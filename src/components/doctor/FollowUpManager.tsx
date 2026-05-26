import { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Search,
  Bell,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Prescription, Patient, UserProfile } from '../../types';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';

interface FollowUpManagerProps {
  profile: UserProfile | null;
}

export default function FollowUpManager({ profile }: FollowUpManagerProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'overdue'>('pending');
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFollowUps = async () => {
    if (!profile?.clinicId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'prescriptions'),
        where('clinicId', '==', profile.clinicId),
        where('followupDate', '!=', null),
        orderBy('followupDate', 'asc')
      );
      const snapshot = await getDocs(q);
      const prescriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
      
      // Fetch patient details for each prescription
      const patientIds = Array.from(new Set(prescriptions.map(p => p.patientId)));
      const patientsMap: Record<string, Patient> = {};
      
      if (patientIds.length > 0) {
        const patientsSnap = await getDocs(query(
          collection(db, 'patients'),
          where('clinicId', '==', profile.clinicId)
        ));
        patientsSnap.docs.forEach(doc => {
          patientsMap[doc.id] = { id: doc.id, ...doc.data() } as Patient;
        });
      }

      const today = startOfDay(new Date());
      const data = prescriptions.map(p => {
        const patient = patientsMap[p.patientId];
        const fDate = new Date(p.followupDate!);
        let status: 'pending' | 'overdue' | 'completed' = 'pending';
        
        if (p.advice?.includes('[Follow-up Completed]')) {
          status = 'completed';
        } else if (isBefore(fDate, today)) {
          status = 'overdue';
        }

        return {
          id: p.id,
          patientName: patient?.name || 'Unknown Patient',
          patientPhone: patient?.phone || 'N/A',
          lastVisit: format(new Date(p.createdAt), 'dd MMM yyyy'),
          followupDate: p.followupDate,
          status,
          condition: p.diagnosis,
          prescription: p
        };
      });

      setFollowups(data);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [profile]);

  const handleMarkDone = async (item: any) => {
    try {
      const docRef = doc(db, 'prescriptions', item.id);
      await updateDoc(docRef, {
        advice: `${item.prescription.advice || ''}\n\n[Follow-up Completed on ${new Date().toISOString()}]`
      });
      toast.success('Follow-up marked as completed');
      fetchFollowUps();
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  const filtered = followups.filter(f => {
    const matchesTab = f.status === activeTab;
    const matchesSearch = f.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         f.condition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && (searchQuery ? matchesSearch : true);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Follow-up Manager</h2>
          <p className="text-slate-500 text-sm">Track and manage patient recovery cycles</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchFollowUps}
            className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white rounded-xl border border-slate-200"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
            <Bell size={18} />
            Remind All
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-fit border border-slate-200">
          {(['pending', 'overdue', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search by patient or condition..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
           Array(3).fill(0).map((_, i) => (
             <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
           ))
        ) : filtered.map((item) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={item.id}
            className={`bg-white rounded-[2rem] border transition-all group p-6 ${
              item.status === 'overdue' ? 'border-red-100 hover:border-red-200' : 'border-slate-200 hover:border-indigo-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="flex gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                  item.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <User size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.patientName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis:</span>
                    <span className="text-xs text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{item.condition}</span>
                  </div>
                </div>
              </div>
              <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:items-end gap-2">
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ring-1 ${
                  item.status === 'overdue' ? 'bg-red-50 text-red-500 ring-red-100' : 
                  item.status === 'completed' ? 'bg-emerald-50 text-emerald-500 ring-emerald-100' : 'bg-orange-50 text-orange-500 ring-orange-100'
                }`}>
                  {item.status === 'overdue' ? <AlertCircle size={12} /> : <Clock size={12} />}
                  {item.status}
                </div>
                <div className="flex flex-col sm:items-end">
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Expected Reset</p>
                   <p className="text-sm text-slate-900 font-black">{format(new Date(item.followupDate), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-slate-100">
              <div className="flex flex-wrap gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black leading-none mb-2">Last Clinical Visit</span>
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-300" />
                    {item.lastVisit}
                  </span>
                </div>
                <div className="flex flex-col border-l border-slate-100 pl-8">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black leading-none mb-2">Contact Link</span>
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <MessageSquare size={14} className="text-slate-300" />
                    {item.patientPhone}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all active:scale-95">
                  <MessageSquare size={16} />
                  Message
                </button>
                {item.status !== 'completed' && (
                  <button 
                    onClick={() => handleMarkDone(item)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-4 text-[11px] font-bold uppercase tracking-widest bg-slate-900 text-white hover:bg-emerald-600 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95"
                  >
                    <CheckCircle size={16} />
                    Complete Cycle
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Calendar size={32} className="text-slate-200" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No follow-ups found in this cycle</p>
          </div>
        )}
      </div>
    </div>
  );
}
