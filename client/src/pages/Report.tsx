import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, AlertTriangle, Activity, MapPin, Search, Check, FileText, BrainCircuit, ScanSearch, Gavel, Sparkles, ShieldCheck, Zap, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import VoiceInput from '../components/VoiceInput';
import { useAuth } from '../context/AuthContext';

const Report = () => {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [checkingGps, setCheckingGps] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);
  const [complaintId, setComplaintId] = useState<string>('');

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        toast.error('File too large', { description: 'Please select an image under 10MB.' });
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const requestLocation = (): Promise<{lat: number, lng: number, hasGps: boolean}> => {
    return new Promise((resolve) => {
      setCheckingGps(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude, hasGps: true };
            setCheckingGps(false);
            resolve(loc);
          },
          (error) => {
            const loc = { lat: 0, lng: 0, hasGps: false };
            setCheckingGps(false);
            resolve(loc);
          },
          { timeout: 5000 }
        );
      } else {
        const loc = { lat: 0, lng: 0, hasGps: false };
        setCheckingGps(false);
        resolve(loc);
      }
    });
  }

  const handleAnalyze = async () => {
    if (!file || !description || !locationStr) return;
    
    setIsAnalyzing(true);
    setAiStep(0);
    
    const steps = setInterval(() => {
       setAiStep(prev => prev < 3 ? prev + 1 : prev);
    }, 1500);
    
    const loc = await requestLocation();
    
    const formData = new FormData();
    formData.append('description', description);
    formData.append('locationStr', locationStr);
    formData.append('image', file);
    formData.append('hasGps', loc.hasGps ? 'true' : 'false');
    formData.append('language', i18n.language);
    if (loc.hasGps) {
      formData.append('lat', loc.lat.toString());
      formData.append('lng', loc.lng.toString());
    }

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token || JSON.parse(localStorage.getItem('civicmind_user') || '{}').token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process complaint');
      }

      setAiResult(data.aiAnalysis);
      if (data.complaint) {
         setComplaintId(data.complaint.complaintId);
      }
      
      clearInterval(steps);
      setAiStep(4);
      
      setTimeout(() => {
        setStep(4);
        setIsAnalyzing(false);
        toast.success(t('toast.analysisComplete', 'Analysis Complete'), { description: t('toast.analysisCompleteDesc', 'The AI has finished reviewing your report.') });
      }, 1000);
    } catch (err: any) {
      console.error(err);
      toast.error(t('toast.error', 'AI Processing Failed'), { description: err.message || 'An error occurred.' });
      clearInterval(steps);
      setIsAnalyzing(false);
    }
  };

  const agentSteps = [
    { icon: <ScanSearch size={20} />, text: t('report.agentStep1', 'Vision Agent: Detecting objects in scene...') },
    { icon: <BrainCircuit size={20} />, text: t('report.agentStep2', 'Analytics Agent: Cross-referencing description...') },
    { icon: <Gavel size={20} />, text: t('report.agentStep3', 'Decision Agent: Prioritizing and routing...') },
    { icon: <Sparkles size={20} />, text: t('report.agentStep4', 'Gemini: Compiling final recommendation...') }
  ];

  return (
    <div className="min-h-[92vh] w-full bg-background text-foreground flex flex-col justify-between py-6 md:py-10 px-4 md:px-8 relative overflow-hidden">
      
      {/* Background Decorative Lighting */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto relative z-10 flex-1 flex flex-col">
        
        {/* Page Top Banner */}
        <div className="mb-8 md:mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase mb-2">
              <Zap size={14} />
              <span>{t('report.sidebarBadge', 'Civic Intelligence Engine')}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {t('report.title', 'Submit a Civic Report')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-2xl">
              {t('report.subtitle', 'Help improve your community by reporting infrastructure problems with instant AI verification.')}
            </p>
          </div>

          <button
            onClick={() => navigate('/issue')}
            className="px-5 py-2.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0"
          >
            <FileText size={16} className="text-primary" />
            <span>{t('report.trackStatusBtn', 'Track Complaint Status')}</span>
          </button>
        </div>

        {/* Responsive 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          
          {/* Main Reporting Form Card (Col 8) */}
          <div className="lg:col-span-8 w-full bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between mb-10 relative px-2">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10" />
              {[1, 2, 3].map((num) => (
                <div 
                  key={num}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                    ${step >= num ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'bg-card text-muted-foreground border border-border'}`}
                >
                  {step > num ? <Check size={18} /> : num}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              
              {/* STEP 1: Description */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col justify-between space-y-6"
                >
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 text-foreground">
                      {t('report.step1', 'What happened?')}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {t('report.step1Sub', 'Describe the issue in your own words. Gemini will automatically extract key details.')}
                    </p>
                    
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t('report.descLabel', 'Issue Description')}
                        </label>
                        <VoiceInput onResult={(text) => setDescription(prev => prev ? `${prev} ${text}` : text)} />
                      </div>
                      
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('report.descPlaceholder', 'e.g. There is a huge pothole causing traffic jams, it looks quite dangerous for bikes...')}
                        className="w-full h-44 sm:h-52 bg-secondary/30 border border-border rounded-2xl p-5 text-base sm:text-lg text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all resize-none placeholder:text-muted-foreground/50 leading-relaxed"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-border/40">
                    <button
                      disabled={!description.trim()}
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-xl shadow-primary/20"
                    >
                      {t('report.nextBtn', 'Next')} <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Location */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col justify-between space-y-6"
                >
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 text-foreground">
                      {t('report.step2', 'Where is it located?')}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {t('report.step2Sub', 'Provide the nearest landmark, area, or street address.')}
                    </p>
                    
                    <div className="mt-6">
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {t('report.locationLabel', 'Location / Landmark')}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                        <input 
                          type="text"
                          value={locationStr}
                          onChange={(e) => setLocationStr(e.target.value)}
                          placeholder={t('report.locationPlaceholder', 'e.g. 123 Main Street, Near Central Park, Andheri East')}
                          className="w-full bg-secondary/30 border border-border rounded-2xl py-5 pl-14 pr-5 text-base sm:text-lg text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all placeholder:text-muted-foreground/50"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-border/40 gap-4">
                    <button 
                      onClick={() => setStep(1)} 
                      className="px-6 py-3.5 text-muted-foreground hover:text-foreground font-bold rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      {t('report.backBtn', 'Back')}
                    </button>
                    <button
                      disabled={!locationStr.trim()}
                      onClick={() => setStep(3)}
                      className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-xl shadow-primary/20"
                    >
                      {t('report.nextBtn', 'Next')} <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Upload Evidence */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col justify-between space-y-6"
                >
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 text-foreground">
                      {t('report.step3', 'Upload Evidence')}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {t('report.step3Sub', 'Snap a photo or upload an image. AI vision requires this to verify evidence.')}
                    </p>
                    
                    <div className="mt-6 relative border-2 border-dashed border-border hover:border-primary/60 rounded-3xl h-64 sm:h-72 flex flex-col items-center justify-center overflow-hidden transition-all bg-secondary/20 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        disabled={isAnalyzing}
                      />
                      
                      {preview ? (
                        <>
                          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                          {isAnalyzing && (
                             <div className="absolute inset-0 z-30 bg-background/85 backdrop-blur-md flex flex-col justify-center p-6">
                               <div className="space-y-4 max-w-md mx-auto w-full">
                                 {agentSteps.map((agent, idx) => (
                                   <motion.div 
                                     key={idx}
                                     initial={{ opacity: 0, x: -10 }}
                                     animate={{ opacity: aiStep >= idx ? 1 : 0.3, x: aiStep >= idx ? 0 : -10 }}
                                     className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${aiStep === idx ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'border-transparent text-foreground'}`}
                                   >
                                     <div className={`p-2 rounded-lg ${aiStep === idx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                       {agent.icon}
                                     </div>
                                     <div className="flex-1 text-xs sm:text-sm font-medium">{agent.text}</div>
                                     {aiStep > idx && <Check size={16} className="text-emerald-400 shrink-0" />}
                                     {aiStep === idx && <Activity size={16} className="text-primary animate-spin shrink-0" />}
                                   </motion.div>
                                 ))}
                               </div>
                             </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-center p-6 text-muted-foreground group-hover:text-primary transition-colors">
                          <Upload size={48} className="mb-3 text-primary/70 group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-base sm:text-lg text-foreground">
                            {t('report.clickOrDrag', 'Click or drag an image here')}
                          </p>
                          <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                            {t('report.fileLimits', 'JPEG, PNG, WEBP up to 10MB')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-border/40 gap-4">
                    <button 
                      onClick={() => setStep(2)} 
                      disabled={isAnalyzing}
                      className="px-6 py-3.5 text-muted-foreground hover:text-foreground font-bold rounded-xl hover:bg-secondary/50 transition-colors disabled:opacity-50"
                    >
                      {t('report.backBtn', 'Back')}
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={!file || isAnalyzing}
                      className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-xl shadow-primary/20"
                    >
                      {isAnalyzing ? (
                        <>{t('report.processing', 'Processing AI Analysis...')}</>
                      ) : (
                        <>{t('report.runAnalysisBtn', 'Run AI Analysis')} <Search size={20} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Results */}
              {step === 4 && aiResult && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {!aiResult.isGenuine ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                        <AlertTriangle size={40} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('report.unclearTitle', 'Evidence Unclear')}</h2>
                      <p className="text-muted-foreground text-base mb-6 max-w-lg mx-auto leading-relaxed">
                        {aiResult.evidenceAssessment.limitations || aiResult.evidenceAssessment.reasoning[0] || t('report.unclearSub', 'The AI could not clearly identify the issue from the provided image. Please upload a clearer photo.')}
                      </p>
                      <button 
                        onClick={() => { setStep(3); setFile(null); setPreview(null); }} 
                        className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg hover:bg-primary/90 transition-all"
                      >
                        {t('report.reuploadBtn', 'Upload Clearer Image')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <Check size={28} />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-extrabold">{t('report.verifiedTitle', 'Report Verified')}</h2>
                          <p className="text-xs sm:text-sm text-muted-foreground">{t('report.verifiedSub', 'AI vision has processed and structured your submission.')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Assessment Details */}
                        <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-3">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">{t('report.sceneAnalysis', 'Scene Analysis')}</span>
                          <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">
                            {aiResult.evidenceAssessment.sceneAnalysis}
                          </p>
                          
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block pt-2">{t('report.detectedObjects', 'Detected Objects')}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.evidenceAssessment.detectedObjects?.map((obj: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-background rounded-lg text-xs font-medium border border-border">{obj}</span>
                            ))}
                          </div>
                        </div>

                        {/* Confidence & Reasoning */}
                        <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-3">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">{t('report.confidenceReasoning', 'Confidence & Reasoning')}</span>
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 bg-background rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${aiResult.evidenceAssessment.confidence}%` }} />
                            </div>
                            <span className="text-xs font-extrabold">{aiResult.evidenceAssessment.confidence}%</span>
                          </div>
                          <ul className="text-xs space-y-1.5 text-muted-foreground">
                            {aiResult.evidenceAssessment.reasoning?.map((r: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Route & Department Card */}
                      <div className="p-5 border border-primary/30 bg-primary/10 rounded-2xl flex items-center justify-between mb-6">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">{t('report.assignedDept', 'Assigned Department')}</span>
                          <span className="font-extrabold text-base sm:text-lg text-primary">{aiResult.suggestedDepartment}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block mb-0.5">{t('report.priorityLabel', 'Priority')}</span>
                          <span className="font-extrabold text-base sm:text-lg text-foreground">{aiResult.estimatedPriority}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={() => navigate('/issue')}
                          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25"
                        >
                          {t('report.trackStatusBtn', 'Track Complaint Status')}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right Column: AI & Guidelines Sidebar (Col 4) */}
          <div className="lg:col-span-4 w-full space-y-6">
            
            {/* Sidebar Card 1: AI Verification Badge */}
            <div className="p-6 bg-card/60 backdrop-blur-xl border border-border rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">{t('report.sidebarTitle', 'AI Real-time Verification')}</h3>
                  <span className="text-xs text-muted-foreground">{t('report.sidebarBadge', 'Civic Intelligence Engine')}</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Gemini Vision inspects photo evidence to extract severity indicators, auto-detect location context, and assign priority.
              </p>
            </div>

            {/* Sidebar Card 2: Reporting Best Practices */}
            <div className="p-6 bg-card/60 backdrop-blur-xl border border-border rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-sm sm:text-base border-b border-border/50 pb-3">
                <HelpCircle size={18} className="text-indigo-400" />
                <span>{t('report.guidelinesTitle', 'Reporting Guidelines')}</span>
              </div>
              
              <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-secondary text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>{t('report.guideline1', 'Capture clear daylight photos showing full context.')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-secondary text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>{t('report.guideline2', 'Provide recognizable landmarks for rapid dispatch.')}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-secondary text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>{t('report.guideline3', 'Voice input is supported in English, Hindi & Marathi.')}</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Report;
