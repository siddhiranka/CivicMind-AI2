import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        navigate('/dashboard');
      } else {
        setError(data.error || t('toast.error', 'Registration failed'));
      }
    } catch (err) {
      setError(t('toast.connectionError', 'Connection error. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[90vh] bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <UserPlus size={32} />
          </div>
          <h2 className="text-3xl font-bold">{t('auth.createAccount', 'Create Account')}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t('auth.signupSubtitle', 'Join CivicMind to shape your community')}</p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
            <ShieldCheck size={14} />
            <span>{t('auth.citizenRegistrationNotice', 'Citizen Registration')}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('auth.fullName', 'Full Name')}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder', 'Enter your full name')}
              className="w-full bg-background/50 border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('auth.emailLabel', 'Email Address')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder', 'Enter your email')}
              className="w-full bg-background/50 border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('auth.passwordLabel', 'Password')}</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                className="w-full bg-background/50 border border-border rounded-xl p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('auth.confirmPasswordLabel', 'Confirm Password')}</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter your password')}
              className="w-full bg-background/50 border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold mt-4 hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading', 'Loading...') : t('auth.signUp', 'Sign Up')}
          </button>
        </form>
        
        <p className="text-center mt-6 text-muted-foreground text-sm">
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <a href="/login" className="text-primary hover:underline font-semibold">{t('auth.signIn2', 'Sign in')}</a>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
