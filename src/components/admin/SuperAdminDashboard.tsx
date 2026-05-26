import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { 
  Building2, 
  Users, 
  Stethoscope, 
  TrendingUp, 
  CreditCard, 
  ShieldCheck, 
  Activity,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';

interface Stats {
  totalClinics: number;
  totalDoctors: number;
  totalPatients: number;
  totalRevenue: number;
  totalCommission: number;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  clinicId?: string;
  userRole: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalClinics: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalRevenue: 0,
    totalCommission: 0
  });
  const [clinics, setClinics] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const clinicsSnap = await getDocs(collection(db, 'clinics'));
        const doctorsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')));
        const patientsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'patient')));
        const invoicesSnap = await getDocs(collection(db, 'invoices'));
        
        let totalRev = 0;
        let totalComm = 0;
        invoicesSnap.forEach(d => {
          const data = d.data();
          totalRev += data.amount || 0;
          totalComm += data.commissionAmount || 0;
        });

        setStats({
          totalClinics: clinicsSnap.docs.length,
          totalDoctors: doctorsSnap.docs.length,
          totalPatients: patientsSnap.docs.length,
          totalRevenue: totalRev,
          totalCommission: totalComm
        });

        setClinics(clinicsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const logsSnap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(10)));
        setRecentLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));

      } catch (err) {
        console.error("Error fetching super admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Super Admin Intelligence</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform-wide clinic management & oversight</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Clinics', value: stats.totalClinics, icon: Building2, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Platform Earnings', value: `₹${stats.totalCommission.toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Global Patients', value: stats.totalPatients, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Volume', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5"
          >
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-sm`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-800">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Clinic Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Clinic Directory</h3>
                <p className="text-xs text-slate-500 font-medium">Monitor active tenants and health status</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter clinics..." 
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinic Name</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clinics.map(clinic => (
                    <tr key={clinic.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 font-bold text-xs uppercase">
                            {clinic.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{clinic.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{clinic.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-indigo-100">
                          {clinic.subscriptionPlan}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${clinic.subscriptionStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{clinic.subscriptionStatus}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(clinic.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-slate-300 hover:text-slate-600 p-2">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:underline">View All Clinics</button>
            </div>
          </div>
        </div>

        {/* Global Audit Trail */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <Activity className="text-brand-400 mb-4" size={32} />
              <h3 className="text-xl font-bold">Platform Status</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium">All systems operational across 12 regions.</p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">S{i}</div>)}
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cloud Nodes Syncing</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Global Activity</h3>
              <p className="text-xs text-slate-500 font-medium">Real-time platform logs</p>
            </div>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {recentLogs.map(log => (
                <div key={log.id} className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                    log.action.includes('Delete') ? 'bg-red-50 text-red-500' :
                    log.action.includes('Register') ? 'bg-emerald-50 text-emerald-500' : 'bg-brand-50 text-brand-600'
                  }`}>
                    <Activity size={14} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 leading-snug">{log.action}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{log.details}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={10} className="text-slate-300" />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
