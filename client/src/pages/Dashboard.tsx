import React, { useEffect, useState } from 'react';
import { CountUp } from '../components/CountUp';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, ChevronRight, MapPin, Camera } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ComplaintDrawer from '../components/ComplaintDrawer';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import { useTranslation } from 'react-i18next';
import CivicMap from '../components/CivicMap';

let cachedComplaintsData: any[] | null = null;

const Dashboard = () => {
  const [complaints, setComplaints] = useState<any[]>(() => cachedComplaintsData || []);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !cachedComplaintsData);
  const [visibleCount, setVisibleCount] = useState(10);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const loadComplaints = () => {
      const headers: Record<string, string> = {
        'x-language': i18n.language
      };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      fetch('/api/complaints', { headers })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            cachedComplaintsData = data;
            setComplaints(data);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    };

    loadComplaints();

    const handleSubmission = (e: any) => {
      if (e?.detail) {
        const newComplaint = e.detail;
        setComplaints(prev => {
          const filtered = prev.filter(c => c._id !== newComplaint._id && c.complaintId !== newComplaint.complaintId);
          const updated = [newComplaint, ...filtered];
          cachedComplaintsData = updated;
          return updated;
        });
      }
      loadComplaints();
    };

    window.addEventListener('complaint-submitted', handleSubmission);
    window.addEventListener('focus', loadComplaints);
    const interval = setInterval(loadComplaints, 6000);

    return () => {
      window.removeEventListener('complaint-submitted', handleSubmission);
      window.removeEventListener('focus', loadComplaints);
      clearInterval(interval);
    };
  }, [user, i18n.language]);

  const highestPriority = complaints.find(c => c.severity === 'Critical') || complaints[0];

  const criticalCount = complaints.filter(c => c.severity === 'Critical').length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
  const newCount = complaints.filter(c => c.status === 'New').length;

  const handleMarkerClick = (complaint: any) => {
    setSelectedComplaint(complaint);
    setIsDrawerOpen(true);
  };

  const handleApprove = (id: string) => {
    navigate(`/issue/${id}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground pt-4 md:pt-10 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Header & Overview */}
        <div className="mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4 md:mb-6">
            {user?.role === 'officer' ? t('dashboard.title') : t('dashboard.citizenTitle')}
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.avgResolution')}</span>
              <div className="flex items-end gap-2 mt-4">
                <CountUp end={24} suffix="h" className="text-lg md:text-4xl font-extrabold text-blue-400" />
                <span className="text-sm text-green-500 font-medium mb-1">-2h {t('dashboard.thisWeek')}</span>
              </div>
            </div>
            
            <div className="p-3 md:p-6 bg-card border border-border rounded-2xl flex flex-col justify-between active:scale-95 transition-transform">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.critical')}</span>
              <div className="flex items-end gap-2 mt-4">
                <CountUp end={criticalCount} className="text-lg md:text-4xl font-extrabold text-destructive" />
                <span className="text-sm text-destructive font-medium mb-1">{t('dashboard.needsAction')}</span>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.pendingReview')}</span>
              <div className="flex items-end gap-2 mt-4">
                <CountUp end={pendingCount} className="text-lg md:text-4xl font-extrabold" />
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.resolvedToday')}</span>
              <div className="flex items-end gap-2 mt-4">
                <CountUp end={resolvedCount} className="text-lg md:text-4xl font-extrabold text-green-500" />
              </div>
            </div>
          </div>

          {user?.role === 'officer' && (
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4 items-start">
              <ShieldCheck className="text-primary shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed font-medium">
                <strong className="text-primary">{t('dashboard.aiSummary')}:</strong> Road infrastructure complaints have spiked by 18% in the northern district due to recent rainfall. It is recommended to deploy an additional maintenance team to sector 4 to prevent further traffic gridlock.
              </p>
            </div>
          )}
        </div>

        {/* Hero Card: Highest Priority (Officer Only) */}
        {user?.role === 'officer' && highestPriority && highestPriority.status !== 'Resolved' && (
          <div className="mb-10 bg-card border border-destructive/30 rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row relative min-h-[250px]">
            <div className="absolute top-0 left-0 w-2 h-full bg-destructive z-10" />
            <div className="md:w-1/3 h-48 md:h-auto border-r border-border relative bg-secondary/20 flex items-center justify-center">
              {highestPriority.imageUrl ? (
                <img src={highestPriority.imageUrl} alt="Critical Issue" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <Camera size={40} className="text-muted-foreground opacity-30" />
              )}
              <div className="absolute top-4 left-4 px-3 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded shadow-lg uppercase tracking-wider">
                {t('dashboard.criticalPriority')}
              </div>
            </div>
            
            <div className="flex-1 p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{highestPriority.issueDetected || "Infrastructure Hazard"}</h2>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm"><MapPin size={14} /> {highestPriority.location?.address}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase font-semibold block mb-1">{t('dashboard.confidence')}</span>
                    <span className="text-xl font-bold">{highestPriority.evidence?.overallStrength || 0}%</span>
                  </div>
                </div>
                
                <p className="text-sm bg-secondary/30 p-4 rounded-xl mb-6 border border-border leading-relaxed">
                  <strong className="block mb-1 text-foreground">{t('dashboard.aiReasoning')}:</strong>
                  {highestPriority.evidence?.sceneAnalysis || "Severe structural degradation detected. Immediate risk to public safety."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-6 mt-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block mb-1">{t('dashboard.routeTo')}</span>
                  <span className="font-bold text-primary">{highestPriority.suggestedDepartment || "General Maintenance"}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => navigate(`/issue/${highestPriority.complaintId}`)} className="px-6 py-2.5 rounded-lg border border-border font-semibold hover:bg-secondary active:scale-95 transition-transform transition-colors">
                    {t('dashboard.viewDetails')}
                  </button>
                  <button onClick={() => handleApprove(highestPriority._id)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-transform transition-colors shadow-lg">
                    {t('dashboard.approveDispatch')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Civic Intelligence Map */}
          <div className="lg:col-span-2 h-[600px]">
            <CivicMap complaints={complaints} onMarkerClick={handleMarkerClick} />
          </div>

          {/* Recent List */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-lg flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t('dashboard.recentReports')}</h3>
              <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full">
                {complaints.length} Total Reports
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                <Activity className="animate-spin text-primary" size={36} />
                <p className="text-xs font-semibold animate-pulse">{t('dashboard.fetchingData', 'Loading recent reports...')}</p>
              </div>
            ) : complaints.length === 0 ? (
              <EmptyState 
                icon={Activity} 
                title={t('dashboard.noReports')}
                description={user?.role === 'officer' ? t('dashboard.noReportsDescOfficer') : t('dashboard.noReportsDescCitizen')}
                actionLabel={user?.role === 'citizen' ? t('empty.reportAnIssue') : undefined}
                actionPath={user?.role === 'citizen' ? '/report' : undefined}
              />
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2 flex-1 max-h-[520px]">
                {complaints.slice(0, visibleCount).map(c => (
                  <div 
                    key={c._id || c.complaintId} 
                    onClick={() => navigate(`/issue/${c.complaintId}`)}
                    className="p-3.5 md:p-4 rounded-2xl border border-border hover:border-primary/50 bg-background cursor-pointer transition-colors active:scale-95 transition-transform shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm truncate pr-4">{c.issueDetected || c.originalDescription || "Report"}</h4>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 ${
                        c.severity === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {c.severity}
                      </span>
                    </div>
<div className="text-sm text-muted-foreground line-clamp-2 mb-2">{c.enhancedDescription || ''}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span className="truncate">{c.location?.address?.split(',')[0]}</span>
                      <span>•</span>
                      <span>{new Date(c.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">{c.suggestedDepartment || "General"}</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}

                {visibleCount < complaints.length && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="w-full py-3 bg-secondary/50 border border-border text-foreground hover:bg-secondary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Load More Previous Reports ({complaints.length - visibleCount} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ComplaintDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        complaint={selectedComplaint} 
      />
    </div>
  );
};

export default Dashboard;
