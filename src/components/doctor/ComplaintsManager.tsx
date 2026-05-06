import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, query, getDocs, orderBy, doc, updateDoc, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, User, Search, Filter, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Complaint {
  id: string;
  doctorId: string;
  doctorName: string;
  subject: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'Pending' | 'In Review' | 'Resolved' | 'Action Taken';
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  boardNotes?: string;
}

export default function ComplaintsManager() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'In Review' | 'Critical'>('All');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setComplaints(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: Complaint['status']) => {
    try {
      await updateDoc(doc(db, 'complaints', id), {
        status: newStatus,
        boardNotes: resolutionNote,
        resolvedAt: new Date().toISOString()
      });
      await logAction({
        action: 'Complaint Status Updated',
        entityType: 'Feedback',
        entityId: id,
        details: `Set status to ${newStatus}. Note: ${resolutionNote.substring(0, 50)}...`,
        severity: newStatus === 'Action Taken' ? 'critical' : 'info'
      });
      toast.success(`Complaint marked as ${newStatus}`);
      setSelectedComplaint(null);
      setResolutionNote('');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filtered = complaints.filter(c => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return c.severity === 'critical';
    return c.status === filter;
  });

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Scanning Bio-Ethics Ledger...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Grievance & Review Board</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Clinical Complaints</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {['All', 'Pending', 'In Review', 'Critical'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {filtered.map((c) => (
            <motion.div 
              layout
              key={c.id} 
              onClick={() => setSelectedComplaint(c)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer group ${selectedComplaint?.id === c.id ? 'bg-white border-indigo-500 shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {c.severity === 'critical' ? <ShieldAlert size={22} /> : <AlertCircle size={22} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">Against: Dr. {c.doctorName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(c.createdAt), 'MMM dd, yyyy • HH:mm')}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  c.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}>
                  {c.status}
                </div>
              </div>
              <p className="text-sm font-bold text-slate-700 line-clamp-1 mb-2">{c.subject}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
               <CheckCircle2 size={48} className="mx-auto text-emerald-100 mb-4" />
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No matching grievances found</p>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {selectedComplaint ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl sticky top-6 self-start"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-xl font-bold text-slate-900">Case Investigation</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {selectedComplaint.id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                       <User size={20} />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Complainant</p>
                       <p className="text-sm font-bold text-slate-900">{selectedComplaint.userName}</p>
                       <p className="text-[10px] text-slate-500">{selectedComplaint.userEmail}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Complaint Details</h5>
                    <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                       <p className="text-sm font-bold text-slate-900 mb-3">{selectedComplaint.subject}</p>
                       <p className="text-xs text-slate-600 leading-relaxed italic border-l-4 border-slate-100 pl-4">"{selectedComplaint.description}"</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Medical Board Review Note</h5>
                    <textarea 
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Enter investigation findings or resolution steps..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-indigo-500 min-h-[100px]"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => handleUpdateStatus(selectedComplaint.id, 'In Review')}
                      className="py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      Move to Review
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedComplaint.id, 'Action Taken')}
                      className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200"
                    >
                      Reconsider Specialization
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedComplaint.id, 'Resolved')}
                      className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl"
                    >
                      Finalize & Resolve
                    </button>
                 </div>
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex h-full flex-col items-center justify-center text-slate-300 opacity-50 space-y-4">
               <MessageSquare size={80} strokeWidth={1} />
               <p className="text-sm font-bold uppercase tracking-[0.2em]">Select a case to investigate</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function X({ size, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
