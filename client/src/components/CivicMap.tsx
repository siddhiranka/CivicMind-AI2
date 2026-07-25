import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mic, MapPin, AlertTriangle, CheckCircle2, Clock,
  Activity, Brain, ZoomIn, ZoomOut, Layers, Maximize2,
  Navigation, TrendingUp, Zap, X, ChevronRight, Filter
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

/* ─── Types ────────────────────────────────────────────────── */
interface Complaint {
  _id: string;
  complaintId?: string;
  issueDetected?: string;
  severity?: string;
  status?: string;
  location?: { lat: number; lng: number; address?: string };
  suggestedDepartment?: string;
  evidence?: { overallStrength?: number; sceneAnalysis?: string };
  imageUrl?: string;
  createdAt?: string;
}

interface CivicMapProps {
  complaints: Complaint[];
  onMarkerClick?: (c: Complaint) => void;
}

/* ─── Constants ─────────────────────────────────────────────── */
const MUMBAI = { lat: 19.076, lng: 72.8777 };

const FILTERS = ['All', 'Critical', 'Roads', 'Water', 'Electricity', 'Garbage', 'Traffic', 'Environment'];

const LIVE_FEED = [
  { time: '2m ago', msg: 'New pothole reported – Bandra West', severity: 'Critical' },
  { time: '5m ago', msg: 'Water leakage resolved – Andheri', severity: 'Resolved' },
  { time: '9m ago', msg: 'Street light outage – Kurla', severity: 'High' },
  { time: '14m ago', msg: 'Garbage accumulation – Dharavi', severity: 'Medium' },
  { time: '20m ago', msg: 'Traffic signal malfunction – Borivali', severity: 'Critical' },
];

const AI_INSIGHTS = [
  { label: 'Complaint Density Alert', value: 'North Mumbai zone has 3× spike', icon: TrendingUp, color: 'text-red-400' },
  { label: 'Recommended Dispatch', value: 'Roads & Drainage Dept – Sector 4', icon: Zap, color: 'text-blue-400' },
  { label: 'Predicted Response Time', value: '≈ 3.2 hrs based on current load', icon: Clock, color: 'text-amber-400' },
  { label: 'AI Confidence Score', value: '96% pattern detection accuracy', icon: Brain, color: 'text-emerald-400' },
];

/* ─── Severity colour helpers ───────────────────────────────── */
const severityColor = (c: Complaint): string => {
  if (c.status === 'Resolved') return '#22c55e';
  if (c.severity === 'Critical') return '#ef4444';
  if (c.severity === 'High') return '#f97316';
  if (c.severity === 'Medium') return '#eab308';
  return '#6366f1';
};

const severityRing = (c: Complaint): string => {
  if (c.status === 'Resolved') return 'ring-green-500/40';
  if (c.severity === 'Critical') return 'ring-red-500/50';
  if (c.severity === 'High') return 'ring-orange-500/40';
  if (c.severity === 'Medium') return 'ring-yellow-500/40';
  return 'ring-primary/40';
};

const severityLabel = (c: Complaint): string => {
  if (c.status === 'Resolved') return '✅';
  if (c.severity === 'Critical') return '🔴';
  if (c.severity === 'High') return '🟠';
  if (c.severity === 'Medium') return '🟡';
  return '🔵';
};

