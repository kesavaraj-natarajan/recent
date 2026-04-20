/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBasket, 
  Search, 
  ShoppingCart, 
  MapPin, 
  User, 
  Leaf, 
  ChevronRight, 
  X, 
  Plus, 
  Minus,
  Sparkles,
  Send,
  Loader2,
  Mail,
  Inbox,
  Grid,
  Map as MapIcon,
  Tractor,
  History,
  Truck,
  Star,
  Phone,
  Home,
  Settings,
  LogOut,
  Languages,
  CreditCard,
  Smartphone,
  Building2,
  HelpCircle,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { Product, CartItem } from './types';
import { PRODUCTS as INITIAL_PRODUCTS } from './constants';
import Auth from './components/Auth';
import FarmerDashboard from './components/FarmerDashboard';
import FarmMap from './components/FarmMap';
import VoiceAssistant from './components/VoiceAssistant';
import { translations, Language } from './lib/translations';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [user, setUser] = useState<{ 
    id: string;
    name: string; 
    email: string; 
    role: 'consumer' | 'farmer';
    phone?: string;
    address?: string;
    farmName?: string;
    location?: string;
    coordinates?: { lat: number; lng: number };
    profilePhoto?: string;
  } | null>(() => {
    const savedUser = localStorage.getItem('farm2homeUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isDataFetched, setIsDataFetched] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [view, setView] = useState<'marketplace' | 'dashboard'>(() => {
    const savedUser = localStorage.getItem('farm2homeUser');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      return parsed.role === 'farmer' ? 'dashboard' : 'marketplace';
    }
    return 'marketplace';
  });
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [comparisonList, setComparisonList] = useState<Product[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [currentPage, setCurrentPage] = useState<'home' | 'about'>('home');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'home'>('pickup');
  const [favoriteFarmers, setFavoriteFarmers] = useState<string[]>([]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedProductForReviews, setSelectedProductForReviews] = useState<Product | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<Product | null>(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', imageUrl: '' });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [orders, setOrders] = useState<{ id: string; date: string; total: number; status: string; items: CartItem[], customer?: string }[]>([]);
  const [emails, setEmails] = useState<{ id: string; subject: string; body: string; date: string; read: boolean }[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type: 'email' | 'info' }[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(50); // Increased default radius
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [voiceCommand, setVoiceCommand] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    if (user) {
      localStorage.setItem('farm2homeUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('farm2homeUser');
    }
  }, [user]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();
        if (prodData.success && prodData.products.length > 0) {
          setProducts(prodData.products);
          setIsDataFetched(true);
        }
        
        if (user?.email) {
          const orderRes = await fetch(`/api/orders?email=${user.email}`);
          const orderData = await orderRes.json();
          if (orderData.success) {
            setOrders(orderData.orders);
          }
          
          const favRes = await fetch(`/api/favorites?email=${user.email}`);
          const favData = await favRes.json();
          if (favData.success) {
            setFavoriteFarmers(favData.favorites);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };
    fetchInitialData();
  }, [user?.email]);

  const toggleFavoriteFarmer = async (product: Product) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const isFavorite = favoriteFarmers.includes(product.farmerName);
    
    try {
      if (isFavorite) {
        setFavoriteFarmers(prev => prev.filter(f => f !== product.farmerName));
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, farmerName: product.farmerName })
        });
      } else {
        setFavoriteFarmers(prev => [...prev, product.farmerName]);
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: user.email, 
            farmerName: product.farmerName,
            farmerMobile: product.farmerMobile,
            farmLocation: product.farmLocation
          })
        });
        addNotification("Added to Favorites", `${product.farmerName} has been added to your favorite farmers.`, "info");
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c; // Distance in km
    return d;
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.farmerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesRating = product.rating >= minRating;
      
      let matchesLocation = true;
      if (userLocation) {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, product.coordinates.lat, product.coordinates.lng);
        matchesLocation = distance <= searchRadius;
      }

      return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesLocation && product.stock > 0;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

  const purchasedCategories = new Set(
    orders.flatMap(order => order.items.map(item => item.category))
  );
  
  const recommendedProducts = products.filter(p => 
    purchasedCategories.has(p.category) && 
    !orders.some(order => order.items.some(item => item.id === p.id))
  ).slice(0, 5);

  const toggleComparison = (product: Product) => {
    setComparisonList(prev => {
      const isAlreadyAdded = prev.find(p => p.id === product.id);
      if (isAlreadyAdded) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 3) {
        alert("You can compare up to 3 products at a time.");
        return prev;
      }
      return [...prev, product];
    });
  };

  const addToCart = (product: Product) => {
    if (user?.role === 'farmer') {
      addNotification("Notice", "Farmers cannot buy products. You are in preview mode as a seller.", "info");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          addNotification("Out of Stock", `Only ${product.stock} units of ${product.name} available.`, "info");
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.stock < 1) {
        addNotification("Out of Stock", `${product.name} is currently out of stock.`, "info");
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const buyNow = (product: Product) => {
    if (user?.role === 'farmer') {
      addNotification("Notice", "Farmers cannot buy products.", "info");
      return;
    }
    addToCart(product);
    if (user) {
      setIsCheckoutOpen(true);
    } else {
      setIsCartOpen(true);
      setIsAuthOpen(true);
      addNotification(t.signInToBuy, t.signInToBuyMessage, "info");
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const addNotification = (title: string, message: string, type: 'email' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  const receiveEmail = (subject: string, body: string) => {
    const id = Math.random().toString(36).substring(7);
    const newEmail = {
      id,
      subject,
      body,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setEmails(prev => [newEmail, ...prev]);
    addNotification(`${t.newEmail}: ${subject}`, t.checkInbox, 'email');
  };

  const sendRealEmail = async (to: string, subject: string, body: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          text: body,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
            <h2 style="color: #5A5A40;">Farm2Home</h2>
            <p style="font-size: 16px; line-height: 1.5;">${body.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">This is an automated message from Farm2Home. Please do not reply.</p>
          </div>`
        }),
      });
      const data = await response.json();
      if (data.success) {
        console.log('Real email sent successfully');
      }
    } catch (error) {
      console.error('Failed to send real email:', error);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    if (!selectedProductForReviews) return;

    const review = {
      id: Math.random().toString(36).substring(7),
      userName: user.name,
      rating: newReview.rating,
      comment: newReview.comment,
      imageUrl: newReview.imageUrl,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductForReviews.id, review })
      });
      
      if (response.ok) {
        const updatedProducts = products.map(p => {
          if (p.id === selectedProductForReviews.id) {
            const updatedReviews = [review, ...p.reviews];
            const avgRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
            return { ...p, reviews: updatedReviews, rating: parseFloat(avgRating.toFixed(1)) };
          }
          return p;
        });

        setProducts(updatedProducts);
        setSelectedProductForReviews(updatedProducts.find(p => p.id === selectedProductForReviews.id) || null);
        setNewReview({ rating: 5, comment: '', imageUrl: '' });
        addNotification(t.reviewAdded, t.thankYouFeedback, "info");
      }
    } catch (err) {
      console.error("Failed to add review:", err);
      addNotification("Error", "Failed to post review. Please try again.", "info");
    }
  };

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const streetAddress = formData.get('streetAddress') as string;
    const city = formData.get('city') as string;
    const zipCode = formData.get('zipCode') as string;

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessingPayment(false);
    setIsCheckoutOpen(false);
    setIsOrderSuccess(true);
    clearCart();
    
    const orderId = "HH-" + Math.floor(Math.random() * 100000);
    const productNames = cart.map(item => item.name).join(', ');

    // Save order to Supabase
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          street_address: streetAddress,
          city: city,
          zip_code: zipCode,
          product_name: productNames,
          items_json: cart,
          total_amount: cartTotal + (deliveryMethod === 'home' ? 50 : 0),
          delivery_method: deliveryMethod,
          date_time: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Supabase Sync Error:', errorData);
      }
    } catch (error) {
      console.error('Failed to save order to Supabase:', error);
    }

    // Add to orders history
    const newOrder = {
      id: orderId,
      date: new Date().toLocaleDateString(),
      total: cartTotal + (deliveryMethod === 'home' ? 50 : 0),
      status: 'Processing',
      items: [...cart],
      customer: user?.name || `${firstName} ${lastName}`,
      deliveryMethod: deliveryMethod,
      email: email
    };
    setOrders(prev => [newOrder, ...prev]);

      // If home delivery, update status to Delivered after 12 seconds
      if (deliveryMethod === 'home') {
        setTimeout(async () => {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Delivered' } : o));
          try {
            await fetch('/api/orders/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, status: 'Delivered' })
            });
          } catch (e) {
            console.error("Failed to update order status in Supabase:", e);
          }
        }, 12000);
      }
};

const handleCancelOrder = (orderId: string) => {
  if (!confirm(t.confirmCancel)) return;

  setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
  
  const subject = `${t.orderCancelled}: ${orderId}`;
  const body = t.orderCancelledBody
    .replace('{name}', user?.name || '')
    .replace('{orderId}', orderId);
  
  receiveEmail(subject, body);
  addNotification(t.orderCancelled, `Order ${orderId} has been cancelled.`, "info");
};

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiLoading) return;

    const userMsg = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAiLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...aiMessages, { role: 'user', content: userMsg }].map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: `You are Farm2Home AI, a helpful assistant for a farmer-to-consumer marketplace. 
          Help users find seasonal produce, suggest recipes based on available products, and explain the benefits of buying local.
          Available products: ${JSON.stringify(products.map(p => ({ name: p.name, category: p.category, price: p.price, farmer: p.farmerName, unit: p.unit })))}
          
          SPECIFIC TASKS:
          - If a user asks for prices (e.g., "today egg price"), look it up in the product list above and provide the exact match.
          - If the product exists, format the response using a Markdown Table for clarity (Price Report).
          - If the product doesn't exist, recommend the closest alternative or explain that it's currently unavailable from local farmers.
          - Keep responses concise, warm, and encouraging. Use markdown for formatting.
          
          IMPORTANT: The user might speak in English or Tamil. 
          1. If the user speaks in Tamil, reply in Tamil.
          2. If the user speaks in English, reply in English.
          3. If they mix both, reply in the language that seems most appropriate.`
        }
      });

      const text = response.text;
      if (text) {
        setAiMessages(prev => [...prev, { role: 'model', content: text }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setAiMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I'm having trouble connecting right now. Please try again later!" }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleVoiceAction = (result: any) => {
    const { action, payload } = result;
    
    if (action === 'NAVIGATE') {
      const page = payload.targetPage?.toLowerCase();
      // Reset all toggles before navigating to a specific view
      setIsCartOpen(false);
      setIsOrderHistoryOpen(false);
      setIsProfileOpen(false);
      setIsInboxOpen(false);
      setIsFavoritesOpen(false);
      setIsOrderTrackingOpen(false);
      setIsAiOpen(false);
      setIsSupportOpen(false);

      if (page === 'cart' && user?.role !== 'farmer') setIsCartOpen(true);
      else if (page === 'home' || page === 'marketplace') { setView('marketplace'); setCurrentPage('home'); }
      else if (page === 'about') { setView('marketplace'); setCurrentPage('about'); }
      else if ((page === 'orders' || page === 'history') && user?.role !== 'farmer') setIsOrderHistoryOpen(true);
      else if (page === 'profile' || page === 'account') setIsProfileOpen(true);
      else if (page === 'inbox' || page === 'messages') setIsInboxOpen(true);
      else if ((page === 'favorites' || page === 'saved') && user?.role !== 'farmer') setIsFavoritesOpen(true);
      else if ((page === 'tracking' || page === 'delivery') && user?.role !== 'farmer') setIsOrderTrackingOpen(true);
      else if (page === 'support' || page === 'help') setIsSupportOpen(true);
      else if (page === 'dashboard' && user?.role === 'farmer') setView('dashboard');
      else if (user?.role === 'farmer' && ['cart', 'orders', 'history', 'favorites', 'tracking'].includes(page)) {
        addNotification("Action Restricted", "Farmers do not have access to consumer features.", "info");
        return;
      }
      else setView('marketplace'); // Default fallback

      addNotification("Navigation", `Opening ${page}...`, "info");
      return;
    }

    if (user?.role === 'farmer') {
      // Navigate to dashboard if not already there for other farmer actions
      if (view !== 'dashboard') {
        setView('dashboard');
      }
      // Pass the command to the dashboard
      setVoiceCommand({ ...result, timestamp: Date.now() });
      addNotification("Voice Command", result.replyText, "info");
    } else {
      if (action === 'SEARCH') {
        setSearchQuery(payload.searchTerm || '');
        setView('marketplace');
        addNotification("Voice Search", `Searching for "${payload.searchTerm}"`, "info");
      } else if (action === 'ADD_TO_CART') {
        const product = products.find(p => p.name.toLowerCase().includes(payload.productName?.toLowerCase() || ''));
        if (product) {
          addToCart(product);
          const qty = payload.quantity || 1;
          if (qty > 1) {
            for (let i = 1; i < qty; i++) {
              addToCart(product);
            }
          }
          addNotification(t.cartUpdated, `${qty}x ${product.name} ${t.addedToCart}`, "info");
          setIsCartOpen(true);
        } else {
          addNotification("Product Not Found", `Could not find "${payload.productName}"`, "info");
        }
      }
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  useEffect(() => {
    if (user?.role === 'farmer') {
      setView('dashboard');
    } else {
      setView('marketplace');
    }
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-brand-cream/80 backdrop-blur-md border-b border-brand-ink/10">
        <div className="w-full px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setView('marketplace')}
            >
              <div className="w-10 h-10 bg-brand-olive rounded-full flex items-center justify-center text-white">
                <Leaf size={20} />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight">Farm2Home</span>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-8 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40" size={18} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-brand-ink/10 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-ink/10 rounded-full hover:bg-brand-olive/5 transition-all text-sm font-medium text-brand-ink/80"
                title="Set Location"
              >
                <MapPin size={16} className={userLocation ? "text-brand-olive" : "text-brand-ink/40"} />
                <span className="max-w-[100px] truncate">
                  {userLocation ? userLocation.address : 'Set Location'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
                className="p-2 bg-brand-olive/5 text-brand-olive hover:bg-brand-olive/10 rounded-xl transition-all flex items-center gap-2 border border-brand-olive/10"
                title={t.changeLanguage}
              >
                <Languages size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">{lang === 'en' ? 'தமிழ்' : 'English'}</span>
              </button>

              {user?.role === 'farmer' && (
                <button 
                  onClick={() => setView(view === 'dashboard' ? 'marketplace' : 'dashboard')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-olive hover:bg-brand-olive/5 rounded-full transition-all"
                >
                  {view === 'dashboard' ? <ShoppingBasket size={18} /> : <Tractor size={18} />}
                  {view === 'dashboard' ? t.viewShop : t.dashboard}
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-3">
                  <div 
                    className="hidden sm:block text-right cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsProfileOpen(true)}
                  >
                    <p className="text-xs font-bold text-brand-olive uppercase tracking-wider">
                      {user.role === 'farmer' ? t.farmer : t.consumer}
                    </p>
                    <p className="text-sm font-serif font-semibold">{user.name}</p>
                  </div>
                  <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="p-2 text-brand-ink/60 hover:text-brand-olive transition-colors relative"
                    title={t.profile}
                  >
                    {user.profilePhoto ? (
                      <img 
                      src={user.profilePhoto} 
                      alt="Profile" 
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-brand-ink/10" 
                    />
                    ) : (
                      <User size={24} />
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="px-6 py-2 bg-brand-olive text-white rounded-full text-sm font-semibold hover:bg-brand-olive/90 transition-all"
                >
                  {t.signIn}
                </button>
              )}
              
              {view === 'marketplace' && user?.role !== 'farmer' && (
                <div className="flex items-center gap-2">
                  {user?.role === 'consumer' && (
                    <>
                      <button 
                        onClick={() => setIsOrderTrackingOpen(true)}
                        className="p-2 text-brand-ink/60 hover:text-brand-olive transition-colors"
                        title={t.trackOrders}
                      >
                        <Truck size={24} />
                      </button>
                      <button 
                        onClick={() => setIsOrderHistoryOpen(true)}
                        className="p-2 text-brand-ink/60 hover:text-brand-olive transition-colors"
                        title={t.orderHistory}
                      >
                        <History size={24} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setIsFavoritesOpen(true)}
                    className="p-2 text-brand-ink/60 hover:text-brand-olive transition-colors"
                    title="Favorite Farmers"
                  >
                    <Heart size={24} />
                  </button>
                  <button 
                    onClick={() => setIsInboxOpen(true)}
                    className="relative p-2 text-brand-ink/60 hover:text-brand-olive transition-colors"
                    title={t.inbox}
                  >
                    <Mail size={24} />
                    {emails.filter(e => !e.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {emails.filter(e => !e.read).length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 text-brand-ink/60 hover:text-brand-olive transition-colors"
                  >
                    <ShoppingCart size={24} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-olive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-12 py-8">
        {currentPage === 'about' ? (
          <div className="max-w-4xl mx-auto py-12">
            <h1 className="text-5xl font-serif font-bold text-brand-olive mb-8">About Farm2Home</h1>
            <img 
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=2000" 
              alt="Farm landscape"
              className="w-full h-64 object-cover rounded-3xl mb-8"
              referrerPolicy="no-referrer"
            />
            <div className="prose prose-lg max-w-none text-brand-ink/80 space-y-6">
              <p className="text-xl">
                Farm2Home was born from a simple idea: what if we could connect consumers directly with the people who grow their food?
              </p>
              <p>
                We believe that the best food is fresh, local, and grown with care. By cutting out the middlemen, we ensure that farmers get a fair price for their hard work, and consumers get the freshest produce possible.
              </p>
              <h2 className="text-3xl font-serif font-bold text-brand-olive mt-12 mb-4">Our Mission</h2>
              <p>
                To empower local farmers by providing a direct link to consumers who value quality, sustainability, and community. We strive to build a transparent food system where everyone knows exactly where their food comes from.
              </p>
              <h2 className="text-3xl font-serif font-bold text-brand-olive mt-12 mb-4">Why Choose Us?</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Direct from the Source:</strong> No warehouses, no long transit times. Just fresh produce straight from the farm.</li>
                <li><strong>Fair Prices:</strong> Farmers set their own prices and keep the majority of the profit.</li>
                <li><strong>Sustainable Practices:</strong> We encourage and support organic and sustainable farming methods.</li>
                <li><strong>Community Connection:</strong> Get to know the people who grow your food.</li>
              </ul>
              <div className="mt-12 pt-8 border-t border-brand-ink/10 text-center">
                <button 
                  onClick={() => { setView('marketplace'); setCurrentPage('home'); }}
                  className="bg-brand-olive text-white px-8 py-4 rounded-full font-semibold hover:bg-brand-olive/90 transition-colors"
                >
                  Back to Marketplace
                </button>
              </div>
            </div>
          </div>
        ) : view === 'dashboard' && user?.role === 'farmer' ? (
          <FarmerDashboard 
            farmerName={user.farmName || user.name} 
            farmerPhoto={user.profilePhoto}
            user={user}
            onUpdateUser={setUser}
            products={products} 
            onUpdateProducts={setProducts} 
            lang={lang}
            voiceCommand={voiceCommand}
            orders={orders}
            addNotification={addNotification}
          />
        ) : (
          <>
            {/* Hero Section */}
        <section className="mb-12">
          <div className="relative rounded-3xl overflow-hidden bg-brand-olive h-[400px] flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=2000" 
              alt="Farm landscape"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="relative z-10 px-8 md:px-16 max-w-2xl">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-serif text-white leading-tight mb-6"
              >
                {lang === 'en' ? (
                  <>Fresh from the <span className="italic">soil</span> to your <span className="italic">table</span>.</>
                ) : (
                  <>மண்ணிலிருந்து உங்கள் <span className="italic">மேசைக்கு</span> நேரடி <span className="italic">பசுமை</span>.</>
                )}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-white/80 text-lg mb-8"
              >
                {t.heroSubtitle}
              </motion.p>
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => setCurrentPage('about')}
                className="bg-white text-brand-olive px-8 py-4 rounded-full font-semibold flex items-center gap-2 hover:bg-brand-cream transition-colors group"
              >
                {t.moreAboutUs} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        </section>

        {/* Categories & Filter */}
        <section className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all border",
                  isFiltersOpen 
                    ? "bg-brand-olive text-white border-brand-olive" 
                    : "bg-white text-brand-ink/80 border-brand-ink/10 hover:border-brand-olive/40"
                )}
              >
                <Settings size={18} />
                Filters & Sort
              </button>
              <div className="text-sm text-brand-ink/40 font-medium">
                {t.showingProducts.replace('{count}', filteredProducts.length.toString())}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white rounded-full border border-brand-ink/10 p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    viewMode === 'grid' ? "bg-brand-olive text-white" : "text-brand-ink/40 hover:text-brand-olive"
                  )}
                  title="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    viewMode === 'map' ? "bg-brand-olive text-white" : "text-brand-ink/40 hover:text-brand-olive"
                  )}
                  title="Map View"
                >
                  <MapIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isFiltersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-white rounded-3xl border border-brand-ink/5 shadow-lg space-y-6">
                  {/* Categories */}
                  <div>
                    <h3 className="text-sm font-bold text-brand-ink/40 uppercase tracking-wider mb-3">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                            selectedCategory === category 
                              ? "bg-brand-olive text-white border-brand-olive" 
                              : "bg-brand-cream/50 text-brand-ink/60 border-brand-ink/10 hover:border-brand-olive/40"
                          )}
                        >
                          {category === 'All' ? t.all : (
                            category === 'Vegetables' ? t.vegetables :
                            category === 'Fruits' ? t.fruits :
                            category === 'Grains' ? t.grains :
                            category === 'Dairy' ? t.dairy :
                            category === 'Honey' ? t.honey : 
                            category === 'Herbs' ? t.herbs : category
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sort */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-brand-ink/40 uppercase tracking-wider">{t.sortBy}</h3>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full p-3 bg-brand-cream/50 border border-brand-ink/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                      >
                        <option value="name">{t.name}</option>
                        <option value="price-asc">{t.lowToHigh}</option>
                        <option value="price-desc">{t.highToLow}</option>
                      </select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-bold text-brand-ink/40 uppercase tracking-wider">
                        <span>{t.maxPrice}</span>
                        <span className="text-brand-olive">₹{priceRange[1]}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1000" 
                        step="10"
                        value={isNaN(priceRange[1]) ? 1000 : priceRange[1]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setPriceRange([0, isNaN(val) ? 1000 : val]);
                        }}
                        className="w-full accent-brand-olive h-2 bg-brand-ink/5 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                    </div>

                    {/* Rating */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-bold text-brand-ink/40 uppercase tracking-wider">
                        <span>{t.minRating}</span>
                        <span className="text-brand-olive">{minRating > 0 ? `${minRating}+ ${t.stars}` : t.anyRating}</span>
                      </div>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setMinRating(rating)}
                            className={cn(
                              "flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all border",
                              minRating === rating 
                                ? "bg-brand-olive text-white border-brand-olive" 
                                : "bg-brand-cream/50 text-brand-ink/40 border-brand-ink/10 hover:border-brand-olive/40"
                            )}
                          >
                            {rating === 0 ? t.all : `${rating}★`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-brand-ink/5">
                    <button 
                      onClick={() => { setPriceRange([0, 1000]); setSelectedCategory('All'); setSearchQuery(''); setMinRating(0); }}
                      className="text-sm font-bold text-brand-olive uppercase hover:underline"
                    >
                      {t.resetFilters}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Recommended Products */}
        {user?.role === 'consumer' && recommendedProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-brand-olive" size={24} />
              Recommended for You
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {recommendedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group bg-white rounded-2xl overflow-hidden border border-brand-ink/5 hover:shadow-xl hover:shadow-brand-olive/5 transition-all text-sm"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteFarmer(product);
                        }}
                        className={cn(
                          "p-2 rounded-full backdrop-blur-md transition-all",
                          favoriteFarmers.includes(product.farmerName) 
                            ? "bg-brand-olive text-white" 
                            : "bg-white/80 text-brand-ink/60 hover:bg-white hover:text-brand-olive"
                        )}
                        title={favoriteFarmers.includes(product.farmerName) ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Heart size={16} className={favoriteFarmers.includes(product.farmerName) ? "fill-current" : ""} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-brand-ink truncate pr-2">{product.name}</h3>
                      <span className="font-bold text-brand-olive whitespace-nowrap">₹{product.price}</span>
                    </div>
                    <p className="text-xs text-brand-ink/60 mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-medium text-brand-ink/60">
                        {product.farmerPhoto ? (
                          <img src={product.farmerPhoto} alt={product.farmerName} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <MapPin size={12} />
                        )}
                        <span className="truncate max-w-[100px]">{product.farmLocation}</span>
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className="p-2 bg-brand-olive/10 text-brand-olive rounded-full hover:bg-brand-olive hover:text-white transition-colors"
                        title={t.addToBasket}
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Product Grid / Map */}
        <section className="mb-16">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              <AnimatePresence mode='popLayout'>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <motion.div
                      layout
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group bg-white rounded-2xl overflow-hidden border border-brand-ink/5 hover:shadow-xl hover:shadow-brand-olive/5 transition-all text-sm"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-olive">
                            {product.category === 'Vegetables' ? t.vegetables : 
                             product.category === 'Fruits' ? t.fruits : 
                             product.category === 'Dairy' ? t.dairy : 
                             product.category === 'Grains' ? t.grains : 
                             product.category === 'Honey' ? t.honey :
                             product.category === 'Herbs' ? t.herbs : 
                             product.category}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleComparison(product); }}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                              comparisonList.find(p => p.id === product.id)
                                ? "bg-brand-olive text-white"
                                : "bg-white/90 backdrop-blur-sm text-brand-ink/60 hover:text-brand-olive"
                            )}
                          >
                            {comparisonList.find(p => p.id === product.id) ? t.comparing : t.compare}
                          </button>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-serif text-xl font-semibold">{product.name}</h3>
                          <span className="font-bold text-brand-olive">₹{product.price.toFixed(2)}</span>
                        </div>
                        <div 
                          className="flex items-center gap-1 text-xs text-brand-ink/40 mb-1 cursor-pointer hover:text-brand-olive transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFarmer(product);
                          }}
                        >
                          {product.farmerPhoto ? (
                            <img 
                              src={product.farmerPhoto} 
                              alt={product.farmerName} 
                              referrerPolicy="no-referrer"
                              className="w-4 h-4 rounded-full object-cover" 
                            />
                          ) : (
                            <MapPin size={12} />
                          )}
                          <span>{product.farmerName} • {product.farmLocation}</span>
                          {userLocation && (
                            <span className="ml-1 text-brand-olive font-bold">
                              ({calculateDistance(userLocation.lat, userLocation.lng, product.coordinates.lat, product.coordinates.lng).toFixed(1)} km)
                            </span>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteFarmer(product);
                            }}
                            className={cn(
                              "ml-auto p-1 rounded-full transition-colors",
                              favoriteFarmers.includes(product.farmerName) ? "text-red-500 bg-red-50" : "text-brand-ink/40 hover:text-red-500 hover:bg-red-50"
                            )}
                          >
                            <Heart size={14} className={favoriteFarmers.includes(product.farmerName) ? "fill-current" : ""} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-brand-ink/40 mb-2">
                          <Phone size={12} />
                          <span>{product.farmerMobile}</span>
                        </div>
                        <div 
                          className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedProductForReviews(product)}
                        >
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={cn(
                                  i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-brand-ink/10"
                                )} 
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-brand-ink/40">{product.rating} ({product.reviews.length})</span>
                        </div>
                        {user?.role !== 'farmer' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => addToCart(product)}
                              className="flex-1 py-3 bg-brand-cream border border-brand-olive/20 text-brand-olive rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-olive hover:text-white transition-all"
                            >
                              <Plus size={18} /> {t.basket}
                            </button>
                            <button 
                              onClick={() => buyNow(product)}
                              className="flex-1 py-3 bg-brand-olive text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-olive/90 transition-all shadow-md shadow-brand-olive/10"
                            >
                              {t.buyNow}
                            </button>
                          </div>
                        )}
                        {user?.role === 'farmer' && (
                          <div className="py-2 text-center text-brand-ink/40 text-xs italic border-t border-brand-ink/5 mt-2">
                            Farmers can only view marketplace prices and products.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full py-20 px-6 text-center bg-brand-cream/30 border-2 border-dashed border-brand-olive/10 rounded-[2rem]"
                  >
                    <div className="w-20 h-20 bg-brand-olive/5 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-olive/40">
                      <Search size={40} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-3 text-brand-ink">
                      {lang === 'en' ? 'Oops! No matches found' : 'மன்னிக்கவும்! பொருத்தங்கள் எதுவும் இல்லை'}
                    </h3>
                    <p className="text-brand-ink/60 max-w-md mx-auto mb-8">
                      {lang === 'en' 
                        ? "We couldn't find anything matching your current search or filters. Try searching for something else or clearing your filters." 
                        : "உங்கள் தற்போதைய தேடல் அல்லது வடிப்பான்களுடன் பொருந்தக்கூடிய எதையும் எங்களால் கண்டுபிடிக்க முடியவில்லை. வேறு எதையாவது தேட முயற்சிக்கவும்."}
                    </p>
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                        setPriceRange([0, 2000]);
                        setMinRating(0);
                      }}
                      className="px-6 py-3 bg-brand-olive text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                      {lang === 'en' ? 'View All Fresh Produce' : 'அனைத்து தயாரிப்புகளையும் காண்க'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <FarmMap products={filteredProducts} onAddToCart={addToCart} userLocation={userLocation} searchRadius={searchRadius} userRole={user?.role} />
          )}
        </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-brand-ink text-white py-16">
        <div className="w-full px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Leaf className="text-brand-olive" size={24} />
                <span className="text-2xl font-serif font-bold tracking-tight">Farm2Home</span>
              </div>
              <p className="text-white/60 max-w-sm mb-8">
                Empowering local farmers by providing a direct link to consumers who value quality, sustainability, and community.
              </p>
            </div>
            <div>
              <h4 className="font-serif text-lg mb-6">Marketplace</h4>
              <ul className="space-y-4 text-white/40 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">All Produce</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Seasonal Boxes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Farmers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Wholesale</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-lg mb-6">Support</h4>
              <ul className="space-y-4 text-white/40 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Delivery Info</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Returns & Refunds</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20 uppercase tracking-widest">
            <span>© 2026 Farm2Home. All rights reserved.</span>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-brand-cream z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold">{t.basket}</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-ink/40">
                    <ShoppingBasket size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-serif italic">{t.emptyBasket}</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-brand-olive font-semibold underline underline-offset-4"
                    >
                      {t.allProduce}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <h4 className="font-serif font-semibold">{item.name}</h4>
                            <button onClick={() => removeFromCart(item.id)} className="text-brand-ink/20 hover:text-red-500 transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                          <p className="text-xs text-brand-ink/40 mb-3">{item.farmerName}</p>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 bg-white border border-brand-ink/10 rounded-lg px-2 py-1">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-brand-olive transition-colors">
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-brand-olive transition-colors">
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="font-bold text-brand-olive">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-brand-ink/10">
                  <div className="flex justify-between mb-2 text-brand-ink/60">
                    <span>{t.subtotal}</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-6 text-brand-ink/60">
                    <span>{t.delivery}</span>
                    <span className="text-emerald-600 font-medium">{t.free}</span>
                  </div>
                  <div className="flex justify-between mb-8 text-xl font-serif font-bold">
                    <span>{t.total}</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (user) {
                        setIsCheckoutOpen(true);
                      } else {
                        setIsCartOpen(false);
                        setIsAuthOpen(true);
                        addNotification(t.signInRequired, t.signInRequiredMessage, "info");
                      }
                    }}
                    className="w-full py-4 bg-brand-olive text-white rounded-xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
                  >
                    {t.checkout}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Favorite Farmers Drawer */}
      <AnimatePresence>
        {isFavoritesOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFavoritesOpen(false)}
              className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-brand-cream z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold flex items-center gap-2"><Heart size={24} className="fill-red-500 text-red-500" /> Favorite Farmers</h2>
                <button onClick={() => setIsFavoritesOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {favoriteFarmers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-ink/40">
                    <Heart size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-serif italic">No favorite farmers yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favoriteFarmers.map(farmerName => {
                      // Find a product from this farmer to get their details
                      const farmerProduct = products.find(p => p.farmerName === farmerName);
                      return (
                        <div key={farmerName} className="bg-white p-4 rounded-xl shadow-sm border border-brand-ink/5">
                          <div className="flex items-center gap-3 mb-2">
                            {farmerProduct?.farmerPhoto ? (
                              <img src={farmerProduct.farmerPhoto} alt={farmerName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-brand-olive/10 flex items-center justify-center text-brand-olive">
                                <User size={20} />
                              </div>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedFarmer(farmerProduct || { 
                                  id: 'temp', 
                                  farmerName: farmerName, 
                                  farmerMobile: '', 
                                  farmLocation: '', 
                                  name: '', 
                                  price: 0, 
                                  unit: '', 
                                  category: 'Vegetables', 
                                  image: '', 
                                  description: '', 
                                  stock: 0, 
                                  coordinates: { lat: 0, lng: 0 }, 
                                  rating: 5, 
                                  reviews: [] 
                                } as Product);
                              }}
                              className="font-serif text-lg font-bold hover:text-brand-olive hover:underline text-left"
                            >
                              {farmerName}
                            </button>
                          </div>
                          {farmerProduct && (
                            <>
                              <a 
                                href={`https://maps.google.com/?q=${farmerProduct.coordinates.lat},${farmerProduct.coordinates.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-brand-ink/60 mb-1 hover:text-brand-olive transition-colors"
                              >
                                <MapPin size={14} />
                                <span>{farmerProduct.farmLocation}</span>
                              </a>
                              <a 
                                href={`tel:${farmerProduct.farmerMobile}`}
                                className="flex items-center gap-2 text-sm text-brand-ink/60 mb-3 hover:text-brand-olive transition-colors"
                              >
                                <Phone size={14} />
                                <span>{farmerProduct.farmerMobile}</span>
                              </a>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => {
                                    setIsFavoritesOpen(false);
                                    setSearchQuery(farmerName);
                                  }}
                                  className="py-2 bg-brand-olive/10 text-brand-olive rounded-lg font-medium hover:bg-brand-olive/20 transition-colors text-sm"
                                >
                                  View Products
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedFarmer(farmerProduct!);
                                  }}
                                  className="py-2 bg-white text-brand-olive border border-brand-olive/20 rounded-lg font-medium hover:bg-brand-olive/5 transition-colors text-sm"
                                >
                                  View Profile
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Assistant Toggle */}
      {view === 'marketplace' && currentPage === 'home' && !isCheckoutOpen && !isFavoritesOpen && !isCartOpen && !isInboxOpen && (
        <button 
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand-olive text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-40 group"
        >
          <HelpCircle size={24} />
          <span className="absolute -top-10 bg-brand-ink text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Help
          </span>
        </button>
      )}

      {/* Voice Assistant */}
      {view === 'marketplace' && currentPage === 'home' && !isCheckoutOpen && !isFavoritesOpen && !isCartOpen && !isInboxOpen && (
        <VoiceAssistant 
          userRole={user?.role} 
          lang={lang} 
          onAction={handleVoiceAction} 
        />
      )}

      {/* AI Assistant Drawer */}
      <AnimatePresence>
        {isAiOpen && view === 'marketplace' && currentPage === 'home' && !isCheckoutOpen && !isFavoritesOpen && !isCartOpen && !isInboxOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 w-full max-w-sm h-[500px] bg-white rounded-3xl shadow-2xl border border-brand-ink/10 z-50 flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-brand-olive text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span className="font-serif font-bold">Farm2Home AI</span>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 bg-brand-cream rounded-full flex items-center justify-center text-brand-olive mb-4">
                    <Sparkles size={24} />
                  </div>
                  <p className="font-serif italic text-brand-ink/60">
                    "Hi! I'm your seasonal assistant. Ask me about recipes, what's in season, or how to support local farms!"
                  </p>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-brand-olive text-white rounded-tr-none" 
                      : "bg-brand-cream text-brand-ink rounded-tl-none"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-brand-ink/40 text-xs italic">
                  <Loader2 size={14} className="animate-spin" />
                  Farm2Home is thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleAiSubmit} className="p-4 border-t border-brand-ink/10 flex gap-2">
              <input 
                type="text" 
                placeholder="Ask anything..."
                className="flex-1 bg-brand-cream px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button 
                type="submit"
                disabled={isAiLoading || !aiInput.trim()}
                className="w-10 h-10 bg-brand-olive text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-brand-olive/90 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Floating Bar */}
      <AnimatePresence>
        {comparisonList.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-brand-ink text-white px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center gap-6 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {comparisonList.map(p => (
                  <div key={p.id} className="w-10 h-10 rounded-full border-2 border-brand-ink overflow-hidden bg-white">
                    <img src={p.image} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <span className="text-sm font-bold">{comparisonList.length} products selected</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex gap-3">
              <button 
                onClick={() => setComparisonList([])}
                className="text-xs font-bold uppercase hover:text-brand-olive transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setIsComparisonModalOpen(true)}
                className="bg-brand-olive text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-brand-olive/90 transition-all"
              >
                Compare Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {isComparisonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComparisonModalOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-brand-cream rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold">Product Comparison</h2>
                <button onClick={() => setIsComparisonModalOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-x-auto p-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-4 border-b border-brand-ink/10 w-1/4"></th>
                      {comparisonList.map(p => (
                        <th key={p.id} className="p-4 border-b border-brand-ink/10 text-center">
                          <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden mb-4 shadow-md">
                            <img src={p.image} className="w-full h-full object-cover" />
                          </div>
                          <h4 className="font-serif font-bold text-lg">{p.name}</h4>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-ink/5">
                    <tr>
                      <td className="p-4 font-bold text-brand-ink/40 uppercase text-xs">Price</td>
                      {comparisonList.map(p => (
                        <td key={p.id} className="p-4 text-center font-bold text-brand-olive text-xl">₹{p.price.toFixed(2)} / {p.unit}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-brand-ink/40 uppercase text-xs">Category</td>
                      {comparisonList.map(p => (
                        <td key={p.id} className="p-4 text-center">
                          <span className="bg-brand-olive/10 text-brand-olive px-3 py-1 rounded-full text-xs font-bold uppercase">
                            {p.category}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-brand-ink/40 uppercase text-xs">Farmer</td>
                      {comparisonList.map(p => (
                        <td key={p.id} className="p-4 text-center">
                          <p className="font-bold">{p.farmerName}</p>
                          <p className="text-xs text-brand-ink/40">{p.farmLocation}</p>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-brand-ink/40 uppercase text-xs">Stock</td>
                      {comparisonList.map(p => (
                        <td key={p.id} className="p-4 text-center">
                          <span className={cn(
                            "text-sm font-bold",
                            p.stock < 10 ? "text-red-500" : "text-emerald-600"
                          )}>
                            {p.stock} {p.unit} available
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-brand-ink/40 uppercase text-xs">Description</td>
                      {comparisonList.map(p => (
                        <td key={p.id} className="p-4 text-center text-sm text-brand-ink/60 italic">
                          "{p.description}"
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4"></td>
                      {comparisonList.map(p => (
                        <td key={p.id} className="p-4 text-center">
                          <button 
                            onClick={() => { addToCart(p); setIsComparisonModalOpen(false); }}
                            className="bg-brand-olive text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-olive/90 transition-all"
                          >
                            Add to Basket
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications / Simulated Emails */}
      <div className="fixed top-6 left-6 z-[100] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "pointer-events-auto w-80 p-4 rounded-2xl shadow-2xl border flex flex-col gap-1",
                n.type === 'email' ? "bg-brand-ink text-white border-white/10" : "bg-white text-brand-ink border-brand-ink/10"
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {n.type === 'email' ? 'New Email Notification' : 'System Alert'}
                </span>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                  className="opacity-40 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
              <h4 className="font-bold">{n.title}</h4>
              <p className="text-sm opacity-80">{n.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-brand-cream rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white shrink-0">
                <h2 className="text-2xl font-serif font-bold">{t.secureCheckout}</h2>
                <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCheckout} className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                        deliveryMethod === 'pickup' ? "border-brand-olive bg-brand-olive/5 text-brand-olive" : "border-brand-ink/10 bg-white text-brand-ink/60 hover:border-brand-olive/50"
                      )}
                    >
                      <MapPin size={24} />
                      <span className="font-bold">Pickup</span>
                      <span className="text-xs opacity-80">Free</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('home')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                        deliveryMethod === 'home' ? "border-brand-olive bg-brand-olive/5 text-brand-olive" : "border-brand-ink/10 bg-white text-brand-ink/60 hover:border-brand-olive/50"
                      )}
                    >
                      <Truck size={24} />
                      <span className="font-bold">Home Delivery</span>
                      <span className="text-xs opacity-80">+₹50.00</span>
                    </button>
                  </div>
                </div>

                {deliveryMethod === 'home' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">{t.deliveryDetails}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required name="firstName" type="text" placeholder={t.firstName} className="bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" defaultValue={user?.name.split(' ')[0] || ''} />
                      <input required name="lastName" type="text" placeholder={t.lastName} className="bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" defaultValue={user?.name.split(' ').slice(1).join(' ') || ''} />
                    </div>
                    <input required name="email" type="email" placeholder={t.emailAddress} className="w-full bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" defaultValue={user?.email || ''} />
                    <input required name="streetAddress" type="text" placeholder={t.deliveryAddress} className="w-full bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" defaultValue={user?.address || ''} />
                    <div className="grid grid-cols-2 gap-4">
                      <input required name="city" type="text" placeholder="City" className="bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" />
                      <input required name="zipCode" type="text" placeholder="Zip Code" className="bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">{t.paymentMethod}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        paymentMethod === 'card' ? "bg-brand-olive/5 border-brand-olive text-brand-olive" : "bg-white border-brand-ink/10 text-brand-ink/40"
                      )}
                    >
                      <CreditCard size={20} />
                      <span className="text-[10px] font-bold uppercase">{t.card}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        paymentMethod === 'upi' ? "bg-brand-olive/5 border-brand-olive text-brand-olive" : "bg-white border-brand-ink/10 text-brand-ink/40"
                      )}
                    >
                      <Smartphone size={20} />
                      <span className="text-[10px] font-bold uppercase">{t.upi}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        paymentMethod === 'netbanking' ? "bg-brand-olive/5 border-brand-olive text-brand-olive" : "bg-white border-brand-ink/10 text-brand-ink/40"
                      )}
                    >
                      <Building2 size={20} />
                      <span className="text-[10px] font-bold uppercase">{t.netbanking}</span>
                    </button>
                  </div>

                  <div className="bg-white border border-brand-ink/10 rounded-2xl p-4 space-y-4">
                    {paymentMethod === 'card' && (
                      <>
                        <div className="flex items-center gap-3 pb-4 border-b border-brand-ink/5">
                          <div className="w-10 h-6 bg-brand-ink rounded flex items-center justify-center text-[8px] text-white font-bold">VISA</div>
                          <span className="text-sm font-medium">{t.card}</span>
                        </div>
                        <input required type="text" placeholder="Card Number" className="w-full bg-brand-cream/50 border border-brand-ink/5 rounded-xl px-4 py-3 text-sm focus:outline-none" defaultValue="4242 4242 4242 4242" />
                        <div className="grid grid-cols-2 gap-4">
                          <input required type="text" placeholder="MM/YY" className="bg-brand-cream/50 border border-brand-ink/5 rounded-xl px-4 py-3 text-sm focus:outline-none" defaultValue="12/26" />
                          <input required type="text" placeholder="CVC" className="bg-brand-cream/50 border border-brand-ink/5 rounded-xl px-4 py-3 text-sm focus:outline-none" defaultValue="123" />
                        </div>
                      </>
                    )}
                    {paymentMethod === 'upi' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-brand-ink/5">
                          <Smartphone size={20} className="text-brand-olive" />
                          <span className="text-sm font-medium">{t.upi}</span>
                        </div>
                        <input required type="text" placeholder={t.enterUpiId} className="w-full bg-brand-cream/50 border border-brand-ink/5 rounded-xl px-4 py-3 text-sm focus:outline-none" defaultValue="user@okaxis" />
                      </div>
                    )}
                    {paymentMethod === 'netbanking' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-brand-ink/5">
                          <Building2 size={20} className="text-brand-olive" />
                          <span className="text-sm font-medium">{t.netbanking}</span>
                        </div>
                        <select className="w-full bg-brand-cream/50 border border-brand-ink/5 rounded-xl px-4 py-3 text-sm focus:outline-none">
                          <option>{t.selectBank}</option>
                          <option>State Bank of India</option>
                          <option>HDFC Bank</option>
                          <option>ICICI Bank</option>
                          <option>Axis Bank</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex justify-between mb-2 text-brand-ink/60">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  {deliveryMethod === 'home' && (
                    <div className="flex justify-between mb-2 text-brand-ink/60">
                      <span>Delivery Charge</span>
                      <span>₹50.00</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-4 text-lg font-serif font-bold">
                    <span>{t.totalAmount}</span>
                    <span>₹{(cartTotal + (deliveryMethod === 'home' ? 50 : 0)).toFixed(2)}</span>
                  </div>
                  <button 
                    type="submit"
                    disabled={isProcessingPayment}
                    className="w-full py-4 bg-brand-olive text-white rounded-xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {t.processing}
                      </>
                    ) : (
                      t.payAndPlaceOrder
                    )}
                  </button>
                  <p className="text-center text-[10px] text-brand-ink/40 mt-4">
                    {t.dummyPaymentNotice}
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {isOrderSuccess && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-12 text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center mx-auto mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Leaf size={48} />
                </motion.div>
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4">{t.harvestConfirmed}</h2>
              <p className="text-brand-ink/60 mb-8">
                {t.orderSuccessMessage}
              </p>
              <div className="space-y-3">
                {deliveryMethod === 'pickup' && (
                  <button 
                    onClick={() => {
                      window.open(`https://www.google.com/maps/search/?api=1&query=Farm`, '_blank');
                    }}
                    className="w-full py-4 bg-brand-olive/10 text-brand-olive rounded-2xl font-bold hover:bg-brand-olive/20 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin size={20} />
                    Navigate to Farm
                  </button>
                )}
                <button 
                  onClick={() => { setIsOrderSuccess(false); setIsCartOpen(false); }}
                  className="w-full py-4 bg-brand-olive text-white rounded-2xl font-bold hover:bg-brand-olive/90 transition-all"
                >
                  {t.backToMarketplace}
                </button>
                <p className="text-xs text-brand-ink/40 italic">
                  {t.checkNotificationsNotice}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Modal */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-bold">Set Location</h2>
                <button 
                  onClick={() => setIsLocationModalOpen(false)}
                  className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-brand-ink/60">
                  Enter your location to find farmers nearby.
                </p>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40" size={18} />
                  <input 
                    type="text"
                    placeholder="e.g., Chennai, Tamil Nadu"
                    className="w-full pl-10 pr-4 py-3 bg-brand-cream/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                  />
                </div>
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-brand-ink">Search Radius</span>
                    <span className="text-sm font-bold text-brand-olive">{searchRadius} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="500" 
                    value={searchRadius} 
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="w-full accent-brand-olive"
                  />
                  <div className="flex justify-between text-xs text-brand-ink/40 mt-1">
                    <span>1 km</span>
                    <span>500 km</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!locationInput.trim()) return;
                    
                    try {
                      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`);
                      const data = await response.json();
                      
                      if (data && data.length > 0) {
                        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                        setUserLocation({ ...coords, address: locationInput });
                        setIsLocationModalOpen(false);
                        setViewMode('map');
                        addNotification("Location Updated", `Showing farmers near ${locationInput}`, "info");
                      } else {
                        addNotification("Location Not Found", "Could not find coordinates for this location.", "info");
                      }
                    } catch (error) {
                      console.error("Geocoding error:", error);
                      addNotification("Error", "Failed to get location coordinates.", "info");
                    }
                  }}
                  className="w-full py-3 bg-brand-olive text-white rounded-xl font-bold hover:bg-brand-olive/90 transition-all"
                >
                  Save Location
                </button>
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const { latitude, longitude } = position.coords;
                          try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                            const data = await response.json();
                            const address = data.address?.city || data.address?.town || data.address?.village || data.address?.state || "Your Location";
                            
                            setUserLocation({ lat: latitude, lng: longitude, address });
                            setLocationInput(address);
                            setIsLocationModalOpen(false);
                            setViewMode('map');
                            addNotification("Location Detected", `Showing farmers near ${address}`, "info");
                          } catch (error) {
                            setUserLocation({ lat: latitude, lng: longitude, address: "Your Location" });
                            setLocationInput("Your Location");
                            setIsLocationModalOpen(false);
                            setViewMode('map');
                            addNotification("Location Detected", "Showing farmers near your location", "info");
                          }
                        },
                        (error) => {
                          console.error("Geolocation error:", error);
                          addNotification("Error", "Could not detect your location. Please check permissions.", "info");
                        }
                      );
                    } else {
                      addNotification("Error", "Geolocation is not supported by your browser.", "info");
                    }
                  }}
                  className="w-full py-3 bg-brand-olive/10 text-brand-olive rounded-xl font-bold hover:bg-brand-olive/20 transition-all flex items-center justify-center gap-2"
                >
                  <MapPin size={18} /> Auto Detect Location
                </button>
                {userLocation && (
                  <button
                    onClick={() => {
                      setUserLocation(null);
                      setLocationInput('');
                      setIsLocationModalOpen(false);
                      addNotification("Location Cleared", "Showing all farmers", "info");
                    }}
                    className="w-full py-3 bg-brand-ink/5 text-brand-ink/60 rounded-xl font-bold hover:bg-brand-ink/10 transition-all"
                  >
                    Clear Location
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative group cursor-pointer">
                    {user.profilePhoto ? (
                      <img 
                        src={user.profilePhoto} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand-olive" 
                      />
                    ) : (
                      <div className="w-12 h-12 bg-brand-olive text-white rounded-full flex items-center justify-center">
                        <User size={24} />
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Plus size={16} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setUser({ ...user, profilePhoto: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold">{t.yourProfile}</h2>
                    <p className="text-xs text-brand-ink/40">{t.manageAccount}</p>
                  </div>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">{t.fullName}</label>
                      <div className="flex items-center gap-3 p-3 bg-white border border-brand-ink/10 rounded-xl">
                        <User size={18} className="text-brand-ink/20" />
                        <input 
                          type="text" 
                          className="flex-1 bg-transparent focus:outline-none text-sm font-medium"
                          value={user.name}
                          onChange={(e) => setUser({...user, name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">{t.emailAddress}</label>
                      <div className="flex items-center gap-3 p-3 bg-white border border-brand-ink/10 rounded-xl opacity-60">
                        <Mail size={18} className="text-brand-ink/20" />
                        <input 
                          type="email" 
                          disabled
                          className="flex-1 bg-transparent focus:outline-none text-sm font-medium cursor-not-allowed"
                          value={user.email}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">{t.phoneNumber}</label>
                      <div className="flex items-center gap-3 p-3 bg-white border border-brand-ink/10 rounded-xl">
                        <Phone size={18} className="text-brand-ink/20" />
                        <input 
                          type="tel" 
                          className="flex-1 bg-transparent focus:outline-none text-sm font-medium"
                          value={user.phone || ''}
                          onChange={(e) => setUser({...user, phone: e.target.value})}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">
                        {user.role === 'farmer' ? t.farmAddress : t.deliveryAddress}
                      </label>
                      <div className="flex items-center gap-3 p-3 bg-white border border-brand-ink/10 rounded-xl">
                        <Home size={18} className="text-brand-ink/20" />
                        <input 
                          type="text" 
                          className="flex-1 bg-transparent focus:outline-none text-sm font-medium"
                          value={user.address || ''}
                          onChange={(e) => setUser({...user, address: e.target.value})}
                          placeholder={user.role === 'farmer' ? t.farmAddressPlaceholder : t.deliveryAddressPlaceholder}
                        />
                      </div>
                    </div>

                    {user.role === 'farmer' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">{t.farmName}</label>
                          <div className="flex items-center gap-3 p-3 bg-white border border-brand-ink/10 rounded-xl">
                            <Tractor size={18} className="text-brand-ink/20" />
                            <input 
                              type="text" 
                              className="flex-1 bg-transparent focus:outline-none text-sm font-medium"
                              value={user.farmName || ''}
                              onChange={(e) => setUser({...user, farmName: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">Farm Location</label>
                          <div className="flex items-center gap-3 p-3 bg-white border border-brand-ink/10 rounded-xl">
                            <MapPin size={18} className="text-brand-ink/20" />
                            <input 
                              type="text" 
                              className="flex-1 bg-transparent focus:outline-none text-sm font-medium"
                              value={user.location || ''}
                              onChange={(e) => setUser({...user, location: e.target.value})}
                              onBlur={async (e) => {
                                const val = e.target.value;
                                if (val && val.trim()) {
                                  try {
                                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}`);
                                    const data = await response.json();
                                    if (data && data.length > 0) {
                                      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                                      setUser({ ...user, location: val, coordinates: coords });
                                      addNotification("Location Verified", `Coordinates found for ${val}`, "info");
                                    }
                                  } catch (error) {
                                    console.error("Geocoding error:", error);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-brand-ink/10 flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/user/update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(user),
                        });
                        const data = await response.json();
                        if (data.success) {
                          setUser(data.user);
                          setIsProfileOpen(false);
                          addNotification(t.profileUpdated, t.profileUpdateSuccess, "info");
                        } else {
                          throw new Error(data.error || "Failed to update profile");
                        }
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="w-full py-3 bg-brand-olive text-white rounded-xl font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
                  >
                    {t.saveChanges}
                  </button>
                  <button 
                    onClick={() => {
                      setUser(null);
                      setIsProfileOpen(false);
                      setView('marketplace');
                      addNotification(t.signedOut, t.signedOutMessage, "info");
                    }}
                    className="w-full py-3 bg-white border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> {t.signOut}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedProductForReviews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForReviews(null)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedProductForReviews.image} 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover" 
                  />
                  <div>
                    <h2 className="text-xl font-serif font-bold">{selectedProductForReviews.name}</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={cn(
                              i < Math.floor(selectedProductForReviews.rating) ? "fill-yellow-400 text-yellow-400" : "text-brand-ink/10"
                            )} 
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-brand-ink/40">{selectedProductForReviews.rating} {t.ratingLabel}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedProductForReviews(null)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
 
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Add Review Form */}
                <div className="bg-white p-6 rounded-2xl border border-brand-ink/5 shadow-sm">
                  <h3 className="font-serif font-bold mb-4">{t.writeAReview}</h3>
                  <form onSubmit={handleAddReview} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-brand-ink/40 uppercase tracking-wider">{t.ratingLabel}:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star 
                              size={24} 
                              className={cn(
                                star <= newReview.rating ? "fill-yellow-400 text-yellow-400" : "text-brand-ink/10"
                              )} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      required
                      placeholder={t.shareExperiencePlaceholder}
                      className="w-full px-4 py-3 bg-brand-cream/50 border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 text-sm"
                      rows={3}
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-brand-olive font-medium text-sm hover:underline">
                        <Plus size={16} />
                        Add Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewReview({ ...newReview, imageUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {newReview.imageUrl && (
                        <div className="relative w-12 h-12 rounded overflow-hidden">
                          <img 
                            src={newReview.imageUrl} 
                            alt="Preview" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                          <button 
                            type="button"
                            onClick={() => setNewReview({ ...newReview, imageUrl: '' })}
                            className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-brand-olive text-white rounded-xl font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
                    >
                      {t.postReview}
                    </button>
                  </form>
                </div>
 
                {/* Reviews List */}
                <div className="space-y-6">
                  <h3 className="font-serif font-bold text-lg">{t.customerReviews} ({selectedProductForReviews.reviews.length})</h3>
                  {selectedProductForReviews.reviews.length === 0 ? (
                    <p className="text-center text-brand-ink/40 italic py-8">{t.beTheFirstToReview}</p>
                  ) : (
                    selectedProductForReviews.reviews.map((review) => (
                      <div key={review.id} className="border-b border-brand-ink/5 pb-6 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-sm">{review.userName}</p>
                            <div className="flex items-center gap-0.5 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={10} 
                                  className={cn(
                                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-brand-ink/10"
                                  )} 
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-brand-ink/20 uppercase tracking-widest">{review.date}</span>
                        </div>
                        <p className="text-sm text-brand-ink/70 leading-relaxed">{review.comment}</p>
                        {review.imageUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden max-w-xs">
                            <img 
                              src={review.imageUrl} 
                              alt="Review" 
                              referrerPolicy="no-referrer"
                              className="w-full h-auto object-cover" 
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOrderHistoryOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderHistoryOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[600px]"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold">{t.orderHistory}</h2>
                    <p className="text-xs text-brand-ink/40">{t.pastPurchases}</p>
                  </div>
                </div>
                <button onClick={() => setIsOrderHistoryOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {orders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-ink/40 text-center">
                    <History size={48} className="mb-4 opacity-20" />
                    <p className="font-serif italic">{t.noOrdersFound}</p>
                    <p className="text-sm mt-2">{t.startShopping}</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl border border-brand-ink/5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-wider">{t.orderId}</p>
                          <p className="font-mono font-bold">{order.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-wider">{t.date}</p>
                          <p className="font-medium">{order.date}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-brand-ink/60">{item.quantity}x {item.name}</span>
                            <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-brand-ink/5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          order.status === 'Processing' ? "bg-orange-100 text-orange-600" : 
                          order.status === 'Cancelled' ? "bg-red-100 text-red-600" :
                          "bg-emerald-100 text-emerald-600"
                        )}>
                          {order.status === 'Processing' ? t.processingStatus : 
                           order.status === 'Shipped' ? t.shipped : 
                           order.status === 'Delivered' ? t.delivered : 
                           order.status === 'Cancelled' ? t.cancelled : order.status}
                        </span>
                        <span className="text-lg font-serif font-bold">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Tracking Modal */}
      <AnimatePresence>
        {isOrderTrackingOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderTrackingOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[600px]"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold">{t.trackOrders}</h2>
                    <p className="text-xs text-brand-ink/40">{t.realTimeStatus}</p>
                  </div>
                </div>
                <button onClick={() => setIsOrderTrackingOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-ink/40 text-center">
                    <Truck size={48} className="mb-4 opacity-20" />
                    <p className="font-serif italic">{t.noActiveOrders}</p>
                    <p className="text-sm mt-2">{t.allHarvestsDelivered}</p>
                  </div>
                ) : (
                  orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').map(order => (
                    <div key={order.id} className="bg-white p-8 rounded-2xl border border-brand-ink/5 shadow-sm">
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h4 className="font-serif font-bold text-lg">Order {order.id}</h4>
                          <p className="text-sm text-brand-ink/40">Expected delivery: Today</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1 bg-brand-olive/10 text-brand-olive rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {order.status === 'Processing' ? t.processingStatus : t.shipped}
                          </span>
                          {order.status === 'Processing' && (
                            <button 
                              onClick={() => handleCancelOrder(order.id)}
                              className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                            >
                              {t.cancelOrder}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative mb-12">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-brand-ink/5 -translate-y-1/2" />
                        <div 
                          className="absolute top-1/2 left-0 h-1 bg-brand-olive -translate-y-1/2 transition-all duration-1000" 
                          style={{ width: order.status === 'Processing' ? '33.33%' : '66.66%' }}
                        />
                        
                        <div className="relative flex justify-between">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 bg-brand-olive text-white rounded-full flex items-center justify-center shadow-lg">
                              <ShoppingBasket size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-brand-olive">Confirmed</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              order.status !== 'Processing' ? "bg-brand-olive text-white shadow-lg" : "bg-brand-ink/5 text-brand-ink/20"
                            )}>
                              <Tractor size={14} />
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold uppercase",
                              order.status !== 'Processing' ? "text-brand-olive" : "text-brand-ink/20"
                            )}>Packed</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              order.status === 'Shipped' ? "bg-brand-olive text-white shadow-lg animate-pulse" : "bg-brand-ink/5 text-brand-ink/20"
                            )}>
                              <Truck size={14} />
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold uppercase",
                              order.status === 'Shipped' ? "text-brand-olive" : "text-brand-ink/20"
                            )}>Shipping</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 bg-brand-ink/5 text-brand-ink/20 rounded-full flex items-center justify-center">
                              <MapPin size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-brand-ink/20">Arrived</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-brand-cream/50 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-olive shadow-sm">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-wider">Current Location</p>
                          <p className="text-sm font-medium">Local Distribution Center - 2.4 miles away</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isInboxOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInboxOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[600px]"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center">
                    <Inbox size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold">{t.yourInbox}</h2>
                    <p className="text-xs text-brand-ink/40">{t.simulatedEmailNotifications}</p>
                  </div>
                </div>
                <button onClick={() => setIsInboxOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {emails.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-brand-ink/40">
                    <Mail size={48} className="mb-4 opacity-20" />
                    <p className="font-serif italic">{t.noMessagesYet}</p>
                  </div>
                ) : (
                  emails.map(email => (
                    <motion.div 
                      key={email.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e))}
                      className={cn(
                        "p-6 rounded-2xl border transition-all cursor-pointer",
                        email.read 
                          ? "bg-white/50 border-brand-ink/5" 
                          : "bg-white border-brand-olive/20 shadow-md ring-1 ring-brand-olive/10"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={cn("font-bold", !email.read && "text-brand-olive")}>{email.subject}</h3>
                        <span className="text-[10px] font-bold text-brand-ink/40 uppercase">{email.date}</span>
                      </div>
                      <p className="text-sm text-brand-ink/70 whitespace-pre-wrap leading-relaxed">
                        {email.body}
                      </p>
                      {!email.read && (
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-brand-olive uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 bg-brand-olive rounded-full animate-pulse" />
                          {t.newMessage}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Farmer Details Modal */}
      <AnimatePresence>
        {selectedFarmer && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFarmer(null)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-brand-ink/10 flex justify-between items-center bg-white">
                <h2 className="text-xl font-serif font-bold">Farmer Profile</h2>
                <button onClick={() => setSelectedFarmer(null)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  {selectedFarmer.farmerPhoto ? (
                    <img 
                      src={selectedFarmer.farmerPhoto} 
                      alt={selectedFarmer.farmerName} 
                      referrerPolicy="no-referrer"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" 
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-brand-olive/10 flex items-center justify-center text-brand-olive border-4 border-white shadow-lg">
                      <User size={64} />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-brand-olive text-white p-2 rounded-full shadow-lg">
                    <Tractor size={20} />
                  </div>
                </div>

                <h3 className="text-2xl font-serif font-bold mb-2">{selectedFarmer.farmerName}</h3>
                <p className="text-brand-ink/60 italic mb-6">"Dedicated to providing fresh, organic harvest directly from our fields to your home."</p>

                <div className="w-full space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-brand-ink/5">
                    <div className="w-10 h-10 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center">
                      <MapPin size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">Farm Location</p>
                      <p className="font-medium">{selectedFarmer.farmLocation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-brand-ink/5">
                    <div className="w-10 h-10 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center">
                      <Phone size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest">Contact Number</p>
                      <p className="font-medium">{selectedFarmer.farmerMobile}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mb-4">
                  <button 
                    onClick={() => {
                      setSearchQuery(selectedFarmer.farmerName);
                      setSelectedFarmer(null);
                    }}
                    className="flex-1 py-3 bg-brand-olive text-white rounded-xl font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
                  >
                    View All Products
                  </button>
                  <a 
                    href={`tel:${selectedFarmer.farmerMobile}`}
                    className="flex-1 py-3 bg-white text-brand-olive border border-brand-olive/20 rounded-xl font-bold hover:bg-brand-olive/5 transition-all text-center"
                  >
                    Call Farmer
                  </a>
                </div>

                <button 
                  onClick={() => {
                    setUserLocation({ 
                      lat: selectedFarmer.coordinates.lat, 
                      lng: selectedFarmer.coordinates.lng, 
                      address: selectedFarmer.farmLocation 
                    });
                    setSearchRadius(25); // Set a default radius
                    setSelectedFarmer(null);
                    setViewMode('map');
                    addNotification("Location Filter Applied", `Showing farmers within 25km of ${selectedFarmer.farmerName}'s farm`, "info");
                  }}
                  className="w-full py-3 bg-brand-cream border-2 border-dashed border-brand-olive/30 text-brand-olive rounded-xl font-bold hover:bg-brand-olive/5 transition-all flex items-center justify-center gap-2"
                >
                  <MapPin size={18} /> Find Farmers Near This Farm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportOpen(false)}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-cream rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold">{t.support || 'Help & Support'}</h2>
                  <p className="text-sm text-brand-ink/40">{lang === 'en' ? 'Get in touch with our team' : 'எங்கள் குழுவுடன் தொடர்பு கொள்ளுங்கள்'}</p>
                </div>
                <button onClick={() => setIsSupportOpen(false)} className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-brand-ink/5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Phone size={24} />
                    </div>
                    <div>
                      <p className="font-bold">{lang === 'en' ? 'Call Support' : 'ஆதரவை அழைக்கவும்'}</p>
                      <p className="text-sm text-brand-ink/40">1-800-FARM-HELP</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-brand-ink/5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-olive/10 text-brand-olive rounded-full flex items-center justify-center">
                      <Mail size={24} />
                    </div>
                    <div>
                      <p className="font-bold">{lang === 'en' ? 'Email Us' : 'எங்களுக்கு மின்னஞ்சல் அனுப்புங்கள்'}</p>
                      <p className="text-sm text-brand-ink/40">support@farm2home.com</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-brand-ink/5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <HelpCircle size={24} />
                    </div>
                    <div>
                      <p className="font-bold">{lang === 'en' ? 'Frequently Asked Questions' : 'அடிக்கடி கேட்கப்படும் கேள்விகள்'}</p>
                      <p className="text-sm text-brand-ink/40">{lang === 'en' ? 'Browse our help guides' : 'எங்கள் உதவி வழிகாட்டிகளை உலாவவும்'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-brand-ink text-white rounded-[2rem] text-center">
                <p className="font-serif italic text-lg mb-2">"{lang === 'en' ? 'We are here to help you grow!' : 'உங்களை வளர உதவ நாங்கள் இங்கே இருக்கிறோம்!'}"</p>
                <p className="text-xs text-white/40 uppercase tracking-widest">— Farm2Home Team</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthOpen && (
          <Auth 
            onClose={() => setIsAuthOpen(false)} 
            lang={lang}
            onSuccess={(userData) => {
              setUser(userData);
              setIsAuthOpen(false);
              if (userData.role === 'farmer') {
                setView('dashboard');
              }
              addNotification("Welcome to Farm2Home!", `Signed in as ${userData.name}`, "info");
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
