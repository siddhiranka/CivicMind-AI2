import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-[85vh] bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-destructive/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card/70 backdrop-blur-xl border border-destructive/30 rounded-3xl p-8 max-w-md text-center shadow-2xl relative z-10"
      >
        <div className="w-20 h-20 bg-destructive/20 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-6 border border-destructive/30">
          <ShieldAlert size={44} />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
          403 Access Denied
        </span>

        <h1 className="text-2xl font-bold mt-4 mb-2 text-foreground">
          {t('unauthorized.title', 'Unauthorized Access')}
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          {t('unauthorized.message', 'This section is restricted to verified government officers. Your account does not have permission to view internal administration tools.')}
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md"
          >
            <Home size={18} />
            {t('unauthorized.returnDashboard', 'Return to Dashboard')}
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-secondary/80 text-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-secondary transition-all border border-border"
          >
            <ArrowLeft size={18} />
            {t('common.back', 'Go Back')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Unauthorized;
