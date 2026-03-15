import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Mail, Lock, AlertCircle, ArrowRight, CheckCircle, X } from 'lucide-react';
import { motion } from 'motion/react';

import { UA_UNIVERSITY_ID } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  const validateEduEmail = (email: string) => {
    const lowerEmail = email.toLowerCase();
    return lowerEmail.endsWith('ua.edu') || lowerEmail.endsWith('crimson.ua.edu');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEduEmail(email)) {
      setError('Please use your official University of Alabama email (@ua.edu or @crimson.ua.edu)');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              university_id: UA_UNIVERSITY_ID,
              university_name: 'University of Alabama',
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // If Supabase is configured to auto-confirm or if it returns a session immediately
        if (signUpData.session) {
          navigate('/');
        } else {
          // Show success modal and switch to login view
          setShowSuccessModal(true);
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        if (data.session) {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl"
      >
        <div className="text-center mb-8">
          <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-stone-100">
            <img 
              src="https://image2url.com/r2/default/images/1773109092662-96a62cec-da16-4e55-8b35-10fc33a12886.png" 
              alt="BamaMarkets Logo" 
              className="w-14 h-14 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="text-stone-500 mt-2">
            {isSignUp 
              ? 'Join your campus marketplace today.' 
              : 'Sign in to start buying and selling.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700 ml-1">University Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input 
                type="email"
                required
                placeholder="yourname@email.com"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 focus:border-transparent outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input 
                type="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-crimson-400 focus:border-transparent outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-crimson-600 text-white rounded-xl font-bold hover:bg-crimson-700 transition-all shadow-lg shadow-crimson-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-stone-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-crimson-600 font-bold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative"
          >
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-stone-400" />
            </button>

            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>

            <h3 className="text-2xl font-bold text-stone-900 mb-2">Check your email</h3>
            <p className="text-stone-600 mb-8">
              We've sent a confirmation link to <span className="font-semibold text-stone-900">{email}</span>. 
              Please verify your email to activate your account.
            </p>

            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all"
            >
              Got it, thanks!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
