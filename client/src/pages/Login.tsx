import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const loginEmail = (customEmail || email).trim();
    const loginPassword = (customPassword || password).trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        navigate('/dashboard');
      } else {
        setError(data.error || t('toast.error', 'Login failed'));
      }
    } catch (err) {
      setError(t('toast.connectionError', 'Connection error. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <div className="min-h-[90vh] bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <LogIn size={32} />
            </div>
            <h2 className="text-3xl font-bold">{t('auth.welcomeBack', 'Welcome Back')}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t('auth.loginSubtitle', 'Log in to your CivicMind account')}</p>
          </div>

          {error && (
            <div className="p-3 mb-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
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

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold mt-4 hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? t('common.loading', 'Loading...') : t('auth.signIn', 'Sign In')}
            </button>
          </form>
          
          <p className="text-center mt-6 text-muted-foreground text-sm">
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <a href="/signup" className="text-primary hover:underline font-semibold">{t('auth.signUp', 'Sign up')}</a>
          </p>
        </motion.div>

        {/* Hackathon Demo Accounts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/40 backdrop-blur-md border border-primary/20 rounded-3xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-primary" size={20} />
            <h3 className="font-bold text-sm tracking-wide text-foreground">
              {t('auth.demoAccountsTitle', 'Hackathon Quick Demo Logins')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Citizen Demo Card */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
                  <UserCheck size={16} />
                  <span>{t('auth.citizenDemoTitle', 'Citizen Demo')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">citizen@demo.com</p>
                <p className="text-xs text-muted-foreground font-mono">Citizen@123</p>
              </div>

              <button
                type="button"
                onClick={() => fillDemoAccount('citizen@demo.com', 'Citizen@123')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md"
              >
                {t('auth.loginAsCitizen', 'Login as Citizen')}
              </button>
            </div>

            {/* Officer Demo Card */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-blue-400 text-sm">
                  <ShieldAlert size={16} />
                  <span>{t('auth.officerDemoTitle', 'Officer Demo')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">officer@demo.com</p>
                <p className="text-xs text-muted-foreground font-mono">Officer@123</p>
              </div>

              <button
                type="button"
                onClick={() => fillDemoAccount('officer@demo.com', 'Officer@123')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md"
              >
                {t('auth.loginAsOfficer', 'Login as Officer')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