const badgeColor = (sev: string): string => {
  if (sev === 'Critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (sev === 'Resolved') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (sev === 'High') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
};

/* ─── Main Component ────────────────────────────────────────── */
const CivicMap: React.FC<CivicMapProps> = ({ complaints, onMarkerClick }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isGeoSearching, setIsGeoSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(MUMBAI);
  const [mapZoom, setMapZoom] = useState(11);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedIdx, setFeedIdx] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  /* auto-scroll live feed */
  useEffect(() => {
    const t = setInterval(() => setFeedIdx(i => (i + 1) % LIVE_FEED.length), 3500);
    return () => clearInterval(t);
  }, []);

  /* filter complaints */
  const filtered = complaints.filter(c => {
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Critical' && c.severity === 'Critical') ||
      (activeFilter === 'Roads' && c.suggestedDepartment?.toLowerCase().includes('road')) ||
      (activeFilter === 'Water' && c.suggestedDepartment?.toLowerCase().includes('water')) ||
      (activeFilter === 'Electricity' && c.suggestedDepartment?.toLowerCase().includes('electric')) ||
      (activeFilter === 'Garbage' && c.suggestedDepartment?.toLowerCase().includes('sanit')) ||
      (activeFilter === 'Traffic' && c.suggestedDepartment?.toLowerCase().includes('traffic')) ||
      (activeFilter === 'Environment' && c.suggestedDepartment?.toLowerCase().includes('environ'));
    const matchSearch = !search || (c.issueDetected?.toLowerCase().includes(search.toLowerCase())) ||
      (c.location?.address?.toLowerCase().includes(search.toLowerCase())) ||
      (c.complaintId?.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  /* stats */
  const todayCount = complaints.length;
  const criticalCount = complaints.filter(c => c.severity === 'Critical').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapId = (import.meta as any).env?.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID';

  /* geocode search to pan map */
  const handleGeoSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    // First try to match a complaint ID or address in the data
    const matched = complaints.find(
      c => c.complaintId?.toLowerCase() === q.toLowerCase() ||
           c.location?.address?.toLowerCase().includes(q.toLowerCase())
    );
    if (matched?.location?.lat) {
      setMapCenter({ lat: matched.location.lat, lng: matched.location.lng });
      setMapZoom(16);
      setSelectedComplaint(matched);
      return;
    }
    // Fall back to Geocoding API
    if (!apiKey) return;
    setIsGeoSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.results[0]) {
        const loc = json.results[0].geometry.location;
        setMapCenter({ lat: loc.lat, lng: loc.lng });
        setMapZoom(14);
      }
    } catch (e) { /* silent */ } finally {
      setIsGeoSearching(false);
    }
  }, [complaints, apiKey]);

  /* voice search */
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setSearchInput(transcript);
      setSearch(transcript);
      handleGeoSearch(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, [isListening, handleGeoSearch]);

  /* fullscreen */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /* marker click */
  const handleMarker = (c: Complaint) => {
    setSelectedComplaint(c);
    if (c.location?.lat) { setMapCenter({ lat: c.location.lat, lng: c.location.lng }); setMapZoom(16); }
    onMarkerClick?.(c);
  };

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full rounded-3xl overflow-hidden bg-[#0d1117] border border-border"
    >
      {/* ── Map ── */}
      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          <Map
            mapId={mapId}
            defaultZoom={11}
            defaultCenter={MUMBAI}
            center={mapCenter}
            zoom={mapZoom}
            onCenterChanged={ev => setMapCenter(ev.detail.center)}
            onZoomChanged={ev => setMapZoom(ev.detail.zoom)}
            disableDefaultUI={true}
            mapTypeId={isSatellite ? 'satellite' : 'roadmap'}
            className="w-full h-full"
            onClick={() => setSelectedComplaint(null)}
          >
            {filtered.map(c => c.location?.lat && (
              <AdvancedMarker
                key={c._id}
                position={{ lat: c.location.lat, lng: c.location.lng }}
                onClick={() => handleMarker(c)}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: -10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ring-4 ${severityRing(c)} shadow-lg hover:scale-125 transition-transform`}
                  style={{ background: severityColor(c) }}
                  title={c.issueDetected}
                >
                  <span className="text-[13px]">{severityLabel(c)}</span>
                </motion.div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      ) : (
        /* Fallback – no API key */
        <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/20 gap-3">
          <MapPin size={48} className="text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">Google Maps API key not configured</p>
          <p className="text-muted-foreground/50 text-xs">Set VITE_GOOGLE_MAPS_API_KEY in .env</p>
        </div>
      )}

      {/* ── Gradient overlay corners ── */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-white/5" />

      {/* ── Search Bar ── */}
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[360px] z-30">
        <form
          onSubmit={e => { e.preventDefault(); setSearch(searchInput); handleGeoSearch(searchInput); }}
          className="flex items-center gap-2 bg-background/85 backdrop-blur-2xl border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl focus-within:ring-2 focus-within:ring-primary/50 transition-all"
        >
          <button type="submit" className="shrink-0 hover:text-primary text-muted-foreground transition-colors">
            {isGeoSearching
              ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
              : <Search size={16} />}
          </button>
          <input
            type="text"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setSearch(e.target.value); }}
            placeholder="Search city, locality or complaint ID..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none text-foreground"
          />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); }} className="shrink-0 hover:text-foreground text-muted-foreground transition-colors">
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setMapCenter(MUMBAI); setMapZoom(12); }}
            className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
            title="Reset to Mumbai"
          >
            <Navigation size={15} />
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            className={`shrink-0 p-1 rounded-lg transition-colors ${isListening ? 'text-primary bg-primary/20 animate-pulse' : 'hover:bg-white/10 text-muted-foreground hover:text-primary'}`}
            title="Voice Search"
          >
            <Mic size={15} />
          </button>
        </form>
      </div>

      {/* ── Filter Pills ── */}
      <div className="absolute top-[72px] left-4 right-4 z-30 overflow-x-auto pb-0.5 flex gap-2 hide-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
              activeFilter === f
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                : 'bg-background/80 backdrop-blur-md border-white/10 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Floating Stats Card ── */}
      <div className="absolute top-4 right-4 z-30 hidden md:block">
        <div className="bg-background/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-2xl w-[190px]">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity size={13} className="text-primary" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Live Stats</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Today's Reports", val: todayCount || 132, color: 'text-foreground' },
              { label: 'Critical', val: criticalCount || 18, color: 'text-red-400' },
              { label: 'Resolved Today', val: resolvedCount || 95, color: 'text-green-400' },
              { label: 'Avg Response', val: '3.2 hrs', color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
                <span className={`text-xs font-extrabold ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Activity Feed ── */}
      <div className="absolute bottom-[60px] left-4 z-30 w-[min(340px,calc(100%-2rem))] hidden sm:block">
        <div className="bg-background/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-xl overflow-hidden h-[42px] flex items-center gap-2.5">
          <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <AnimatePresence mode="wait">
            <motion.div
              key={feedIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-2 text-xs text-muted-foreground truncate"
            >
              <span className="font-semibold text-foreground truncate">{LIVE_FEED[feedIdx].msg}</span>
              <span className="shrink-0 opacity-60">{LIVE_FEED[feedIdx].time}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Map Controls ── */}
      <div className="absolute right-4 bottom-4 z-30 flex flex-col gap-2">
        {[
          { icon: ZoomIn, action: () => setMapZoom(z => Math.min(z + 1, 20)), title: 'Zoom In' },
          { icon: ZoomOut, action: () => setMapZoom(z => Math.max(z - 1, 3)), title: 'Zoom Out' },
          { icon: Navigation, action: () => { setMapCenter(MUMBAI); setMapZoom(12); }, title: 'Reset View' },
          { icon: Layers, action: () => setIsSatellite(s => !s), title: 'Toggle Satellite' },
          { icon: Maximize2, action: toggleFullscreen, title: 'Fullscreen' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-9 h-9 flex items-center justify-center bg-background/85 backdrop-blur-xl border border-white/10 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/40 shadow-lg transition-all active:scale-95"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {/* ── AI Insights Panel ── */}
      <div className="absolute left-4 bottom-4 z-30 hidden lg:block w-[220px]">
        <div className="bg-background/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-2xl">
          <div className="flex items-center gap-1.5 mb-3">
            <Brain size={13} className="text-primary" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">AI Insights</span>
          </div>
          <div className="space-y-2.5">
            {AI_INSIGHTS.map(ins => (
              <div key={ins.label} className="flex items-start gap-2">
                <ins.icon size={12} className={`${ins.color} shrink-0 mt-0.5`} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{ins.label}</p>
                  <p className={`text-[10px] font-semibold ${ins.color}`}>{ins.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Marker Info Popup ── */}
      <AnimatePresence>
        {selectedComplaint && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(360px,calc(100%-2rem))] bg-background/95 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {selectedComplaint.imageUrl && (
              <img
                src={selectedComplaint.imageUrl}
                alt="Issue"
                className="w-full h-28 object-cover"
              />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-foreground leading-tight">{selectedComplaint.issueDetected || 'Civic Issue'}</h4>
                  {selectedComplaint.location?.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin size={10} /> {selectedComplaint.location.address.split(',').slice(0, 2).join(',')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor(selectedComplaint.severity || '')}`}>
                    {selectedComplaint.severity}
                  </span>
                  <button onClick={() => setSelectedComplaint(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[
                  { label: 'Department', val: selectedComplaint.suggestedDepartment || 'General' },
                  { label: 'Status', val: selectedComplaint.status || 'Pending' },
                  { label: 'AI Confidence', val: `${selectedComplaint.evidence?.overallStrength || 0}%` },
                  { label: 'Reported', val: selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleDateString() : '—' },
                ].map(r => (
                  <div key={r.label} className="bg-secondary/50 rounded-xl px-2.5 py-2">
                    <p className="text-muted-foreground uppercase tracking-wider font-bold">{r.label}</p>
                    <p className="font-semibold text-foreground mt-0.5">{r.val}</p>
                  </div>
                ))}
              </div>

              {selectedComplaint.evidence?.sceneAnalysis && (
                <p className="text-[10px] text-muted-foreground leading-relaxed bg-secondary/30 rounded-xl px-2.5 py-2 border border-border line-clamp-2">
                  <span className="font-bold text-foreground">AI: </span>{selectedComplaint.evidence.sceneAnalysis}
                </p>
              )}

              <a
                href={`/issue/${selectedComplaint.complaintId || selectedComplaint._id}`}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
              >
                View Full Details <ChevronRight size={13} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count badge */}
      {filtered.length < complaints.length && (
        <div className="absolute top-[118px] left-4 z-30">
          <span className="bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">
            {filtered.length} / {complaints.length} shown
          </span>
        </div>
      )}
    </div>
  );
};

export default CivicMap;
