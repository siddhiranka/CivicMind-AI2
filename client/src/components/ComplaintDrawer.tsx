import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, Clock, User, ChevronRight, Check } from 'lucide-react';

interface ComplaintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: any;
}

const ComplaintDrawer: React.FC<ComplaintDrawerProps> = ({ isOpen, onClose, complaint }) => {
  if (!complaint) return null;

  const steps = [
    { id: 'Reported', label: 'Reported', icon: <User size={16} />, completed: true },
    { id: 'AI Reviewed', label: 'AI Reviewed', icon: <ShieldCheck size={16} />, completed: true },
    { 
      id: 'Officer Review', 
      label: complaint.status === 'Rejected' ? 'Rejected' : complaint.status === 'Needs Manual Inspection' ? 'Manual Inspection Required' : complaint.status === 'Needs More Evidence' ? 'More Evidence Required' : 'Officer Review', 
      icon: ['Rejected', 'Needs Manual Inspection', 'Needs More Evidence'].includes(complaint.status) ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />, 
      completed: complaint.status !== 'Pending' 
    },
    { id: 'Dept Assigned', label: 'Department Assigned', icon: <ChevronRight size={16} />, completed: ['Assigned', 'In Progress', 'Resolved'].includes(complaint.status) },
    { id: 'In Progress', label: 'In Progress', icon: <Clock size={16} />, completed: ['In Progress', 'Resolved'].includes(complaint.status) },
    { id: 'Resolved', label: 'Resolved', icon: <Check size={16} />, completed: complaint.status === 'Resolved' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Drawer / Mobile Bottom Sheet */}
          <motion.div 
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 h-[88vh] md:h-full w-full max-w-xl bg-card border-t md:border-t-0 md:border-l border-border z-50 overflow-y-auto shadow-2xl flex flex-col rounded-t-3xl md:rounded-t-none md:rounded-l-3xl"
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1 block md:hidden shrink-0" />

            {/* Header */}
            <div className="sticky top-0 bg-card/90 backdrop-blur-md border-b border-border p-5 sm:p-6 flex justify-between items-center z-10 shrink-0">
              <div>
                <h2 className="text-xl font-bold">{complaint.complaintId}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    complaint.status === 'Resolved' ? 'bg-green-500/10 text-green-500' :
                    complaint.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {complaint.status}
                  </span>
                  <span>•</span>
                  <span>{new Date(complaint.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 flex-1">
              
              {/* Evidence Photo */}
              <div className="rounded-2xl overflow-hidden border border-border">
                <img src={complaint.imageUrl} alt="Complaint Evidence" className="w-full h-64 object-cover" />
                <div className="bg-secondary/30 p-4 border-t border-border flex items-start gap-3">
                  <MapPin size={20} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{complaint.location?.address || 'Unknown Location'}</p>
                    {complaint.evidence?.gpsAvailable && <span className="text-xs text-primary font-semibold tracking-wide">GPS Verified</span>}
                  </div>
                </div>
              </div>

              {/* Resolution Timeline */}
              <div>
                <h3 className="text-lg font-bold mb-6">Resolution Timeline</h3>
                <div className="relative pl-4 space-y-6">
                  <div className="absolute top-2 bottom-2 left-[23px] w-0.5 bg-border -z-10" />
                  
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 mt-0.5
                        ${step.completed ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'}
                      `}>
                        {step.icon}
                      </div>
                      <div>
                        <p className={`font-semibold ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                        {step.id === 'Dept Assigned' && step.completed && (
                          <p className="text-sm text-primary mt-1">{complaint.suggestedDepartment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Responsible Assessment */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  AI Evidence Assessment
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Severity</span>
                    <span className={`text-lg font-bold ${
                      complaint.severity === 'Critical' ? 'text-destructive' :
                      complaint.severity === 'High' ? 'text-amber-500' : 'text-foreground'
                    }`}>{complaint.severity}</span>
                  </div>
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${complaint.evidence?.overallStrength || 0}%` }} />
                      </div>
                      <span className="text-sm font-bold">{complaint.evidence?.overallStrength || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Scene Analysis</span>
                    <p className="text-sm leading-relaxed">{complaint.evidence?.sceneAnalysis || "Analysis unavailable."}</p>
                  </div>
                  
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={16} />
                      <span className="text-xs uppercase tracking-wider font-semibold">AI Limitations</span>
                    </div>
                    <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                      {complaint.evidence?.limitations || "Visual assessment only. Exact conditions may vary. Human verification required before dispatch."}
                    </p>
                  </div>

                  <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">AI Reasoning</span>
                     <ul className="text-sm space-y-2">
                       {complaint.evidence?.reasoning?.map((r: string, i: number) => (
                         <li key={i} className="flex items-start gap-2 text-muted-foreground">
                           <div className="w-1 h-1 bg-primary rounded-full mt-2 shrink-0" />
                           <span>{r}</span>
                         </li>
                       ))}
                     </ul>
                  </div>
                </div>
              </div>
              
              {/* Citizen Description */}
              <div>
                <h3 className="text-lg font-bold mb-3">Citizen Report</h3>
                <p className="text-muted-foreground bg-secondary/30 p-4 rounded-xl italic">"{complaint.originalDescription}"</p>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ComplaintDrawer;
