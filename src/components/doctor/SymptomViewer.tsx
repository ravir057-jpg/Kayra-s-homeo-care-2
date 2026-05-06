import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { Activity, Zap, Smile, Moon, Utensils, Droplets, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SymptomLog } from '../../types';

interface SymptomViewerProps {
  patientId: string;
}

export default function SymptomViewer({ patientId }: SymptomViewerProps) {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(
          collection(db, 'symptom_logs'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SymptomLog));
        setLogs(data);
      } catch (error) {
        console.error('Failed to fetch symptom logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [patientId]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Retrieving Health Journey...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
        <div className="p-4 bg-slate-50 rounded-[2rem] text-slate-300 border border-slate-100 shadow-inner">
          <Activity size={40} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">No Patient-Led Logs</p>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">The patient hasn't logged any symptoms via their portal yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity size={12} className="text-indigo-500" /> Patient Progress Tracker
        </h4>
        <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-3 py-1 rounded-full ring-1 ring-indigo-100">
          {logs.length} Vital Logs
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {logs.map((log, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={log.id} 
              className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                    log.severity > 7 ? 'bg-red-50 text-red-500 border border-red-100' : 
                    log.severity > 4 ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                  }`}>
                    {log.severity}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Severity Index</p>
                    <div className="flex items-center gap-2">
                       <Calendar size={12} className="text-slate-300" />
                       <p className="text-xs font-bold text-slate-800">{format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlertCircle size={10} className="text-indigo-500" /> Core Symptoms
                  </p>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed">{log.symptoms}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <VitalItem icon={<Zap size={10} />} label="Energy" value={log.energyLevel} color="text-amber-500" bgColor="bg-amber-50" />
                  <VitalItem icon={<Smile size={10} />} label="Mood" value={log.mood} color="text-indigo-500" bgColor="bg-indigo-50" />
                  <VitalItem icon={<Moon size={10} />} label="Sleep" value={log.sleepQuality} color="text-indigo-400" bgColor="bg-indigo-50" />
                  <VitalItem icon={<Utensils size={10} />} label="Appetite" value={log.appetite} color="text-emerald-500" bgColor="bg-emerald-50" />
                  <VitalItem icon={<Droplets size={10} />} label="Thirst" value={log.thirst} color="text-blue-500" bgColor="bg-blue-50" />
                </div>

                {log.notes && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Doctor's Observation Notes (from Patient)</p>
                    <p className="text-[11px] text-slate-500 italic leading-relaxed">"{log.notes}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function VitalItem({ icon, label, value, color, bgColor }: { icon: React.ReactNode, label: string, value: string, color: string, bgColor: string }) {
  return (
    <div className={`p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1 items-start bg-white shadow-sm ring-1 ring-inset ring-slate-100`}>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 w-full">
        <div className={`shrink-0 w-5 h-5 ${bgColor} ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-700 truncate">{value}</span>
      </div>
    </div>
  );
}
