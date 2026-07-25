import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, MapPin, CheckCircle2, AlertTriangle, ChevronRight, Check, FileText, ArrowLeft, Loader2, User, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import VoiceInput from '../components/VoiceInput';
import { useTranslation } from 'react-i18next';

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [complaintId, setComplaintId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  
  // Officer Action State
  const [notes, setNotes] = useState('');
  const [suggestedDepartment, setSuggestedDepartment] = useState('');
  const [assignedOfficerName, setAssignedOfficerName] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [budgetEstimation, setBudgetEstimation] = useState('');
  const [resourceAllocation, setResourceAllocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComplaint = async (searchId: string) => {
    setIsSearching(true);
    setError('');
    
    try {
      const headers: Record<string, string> = {
        'x-language': i18n.language
      };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const response = await fetch(`/api/complaints/track/${searchId}`, {
        headers
      });
      if (!response.ok) {
        throw new Error('Complaint not found');
      }
      const found = await response.json();
      setComplaint(found);
      
      if (user?.role === 'officer') {
        setNotes(found.officerNotes || '');
        setSuggestedDepartment(found.suggestedDepartment || '');
        setAssignedOfficerName(found.assignedOfficerName || '');
        if (found.expectedCompletionDate) {
          setExpectedCompletionDate(new Date(found.expectedCompletionDate).toISOString().split('T')[0]);
        }
        setBudgetEstimation(found.budgetEstimation || '');
        setResourceAllocation(found.resourceAllocation || '');
      }
    } catch (err: any) {
      setError('We could not find a complaint with that ID. Please check and try again.');
      setComplaint(null);
      toast.error('Not Found', { description: 'Please check your Complaint ID.' });
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchComplaint(id);
    }
  }, [id, user, i18n.language]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintId.trim()) return;
    navigate(`/issue/${complaintId.toUpperCase()}`);
  };

  const handleAction = async (newStatus: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/complaints/${complaint._id}/review`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ 
          status: newStatus, 
          officerNotes: notes,
          suggestedDepartment,
          assignedOfficerName,
          expectedCompletionDate,
          budgetEstimation,
          resourceAllocation 
        })
      });
      
      if (!response.ok) throw new Error("Failed to update status");
      
      toast.success("Officer review submitted successfully");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 'Reported', label: t('timeline.reported', 'Reported'), icon: <User size={16} /> },
    { id: 'AI Reviewed', label: t('timeline.aiReview', 'AI Evidence Verified'), icon: <ShieldCheck size={16} /> },
    { 
      id: 'Officer Review', 
      label: complaint?.status === 'Rejected' ? t('status.Rejected', 'Rejected') : complaint?.status === 'Needs Manual Inspection' ? t('status.Needs Manual Inspection', 'Manual Inspection Required') : complaint?.status === 'Needs More Evidence' ? t('status.Needs More Evidence', 'More Evidence Required') : t('timeline.officerAssigned', 'Officer Review'), 
      icon: ['Rejected', 'Needs Manual Inspection', 'Needs More Evidence'].includes(complaint?.status) ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />
    },
    { id: 'Dept Assigned', label: t('issue.assignDepartment', 'Department Assigned'), icon: <ChevronRight size={16} /> },
    { id: 'In Progress', label: t('timeline.inProgress', 'Work Started'), icon: <Clock size={16} /> },
    { id: 'Resolved', label: t('timeline.resolved', 'Resolved'), icon: <Check size={16} /> }
  ];

  const getCompletedSteps = (status: string) => {
    const s = [ 'Reported', 'AI Reviewed' ];
    if (status !== 'Pending') s.push('Officer Review');
    if (['Assigned', 'In Progress', 'Resolved'].includes(status)) s.push('Dept Assigned');
    if (['In Progress', 'Resolved'].includes(status)) s.push('In Progress');
    if (status === 'Resolved') s.push('Resolved');
    return s;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 sm:pt-24 pb-12 flex flex-col items-center">
      <div className="max-w-6xl w-full px-4 sm:px-6 md:px-8">
        
        {!id && (
          <>
            <div className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">{t('issue.searchTitle', 'Track Your Complaint')}</h1>
              <p className="text-muted-foreground text-base sm:text-lg">{t('issue.searchSubtitle', 'Enter your Complaint ID for complete transparency on your issue\'s status.')}</p>
            </div>
            <form onSubmit={handleSearch} className="relative mb-8 sm:mb-12 max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-muted-foreground" size={22} />
                <input 
                  type="text"
                  value={complaintId}
                  onChange={(e) => setComplaintId(e.target.value.toUpperCase())}
                  placeholder={t('issue.searchPlaceholder', 'e.g. CM-1234')}
                  className="w-full bg-card border border-border rounded-2xl sm:rounded-full min-h-[48px] py-4 sm:py-5 pl-12 sm:pl-16 pr-28 sm:pr-44 text-base sm:text-lg focus:ring-2 focus:ring-primary shadow-lg uppercase"
                />
                <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                  <VoiceInput onResult={(text) => setComplaintId(text.toUpperCase())} />
                  <button 
                    type="submit"
                    disabled={isSearching || !complaintId.trim()}
                    className="px-5 sm:px-8 h-full min-h-[44px] bg-primary text-primary-foreground rounded-xl sm:rounded-full font-bold hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 className="animate-spin" size={20} /> : t('issue.search', 'Search')}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-3 justify-center max-w-3xl mx-auto"
            >
              <AlertTriangle size={20} />
              {error}
            </motion.div>
          )}

          {complaint && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              {/* Header */}
              <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <button 
                    onClick={() => navigate(-1)}
                    className="p-3 min-w-[44px] min-h-[44px] bg-secondary hover:bg-secondary/80 active:scale-95 rounded-xl transition-all flex items-center justify-center shrink-0"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{user?.role === 'officer' ? t('issue.officerDecision', 'Officer Review Workspace') : t('issue.yourComplaint', 'Issue Details')}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-muted-foreground text-sm sm:text-base">
                        {t('report.complaintId', 'Complaint ID')}: <span className="font-semibold text-foreground">{complaint.complaintId}</span>
                      </p>
                      <span className="text-xs px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg uppercase font-bold tracking-wider">{String(t(`status.${complaint.status}`, complaint.status))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
                
                {/* Left Column: Evidence & Citizen Report */}
                <div className="space-y-5 sm:space-y-6 md:space-y-8">
                  <div className="bg-card border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg">
                    <div className="p-4 sm:p-6 border-b border-border flex items-center gap-2 font-bold text-base sm:text-lg">
                      <User className="text-primary" size={20} />
                      {t('report.step3', 'Citizen Evidence')}
                    </div>
                    <img src={complaint.imageUrl} alt="Evidence" className="w-full h-48 sm:h-64 object-cover rounded-b-none" />
                    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">{t('report.location', 'Reported Location')}</span>
                        <div className="flex items-start gap-2">
                          <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                          <p className="font-medium text-sm leading-relaxed">{complaint.location?.address || 'Unknown'}</p>
                        </div>
                        {complaint.evidence?.gpsAvailable && (
                          <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-green-500/10 text-green-500 rounded">
                            {t('issue.gpsVerified', 'GPS Metadata Verified')}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">{t('report.description', 'Original Description')}</span>
                        <p className="text-sm bg-secondary/30 p-4 rounded-xl border border-border italic text-muted-foreground">
                          "{complaint.originalDescription}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg">
                    <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6">{t('issue.timeline', 'Resolution Timeline')}</h3>
                    <div className="relative pl-4 space-y-5 sm:space-y-8">
                      <div className="absolute top-2 bottom-2 left-[23px] w-0.5 bg-secondary -z-10" />
                      
                      {steps.map((step) => {
                        const completedSteps = getCompletedSteps(complaint.status);
                        const isCompleted = completedSteps.includes(step.id);
                        const isCurrent = completedSteps[completedSteps.length - 1] === step.id;
                        
                        return (
                          <div key={step.id} className="flex items-center gap-3 sm:gap-4 min-h-[44px]">
                            <div className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors duration-500
                              ${isCurrent ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 
                                isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                                'bg-card border-border text-muted-foreground'}
                            `}>
                              {step.icon}
                            </div>
                            <div>
                              <p className={`font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                              {step.id === 'Dept Assigned' && isCompleted && (
                                <p className="text-sm text-primary mt-1">{complaint.suggestedDepartment}</p>
                              )}
                              {step.id === 'Reported' && isCompleted && (
                                <p className="text-xs text-muted-foreground mt-1">{new Date(complaint.createdAt).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Middle/Right Column: AI Assessment */}
                <div className="lg:col-span-2 space-y-5 sm:space-y-6 md:space-y-8">
                  <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-5 sm:mb-8 border-b border-border pb-4 sm:pb-6 relative z-10">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <ShieldCheck size={24} className="text-primary sm:w-7 sm:h-7" />
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">AI Evidence Assessment</h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8 relative z-10">
                      <div className="p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border">
                        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Scene Matches</span>
                        <span className="text-lg sm:text-xl font-bold">{complaint.evidence?.sceneMatch || 0}%</span>
                      </div>
                      <div className="p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border">
                        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Confidence</span>
                        <span className="text-lg sm:text-xl font-bold">{complaint.evidence?.overallStrength || 0}%</span>
                      </div>
                      <div className="p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border">
                        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">GPS Present</span>
                        <span className="text-lg sm:text-xl font-bold">{complaint.evidence?.gpsAvailable ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border">
                        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Evid. Strength</span>
                        <span className={`text-lg sm:text-xl font-bold ${complaint.severity === 'Critical' ? 'text-destructive' : 'text-primary'}`}>{complaint.severity}</span>
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scene Analysis</h3>
                        <p className="text-sm leading-relaxed p-4 bg-background border border-border rounded-xl">
                          {complaint.evidence?.sceneAnalysis}
                        </p>
                      </div>

                      {user?.role === 'officer' && (
                        <div>
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Objects Detected</h3>
                          <div className="flex flex-wrap gap-2">
                            {complaint.evidence?.detectedObjects?.map((obj: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded-lg border border-border">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reasoning</h3>
                        <ul className="text-sm space-y-2 p-4 bg-background border border-border rounded-xl">
                          {complaint.evidence?.reasoning?.map((r: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check size={16} className="text-primary shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {user?.role === 'officer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Dept</h3>
                            <p className="font-bold text-primary">{complaint.suggestedDepartment || complaint.evidence?.suggestedDepartment}</p>
                          </div>
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommended Action</h3>
                            <p className="font-bold text-foreground">{complaint.recommendedAction || "Dispatch maintenance team."}</p>
                          </div>
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Est. Budget Needed</h3>
                            <p className="font-bold text-foreground">{complaint.budgetEstimation || "Requires manual estimation"}</p>
                          </div>
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resources Required</h3>
                            <p className="font-bold text-foreground">{complaint.resourceAllocation || "Field team evaluation needed"}</p>
                          </div>
                        </div>
                      )}

                      <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                          <AlertTriangle size={18} />
                          <span className="text-sm uppercase tracking-wider font-bold">Limitations</span>
                        </div>
                        <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                          {complaint.evidence?.limitations || 'No significant limitations detected in this image context.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user?.role === 'officer' && (
                    <>
                      {/* Assignment Panel */}
                      <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Assignment Panel</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Department</label>
                            <input
                              type="text"
                              value={suggestedDepartment}
                              onChange={(e) => setSuggestedDepartment(e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded-xl p-3 min-h-[44px] text-sm focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Officer Name</label>
                            <input
                              type="text"
                              value={assignedOfficerName}
                              onChange={(e) => setAssignedOfficerName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full bg-secondary/30 border border-border rounded-xl p-3 min-h-[44px] text-sm focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Expected Completion Date</label>
                            <input
                              type="date"
                              value={expectedCompletionDate}
                              onChange={(e) => setExpectedCompletionDate(e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded-xl p-3 min-h-[44px] text-sm focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Budget Estimation</label>
                            <input
                              type="text"
                              value={budgetEstimation}
                              onChange={(e) => setBudgetEstimation(e.target.value)}
                              placeholder="e.g. $5,000"
                              className="w-full bg-secondary/30 border border-border rounded-xl p-3 min-h-[44px] text-sm focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Resource Allocation</label>
                            <input
                              type="text"
                              value={resourceAllocation}
                              onChange={(e) => setResourceAllocation(e.target.value)}
                              placeholder="e.g. 1 Crane, 3 Workers"
                              className="w-full bg-secondary/30 border border-border rounded-xl p-3 min-h-[44px] text-sm focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Panel */}
                      <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Officer Decision</h2>
                        
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold">Officer Notes (Internal)</label>
                            <VoiceInput onResult={(text) => setNotes(prev => prev ? `${prev} ${text}` : text)} />
                          </div>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add your rationale for this decision..."
                            className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary focus:bg-background transition-colors resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                          <button 
                            disabled={isSubmitting}
                            onClick={() => handleAction('Assigned')}
                            className="p-3 min-h-[48px] bg-primary/10 hover:bg-primary/20 active:scale-95 text-primary border border-primary/20 rounded-xl font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 text-center"
                          >
                            <ChevronRight size={20} />
                            Assign
                          </button>
                          <button 
                            disabled={isSubmitting}
                            onClick={() => handleAction('In Progress')}
                            className="p-3 min-h-[48px] bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-600 border border-blue-500/20 rounded-xl font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 text-center"
                          >
                            <MapPin size={20} />
                            Escalate
                          </button>
                          <button 
                            disabled={isSubmitting}
                            onClick={() => handleAction('Resolved')}
                            className="p-3 min-h-[48px] bg-green-500/10 hover:bg-green-500/20 active:scale-95 text-green-600 border border-green-500/20 rounded-xl font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 text-center"
                          >
                            <CheckCircle2 size={20} />
                            Resolve
                          </button>
                          <button 
                            disabled={isSubmitting}
                            onClick={() => handleAction('Needs More Evidence')}
                            className="p-3 min-h-[48px] bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-600 border border-amber-500/20 rounded-xl font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 text-center"
                          >
                            <FileText size={20} />
                            Ask Proof
                          </button>
                          <button 
                            disabled={isSubmitting}
                            onClick={() => handleAction('Rejected')}
                            className="p-3 min-h-[48px] bg-destructive/10 hover:bg-destructive/20 active:scale-95 text-destructive border border-destructive/20 rounded-xl font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 text-center"
                          >
                            <AlertTriangle size={20} />
                            Reject
                          </button>
                          <button 
                            disabled={isSubmitting}
                            onClick={() => handleAction('Rejected')}
                            className="p-3 min-h-[48px] bg-secondary/30 hover:bg-secondary/50 active:scale-95 text-muted-foreground border border-border rounded-xl font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 text-center"
                          >
                            <AlertTriangle size={20} />
                            Duplicate
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default IssueDetails;
