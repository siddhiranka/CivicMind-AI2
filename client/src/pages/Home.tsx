import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Camera, BrainCircuit, ListChecks, HardHat, Sprout, ArrowRight, ShieldCheck, Zap, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Home = ({ onOpenChat }: { onOpenChat: () => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleCTA = (path: string) => {
    navigate(user ? path : '/signup');
  };

  const workflowSteps = [
    { title: t('home.step1', 'Report Issue'), icon: <Camera size={22} className="text-primary" /> },
    { title: t('home.step2', 'AI Analysis'), icon: <BrainCircuit size={22} className="text-blue-400" /> },
    { title: t('home.step3', 'AI Prioritizes'), icon: <ListChecks size={22} className="text-indigo-400" /> },
    { title: t('home.step4', 'Authority Reviews'), icon: <HardHat size={22} className="text-amber-500" /> },
    { title: t('home.step5', 'Issue Resolved'), icon: <Sprout size={22} className="text-emerald-500" /> },
  ];

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col">
      
      {/* 1. Hero Section */}
      <section className="w-full flex flex-col items-center justify-center px-4 md:px-8 pt-6 md:pt-12 pb-10 relative overflow-hidden bg-background">
        
        {/* Premium Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[400px] md:h-[500px] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none" />

        <div className="flex flex-col items-center justify-center w-full max-w-[1200px] mx-auto z-10 relative text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-bold tracking-wide mb-6"
          >
            <Zap size={16} />
            <span>{t('home.badge', 'AI-Driven Civic Intelligence Engine')}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 max-w-[1000px] mx-auto leading-tight text-balance"
          >
            {t('home.title', 'Empowering Citizens. Transforming Cities.')}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-[680px] mx-auto font-normal leading-relaxed px-2"
          >
            {t('home.subtitle', 'The AI-powered Decision Intelligence Platform for proactive civic management and rapid issue resolution.')}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mx-auto justify-center px-4"
          >
            <button 
              onClick={() => handleCTA('/report')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
            >
              {t('home.reportCTA', 'Report Issue')} <ChevronRight size={20} />
            </button>
            {(!user || user.role === 'citizen') ? (
              <button 
                onClick={() => handleCTA('/issue')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground text-base font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all active:scale-95 border border-border"
              >
                {t('home.trackCTA', 'Track Complaint')}
              </button>
            ) : (
              <button 
                onClick={() => handleCTA('/dashboard')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground text-base font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all active:scale-95 border border-border"
              >
                {t('home.dashboardCTA', 'Officer Dashboard')}
              </button>
            )}
          </motion.div>

          {/* Workflow Visualization - 5 Uniform Cards (First View / Above Fold) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-[1050px] mt-8 mx-auto"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 p-3 sm:p-4 rounded-3xl bg-card/60 border border-white/10 backdrop-blur-xl shadow-2xl">
              {workflowSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-secondary/50 border border-border hover:bg-secondary/80 transition-all w-full min-h-[85px] sm:min-h-[95px]">
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center mb-1.5 shadow-sm shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-foreground leading-tight">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Metrics Bar for Mobile & Desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl mt-6 px-2"
          >
            <div className="p-3 md:p-4 bg-card/60 border border-border rounded-2xl text-center">
              <span className="text-xl md:text-3xl font-extrabold text-primary block">98%</span>
              <span className="text-xs text-muted-foreground font-medium">{t('home.accuracy', 'Vision Accuracy')}</span>
            </div>
            <div className="p-3 md:p-4 bg-card/60 border border-border rounded-2xl text-center">
              <span className="text-xl md:text-3xl font-extrabold text-blue-400 block">24h</span>
              <span className="text-xs text-muted-foreground font-medium">{t('home.avgRes', 'Avg Resolution')}</span>
            </div>
            <div className="p-3 md:p-4 bg-card/60 border border-border rounded-2xl text-center">
              <span className="text-xl md:text-3xl font-extrabold text-emerald-400 block">10k+</span>
              <span className="text-xs text-muted-foreground font-medium">{t('home.citizensServed', 'Citizens Served')}</span>
            </div>
            <div className="p-3 md:p-4 bg-card/60 border border-border rounded-2xl text-center">
              <span className="text-xl md:text-3xl font-extrabold text-amber-400 block">{t('home.zero', 'Zero')}</span>
              <span className="text-xs text-muted-foreground font-medium">{t('home.zeroFriction', 'Manual Friction')}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. The 5-Step Flow Section */}
      <section className="w-full flex flex-col items-center justify-center px-4 md:px-8 py-16 bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('home.flowTitle', 'How AI Accelerates Resolution')}</h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">{t('home.flowSubtitle', "From a citizen's camera to a resolved community issue in record time.")}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-stretch relative w-full">
            <FlowStep 
              icon={<Camera size={28} />}
              title={t('home.flow1Title', '1. Report Issue')}
              desc={t('home.flow1Desc', 'A resident spots an issue and snaps a quick photo.')}
              delay={0.1}
            />
            <FlowStep 
              icon={<BrainCircuit size={28} />}
              title={t('home.flow2Title', '2. AI Analysis')}
              desc={t('home.flow2Desc', 'AI assesses the scene, detects objects, and verifies evidence.')}
              delay={0.2}
            />
            <FlowStep 
              icon={<ListChecks size={28} />}
              title={t('home.flow3Title', '3. AI Prioritizes')}
              desc={t('home.flow3Desc', 'The issue is scored by severity and routed to the correct department.')}
              delay={0.3}
            />
            <FlowStep 
              icon={<HardHat size={28} />}
              title={t('home.flow4Title', '4. Authority Reviews')}
              desc={t('home.flow4Desc', 'Officers review the AI brief and dispatch a maintenance team.')}
              delay={0.4}
            />
            <FlowStep 
              icon={<Sprout size={28} />}
              title={t('home.flow5Title', '5. Issue Resolved')}
              desc={t('home.flow5Desc', 'The issue is resolved, and citizens are kept in the loop transparently.')}
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* 3. Real-World Scenario (AI Decision Intelligence) */}
      <section className="w-full flex flex-col items-center justify-center px-4 md:px-8 py-16 relative overflow-hidden">
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2" />
        
        <div className="max-w-6xl w-full mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-card/80 backdrop-blur-3xl border border-border rounded-3xl p-6 md:p-10 shadow-2xl flex flex-col lg:flex-row items-center gap-10 lg:gap-16 relative z-10"
          >
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <BrainCircuit size={16} />
                <span className="text-xs font-bold tracking-wider uppercase">{t('home.impactTag', 'Decision Intelligence')}</span>
              </div>
              <h3 className="text-3xl md:text-5xl font-bold leading-tight">{t('home.impactTitle', 'Real-world impact.')}</h3>
              <p className="text-base md:text-xl text-muted-foreground leading-relaxed">
                {t('home.impactDesc', 'A deep pothole reported on a busy intersection today gets resolved tomorrow morning, because CivicMind AI instantly flagged it as a Critical Hazard and routed it directly to the Road Safety division before human dispatchers even arrived at the office.')}
              </p>
              <button 
                onClick={() => onOpenChat()}
                className="text-primary text-base md:text-lg font-bold flex items-center gap-2 hover:gap-4 transition-all group"
              >
                {t('home.impactCTA', 'Ask AI Assistant about risk prediction')} <ArrowRight size={20} className="group-hover:text-blue-400 transition-colors" />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-background/80 rounded-3xl border border-border p-6 md:p-8 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-destructive" />
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <span className="font-bold text-base md:text-lg text-foreground">{t('home.assessmentTitle', 'AI Evidence Assessment')}</span>
                <span className="px-3 py-1 bg-destructive/10 text-destructive text-xs md:text-sm font-black tracking-widest rounded uppercase">{t('home.critical', 'Critical')}</span>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>{t('home.confidence', 'Analysis Confidence')}</span>
                    <span className="text-foreground">95%</span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: '95%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                      className="h-full bg-primary" 
                    />
                  </div>
                </div>
                <div className="p-4 md:p-5 bg-secondary/50 rounded-2xl border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('home.reasoningTitle', 'Automated Reasoning')}</h4>
                  <p className="text-xs md:text-sm font-medium leading-relaxed">
                    {t('home.reasoningText', 'Image evidence confirms severe road displacement (depth ~15cm) on a high-density primary artery. High risk of immediate vehicle damage and public traffic accidents.')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. Footer Section */}
      <footer className="w-full bg-card border-t border-border flex flex-col justify-between p-6 md:p-12 mt-auto">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-8">
          <div>
            <h3 className="text-2xl font-extrabold text-foreground mb-2">CivicMind AI</h3>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              {t('home.footerDesc', 'Transforming city maintenance through computer vision, automated evidence verification, and predictive civic intelligence.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 md:justify-end text-sm font-semibold text-muted-foreground">
            <a href="/report" className="hover:text-foreground transition-colors">{t('nav.report', 'Report Issue')}</a>
            <a href="/issue" className="hover:text-foreground transition-colors">{t('nav.track', 'Track Complaint')}</a>
            <a href="/dashboard" className="hover:text-foreground transition-colors">{t('nav.dashboard', 'Dashboard')}</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground/60 font-medium border-t border-border/40 pt-4 gap-2">
          <span>&copy; {new Date().getFullYear()} CivicMind AI</span>
          <span>{t('home.poweredBy', 'Powered by Google Gemini')}</span>
        </div>
      </footer>
    </div>
  );
};

const FlowStep = ({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex flex-col items-center text-center p-5 md:p-6 bg-card/60 backdrop-blur-md border border-border rounded-3xl shadow-lg w-full h-full min-h-[220px] md:min-h-[250px] justify-between"
  >
    <div className="w-14 h-14 bg-card border border-border rounded-2xl flex items-center justify-center text-primary shadow-md shrink-0">
      {icon}
    </div>
    <div className="my-auto">
      <h4 className="text-base md:text-lg font-bold mb-1.5 text-foreground">{title}</h4>
      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);

export default Home;
