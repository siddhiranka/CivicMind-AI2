import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Camera, BrainCircuit, ListChecks, HardHat, Sprout, ArrowRight, Zap, ShieldCheck, BarChart3, Sparkles } from 'lucide-react';
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
    <div className="w-full bg-background text-foreground flex flex-col scroll-smooth">
      
      {/* 1. HERO SECTION */}
      <section className="w-full py-12 md:py-20 px-4 sm:px-6 md:px-8 relative overflow-hidden bg-background flex flex-col items-center justify-center">
        
        {/* Hero Background Effects */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[350px] md:h-[450px] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_75%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="flex flex-col items-center justify-center w-full max-w-[1200px] mx-auto z-10 relative text-center space-y-5 md:space-y-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-bold tracking-wide shadow-sm"
          >
            {user ? (
              <>
                <Sparkles size={16} className="text-amber-400" />
                <span>Welcome back, {user.name}!</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span>{t('home.badge', 'AI-Driven Civic Intelligence Engine')}</span>
              </>
            )}
          </motion.div>

          {/* Heading - Empowering Citizens. Transforming Cities. (2 Lines) */}
          <motion.h1 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-[950px] mx-auto leading-[1.15] text-balance"
          >
            {t('home.title', 'Empowering Citizens. Transforming Cities.')}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-[680px] mx-auto font-normal leading-relaxed px-2"
          >
            {t('home.subtitle', 'The AI-powered Decision Intelligence Platform for proactive civic management and rapid issue resolution.')}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto mx-auto justify-center px-4 pt-1"
          >
            <motion.button 
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleCTA('/report')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
            >
              {t('home.reportCTA', 'Report Issue')} <ChevronRight size={18} />
            </motion.button>

            {(!user || user.role === 'citizen') ? (
              <motion.button 
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleCTA('/issue')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-secondary text-secondary-foreground text-sm sm:text-base font-bold flex items-center justify-center gap-2 border border-border hover:bg-secondary/80 transition-all"
              >
                {t('home.trackCTA', 'Track Complaint')}
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleCTA('/dashboard')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-secondary text-secondary-foreground text-sm sm:text-base font-bold flex items-center justify-center gap-2 border border-border hover:bg-secondary/80 transition-all"
              >
                {t('home.dashboardCTA', 'Officer Dashboard')}
              </motion.button>
            )}
          </motion.div>

          {/* Workflow Visualization Cards */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full max-w-[1050px] pt-2 mx-auto"
          >
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 -mx-3 px-3 md:grid md:grid-cols-5 md:overflow-visible md:snap-none md:mx-0 md:px-0 md:pb-0 p-3 rounded-3xl bg-card/60 border border-white/10 backdrop-blur-xl shadow-xl">
              {workflowSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center justify-center text-center p-2.5 rounded-2xl bg-secondary/50 border border-border hover:bg-secondary/80 transition-all min-w-[130px] md:min-w-0 w-full min-h-[80px] snap-center shrink-0 md:shrink">
                  <div className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center mb-1 shadow-sm shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-foreground leading-tight">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full max-w-4xl px-2 pt-1"
          >
            <div className="p-3 bg-card/60 border border-border rounded-2xl text-center backdrop-blur-md">
              <span className="text-lg sm:text-2xl font-extrabold text-primary block">98%</span>
              <span className="text-[11px] text-muted-foreground font-medium">{t('home.accuracy', 'Vision Accuracy')}</span>
            </div>
            <div className="p-3 bg-card/60 border border-border rounded-2xl text-center backdrop-blur-md">
              <span className="text-lg sm:text-2xl font-extrabold text-blue-400 block">24h</span>
              <span className="text-[11px] text-muted-foreground font-medium">{t('home.avgRes', 'Avg Resolution')}</span>
            </div>
            <div className="p-3 bg-card/60 border border-border rounded-2xl text-center backdrop-blur-md">
              <span className="text-lg sm:text-2xl font-extrabold text-emerald-400 block">10k+</span>
              <span className="text-[11px] text-muted-foreground font-medium">{t('home.citizensServed', 'Citizens Served')}</span>
            </div>
            <div className="p-3 bg-card/60 border border-border rounded-2xl text-center backdrop-blur-md">
              <span className="text-lg sm:text-2xl font-extrabold text-amber-400 block">{t('home.zero', 'Zero')}</span>
              <span className="text-[11px] text-muted-foreground font-medium">{t('home.zeroFriction', 'Manual Friction')}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. HOW AI ACCELERATES RESOLUTION */}
      <section className="w-full py-12 md:py-20 px-4 sm:px-6 md:px-8 bg-secondary/20 border-y border-border relative flex flex-col items-center justify-center">
        <div className="max-w-7xl mx-auto w-full flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 space-y-3"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('home.flowTitle', 'How AI Accelerates Resolution')}</h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 leading-relaxed">{t('home.flowSubtitle', "From a citizen's camera to a resolved community issue in record time.")}</p>
          </motion.div>

          {/* 5-Step Connected Flow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-3 items-stretch relative w-full">
            <FlowStep 
              icon={<Camera size={24} />}
              title={t('home.flow1Title', '1. Report Issue')}
              desc={t('home.flow1Desc', 'A resident spots an issue and snaps a quick photo.')}
              delay={0.1}
              isLast={false}
            />
            <FlowStep 
              icon={<BrainCircuit size={24} />}
              title={t('home.flow2Title', '2. AI Analysis')}
              desc={t('home.flow2Desc', 'AI assesses the scene, detects objects, and verifies evidence.')}
              delay={0.2}
              isLast={false}
            />
            <FlowStep 
              icon={<ListChecks size={24} />}
              title={t('home.flow3Title', '3. AI Prioritizes')}
              desc={t('home.flow3Desc', 'The issue is scored by severity and routed to the correct department.')}
              delay={0.3}
              isLast={false}
            />
            <FlowStep 
              icon={<HardHat size={24} />}
              title={t('home.flow4Title', '4. Authority Reviews')}
              desc={t('home.flow4Desc', 'Officers review the AI brief and dispatch a maintenance team.')}
              delay={0.4}
              isLast={false}
            />
            <FlowStep 
              icon={<Sprout size={24} />}
              title={t('home.flow5Title', '5. Issue Resolved')}
              desc={t('home.flow5Desc', 'The issue is resolved, and citizens are kept in the loop transparently.')}
              delay={0.5}
              isLast={true}
            />
          </div>
        </div>
      </section>

      {/* 3. REAL-WORLD IMPACT */}
      <section className="w-full py-12 md:py-20 px-4 sm:px-6 md:px-8 relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute top-1/2 right-1/4 w-[450px] h-[450px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
        
        <div className="max-w-6xl w-full mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="bg-card/80 backdrop-blur-3xl border border-border rounded-3xl p-5 sm:p-7 md:p-10 shadow-2xl flex flex-col lg:flex-row items-center gap-6 sm:gap-10 relative z-10"
          >
            <div className="flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <BrainCircuit size={15} />
                <span className="text-xs font-bold tracking-wider uppercase">{t('home.impactTag', 'Decision Intelligence')}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">{t('home.impactTitle', 'Real-world impact.')}</h3>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                {t('home.impactDesc', 'A deep pothole reported on a busy intersection today gets resolved tomorrow morning, because CivicMind AI instantly flagged it as a Critical Hazard and routed it directly to the Road Safety division before human dispatchers even arrived at the office.')}
              </p>

              {/* Callout Box: Why it matters */}
              <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary block">Why it matters</span>
                <p className="text-xs md:text-sm text-foreground/90 leading-relaxed font-medium">
                  AI identifies urgent civic issues before they become larger public safety risks, enabling authorities to respond faster while improving transparency for citizens.
                </p>
              </div>

              <button 
                onClick={() => onOpenChat()}
                className="text-primary text-sm md:text-base font-bold flex items-center gap-2 hover:gap-3 transition-all group pt-1"
              >
                {t('home.impactCTA', 'Ask AI Assistant about risk prediction')} <ArrowRight size={18} className="group-hover:text-blue-400 transition-colors" />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-background/80 rounded-3xl border border-border p-4 sm:p-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-destructive" />
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/50">
                <span className="font-bold text-sm md:text-base text-foreground">{t('home.assessmentTitle', 'AI Evidence Assessment')}</span>
                <span className="px-2.5 py-0.5 bg-destructive/10 text-destructive text-xs font-black tracking-widest rounded uppercase">{t('home.critical', 'Critical')}</span>
              </div>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>{t('home.confidence', 'Analysis Confidence')}</span>
                    <span className="text-foreground">95%</span>
                  </div>
                  <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: '95%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                      className="h-full bg-primary" 
                    />
                  </div>
                </div>
                <div className="p-3.5 bg-secondary/50 rounded-2xl border border-border">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('home.reasoningTitle', 'Automated Reasoning')}</h4>
                  <p className="text-xs md:text-sm font-medium leading-relaxed">
                    {t('home.reasoningText', 'Image evidence confirms severe road displacement (depth ~15cm) on a high-density primary artery. High risk of immediate vehicle damage and public traffic accidents.')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. WHY CIVICMIND AI? */}
      <section className="w-full py-12 md:py-20 px-4 sm:px-6 md:px-8 bg-secondary/10 border-y border-border relative flex flex-col items-center justify-center">
        <div className="max-w-7xl mx-auto w-full flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 space-y-3"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Why CivicMind AI?</h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 leading-relaxed">
              Purpose-built for modern municipal decision intelligence and citizen trust.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-card/70 backdrop-blur-xl border border-border hover:border-primary/40 rounded-3xl p-6 flex flex-col space-y-3 shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Faster Resolution</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                AI prioritizes urgent complaints automatically, enabling maintenance crews to respond in record time.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="bg-card/70 backdrop-blur-xl border border-border hover:border-blue-500/40 rounded-3xl p-6 flex flex-col space-y-3 shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Verified Evidence</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Computer Vision reduces fake or duplicate reports, scoring confidence before dispatch.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -4 }}
              className="bg-card/70 backdrop-blur-xl border border-border hover:border-indigo-500/40 rounded-3xl p-6 flex flex-col space-y-3 shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Smarter Governance</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Authorities receive actionable insights instead of manually reviewing every individual complaint.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA */}
      <section className="w-full py-12 md:py-20 px-4 sm:px-6 md:px-8 relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background text-center flex flex-col items-center justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] md:w-[800px] h-[350px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-3xl mx-auto z-10 relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Ready to build smarter communities?
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Join citizens and authorities in creating safer, cleaner and more responsive cities powered by AI.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2"
          >
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleCTA('/report')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/25 transition-all"
            >
              Report an Issue <ChevronRight size={18} />
            </motion.button>

            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleCTA('/dashboard')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-secondary text-secondary-foreground text-sm sm:text-base font-bold flex items-center justify-center gap-2 border border-border hover:bg-secondary/80 transition-all"
            >
              Explore Dashboard
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="w-full bg-card border-t border-border flex flex-col justify-between p-5 sm:p-6 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-foreground mb-1.5">CivicMind AI</h3>
            <p className="text-muted-foreground max-w-md text-xs sm:text-sm leading-relaxed">
              {t('home.footerDesc', 'Transforming city maintenance through computer vision, automated evidence verification, and predictive civic intelligence.')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-4 md:justify-end text-xs sm:text-sm font-semibold text-muted-foreground">
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

const FlowStep = ({ icon, title, desc, delay, isLast }: { icon: React.ReactNode, title: string, desc: string, delay: number, isLast: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -4 }}
    className="flex flex-col items-center text-center p-5 bg-card/60 backdrop-blur-md border border-border hover:border-primary/40 rounded-3xl shadow-lg w-full h-full min-h-[220px] justify-between transition-all relative group"
  >
    <div className="w-12 h-12 bg-card border border-border rounded-2xl flex items-center justify-center text-primary shadow-md shrink-0 mb-2 group-hover:scale-105 transition-transform">
      {icon}
    </div>
    <div className="my-auto">
      <h4 className="text-sm sm:text-base font-bold mb-1 text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>

    {/* Connecting Flow Arrow */}
    {!isLast && (
      <>
        {/* Desktop Arrow */}
        <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-secondary border border-border items-center justify-center text-primary shadow-md">
          <ChevronRight size={14} />
        </div>
        {/* Mobile Arrow */}
        <div className="flex md:hidden absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 w-7 h-7 rounded-full bg-secondary border border-border items-center justify-center text-primary shadow-md">
          <ChevronRight size={14} className="rotate-90" />
        </div>
      </>
    )}
  </motion.div>
);

export default Home;
