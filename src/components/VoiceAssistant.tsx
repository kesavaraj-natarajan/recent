import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../types';
import { translations, Language } from '../lib/translations';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface VoiceAssistantProps {
  userRole?: 'consumer' | 'farmer';
  lang: Language;
  onAction: (action: any) => void;
}

export default function VoiceAssistant({ userRole, lang, onAction }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const t = translations[lang];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        // Set language based on current app language
        recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-US';

        recognition.onstart = () => {
          console.log('Speech recognition started');
          setFeedback(lang === 'ta' ? 'கேட்கிறேன்...' : 'Listening...');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          // Suppress console error for 'no-speech' as it's a common timeout
          if (event.error !== 'no-speech') {
            console.error('Speech recognition error:', event.error);
          }
          
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            setFeedback(lang === 'ta' ? 'மைக்ரோபோன் அனுமதி மறுக்கப்பட்டது. தயவுசெய்து அனுமதியை சரிபார்க்கவும்.' : 'Microphone access denied. Please check your browser permissions.');
          } else if (event.error === 'no-speech') {
            setFeedback(lang === 'ta' ? 'குரல் கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Voice not detected. Please try again.');
          } else if (event.error === 'network') {
            setFeedback(lang === 'ta' ? 'பிணைய பிழை. உங்கள் இணைய இணைப்பைச் சரிபார்க்கவும்.' : 'Network error. Please check your internet connection.');
          } else {
            setFeedback(lang === 'ta' ? 'மன்னிக்கவும், என்னால் தெளிவாக கேட்க முடியவில்லை.' : 'Sorry, I could not hear you clearly.');
          }
          
          // Don't clear feedback immediately if it's a no-speech error, 
          // let the user see it and potentially retry
          if (event.error !== 'no-speech') {
            setTimeout(() => {
              if (!isProcessing) setFeedback('');
            }, 4000);
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
          recognition.stop();
        };
      }
    }
  }, [lang]);

  useEffect(() => {
    // Process when user stops speaking (isListening becomes false) and we have a transcript
    if (!isListening && transcript.trim() && !isProcessing) {
      processCommand(transcript);
    }
  }, [isListening, transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback('');
      setIsOpen(true);
      
      if (!recognitionRef.current) {
        setFeedback(lang === 'ta' ? 'உங்கள் உலாவி குரல் அங்கீகாரத்தை ஆதரிக்கவில்லை.' : 'Your browser does not support speech recognition.');
        return;
      }

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        console.error('Failed to start recognition:', e);
        // If already started, just update state
        if (e.name === 'InvalidStateError') {
          setIsListening(true);
        } else {
          setFeedback('Error starting microphone.');
        }
      }
    }
  };

  const processCommand = async (command: string) => {
    if (!process.env.GEMINI_API_KEY) {
      setFeedback('Gemini API key is missing.');
      return;
    }

    setIsProcessing(true);
    setFeedback(lang === 'ta' ? 'செயலாக்குகிறது...' : 'Processing...');
    
    try {
      const systemInstruction = `You are a helpful voice assistant for an agriculture marketplace app called Farm2Home.
The user is a ${userRole || 'guest'}.
The current app language is ${lang === 'ta' ? 'Tamil' : 'English'}.

Available actions for farmer: 
- ADD_PRODUCT: When farmer wants to add a new item. Try to extract productName, price, stock, category.
- UPDATE_PRODUCT: When farmer wants to edit an existing item. Extract productName and updated fields.
- DELETE_PRODUCT: When farmer wants to remove an item. Extract productName.
- NAVIGATE: targetPage can be 'dashboard', 'orders', 'profile', 'inbox'.

Available actions for consumer: 
- SEARCH: Extract searchTerm.
- ADD_TO_CART: When consumer wants to buy something. Extract productName, quantity. Try to find the closest product name.
- NAVIGATE: targetPage can be 'marketplace', 'cart', 'orders', 'profile', 'inbox', 'favorites', 'tracking', 'support', 'about'.

If the user request is incomplete for adding a product (e.g. "I want to add tomatoes" but no price), the "replyText" should acknowledge what was captured and ask for the specific missing details (e.g. "Sure, what's the price for tomatoes?").

- If user asks for prices (e.g. "what is the price of honey" or "தேன் விலை என்ன"), the "replyText" should clearly state the current price from the marketplace data.

IMPORTANT: The user might speak in English or Tamil. 
1. If the user speaks in Tamil, the "replyText" MUST be in Tamil.
2. If the user speaks in English, the "replyText" MUST be in English.
3. If they mix both, reply in the language that seems most appropriate.

Return JSON matching this schema:
{
  "action": "ADD_PRODUCT" | "UPDATE_PRODUCT" | "DELETE_PRODUCT" | "SEARCH" | "ADD_TO_CART" | "NAVIGATE" | "UNKNOWN",
  "payload": {
    "productName": "string (optional)",
    "price": "number (optional)",
    "stock": "number (optional)",
    "category": "string (optional)",
    "quantity": "number (optional)",
    "searchTerm": "string (optional)",
    "targetPage": "string (optional)"
  },
  "replyText": "A short, friendly spoken response."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: command,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              payload: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  stock: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  searchTerm: { type: Type.STRING },
                  targetPage: { type: Type.STRING }
                }
              },
              replyText: { type: Type.STRING }
            },
            required: ["action", "payload", "replyText"]
          }
        }
      });

      const parsedResult = JSON.parse(response.text || '{}');
      setFeedback(parsedResult.replyText || 'Done.');
      
      // Speak the reply
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(parsedResult.replyText);
        
        // Simple detection: if reply contains Tamil characters, use ta-IN
        const hasTamil = /[\u0B80-\u0BFF]/.test(parsedResult.replyText);
        utterance.lang = hasTamil ? 'ta-IN' : 'en-US';
        
        window.speechSynthesis.speak(utterance);
      }

      // Execute action
      if (parsedResult.action !== 'UNKNOWN') {
        onAction(parsedResult);
      }

      setTimeout(() => {
        setIsOpen(false);
        setTranscript('');
        setFeedback('');
      }, 5000);

    } catch (error) {
      console.error('Error processing voice command:', error);
      setFeedback(lang === 'ta' ? 'மன்னிக்கவும், உங்கள் கட்டளையைச் செயலாக்குவதில் பிழை ஏற்பட்டது.' : 'Sorry, there was an error processing your command.');
      setTimeout(() => setIsOpen(false), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!recognitionRef.current) {
    return null; // Browser doesn't support speech recognition
  }

  return (
    <>
      <button
        onClick={toggleListening}
        className={`fixed bottom-6 right-24 p-4 rounded-full shadow-lg z-50 transition-all duration-300 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-brand-olive hover:bg-[#4a4a35] text-white'
        }`}
        title="Voice Assistant"
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100"
          >
            <div className="bg-brand-olive text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span className="font-medium">AI Voice Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="min-h-[80px] flex flex-col items-center justify-center text-center gap-4">
                {isListening ? (
                  <p className="text-gray-600 italic">"{transcript || (lang === 'ta' ? 'கேட்கிறேன்...' : 'Listening...')}"</p>
                ) : isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-brand-olive">
                    <Loader2 className="animate-spin" size={24} />
                    <p className="text-sm font-medium">{lang === 'ta' ? 'செயலாக்குகிறது...' : 'Processing...'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-800 font-medium">{feedback}</p>
                    {feedback.includes(lang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'try again') && (
                      <button
                        onClick={toggleListening}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-olive text-white rounded-full text-sm font-semibold hover:bg-brand-olive/90 transition-all mx-auto"
                      >
                        <Mic size={16} />
                        {lang === 'ta' ? 'மீண்டும் பேசவும்' : 'Speak Again'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {isListening && (
                <div className="mt-4 flex justify-center gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 24, 8] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                      className="w-1.5 bg-red-500 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
