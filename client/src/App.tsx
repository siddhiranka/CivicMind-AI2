import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageTransition from './components/PageTransition';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Report from './pages/Report';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import IssueDetails from './pages/IssueDetails';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';
import ChatBot from './components/ChatBot';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LogOut, User, Globe, ShieldCheck, CheckCircle2, Menu, X, Home as HomeIcon, FileText, LayoutDashboard, UserCheck, Bot } from 'lucide-react';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';

const Header = ({ onOpenChat }: { onOpenChat: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('civicmind_lang', lng);
  };

  const isOfficer = user?.role === 'officer';

  const closeMenuAndNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <header className="px-4 md:px-8 py-3.5 border-b border-border/40 flex items-center justify-between backdrop-blur-md bg-background/80 fixed top-0 w-full z-50">
        <h1 onClick={() => navigate('/')} className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent flex items-center gap-2 cursor-pointer">
          CivicMind AI
        </h1>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 font-medium text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
            <Globe size={16} />
            <select 
              className="bg-transparent border-none text-sm outline-none cursor-pointer focus:ring-0"
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              <option value="en" className="bg-card">English</option>
              <option value="hi" className="bg-card">हिन्दी</option>
              <option value="mr" className="bg-card">मराठी</option>
            </select>
          </div>

          <a href="/" className="hover:text-primary transition-colors">{t('nav.home', 'Home')}</a>
          
          {user && (
            <>
              {!isOfficer && (
                <a href="/report" className="hover:text-primary transition-colors">{t('nav.report', 'Report Issue')}</a>
              )}
              <a href="/issue" className="hover:text-primary transition-colors">{t('nav.track', 'Track Complaint')}</a>
              <a href="/dashboard" className="hover:text-primary transition-colors">{t('nav.dashboard', 'Dashboard')}</a>
            </>
          )}
          
          {user ? (
            <div className="flex items-center gap-3 ml-2 border-l border-border pl-4">
              <button 
                onClick={() => navigate('/profile')} 
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                title="View Profile"
              >
                {isOfficer ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                    <ShieldCheck size={14} /> {user.name.split(' ')[0]}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 size={14} /> {user.name.split(' ')[0]}
                  </span>
                )}
              </button>

              <button onClick={logout} className="text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors text-xs" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-2 border-l border-border pl-4">
              <button onClick={() => navigate('/login')} className="hover:text-primary transition-colors">{t('nav.login', 'Login')}</button>
              <button onClick={() => navigate('/signup')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-bold shadow-md">{t('nav.signup', 'Sign Up')}</button>
            </div>
          )}
        </nav>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex items-center gap-1.5 bg-secondary/80 border border-border px-2.5 py-1.5 rounded-full text-xs font-bold text-muted-foreground shadow-sm">
            <Globe size={14} className="text-primary" />
            <select 
              className="bg-transparent border-none text-xs outline-none cursor-pointer text-foreground font-bold"
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              <option value="en" className="bg-card text-foreground">EN</option>
              <option value="hi" className="bg-card text-foreground">HI</option>
              <option value="mr" className="bg-card text-foreground">MR</option>
            </select>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 text-foreground bg-secondary/80 hover:bg-secondary rounded-2xl border border-border active:scale-95 transition-all shadow-sm"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} className="text-primary" /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 bg-background/98 backdrop-blur-2xl border-b border-border z-40 md:hidden p-5 shadow-2xl flex flex-col gap-2 rounded-b-3xl"
          >
            {user && (
              <div className="p-3 mb-2 bg-secondary/40 border border-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize font-medium">{user.role}</p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${isOfficer ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {user.role}
                </span>
              </div>
            )}

            <button onClick={() => closeMenuAndNavigate('/')} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-secondary/60 text-left font-bold text-sm text-foreground active:scale-98 transition-all">
              <HomeIcon size={18} className="text-primary" /> {t('nav.home', 'Home')}
            </button>

            {user ? (
              <>
                {!isOfficer && (
                  <button onClick={() => closeMenuAndNavigate('/report')} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-secondary/60 text-left font-bold text-sm text-foreground active:scale-98 transition-all">
                    <FileText size={18} className="text-primary" /> {t('nav.report', 'Report Issue')}
                  </button>
                )}
                <button onClick={() => closeMenuAndNavigate('/issue')} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-secondary/60 text-left font-bold text-sm text-foreground active:scale-98 transition-all">
                  <FileText size={18} className="text-indigo-400" /> {t('nav.track', 'Track Complaint')}
                </button>
                <button onClick={() => closeMenuAndNavigate('/dashboard')} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-secondary/60 text-left font-bold text-sm text-foreground active:scale-98 transition-all">
                  <LayoutDashboard size={18} className="text-blue-400" /> {t('nav.dashboard', 'Dashboard')}
                </button>
                <button onClick={() => closeMenuAndNavigate('/profile')} className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-secondary/60 text-left font-bold text-sm text-foreground active:scale-98 transition-all">
                  <UserCheck size={18} className="text-emerald-400" /> {t('profile.accountInfo', 'Profile')}
                </button>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="flex items-center gap-3.5 p-3 rounded-2xl text-destructive hover:bg-destructive/10 font-bold text-sm text-left active:scale-98 transition-all border border-destructive/20 mt-1">
                  <LogOut size={18} /> {t('nav.logout', 'Logout')}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => closeMenuAndNavigate('/login')} className="w-full py-3.5 bg-secondary text-foreground rounded-2xl font-bold border border-border text-xs active:scale-95 transition-all">
                  {t('nav.login', 'Login')}
                </button>
                <button onClick={() => closeMenuAndNavigate('/signup')} className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition-all">
                  {t('nav.signup', 'Sign Up')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const AppContent = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans dark overflow-x-hidden">
      <ScrollToTop />
      <Header onOpenChat={() => setIsChatOpen(true)} />
      
      <main className="flex-1 flex flex-col pt-16 w-full max-w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home onOpenChat={() => setIsChatOpen(true)} /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
            <Route path="/unauthorized" element={<PageTransition><Unauthorized /></PageTransition>} />
            
            {/* Protected Routes for logged in users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/report" element={<PageTransition><Report /></PageTransition>} />
              <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/issue" element={<PageTransition><IssueDetails /></PageTransition>} />
              <Route path="/issue/:id" element={<PageTransition><IssueDetails /></PageTransition>} />
              <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
            </Route>

            {/* Officer-Only Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['officer']} />}>
              <Route path="/officer" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/review" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/analytics" element={<PageTransition><Dashboard /></PageTransition>} />
            </Route>
          </Routes>
        </AnimatePresence>
      </main>

      {/* Floating AI Chat Button – hidden on /login and /signup */}
      {!['/login', '/signup'].includes(location.pathname) && (
        <div className="fixed bottom-6 right-5 z-50 flex flex-col items-center gap-2">
          {/* Tooltip */}
          <AnimatePresence>
            {!isChatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                transition={{ delay: 1.5, duration: 0.3 }}
                className="bg-background/90 backdrop-blur-xl border border-white/10 text-foreground text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap pointer-events-none"
              >
                AI Assistant
              </motion.div>
            )}
          </AnimatePresence>

          {/* Button */}
          <motion.button
            onClick={() => setIsChatOpen(prev => !prev)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-primary/40 transition-all"
            aria-label="Open AI Assistant"
          >
            {/* Pulse rings */}
            {!isChatOpen && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: '2.5s' }} />
                <span className="absolute inset-1 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }} />
              </>
            )}
            <AnimatePresence mode="wait">
              {isChatOpen ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X size={22} />
                </motion.div>
              ) : (
                <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Bot size={22} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}

      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
