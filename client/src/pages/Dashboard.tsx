import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Search, Activity, ShieldCheck, MapIcon, ChevronRight, MapPin, Camera } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import ComplaintDrawer from '../components/ComplaintDrawer';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 });
  const [mapZoom, setMapZoom] = useState(11);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    fetch('/api/complaints', {
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'x-language': i18n.language
      }
    })
      .then(res => res.json())
      .then(data => {
        // Handle array response
        if (Array.isArray(data)) {
          setComplaints(data);
          if (data.length > 0 && data[0].location?.lat) {
             setMapCenter({ lat: data[0].location.lat, lng: data[0].location.lng });
          }
        } else {
          console.error("Expected array, got:", data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [user, i18n.language]);

  const highestPriority = complaints.find(c => c.severity === 'Critical') || complaints[0];

  const criticalCount = complaints.filter(c => c.severity === 'Critical').length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const handleMarkerClick = (complaint: any) => {
    setSelectedComplaint(complaint);
    setIsDrawerOpen(true);
    if (complaint.location?.lat) {
      setMapCenter({ lat: complaint.location.lat, lng: complaint.location.lng });
      setMapZoom(16);
    }
  };

  const handleApprove = (id: string) => {
    navigate(`/issue/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-10 w-64 bg-secondary/50 rounded-lg animate-pulse mb-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 bg-card border border-border rounded-2xl h-32 flex flex-col justify-between">
                <div className="h-4 w-24 bg-secondary/50 rounded animate-pulse" />
                <div className="h-10 w-16 bg-secondary/50 rounded animate-pulse mt-4" />
              </div>
            ))}
          </div>

          <div className="h-20 w-full bg-secondary/30 rounded-2xl animate-pulse mb-10 border border-border" />

          <div className="h-64 w-full bg-card border border-border rounded-3xl animate-pulse mb-10 shadow-lg" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[600px] bg-card border border-border rounded-3xl relative overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-background animate-pulse" />
              <MapIcon size={48} className="text-secondary opacity-50 mb-4 z-10" />
              <div className="text-muted-foreground font-semibold tracking-wide z-10 flex flex-col items-center">
                <span>Loading Interactive Map...</span>
                <span className="text-sm opacity-60 mt-1">Fetching community data</span>
                <div className="w-32 h-2 bg-secondary rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-primary/50 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{width: '60%'}} />
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-3xl p-6 h-[600px] flex flex-col">
              <div className="h-8 w-32 bg-secondary/50 rounded animate-pulse mb-6" />
              <div className="space-y-4 flex-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 w-full bg-secondary/30 rounded-xl animate-pulse border border-border" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground pt-4 md:pt-10 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Header & Overview */}
        <div className="mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4 md:mb-6">
            {user?.role === 'officer' ? t('dashboard.title') : t('dashboard.citizenTitle')}
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.avgResolution')}</span>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-extrabold text-blue-400">24h</span>
                <span className="text-sm text-green-500 font-medium mb-1">-2h {t('dashboard.thisWeek')}</span>
              </div>
            </div>
            
            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.critical')}</span>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-extrabold text-destructive">{criticalCount}</span>
                <span className="text-sm text-destructive font-medium mb-1">{t('dashboard.needsAction')}</span>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.pendingReview')}</span>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-extrabold">{pendingCount}</span>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl flex flex-col justify-between">
              <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{t('dashboard.resolvedToday')}</span>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-extrabold text-green-500">{resolvedCount}</span>
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
                  <button onClick={() => navigate(`/issue/${highestPriority.complaintId}`)} className="px-6 py-2.5 rounded-lg border border-border font-semibold hover:bg-secondary transition-colors">
                    {t('dashboard.viewDetails')}
                  </button>
                  <button onClick={() => handleApprove(highestPriority._id)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-lg">
                    {t('dashboard.approveDispatch')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Map */}
          <div className="lg:col-span-2 h-[600px] bg-card border border-border rounded-3xl overflow-hidden relative shadow-lg">
            {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
              <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                <Map
                  mapId={import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
                  defaultZoom={11}
                  defaultCenter={mapCenter}
                  center={mapCenter}
                  zoom={mapZoom}
                  onCenterChanged={ev => setMapCenter(ev.detail.center)}
                  onZoomChanged={ev => setMapZoom(ev.detail.zoom)}
                  disableDefaultUI={true}
                  className="w-full h-full"
                >
                  {complaints.map((c) => c.location?.lat && (
                    <AdvancedMarker 
                      key={c._id} 
                      position={{ lat: c.location.lat, lng: c.location.lng }}
                      onClick={() => handleMarkerClick(c)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform ${
                        c.severity === 'Critical' ? 'bg-destructive' : 
                        c.status === 'Resolved' ? 'bg-green-500' : 'bg-primary'
                      }`}>
                        {c.severity === 'Critical' ? <AlertTriangle size={14} className="text-white" /> : <MapIcon size={14} className="text-white" />}
                      </div>
                    </AdvancedMarker>
                  ))}
                </Map>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/20 flex-col text-muted-foreground">
                <MapIcon size={48} className="mb-4 opacity-50" />
                <p>Google Maps API Key not configured</p>
              </div>
            )}
          </div>

          {/* Recent List */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-lg flex flex-col">
            <h3 className="text-xl font-bold mb-6">{t('dashboard.recentReports')}</h3>
            
            {complaints.length === 0 ? (
              <EmptyState 
                icon={Activity} 
                title={t('dashboard.noReports')}
                description={user?.role === 'officer' ? t('dashboard.noReportsDescOfficer') : t('dashboard.noReportsDescCitizen')}
                actionLabel={user?.role === 'citizen' ? t('empty.reportAnIssue') : undefined}
                actionPath={user?.role === 'citizen' ? '/report' : undefined}
              />
            ) : (
              <div className="space-y-4 overflow-y-auto pr-2 flex-1 max-h-[500px]">
                {complaints.map(c => (
                  <div 
                    key={c._id} 
                    onClick={() => navigate(`/issue/${c.complaintId}`)}
                    className="p-4 rounded-xl border border-border hover:border-primary/50 bg-background cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm truncate pr-4">{c.issueDetected || "Report"}</h4>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shrink-0 ${
                        c.severity === 'Critical' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {c.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span className="truncate">{c.location?.address?.split(',')[0]}</span>
                      <span>•</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">{c.suggestedDepartment || "General"}</span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
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
