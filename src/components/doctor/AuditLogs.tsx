import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { Shield, ShieldAlert, ShieldCheck, Clock, Search, Filter, History, User } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export default function AuditLogs({ profile }: { profile?: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const baseQuery = collection(db, 'audit_logs');
        let q;
        
        if (profile?.role === 'super_admin') {
          q = query(baseQuery, orderBy('timestamp', 'desc'), limit(50));
        } else if (profile?.clinicId) {
          q = query(baseQuery, where('clinicId', '==', profile.clinicId), orderBy('timestamp', 'desc'), limit(50));
        } else {
          // If no clinicId, doctor might only see logs they created? Or just empty.
          // For now, if no clinicId and not super_admin, we can't fetch broad logs easily per rules.
          setLogs([]);
          setLoading(false);
          return;
        }

        const snap = await getDocs(q);
        setLogs(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      } catch (error) {
        console.error("Audit fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [profile]);

  const filtered = logs.filter(log => 
    log.action?.toLowerCase().includes(search.toLowerCase()) || 
    log.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
    log.details?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security & Access Ledger</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Immutable session tracking</p>
        </div>
        <div className="relative w-full sm:w-64">
           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             placeholder="Audit trail search..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-sm"
           />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                     <th className="px-8 py-4">Action & Signature</th>
                     <th className="px-8 py-4">Entity</th>
                     <th className="px-8 py-4">Details</th>
                     <th className="px-8 py-4">Timestamp</th>
                     <th className="px-8 py-4">Severity</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${
                               log.severity === 'critical' ? 'bg-red-50 text-red-600' :
                               log.severity === 'warning' ? 'bg-amber-50 text-amber-600' :
                               'bg-emerald-50 text-emerald-600'
                             }`}>
                                {log.severity === 'critical' ? <ShieldAlert size={16} /> :
                                 log.severity === 'warning' ? <Shield size={16} /> :
                                 <ShieldCheck size={16} />}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-900">{log.action}</p>
                                <p className="text-[9px] text-slate-400 font-medium">{log.userEmail}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg uppercase tracking-wider">
                             {log.entityType || 'SYSTEM'}
                          </span>
                       </td>
                       <td className="px-8 py-4">
                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]">{log.details || 'No extended signature'}</p>
                       </td>
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-2 text-slate-400">
                             <Clock size={12} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">
                                {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : 'LIVE'}
                             </span>
                          </div>
                       </td>
                       <td className="px-8 py-4">
                          <div className={`text-[9px] font-black uppercase tracking-widest ${
                             log.severity === 'critical' ? 'text-red-600' :
                             log.severity === 'warning' ? 'text-amber-600' :
                             'text-emerald-600'
                          }`}>
                             {log.severity || 'info'}
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {filtered.length === 0 && (
            <div className="py-20 text-center text-slate-300">
               <History size={48} className="mx-auto mb-4 opacity-20" />
               <p className="text-xs font-bold uppercase tracking-widest">No audit trails found in this sector</p>
            </div>
         )}
      </div>

      <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
         <div className="relative z-10">
            <h4 className="text-lg font-bold mb-2">Immutable Security Policy</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-medium">
               All actions within Kayra Homeo Care are logged with high-resolution timestamps, user signatures, and browser fingerprinting metadata. 
               This ledger serves as the primary source of truth for clinical accountability and data integrity.
            </p>
            <div className="mt-6 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
               <span className="flex items-center gap-1"><ShieldCheck size={14} /> AES-256 SYNC</span>
               <span className="flex items-center gap-1"><ShieldCheck size={14} /> ZERO-TRUST ARCH</span>
               <span className="flex items-center gap-1"><ShieldCheck size={14} /> COMPLIANCE READY</span>
            </div>
         </div>
      </div>
    </div>
  );
}
