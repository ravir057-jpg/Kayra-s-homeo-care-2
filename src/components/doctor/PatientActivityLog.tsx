import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { Clock, Activity, AlertCircle, FileDigit } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: any;
  userEmail: string;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: {
    userAgent?: string;
    platform?: string;
  };
}

interface PatientActivityLogProps {
  patientId: string;
}

export default function PatientActivityLog({ patientId }: PatientActivityLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(
          collection(db, 'audit_logs'),
          where('entityId', '==', patientId),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AuditLog));
        setLogs(data);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
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
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Compiling history...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
        <div className="p-4 bg-slate-50 rounded-2xl text-slate-300">
          <Activity size={32} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">No activity recorded</p>
          <p className="text-xs text-slate-500 mt-1">Actions performed on this patient will appear here.</p>
        </div>
      </div>
    );
  }

  const getSeverityStyles = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <FileDigit size={12} /> Clinical Audit Trail
        </h4>
        <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
          {logs.length} Total Events
        </span>
      </div>

      <div className="space-y-4">
        {logs.map((log, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={log.id} 
            className="flex gap-4 group"
          >
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center transition-colors shadow-sm ${
                log.severity === 'critical' ? 'text-red-500 border-red-200' : 
                log.severity === 'warning' ? 'text-amber-500 border-amber-200' : 'text-slate-400'
              }`}>
                {log.severity === 'critical' ? <AlertCircle size={14} /> : <Clock size={14} />}
              </div>
              {idx !== logs.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1"></div>}
            </div>
            
            <div className="flex-1 pb-6">
              <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800 tracking-tight">{log.action}</p>
                  {log.severity && log.severity !== 'info' && (
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getSeverityStyles(log.severity)}`}>
                      {log.severity}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm • dd MMM') : 'Just now'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-2">{log.details || 'System generated event.'}</p>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center">
                     <Activity size={8} className="text-slate-400" />
                   </div>
                   <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{log.userEmail.split('@')[0]}</span>
                </div>
                {log.metadata?.platform && (
                  <div className="flex items-center gap-2 opacity-60">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">{log.metadata.platform}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
