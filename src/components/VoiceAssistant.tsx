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
        recognition.lang = lang === 'ta' ? 'ta-IN' : (lang === 'hi' ? 'hi-IN' : 'en-US');

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.error('Speech recognition error', event.error);
          }
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setFeedback('Microphone access denied. Please allow microphone permissions.');
          } else if (event.error === 'no-speech') {
            setFeedback('No speech detected. Please try again.');
          } else {
            setFeedback('Sorry, I could not hear you clearly.');
          }
          setTimeout(() => setFeedback(''), 3000);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [lang]);

  useEffect(() => {
    if (!isListening && transcript && !isProcessing) {
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
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const processCommand = async (command: string) => {
    setIsProcessing(true);
    setFeedback('Processing...');
    try {
      const systemInstruction = `You are a helpful voice assistant for an agriculture marketplace app called Farm2Home.
The user is a ${userRole || 'guest'}.
Parse their voice command into a JSON object.
Available actions for farmer: ADD_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, NAVIGATE.
Available actions for consumer: SEARCH, ADD_TO_CART, NAVIGATE.
If the command is not understood, use action UNKNOWN.
IMPORTANT: The user might speak in English, Hindi, or Tamil. You must reply in the same language they used.

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
    "targetPage": "string (optional, e.g., 'home', 'cart', 'dashboard', 'orders')"
  },
  "replyText": "A short, friendly spoken response confirming the action or asking for clarification, in the same language as the user's command."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: command,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
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
            required: ['action', 'payload', 'replyText']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setFeedback(result.replyText || 'Done.');
      
      // Speak the reply
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(result.replyText);
        utterance.lang = lang === 'ta' ? 'ta-IN' : (lang === 'hi' ? 'hi-IN' : 'en-US');
        window.speechSynthesis.speak(utterance);
      }

      // Execute action
      if (result.action !== 'UNKNOWN') {
        onAction(result);
      }

      setTimeout(() => {
        setIsOpen(false);
        setTranscript('');
        setFeedback('');
      }, 4000);

    } catch (error) {
      console.error('Error processing voice command:', error);
      setFeedback('Sorry, there was an error processing your command.');
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
              <div className="min-h-[60px] flex items-center justify-center text-center">
                {isListening ? (
                  <p className="text-gray-600 italic">"{transcript || 'Listening...'}"</p>
                ) : isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-brand-olive">
                    <Loader2 className="animate-spin" size={24} />
                    <p className="text-sm font-medium">Processing...</p>
                  </div>
                ) : (
                  <p className="text-gray-800 font-medium">{feedback}</p>
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
