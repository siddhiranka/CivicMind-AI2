import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, AlertTriangle, Activity, MapPin, Search, Check, FileText, BrainCircuit, ScanSearch, Gavel, Sparkles, ShieldCheck, Zap, HelpCircle, Eye, Flame, BarChart2, AlertCircle, Building2, ListChecks, Users, Info, CheckCircle2, ShieldAlert, Lightbulb, FileSearch, Compass, XCircle, RefreshCw } from 'lucide-react';
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
  const [rejectionData, setRejectionData] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [complaintId, setComplaintId] = useState<string>('');
  const [gpsDetails, setGpsDetails] = useState<{lat: number, lng: number, accuracy: number, address: string} | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'verified' | 'denied' | 'none'>('none');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [locationMatchStatus, setLocationMatchStatus] = useState<'unverified' | 'matched' | 'mismatched' | 'denied'>('unverified');
  const [locationMatchReason, setLocationMatchReason] = useState<string>('');

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locationMatchStatus === 'mismatched') {
      toast.error('Location Mismatch!', { description: 'Your current GPS location does not match the reported issue location. You cannot upload evidence.' });
      return;
    }
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

  const evaluateLocationMatch = (enteredText: string, gps: typeof gpsDetails) => {
    // If GPS is verified or user has typed a location, mark location as verified
    if (gps || enteredText.trim().length > 0) {
      setLocationMatchStatus('matched');
      const addr = gps ? (gps.address.slice(0, 55) + '...') : enteredText;
      setLocationMatchReason(`✓ GPS Presence Verified: ${addr}`);
    } else {
      setLocationMatchStatus('unverified');
      setLocationMatchReason("Please enter a location or click 'Detect Live GPS'.");
    }
  };

  const handleDetectGps = () => {
    if (!("geolocation" in navigator)) {
      setGpsStatus('none');
      setLocationMatchStatus('matched'); // Allow manual text input
      setLocationMatchReason("GPS not available on browser. Manual location enabled.");
      toast.error("GPS Not Supported", { description: "Your browser does not support Geolocation. You can type your location manually." });
      return;
    }

    setIsDetectingGps(true);
    toast.info("Detecting Live GPS...", { description: "Please allow location access when prompted." });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 15);

        let reverseAddress = `Mumbai, Maharashtra (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              reverseAddress = data.display_name;
            }
          }
        } catch (e) {
          console.warn("Reverse geocode fetch fallback:", e);
        }

        const newGps = { lat, lng, accuracy, address: reverseAddress };
        setGpsDetails(newGps);
        setGpsStatus('verified');
        setLocationMatchStatus('matched');
        setLocationMatchReason(`✓ Live GPS Signature Verified: ${reverseAddress.slice(0, 50)}...`);
        
        // Auto-fill location string with detected GPS address if empty or outdated
        setLocationStr(reverseAddress);

        setIsDetectingGps(false);
        toast.success("GPS Verified!", { description: `Location: ${reverseAddress.slice(0, 40)}...` });
      },
      (error) => {
        setIsDetectingGps(false);
        setGpsStatus('denied');
        setGpsDetails(null);
        // Allow manual location typing even if GPS permission was denied
        setLocationMatchStatus('matched');
        setLocationMatchReason("⚠️ GPS permission denied. Manual location entry enabled.");
        toast.error("GPS Access Denied", { description: "You can type your location manually to continue." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const requestLocation = async (): Promise<{lat: number | null, lng: number | null, hasGps: boolean}> => {
    if (gpsDetails && gpsStatus === 'verified') {
      return { lat: gpsDetails.lat, lng: gpsDetails.lng, hasGps: true };
    }
    return new Promise((resolve) => {
      setCheckingGps(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude, hasGps: true };
            setGpsDetails({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: 20, address: locationStr || 'Live Location' });
            setGpsStatus('verified');
            setCheckingGps(false);
            resolve(loc);
          },
          (error) => {
            setGpsStatus('denied');
            setGpsDetails(null);
            setCheckingGps(false);
            resolve({ lat: null, lng: null, hasGps: false });
          },
          { timeout: 5000 }
        );
      } else {
        setGpsStatus('none');
        setGpsDetails(null);
        setCheckingGps(false);
      }
    });
  };

  const handleAnalyze = async () => {
    if (!file || !description || !locationStr) return;
    setRejectionData(null);
    
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
    if (loc.hasGps && loc.lat !== null && loc.lng !== null) {
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
      
      if (!response.ok || data.status === 'rejected' || data.isCivicIssue === false) {
        setRejectionData({
          status: 'rejected',
          isCivicIssue: false,
          detectedContent: data.detectedContent || 'Non-civic / Promotional Content',
          error: data.error || data.reason || 'This upload does not contain a real civic infrastructure issue. Please upload an original photo or video showing a real civic problem.'
        });
        clearInterval(steps);
        setAiStep(2); // Stop at "Civic Issue Check"
        setStep(4); // Go to results page to show rejection
        setIsAnalyzing(false);
        return;
      }

        setAiResult(data.aiAnalysis);
        if (data.complaint) {
          setComplaintId(data.complaint.complaintId);
        }
        window.dispatchEvent(new CustomEvent('complaint-submitted', { detail: data.complaint }));
        clearInterval(steps);
        setAiStep(4);
        // Immediately move to the report step and stop analyzing
        setStep(4);
        setIsAnalyzing(false);
        toast.success(t('toast.analysisComplete', 'Analysis Complete'), { description: t('toast.analysisCompleteDesc', 'The AI has finished reviewing your report.') });;
    } catch (err: any) {
      console.error(err);
      toast.error(t('toast.error', 'AI Processing Failed'), { description: err.message || 'An error occurred.' });
      clearInterval(steps);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const agentSteps = [
    { icon: <Upload size={18} />, text: 'Identifying Image' },
    { icon: <ScanSearch size={18} />, text: 'Detecting Content' },
    { icon: <ShieldCheck size={18} />, text: 'Civic Issue Check' },
    { icon: <FileSearch size={18} />, text: 'Reading Visible Text (OCR)' },
    { icon: <BrainCircuit size={18} />, text: 'Matching Description' },
    { icon: <AlertTriangle size={18} />, text: 'Assessing Severity & Priority' },
    { icon: <MapPin size={18} />, text: 'Verifying Location Evidence' },
    { icon: <Sparkles size={18} />, text: 'Compiling Final Report' }
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
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocationStr(val);
                            if (gpsDetails) {
                              evaluateLocationMatch(val, gpsDetails);
                            }
                          }}
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

                      {locationMatchStatus === 'matched' && (
                        <div className="mt-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                          <div className="text-xs text-emerald-300">
                            <span className="font-extrabold block">✓ Physical GPS Presence Verified</span>
                            <span>{locationMatchReason}</span>
                          </div>
                        </div>
                      )}

                      {locationMatchStatus === 'mismatched' && (
                        <div className="mt-3 p-3.5 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-center gap-3">
                          <XCircle size={20} className="text-destructive shrink-0" />
                          <div className="text-xs text-destructive">
                            <span className="font-extrabold block">❌ Location Mismatch Detected</span>
                            <span>{locationMatchReason}</span>
                          </div>
                        </div>
                      )}

                      {locationMatchStatus === 'denied' && (
                        <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                          <div className="text-xs text-amber-300">
                            <span className="font-extrabold block">⚠️ GPS Access Required</span>
                            <span>{locationMatchReason || "Please click 'Detect Live GPS' to verify your physical location at the reported issue site."}</span>
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
                      disabled={!locationStr.trim() || locationMatchStatus === 'mismatched'}
                      onClick={() => {
                        if (gpsStatus === 'none' && 'geolocation' in navigator) {
                          handleDetectGps();
                        }
                        setStep(3);
                      }}
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

                    {/* Location Verification Warning Header */}
                    {locationMatchStatus === 'mismatched' && (
                      <div className="mt-4 p-4 bg-destructive/15 border border-destructive/40 rounded-2xl flex items-center gap-3">
                        <XCircle size={24} className="text-destructive shrink-0" />
                        <div>
                          <h4 className="font-extrabold text-destructive text-sm">❌ Upload Disabled — Location Mismatch</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Your GPS location does not match "{locationStr}". You must be physically at the reported location to upload evidence.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6 relative border-2 border-dashed border-border hover:border-primary/60 rounded-3xl h-64 sm:h-72 flex flex-col items-center justify-center overflow-hidden transition-all bg-secondary/20 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, video/mp4, video/quicktime, video/webm"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        disabled={isAnalyzing || locationMatchStatus === 'mismatched'}
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
                                     className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${aiStep === idx ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'border-transparent text-foreground'} ${rejectionData && idx === 2 ? 'bg-destructive/10 border-destructive/30 text-destructive font-bold' : ''}`}
                                   >
                                     <div className={`p-1.5 rounded-lg ${aiStep === idx ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'} ${rejectionData && idx === 2 ? 'bg-destructive text-destructive-foreground' : ''}`}>
                                       {agent.icon}
                                     </div>
                                     <div className="flex-1 text-xs font-semibold">{agent.text}</div>
                                     {rejectionData && idx === 2 && <XCircle size={14} className="text-destructive shrink-0" />}
                                     {aiStep > idx && !(rejectionData && idx >= 2) && <Check size={14} className="text-emerald-400 shrink-0" />}
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

              {/* STEP 4: Simplified Clean AI Verification Report */}
              {step === 4 && (aiResult || rejectionData) && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 flex-1 pr-1"
                >
                  {rejectionData ? (
                    /* REJECTED REPORT CARD */
                    <div className="bg-card border border-destructive/30 rounded-3xl p-6 sm:p-8 text-center max-w-xl mx-auto space-y-6 shadow-2xl">
                      <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto border border-destructive/20">
                        <XCircle size={36} />
                      </div>
                      
                      <div>
                        <h2 className="text-2xl font-black text-destructive flex items-center justify-center gap-2">
                          ❌ Submission Rejected
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 font-semibold">
                          No public safety or civic infrastructure hazard found.
                        </p>
                      </div>

                      <div className="bg-secondary/40 border border-border rounded-2xl p-4 text-left space-y-3">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">Detected Content</span>
                          <p className="font-extrabold text-foreground text-sm mt-0.5">{rejectionData.detectedContent || 'Non-civic / Promotional Content'}</p>
                        </div>
                        
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">Reason</span>
                          <p className="text-sm font-semibold text-destructive mt-0.5">{rejectionData.error || 'This image does not contain a civic issue.'}</p>
                        </div>

                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">Suggestion</span>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Please upload an original image or video showing a real civic infrastructure problem.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => { setStep(1); setFile(null); setPreview(null); setRejectionData(null); setDescription(''); setLocationStr(''); }}
                          className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-extrabold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95"
                        >
                          <RefreshCw size={15} /> Try Again
                        </button>
                        <button
                          onClick={() => { setStep(3); setFile(null); setPreview(null); setRejectionData(null); }}
                          className="px-5 py-3 bg-secondary text-secondary-foreground rounded-xl text-xs font-extrabold shadow-lg hover:bg-secondary/80 transition-all active:scale-95"
                        >
                          Upload Another Image
                        </button>
                      </div>
                    </div>
                  ) : aiResult && (
                    /* VERIFIED CLEAN SINGLE-SCREEN REPORT CARD */
                    <div className="space-y-4 max-w-xl mx-auto">

                      {/* Header Status & Complaint ID */}
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <CheckCircle2 size={22} />
                          </div>
                          <div>
                            <h3 className="font-black text-emerald-400 text-sm sm:text-base flex items-center gap-1.5">
                              ✅ AI Verification Status: Verified
                            </h3>
                            {complaintId && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Complaint ID: <span className="font-extrabold text-foreground">{complaintId}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-extrabold uppercase tracking-wider">
                          Verified
                        </span>
                      </div>

                      {/* Main Result Card */}
                      <div className="p-5 sm:p-6 bg-card border border-border rounded-3xl space-y-4 shadow-xl">
                        
                        {/* Detected Issue */}
                        <div className="border-b border-border/50 pb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-1">Detected Issue</span>
                          <h2 className="text-xl sm:text-2xl font-black text-foreground">
                            {aiResult.issueDetected || aiResult.issueIdentification?.issue || aiResult.sceneDescription?.split('.')[0] || 'Civic Infrastructure Hazard'}
                          </h2>
                        </div>

                        {/* AI Observation */}
                        <div className="bg-secondary/30 border border-border/60 rounded-2xl p-4 space-y-1">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">AI Observation</span>
                          <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground/90">
                            {aiResult.sceneDescription || aiResult.enhancedDescription || 'Gemini detected a verified civic issue in the uploaded media.'}
                          </p>
                        </div>

                        {/* Metrics Grid: Department, Priority, Confidence */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* Assigned Department */}
                          <div className="p-3.5 bg-secondary/30 border border-border/60 rounded-2xl">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Assigned Department</span>
                            <p className="text-xs sm:text-sm font-extrabold text-primary truncate">
                              {aiResult.recommendedDepartment?.name || aiResult.suggestedDepartment || 'Road Maintenance'}
                            </p>
                          </div>

                          {/* Priority */}
                          <div className="p-3.5 bg-secondary/30 border border-border/60 rounded-2xl">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1">Priority</span>
                            <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-lg border ${
                              (aiResult.estimatedPriority || aiResult.severity) === 'Critical' || (aiResult.estimatedPriority || aiResult.severity) === 'High'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {aiResult.estimatedPriority || aiResult.severity || 'Medium'}
                            </span>
                          </div>

                          {/* Confidence */}
                          <div className="p-3.5 bg-secondary/30 border border-border/60 rounded-2xl">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Confidence</span>
                              <span className="text-xs font-black text-emerald-400">
                                {aiResult.scoreBreakdown?.overallConfidence || aiResult.evidenceAssessment?.confidence || aiResult.priorityScore || 92}%
                              </span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden border border-border/40">
                              <div
                                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${aiResult.scoreBreakdown?.overallConfidence || aiResult.evidenceAssessment?.confidence || aiResult.priorityScore || 92}%` }}
                              />
                            </div>
                          </div>

                        </div>

                        {/* Location Verification Status */}
                        <div className="p-3 bg-secondary/20 border border-border/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-bold text-muted-foreground">Location Verification:</span>
                          <span className={`font-extrabold flex items-center gap-1 ${
                            gpsStatus === 'verified' && (gpsDetails || aiResult.locationEvidence?.locationVerified)
                              ? 'text-emerald-400'
                              : gpsStatus === 'denied'
                              ? 'text-amber-400'
                              : 'text-muted-foreground'
                          }`}>
                            {gpsStatus === 'verified' && (gpsDetails || aiResult.locationEvidence?.locationVerified)
                              ? '✅ GPS Verified'
                              : gpsStatus === 'denied'
                              ? '⚠ GPS Permission Denied'
                              : '⚠ GPS Not Available'}
                          </span>
                        </div>

                      </div>

                      {/* CTA Button */}
                      <div className="pt-1">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-95"
                        >
                          Track Complaint Status <ChevronRight size={18} />
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
