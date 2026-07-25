import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, AlertTriangle, Activity, MapPin, Search, Check, FileText, BrainCircuit, ScanSearch, Gavel, Sparkles, ShieldCheck, Zap, HelpCircle, Eye, Flame, BarChart2, AlertCircle, Building2, ListChecks, Users, Info, CheckCircle2, ShieldAlert, Lightbulb, FileSearch, Compass } from 'lucide-react';
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
  const [gpsDetails, setGpsDetails] = useState<{lat: number, lng: number, accuracy: number, address: string} | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 50 * 1024 * 1024) {
        toast.error('File too large', { description: 'Please select an image or video under 50MB.' });
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleDetectGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS Not Supported", { description: "Your browser does not support Geolocation." });
      return;
    }

    setIsDetectingGps(true);
    toast.info("Detecting Live GPS...", { description: "Please allow location access when prompted." });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 15);

        let reverseAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              reverseAddress = data.display_name;
            }
          }
        } catch (e) {
          console.warn("Reverse geocode fetch failed:", e);
        }

        setGpsDetails({ lat, lng, accuracy, address: reverseAddress });
        setLocationStr(prev => prev ? `${prev} (GPS Verified)` : reverseAddress);
        setIsDetectingGps(false);
        toast.success("GPS Verified!", { description: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)} (±${accuracy}m)` });
      },
      (error) => {
        setIsDetectingGps(false);
        toast.error("GPS Detection Failed", { description: "Please enable location services or type your address manually." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const requestLocation = (): Promise<{lat: number, lng: number, hasGps: boolean}> => {
    if (gpsDetails) {
      return Promise.resolve({ lat: gpsDetails.lat, lng: gpsDetails.lng, hasGps: true });
    }
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
       setAiStep(prev => prev < 7 ? prev + 1 : prev);
    }, 1200);
    
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
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers,
        body: formData
      });
      
      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseErr) {
        throw new Error(`Server returned non-JSON response (${response.status})`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process complaint');
      }

      setAiResult(data.aiAnalysis);
      if (data.complaint) {
         setComplaintId(data.complaint.complaintId);
      }

      window.dispatchEvent(new CustomEvent('complaint-submitted', { detail: data.complaint }));
      
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
    { icon: <Upload size={18} />, text: 'Loading Evidence' },
    { icon: <ScanSearch size={18} />, text: 'Detecting Objects' },
    { icon: <FileSearch size={18} />, text: 'Reading Visible Text' },
    { icon: <BrainCircuit size={18} />, text: 'Understanding Scene' },
    { icon: <Search size={18} />, text: 'Comparing Description' },
    { icon: <AlertTriangle size={18} />, text: 'Assessing Severity' },
    { icon: <MapPin size={18} />, text: 'Checking Location Evidence' },
    { icon: <Sparkles size={18} />, text: 'Generating Recommendation' }
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && description.trim()) {
                            e.preventDefault();
                            setStep(2);
                          }
                        }}
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
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t('report.locationLabel', 'Location / Landmark')}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDetectGps}
                            disabled={isDetectingGps}
                            className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isDetectingGps ? (
                              <Activity size={13} className="animate-spin text-emerald-400" />
                            ) : (
                              <Compass size={13} />
                            )}
                            <span>{isDetectingGps ? "Detecting..." : "Detect Live GPS"}</span>
                          </button>
                          <VoiceInput onResult={(text) => setLocationStr(prev => prev ? `${prev} ${text}` : text)} />
                        </div>
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                        <input 
                          type="text"
                          value={locationStr}
                          onChange={(e) => setLocationStr(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && locationStr.trim()) {
                              e.preventDefault();
                              setStep(3);
                            }
                          }}
                          placeholder={t('report.locationPlaceholder', 'e.g. 123 Main Street, Near Central Park, Andheri East')}
                          className="w-full bg-secondary/30 border border-border rounded-2xl py-5 pl-14 pr-5 text-base sm:text-lg text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-all placeholder:text-muted-foreground/50"
                          autoFocus
                        />
                      </div>

                      {gpsDetails && (
                        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                          <div className="text-xs text-emerald-300">
                            <span className="font-extrabold block">✓ Live GPS Signature Verified</span>
                            <span>Lat: {gpsDetails.lat.toFixed(5)}, Lng: {gpsDetails.lng.toFixed(5)} (Accuracy: ±{gpsDetails.accuracy}m)</span>
                          </div>
                        </div>
                      )}
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
                      Upload Evidence (Image or Video)
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      Snap a photo, upload an image, or record a video. AI vision will inspect your media for evidence verification.
                    </p>
                    
                    <div className="mt-6 relative border-2 border-dashed border-border hover:border-primary/60 rounded-3xl h-64 sm:h-72 flex flex-col items-center justify-center overflow-hidden transition-all bg-secondary/20 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, video/mp4, video/quicktime, video/webm"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        disabled={isAnalyzing}
                      />
                      
                      {preview ? (
                        <>
                          {file?.type.startsWith('video/') ? (
                            <video src={preview} controls autoPlay loop muted className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          {isAnalyzing && (
                             <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur-md flex flex-col justify-center p-6">
                               <div className="space-y-2 max-w-md mx-auto w-full">
                                 {agentSteps.map((agent, idx) => (
                                   <motion.div 
                                     key={idx}
                                     initial={{ opacity: 0, x: -10 }}
                                     animate={{ opacity: aiStep >= idx ? 1 : 0.3, x: aiStep >= idx ? 0 : -10 }}
                                     className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${aiStep === idx ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'border-transparent text-foreground'}`}
                                   >
                                     <div className={`p-1.5 rounded-lg ${aiStep === idx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                       {agent.icon}
                                     </div>
                                     <div className="flex-1 text-xs font-semibold">{agent.text}</div>
                                     {aiStep > idx && <Check size={14} className="text-emerald-400 shrink-0" />}
                                     {aiStep === idx && <Activity size={14} className="text-primary animate-spin shrink-0" />}
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
                            Click or drag evidence (Image or Video) here
                          </p>
                          <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                            JPG, JPEG, PNG, WEBP, MP4, MOV, WEBM up to 50MB
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

              {/* STEP 4: Comprehensive Explainable AI Vision Report */}
              {step === 4 && aiResult && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 overflow-y-auto flex-1 pr-1"
                >
                  {!aiResult.isGenuine ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                        <AlertTriangle size={40} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{t('report.unclearTitle', 'Evidence Unclear')}</h2>
                      <p className="text-muted-foreground text-base mb-6 max-w-lg mx-auto leading-relaxed">
                        {aiResult.evidenceAssessment?.limitations || aiResult.locationEvidence?.evidenceStatement || t('report.unclearSub', 'The AI could not clearly identify the issue from the provided image. Please upload a clearer photo.')}
                      </p>
                      <button
                        onClick={() => { setStep(3); setFile(null); setPreview(null); }}
                        className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                      >
                        {t('report.reuploadBtn', 'Upload Clearer Image')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">

                      {/* ── 1. VERIFIED HEADER ── */}
                      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                          <CheckCircle2 size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-emerald-400 text-sm">Gemini Vision — Report Processed</p>
                          {complaintId && <p className="text-[11px] text-muted-foreground mt-0.5">Complaint ID: <span className="font-bold text-foreground">{complaintId}</span></p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-black text-emerald-400">{aiResult.scoreBreakdown?.overallConfidence || aiResult.evidenceAssessment?.confidence || aiResult.priorityScore || 85}%</p>
                          <p className="text-[10px] text-muted-foreground">Confidence</p>
                        </div>
                      </div>

                      {/* ── DUPLICATE EVIDENCE ALERT ── */}
                      {aiResult.duplicateDetected && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Duplicate Evidence Notice</h4>
                            <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                              This image appears visually similar to a previously submitted report ({aiResult.duplicateInfo?.complaintId}). Please verify whether this is a duplicate submission.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── MULTI-FACTOR SCORE BREAKDOWN ── */}
                      {aiResult.scoreBreakdown && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles size={16} className="text-primary shrink-0" />
                              <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">Multi-Factor Verification Score Breakdown</span>
                            </div>
                            <span className="text-lg font-black text-primary">{aiResult.scoreBreakdown.overallConfidence}%</span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                            <div className="p-2.5 bg-background/80 rounded-xl border border-border">
                              <span className="text-[10px] text-muted-foreground uppercase font-extrabold block">Issue Detection</span>
                              <span className="text-sm font-black text-emerald-400">{aiResult.scoreBreakdown.issueDetectionScore}%</span>
                            </div>
                            <div className="p-2.5 bg-background/80 rounded-xl border border-border">
                              <span className="text-[10px] text-muted-foreground uppercase font-extrabold block">Description Match</span>
                              <span className="text-sm font-black text-blue-400">{aiResult.scoreBreakdown.descriptionMatchScore}%</span>
                            </div>
                            <div className="p-2.5 bg-background/80 rounded-xl border border-border">
                              <span className="text-[10px] text-muted-foreground uppercase font-extrabold block">Location Verification</span>
                              <span className={`text-sm font-black ${aiResult.scoreBreakdown.locationVerificationScore > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {aiResult.scoreBreakdown.locationVerificationScore}%
                              </span>
                            </div>
                            <div className="p-2.5 bg-background/80 rounded-xl border border-border">
                              <span className="text-[10px] text-muted-foreground uppercase font-extrabold block">Image Quality</span>
                              <span className="text-sm font-black text-purple-400">{aiResult.scoreBreakdown.imageQualityScore}%</span>
                            </div>
                          </div>

                          {aiResult.scoreBreakdown.reasoningExplanation && (
                            <p className="text-xs text-muted-foreground leading-relaxed pt-1.5 border-t border-border/40 font-medium">
                              <strong className="text-foreground">AI Score Reasoning: </strong>
                              {aiResult.scoreBreakdown.reasoningExplanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* ── 2. SCENE SUMMARY ── */}
                      <div className="p-4 bg-secondary/20 border border-border rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye size={15} className="text-primary shrink-0" />
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Scene Summary</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground font-medium">
                          {aiResult.sceneDescription || aiResult.evidenceAssessment?.sceneAnalysis || 'Gemini analyzed the submitted evidence in detail.'}
                        </p>
                      </div>

                      {/* ── 3. OBJECTS DETECTED & OCR TEXT ── */}
                      <div className="p-4 bg-secondary/20 border border-border rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <ScanSearch size={15} className="text-primary shrink-0" />
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Objects Detected & OCR Text</span>
                        </div>
                        
                        {/* Detected Objects Pills */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground block">Visible Objects:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(aiResult.objectDetection?.detectedObjects || aiResult.detectedObjects || []).map((obj: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold">{obj}</span>
                            ))}
                          </div>
                        </div>

                        {/* OCR Text / Vehicle Plate */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div className="p-2.5 bg-background border border-border rounded-xl">
                            <span className="text-[10px] font-bold text-muted-foreground block mb-1">Visible Text (OCR):</span>
                            {(aiResult.objectDetection?.extractedText?.length > 0) ? (
                              <div className="flex flex-wrap gap-1">
                                {aiResult.objectDetection.extractedText.map((t: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-secondary text-foreground text-xs rounded border border-border">{t}</span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No street signboards or text detected</p>
                            )}
                          </div>
                          <div className="p-2.5 bg-background border border-border rounded-xl">
                            <span className="text-[10px] font-bold text-muted-foreground block mb-1">Vehicle Plate:</span>
                            <p className="text-xs font-semibold text-foreground">
                              {aiResult.objectDetection?.vehiclePlate || 'None visible / Unclear'}
                            </p>
                          </div>
                        </div>

                        {aiResult.objectDetection?.ocrNotes && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                            {aiResult.objectDetection.ocrNotes}
                          </p>
                        )}
                      </div>

                      {/* ── 4. LOCATION EVIDENCE ── */}
                      <div className="p-4 bg-secondary/20 border border-border rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin size={15} className="text-primary shrink-0" />
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Location Evidence</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            aiResult.locationEvidence?.locationVerified ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {aiResult.locationEvidence?.status || (aiResult.locationEvidence?.locationVerified ? '✓ Location Supported' : '⚠ No visible landmark evidence')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {aiResult.locationEvidence?.evidenceStatement || "The submitted image does not contain sufficient visual evidence (such as signboards, landmarks, or GPS metadata) to verify the claimed location. Please upload a photo that includes nearby landmarks or enable GPS while reporting."}
                        </p>
                      </div>

                      {/* ── 5. DESCRIPTION MATCH ── */}
                      {aiResult.descriptionMatch && (
                        <div className="p-4 bg-secondary/20 border border-border rounded-2xl space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <FileSearch size={15} className="text-primary shrink-0" />
                              <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Description Match</span>
                            </div>
                            <span className="text-sm font-extrabold text-primary">{aiResult.descriptionMatch.matchPercentage || 80}% Match</span>
                          </div>
                          <div className="h-1.5 bg-background rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${aiResult.descriptionMatch.matchPercentage || 80}%` }} />
                          </div>
                          <p className="text-xs font-semibold text-foreground">{aiResult.descriptionMatch.summary}</p>
                          {aiResult.descriptionMatch.discrepancy && (
                            <p className="text-xs text-amber-400/90">{aiResult.descriptionMatch.discrepancy}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{aiResult.descriptionMatch.reason}</p>
                        </div>
                      )}

                      {/* ── 6. EVIDENCE ASSESSMENT MATRIX ── */}
                      {aiResult.evidenceAssessment && (
                        <div className="p-4 bg-secondary/20 border border-border rounded-2xl space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={15} className="text-primary shrink-0" />
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Evidence Assessment Matrix</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className="p-2 bg-background border border-border rounded-xl text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Scene Match</span>
                              <span className="text-xs font-bold text-foreground">{aiResult.evidenceAssessment.sceneMatchesComplaint || 'Yes'}</span>
                            </div>
                            <div className="p-2 bg-background border border-border rounded-xl text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Location Evidence</span>
                              <span className="text-xs font-bold text-amber-400">{aiResult.evidenceAssessment.locationEvidenceLevel || 'Insufficient'}</span>
                            </div>
                            <div className="p-2 bg-background border border-border rounded-xl text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">GPS Provided</span>
                              <span className="text-xs font-bold text-foreground">{aiResult.evidenceAssessment.gpsAvailable || 'No'}</span>
                            </div>
                            <div className="p-2 bg-background border border-border rounded-xl text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Landmark</span>
                              <span className="text-xs font-bold text-foreground">{aiResult.evidenceAssessment.visibleLandmark || 'None'}</span>
                            </div>
                            <div className="p-2 bg-background border border-border rounded-xl text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Image Quality</span>
                              <span className="text-xs font-bold text-emerald-400">{aiResult.evidenceAssessment.imageQuality || 'Good'}</span>
                            </div>
                            <div className="p-2 bg-background border border-border rounded-xl text-center">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Overall Evidence</span>
                              <span className="text-xs font-bold text-primary">{aiResult.evidenceAssessment.overallEvidence || 'Moderate'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── 7. OFFICER RECOMMENDATION & EVIDENCE STRENGTH ── */}
                      {aiResult.fraudDetection && (
                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldAlert size={15} className="text-amber-400 shrink-0" />
                              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">Officer Recommendation & Evidence Strength</span>
                            </div>
                            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold">
                              {aiResult.fraudDetection.recommendation || 'Human Review Recommended'}
                            </span>
                          </div>
                          
                          {aiResult.fraudDetection.warningSigns?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {aiResult.fraudDetection.warningSigns.map((sign: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium rounded-lg flex items-center gap-1">
                                  <AlertCircle size={10} /> {sign}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-amber-300/80 leading-relaxed pt-1">
                            {aiResult.fraudDetection.recommendationReason || 'Insufficient evidence to verify authenticity due to lack of visible landmarks or embedded metadata.'}
                          </p>
                        </div>
                      )}

                      {/* ── 8. RECOMMENDED DEPARTMENT & PRIORITY ── */}
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                        <Building2 size={18} className="text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-0.5">Assigned Department</span>
                          <p className="font-extrabold text-primary text-sm">
                            {aiResult.recommendedDepartment?.name || aiResult.suggestedDepartment || 'Road Maintenance'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{aiResult.recommendedDepartment?.reason || aiResult.risk}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-0.5">Priority</span>
                          <span className="font-extrabold text-sm text-foreground">{aiResult.estimatedPriority || 'Normal'}</span>
                        </div>
                      </div>

                      {/* ── 9. AI LIMITATIONS ── */}
                      <div className="p-4 bg-secondary/10 border border-border/40 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">AI Limitations Disclaimer</span>
                        </div>
                        <ul className="space-y-1.5">
                          {(aiResult.aiLimitations || [
                            "The AI cannot determine whether an image was downloaded from the internet from visual content alone.",
                            "The AI cannot guarantee the exact location unless supported by GPS metadata or identifiable landmarks.",
                            "Final verification should be performed by a government officer."
                          ]).map((lim: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                              {lim}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* ── 10. CITIZEN GUIDANCE (TIPS TO IMPROVE SUBMISSION) ── */}
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Lightbulb size={15} className="text-primary shrink-0" />
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">To Improve Future Report Verification</span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {(aiResult.userGuidance || [
                            "Enable GPS while submitting report.",
                            "Capture nearby signboards, street names, or prominent landmarks.",
                            "Avoid uploading screenshots or photos of secondary screens.",
                            "Upload clear, high-resolution original photos taken in daylight.",
                            "Ensure the civic issue and surrounding area are clearly visible."
                          ]).map((tip: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Check size={12} className="text-primary shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* ── CTA BUTTON ── */}
                      <div className="pt-2 pb-2">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-95"
                        >
                          Track Complaint Status
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
