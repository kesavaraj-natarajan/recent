import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, MapPin, Tractor, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, Language } from '../lib/translations';

interface AuthProps {
  onClose: () => void;
  lang: Language;
  onSuccess: (user: { 
    id: string;
    name: string; 
    email: string; 
    role: 'consumer' | 'farmer';
    phone?: string;
    address?: string;
    farmName?: string;
    location?: string;
  }) => void;
}

export default function Auth({ onClose, onSuccess, lang }: AuthProps) {
  const t = translations[lang];
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'consumer' | 'farmer'>('consumer');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('farm2homeRememberMe') === 'true';
  });
  const [formData, setFormData] = useState(() => {
    const savedEmail = localStorage.getItem('farm2homeEmail') || '';
    const savedPassword = localStorage.getItem('farm2homePassword') || '';
    const savedRole = localStorage.getItem('farm2homeRole') as 'consumer' | 'farmer' || 'consumer';
    
    if (localStorage.getItem('farm2homeRememberMe') === 'true') {
      setRole(savedRole);
    }

    return {
      email: savedEmail,
      password: savedPassword,
      name: '',
      farmName: '',
      location: '',
      phone: '',
      address: '',
    };
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isOtpVerification, setIsOtpVerification] = useState(false);
  const [verificationType, setVerificationType] = useState<'register' | 'reset'>('register');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleAuthSuccess = async (userData: any) => {
    let finalUser = { ...userData };
    
    // Geocode farmer location if coordinates are missing
    if (finalUser.role === 'farmer' && finalUser.location && !finalUser.coordinates) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(finalUser.location)}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          finalUser.coordinates = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
        }
      } catch (e) {
        console.error("Geocoding failed during auth", e);
      }
    }
    
    onSuccess(finalUser);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setError('Please enter a valid 4-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (verificationType === 'register') {
        const response = await fetch('/api/auth/verify-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, otp: otpString }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        handleAuthSuccess(data.user);
      } else {
        if (!newPassword) {
          throw new Error('Please enter a new password');
        }
        const response = await fetch('/api/auth/reset-password-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, otp: otpString, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        setIsForgotPassword(false);
        setResetSent(false);
        setIsOtpVerification(false);
        setIsLogin(true);
        setFormData({ ...formData, password: '' });
        alert('Password reset successfully. Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResetSent(true);
      setVerificationType('reset');
      setIsOtpVerification(true);
      setOtp(['', '', '', '']);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role,
          name: formData.name || (role === 'farmer' ? formData.farmName : ''),
          phone: formData.phone || '+91 98765 43210',
          address: formData.address || 'Flat 402, Green Meadows, Pune, MH',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.requireOtp) {
        setVerificationType('register');
        setIsOtpVerification(true);
        setOtp(['', '', '', '']);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('farm2homeEmail', formData.email);
        localStorage.setItem('farm2homePassword', formData.password);
        localStorage.setItem('farm2homeRole', role);
        localStorage.setItem('farm2homeRememberMe', 'true');
      } else {
        localStorage.removeItem('farm2homeEmail');
        localStorage.removeItem('farm2homePassword');
        localStorage.removeItem('farm2homeRole');
        localStorage.setItem('farm2homeRememberMe', 'false');
      }

      handleAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-brand-cream rounded-3xl shadow-2xl overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-brand-ink/5 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold mb-2">
              {isOtpVerification ? "Verify Email" : isForgotPassword ? "Reset Password" : (isLogin ? t.welcomeBack : t.joinFarm2Home)}
            </h2>
            <p className="text-brand-ink/60 text-sm">
              {isOtpVerification ? `Enter the 4-digit code sent to ${formData.email}` : isForgotPassword ? "Enter your email to receive a verification code" : (isLogin ? t.signInAccount : t.createAccountShop)}
            </p>
          </div>

          {isOtpVerification ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-bold bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                  />
                ))}
              </div>

              {verificationType === 'reset' && (
                <div className="relative mt-6">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="New Password"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink/40 hover:text-brand-ink/60 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading || otp.join('').length !== 4 || (verificationType === 'reset' && !newPassword)}
                className="w-full py-4 bg-brand-olive text-white rounded-xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="animate-spin" size={20} />}
                Verify & {verificationType === 'reset' ? 'Reset Password' : 'Create Account'}
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setIsOtpVerification(false);
                  if (verificationType === 'reset') {
                    setIsForgotPassword(false);
                    setResetSent(false);
                  }
                }}
                className="w-full text-brand-ink/40 text-sm font-medium hover:text-brand-ink/60"
              >
                Cancel
              </button>
            </form>
          ) : isForgotPassword ? (
            <div className="space-y-6">
              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Mail size={32} />
                  </div>
                  <p className="text-brand-ink/80">Verification code sent to <strong>{formData.email}</strong>. Please check your inbox.</p>
                  <button 
                    onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                    className="text-brand-olive font-bold hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                    <input 
                      type="email" 
                      placeholder={t.emailAddress}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-brand-olive text-white rounded-xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading && <Loader2 className="animate-spin" size={20} />}
                    Send Verification Code
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-brand-ink/40 text-sm font-medium hover:text-brand-ink/60"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Role Toggle */}
          <div className="space-y-2 mb-6">
            <label className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-widest text-center block">
              {isLogin ? t.iAmA : t.registerAsA}
            </label>
            <div className="flex p-1 bg-brand-ink/5 rounded-xl">
              <button 
                type="button"
                onClick={() => setRole('consumer')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  role === 'consumer' ? "bg-white shadow-sm text-brand-olive" : "text-brand-ink/40 hover:text-brand-ink/60"
                )}
              >
                <User size={16} /> {t.consumer}
              </button>
              <button 
                type="button"
                onClick={() => setRole('farmer')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  role === 'farmer' ? "bg-white shadow-sm text-brand-olive" : "text-brand-ink/40 hover:text-brand-ink/60"
                )}
              >
                <Tractor size={16} /> {t.farmer}
              </button>
            </div>
            {isLogin && (
              <p className="text-[10px] text-center text-brand-ink/30 italic">
                {t.loginDetectRole}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {!isLogin && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                    <input 
                      type="text" 
                      placeholder={t.fullName}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                )}

                {role === 'farmer' && !isLogin && (
                  <>
                    <div className="relative">
                      <Tractor className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                      <input 
                        type="text" 
                        placeholder={t.farmName}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                        value={formData.farmName}
                        onChange={e => setFormData({...formData, farmName: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                      <input 
                        type="text" 
                        placeholder={t.farmLocation}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                  <input 
                    type="email" 
                    placeholder={t.emailAddress}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={t.password}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white border border-brand-ink/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink/40 hover:text-brand-ink/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-brand-ink/10 text-brand-olive focus:ring-brand-olive/20"
                      />
                      <label htmlFor="rememberMe" className="text-xs text-brand-ink/60 cursor-pointer select-none">
                        {t.rememberMe || "Remember Me"}
                      </label>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-brand-olive font-bold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-brand-olive text-white rounded-xl font-bold text-lg hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20 mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={20} />}
              {isLogin ? t.signIn : t.createAccount}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-brand-ink/60">
              {isLogin ? t.dontHaveAccount : t.alreadyHaveAccount}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-brand-olive font-bold hover:underline underline-offset-4"
              >
                {isLogin ? t.registerNow : t.signIn}
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  </motion.div>
</div>
  );
}
