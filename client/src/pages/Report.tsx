import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, AlertTriangle, Activity, MapPin, Search, Check, FileText, BrainCircuit, ScanSearch, Gavel, Sparkles } from 'lucide-react';
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
  const { i18n } = useTranslation();
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
        setStep(4); // Move to results step
        setIsAnalyzing(false);
        toast.success('Analysis Complete', { description: 'The AI has finished reviewing your report.' });
      }, 1000);
    } catch (err: any) {
      console.error(err);
      toast.error('AI Processing Failed', { description: err.message || 'An error occurred.' });
      clearInterval(steps);
      setIsAnalyzing(false);
    }
  };

  const agentSteps = [
    { icon: <ScanSearch size={20} />, text: "Vision Agent: Detecting objects in scene..." },
    { icon: <BrainCircuit size={20} />, text: "Analytics Agent: Cross-referencing description..." },
    { icon: <Gavel size={20} />, text: "Decision Agent: Prioritizing and routing..." },
    { icon: <Sparkles size={20} />, text: "Gemini: Compiling final recommendation..." }
  ];

  return (
    <div className="min-h-[88vh] bg-background relative overflow-hidden flex flex-col items-center justify-start pt-6 md:pt-12 pb-10">
      <div className="max-w-3xl w-full mx-auto px-4 md:px-6 relative z-10">
        
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10" />
          {[1, 2, 3].map((num) => (
            <div 
              key={num}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors duration-500
                ${step >= num ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-card text-muted-foreground border border-border'}`}
            >
              {step > num ? <Check size={18} /> : num}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: What happened? */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">What happened?</h2>
                  <p className="text-muted-foreground">Describe the issue in your own words. Gemini will automatically extract the key details.</p>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                  <VoiceInput onResult={(text) => setDescription(prev => prev ? `${prev} ${text}` : text)} />
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. There is a huge pothole causing traffic, it looks quite dangerous for bikes..."
                  className="w-full h-40 bg-secondary/30 border border-border rounded-2xl p-5 text-lg text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-colors resize-none placeholder:text-muted-foreground/50"
                  autoFocus
                />
                
                <div className="flex justify-end pt-4">
                  <button
                    disabled={!description.trim()}
                    onClick={() => setStep(2)}
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
                  >
                    Next <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Where did it happen? */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">Where is it located?</h2>
                  <p className="text-muted-foreground">Provide the nearest landmark or street address.</p>
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                  <input 
                    type="text"
                    value={locationStr}
                    onChange={(e) => setLocationStr(e.target.value)}
                    placeholder="e.g. 123 Main Street, Andheri East"
                    className="w-full bg-secondary/30 border border-border rounded-2xl py-5 pl-14 pr-5 text-lg text-foreground focus:ring-2 focus:ring-primary focus:bg-background transition-colors placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>
                
                <div className="flex justify-between items-center pt-8">
                  <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground font-medium px-4 py-2">Back</button>
                  <button
                    disabled={!locationStr.trim()}
                    onClick={() => setStep(3)}
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
                  >
                    Next <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Image Upload & Scanning */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2">Upload Evidence</h2>
                  <p className="text-muted-foreground">Snap a photo or upload an image. The AI needs this to verify the claim.</p>
                </div>
                
                <div className="relative border-2 border-dashed border-border rounded-2xl h-80 flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors bg-secondary/20 cursor-pointer group">
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
                         <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex flex-col justify-center p-8">
                           <div className="space-y-6 max-w-md mx-auto w-full">
                             {agentSteps.map((agent, idx) => (
                               <motion.div 
                                 key={idx}
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: aiStep >= idx ? 1 : 0.3, x: aiStep >= idx ? 0 : -10 }}
                                 className={`flex items-center gap-4 ${aiStep === idx ? 'text-primary font-medium' : 'text-foreground'}`}
                               >
                                 <div className={`p-2 rounded-lg ${aiStep === idx ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                   {agent.icon}
                                 </div>
                                 <div className="flex-1">
                                   <div className="text-sm">{agent.text}</div>
                                 </div>
                                 {aiStep > idx && <Check size={16} className="text-primary" />}
                                 {aiStep === idx && <Activity size={16} className="text-primary animate-spin" />}
                               </motion.div>
                             ))}
                           </div>
                         </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
                      <Upload size={48} className="mb-4" />
                      <p className="font-semibold text-lg">Click or drag an image here</p>
                      <p className="text-sm mt-2 opacity-70">JPEG, PNG up to 10MB</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-8">
                  <button onClick={() => setStep(2)} className="text-muted-foreground hover:text-foreground font-medium px-4 py-2" disabled={isAnalyzing}>Back</button>
                  <button
                    onClick={handleAnalyze}
                    disabled={!file || isAnalyzing}
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
                  >
                    {isAnalyzing ? (
                      <>Processing...</>
                    ) : (
                      <>Run Analysis <Search size={20} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: AI Results (Responsible AI View) */}
            {step === 4 && aiResult && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {!aiResult.isGenuine ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Evidence Unclear</h2>
                    <p className="text-muted-foreground text-lg mb-4 max-w-lg mx-auto">
                      {aiResult.evidenceAssessment.limitations || aiResult.evidenceAssessment.reasoning[0] || "The AI could not clearly identify the issue from the provided image."}
                    </p>
                    <p className="text-sm font-semibold mb-8">Please try again with a clearer, well-lit photo of the issue.</p>
                    <button onClick={() => { setStep(3); setFile(null); setPreview(null); }} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg">Upload Clearer Image</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                        <Check size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Report Verified</h2>
                        <p className="text-muted-foreground">AI has processed your submission.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Left: Assessment Details */}
                      <div className="space-y-4">
                        <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                          <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Scene Analysis</span>
                          <p className="text-sm font-medium leading-relaxed">
                            {aiResult.evidenceAssessment.sceneAnalysis}
                          </p>
                        </div>
                        <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                          <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Detected Objects</span>
                          <div className="flex flex-wrap gap-2">
                            {aiResult.evidenceAssessment.detectedObjects?.map((obj: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-background rounded-md text-xs border border-border">{obj}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Responsible AI Limitations */}
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={16} />
                            <span className="text-sm uppercase tracking-wider font-semibold">AI Limitations</span>
                          </div>
                          <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                            {aiResult.evidenceAssessment.limitations}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                           <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Confidence & Reasoning</span>
                           <div className="flex items-center gap-3 mb-3">
                             <div className="h-2 flex-1 bg-background rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{ width: `${aiResult.evidenceAssessment.confidence}%` }} />
                             </div>
                             <span className="text-sm font-bold">{aiResult.evidenceAssessment.confidence}%</span>
                           </div>
                           <ul className="text-xs space-y-2 text-muted-foreground">
                             {aiResult.evidenceAssessment.reasoning?.map((r: string, i: number) => (
                               <li key={i} className="flex items-start gap-2">
                                 <div className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                                 <span>{r}</span>
                               </li>
                             ))}
                           </ul>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl flex items-center justify-between mb-8">
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">Assigned Department</span>
                        <span className="font-bold text-lg text-primary">{aiResult.suggestedDepartment}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground block mb-1">Priority</span>
                        <span className="font-bold text-lg text-foreground">{aiResult.estimatedPriority}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => navigate('/issue')}
                        className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
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
      </div>
    </div>
  );
};

export default Report;
