import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { collection, query, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  Building2, 
  Users, 
  Stethoscope, 
  TrendingUp, 
  Settings, 
  UserPlus, 
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  MessageCircle,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Clinic, UserProfile } from '../../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  profile: UserProfile | null;
}

export default function ClinicAdminDashboard({ profile }: Props) {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!profile?.ownedClinicId) return;
      
      try {
        const clinicRef = doc(db, 'clinics', profile.ownedClinicId);
        const clinicSnap = await getDoc(clinicRef);
        if (clinicSnap.exists()) {
          setClinic({ id: clinicSnap.id, ...clinicSnap.data() } as Clinic);
        }

        const doctorsQ = query(collection(db, 'users'), where('clinicId', '==', profile.ownedClinicId), where('role', '==', 'doctor'));
        const doctorsSnap = await getDocs(doctorsQ);
        setDoctors(doctorsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (err) {
        console.error("Error fetching clinic data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">{clinic?.name || 'Clinic Management'}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tenant Control Center • Admin Mode</p>
        </div>
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
        >
          <Settings size={16} /> Clinic Settings
        </button>
      </div>

      {/* Clinic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Patients</p>
              <h3 className="text-2xl font-black text-slate-800">420</h3>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 w-[65%] rounded-full shadow-[0_0_10px_rgba(0,128,128,0.3)]"></div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">+12 from last week</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Stethoscope size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Staff Doctors</p>
              <h3 className="text-2xl font-black text-slate-800">{doctors.length}</h3>
            </div>
          </div>
          <button 
            onClick={() => navigate('/doctors')}
            className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
          >
             Manage Staff <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <TrendingUp size={24} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Monthly Rev</p>
                  <h3 className="text-2xl font-black text-white">₹84,200</h3>
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                   <Activity size={12} /> +18.5% Growth
                </p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Doctor Management (Quick List) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-slate-800">Your Medical Team</h3>
                <p className="text-xs text-slate-500 font-medium">Verify credentials and manage availability</p>
             </div>
             <button 
               onClick={() => navigate('/doctors')}
               className="p-3 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all"
             >
                <UserPlus size={20} />
             </button>
          </div>
          <div className="p-6 space-y-4">
             {doctors.map(doc => (
               <div key={doc.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:border-brand-200 hover:bg-white transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 font-bold border border-slate-100 shadow-sm overflow-hidden">
                      {doc.photoURL ? <img src={doc.photoURL} alt={doc.name} className="w-full h-full object-cover" /> : doc.name?.[0] || 'DR'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Dr. {doc.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{doc.specialization || 'Clinical Associate'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {doc.isVerified && <CheckCircle2 size={16} className="text-brand-500" />}
                     <div className={`w-2 h-2 rounded-full ${doc.role === 'doctor' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  </div>
               </div>
             ))}
             {doctors.length === 0 && (
               <div className="text-center py-10 text-slate-400">
                  <p className="text-xs italic font-medium">No other doctors registered yet.</p>
               </div>
             )}
          </div>
          <div className="mt-auto p-6 bg-slate-50 border-t border-slate-100">
             <button className="w-full py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-600 transition-colors">
                View Engagement Reports
             </button>
          </div>
        </div>

        {/* Clinic Status & Plan */}
        <div className="space-y-6">
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Platform Subscription</h3>
              <div className="p-6 bg-brand-50 rounded-[2rem] border border-brand-100 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4">
                    <ShieldCheck size={48} className="text-brand-200/50" />
                 </div>
                 <div className="relative z-10">
                    <p className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em] mb-1">Active Plan</p>
                    <h4 className="text-2xl font-black text-brand-700 uppercase tracking-tighter">{clinic?.subscriptionPlan || 'Free Tier'}</h4>
                    <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-brand-600/80">
                       <Clock size={14} /> Renews on {new Date(clinic?.subscriptionExpiry || '').toLocaleDateString()}
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                 <button className="py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-600 transition-all shadow-lg active:scale-95">
                    Upgrade Plan
                 </button>
                 <button className="py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                    Billing History
                 </button>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Clinic White-Labeling</h3>
              <div className="space-y-4">
                 <div className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-300 border border-slate-100 mr-4">
                       <Building2 size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logo Branding</p>
                       <p className="text-[11px] font-bold text-slate-800">Set Clinic Identity</p>
                    </div>
                    <button className="ml-auto text-[10px] font-bold text-brand-600 uppercase tracking-widest px-3 py-1 bg-white rounded-lg border border-brand-100 shadow-sm">
                       Upload
                    </button>
                 </div>
                 
                 <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-3 text-indigo-700 mb-2">
                       <MessageCircle size={18} />
                       <p className="text-xs font-bold">Support Gateway</p>
                    </div>
                    <p className="text-[11px] text-indigo-600/70 font-medium">Configure clinic-specific WhatsApp support number for patients.</p>
                    <input 
                      type="text" 
                      placeholder="+91..." 
                      className="mt-3 w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-xs font-bold text-indigo-700 focus:border-indigo-400 outline-none"
                    />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
