import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CircleDollarSign as IndianRupee, 
  AlertTriangle, 
  Calendar, 
  ChevronRight,
  TrendingDown,
  BrainCircuit,
  Star,
  MessageSquare,
  Award,
  Video,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { collection, query, getDocs, limit, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../../lib/db';
import { format } from 'date-fns';
import { Feedback, UserProfile } from '../../types';
import { getDashboardStats, getRevenueChartData } from '../../services/analyticsService';

const data = [
  { name: 'Mon', revenue: 4000, value: 2400 },
  { name: 'Tue', revenue: 3000, value: 1398 },
  { name: 'Wed', revenue: 2000, value: 9800 },
  { name: 'Thu', revenue: 2780, value: 3908 },
  { name: 'Fri', revenue: 1890, value: 4800 },
  { name: 'Sat', revenue: 2390, value: 3800 },
  { name: 'Sun', revenue: 3490, value: 4300 },
];

import { useLanguage } from '../../lib/i18n';

export default function DoctorDashboard({ profile }: { profile?: any }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({
    patients: 0,
    revenue: 0,
    lowStock: 0,
    appointments: 0,
    rating: 0,
    reviewCount: 0,
    revenueChange: 0,
    appointmentsChange: 0,
    patientsChange: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentFeedbacks, setRecentFeedbacks] = useState<Feedback[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [smartInsights, setSmartInsights] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const user = auth.currentUser;
      if (!user || !profile) return;

      try {
        const clinicId = profile?.clinicId;
        setLoading(true);

        const [dashboardStats, revenueData] = await Promise.all([
          getDashboardStats(user.uid, clinicId),
          getRevenueChartData(user.uid, clinicId)
        ]);

        // Get low stock count
        let lowStockCount = 0;
        const stockPath = 'inventory';
        try {
          const stockQ = clinicId 
            ? query(collection(db, stockPath), where('clinicId', '==', clinicId))
            : query(collection(db, stockPath), where('doctorId', '==', user.uid));
          const stockSnap = await getDocs(stockQ);
          lowStockCount = stockSnap.docs.filter(d => d.data().stockLevel < 5).length;
        } catch (e) {
          console.warn("Inventory fetch failed:", e);
        }

        setStats({
          ...dashboardStats,
          lowStock: lowStockCount
        });
        setChartData(revenueData);

        // Fetch Recent Feedbacks
        const feedbackQ = clinicId
          ? query(collection(db, 'feedbacks'), where('clinicId', '==', clinicId), orderBy('createdAt', 'desc'), limit(3))
          : query(collection(db, 'feedbacks'), where('doctorId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3));
        
        try {
          const fbSnap = await getDocs(feedbackQ);
          setRecentFeedbacks(fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
        } catch (e) {
          // Fallback if index missing or other error
          const fallbackQ = clinicId
            ? query(collection(db, 'feedbacks'), where('clinicId', '==', clinicId), limit(3))
            : query(collection(db, 'feedbacks'), where('doctorId', '==', user.uid), limit(3));
          const fbSnap = await getDocs(fallbackQ);
          setRecentFeedbacks(fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
        }

        // Fetch Upcoming Appointments
        const apptQ = clinicId
          ? query(collection(db, 'appointments'), where('clinicId', '==', clinicId), where('status', '==', 'Confirmed'), orderBy('date', 'asc'), limit(3))
          : query(collection(db, 'appointments'), where('doctorId', '==', user.uid), where('status', '==', 'Confirmed'), orderBy('date', 'asc'), limit(3));
        const apptSnap = await getDocs(apptQ);
        setUpcomingAppts(apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Smart Insights (Analyzed Medical Reports)
        const reportsQ = query(
          collection(db, 'medical_reports'),
          where('doctorId', '==', user.uid),
          where('status', '==', 'Analyzed'),
          orderBy('analyzedAt', 'desc'),
          limit(2)
        );
        try {
          const reportsSnap = await getDocs(reportsQ);
          setSmartInsights(reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
          console.warn("Could not fetch reports for insights:", e);
        }

        // Fetch Recent Activity (Prescriptions + Invoices)
        const presQ = query(collection(db, 'prescriptions'), where('doctorId', '==', user.uid), orderBy('createdAt', 'desc'), limit(2));
        const invQ = query(collection(db, 'invoices'), where('doctorId', '==', user.uid), orderBy('createdAt', 'desc'), limit(2));
        
        const [presSnap, invSnap] = await Promise.all([getDocs(presQ), getDocs(invQ)]);
        
        const activity = [
          ...presSnap.docs.map(d => ({ ...(d.data() as any), type: 'prescription', id: d.id })),
          ...invSnap.docs.map(d => ({ ...(d.data() as any), type: 'invoice', id: d.id }))
        ].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 3);
        
        setRecentActivity(activity);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile]);

  if (loading) return <div className="h-96 flex items-center justify-center">Syncing Practice Dashboard...</div>;

  return (
    <div className="space-y-4 sm:space-y-8 pb-20 lg:pb-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
        <StatCard 
          title={t('total_patients')} 
          value={stats.patients.toLocaleString()} 
          change={`${stats.patientsChange >= 0 ? '+' : ''}${stats.patientsChange}%`} 
          icon={Users}
          trend={stats.patientsChange >= 0 ? "up" : "down"}
          color="brand"
        />
        <StatCard 
          title={t('revenue')} 
          value={`₹${stats.revenue.toLocaleString()}`} 
          change={`${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%`} 
          icon={IndianRupee}
          trend={stats.revenueChange >= 0 ? "up" : "down"}
          color="brand"
        />
        <StatCard 
          title="Visits" 
          value={stats.appointments.toString()} 
          change={`${stats.appointmentsChange >= 0 ? '+' : ''}${stats.appointmentsChange}%`} 
          icon={Calendar}
          trend={stats.appointmentsChange >= 0 ? "up" : "down"}
          color="blue"
        />
        <StatCard 
          title="Stock" 
          value={stats.lowStock.toString()} 
          change={`${stats.lowStock} alerts`} 
          icon={AlertTriangle}
          trend={stats.lowStock > 0 ? "down" : "neutral"}
          color="red"
        />
        <StatCard 
          title="Rating" 
          value={stats.rating > 0 ? stats.rating.toString() : '5.0'} 
          change={`${stats.reviewCount} reviews`} 
          icon={Award}
          trend={stats.rating >= 4.5 ? 'up' : 'neutral'}
          color="amber"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <div className="flex-1 w-full relative z-10">
          <h3 className="text-lg font-bold text-slate-800">Practice Hub</h3>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Streamline your daily clinical flow</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 w-full lg:w-auto relative z-10">
          <button 
            onClick={() => window.open('https://wa.me/919153000000?text=Hello Kayra Support, I need assistance with my doctor panel.', '_blank')}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3.5 sm:py-4 bg-brand-600 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl active:scale-95 group justify-center sm:justify-start"
          >
            <MessageCircle size={16} />
            <span className="truncate">Support</span>
          </button>
          <button 
            onClick={() => navigate('/video')}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3.5 sm:py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl active:scale-95 group justify-center sm:justify-start"
          >
            <Video size={16} className="sm:size-4.5" />
            <span className="truncate">Video Call</span>
          </button>
        </div>
      </div>

      {/* Charts & AI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-500" />
              Practice Growth
            </h3>
            <select className="text-[10px] font-bold text-slate-400 bg-slate-50 border-none rounded p-1 outline-none appearance-none cursor-pointer">
              <option>WEEKS</option>
              <option>MONTHS</option>
            </select>
          </div>
          <div className="h-44 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} minTickGap={20} />
                <YAxis hide={true} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white flex flex-col shadow-2xl shadow-slate-200 relative overflow-hidden h-full group transition-all hover:scale-[1.01]">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/20">
                <BrainCircuit size={16} className="text-white" />
              </div>
              <span className="font-bold uppercase tracking-[0.2em] text-[10px] text-brand-400">Smart Insights</span>
            </div>
            <h4 className="text-xl font-bold leading-tight mb-3 tracking-tight flex items-center gap-2">
              Clinical Intelligence 
              <span className="animate-pulse w-2 h-2 bg-brand-500 rounded-full" />
            </h4>
            
            {smartInsights.length > 0 ? (
              <div className="space-y-4">
                {smartInsights.map((insight) => (
                  <div key={insight.id} className="bg-white/5 rounded-2xl p-4 text-[11px] border border-white/5 backdrop-blur-sm group/item hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-brand-400 font-black uppercase tracking-widest text-[8px]">{insight.patientName}</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase">{insight.category}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-medium line-clamp-3 italic">
                      "{insight.summary}"
                    </p>
                  </div>
                ))}
                <button 
                  onClick={() => navigate('/patients')}
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl text-[11px] font-bold hover:bg-brand-500 transition-all uppercase tracking-[0.2em] shadow-xl shadow-brand-900/40 active:scale-95 leading-none"
                >
                  Detail View
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-4 text-[11px] border border-white/5 backdrop-blur-sm">
                  <span className="text-brand-400 font-bold uppercase tracking-widest text-[9px]">Awaiting Data</span>
                  <p className="mt-2 text-slate-300 leading-relaxed font-medium italic">No recent Analyzed Reports found. Insights will appear here once patient reports are uploaded and analyzed.</p>
                </div>
                <button 
                  onClick={() => navigate('/patients')}
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl text-[11px] font-bold hover:bg-brand-500 transition-all uppercase tracking-[0.2em] shadow-xl shadow-brand-900/40 active:scale-95 leading-none"
                >
                  Open Patient List
                </button>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
        </div>
      </div>

      {/* Clinical Resources & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Mastering Homeopathy</h3>
                <button className="text-xs text-brand-600 font-bold hover:underline">Archives</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 group cursor-pointer">
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded">CHRONIC CASES</span>
                  <p className="absolute bottom-3 left-3 right-3 text-white text-sm font-bold leading-snug">Managing Miasmatic Layers in Respiratory Pathologies</p>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2">Deep dive into advanced anamnesis protocols for treatment of deep-seated miasmatic blocks.</p>
              </div>
              <div className="space-y-2 group cursor-pointer">
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-600 text-white text-[9px] font-bold rounded">REPERTORY</span>
                  <p className="absolute bottom-3 left-3 right-3 text-white text-sm font-bold leading-snug">Comparison of Silicea vs Phosphorus in Suppurating Conditions</p>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2">Key differentiators and characteristic modalities for precision remedy selection in clinical practice.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">{t('recent_activity')}</h3>
          <div className="space-y-6 flex-1">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No recent activity found.</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <ActivityItem 
                  key={activity.id || idx}
                  title={activity.type === 'prescription' ? `Prescription for ${activity.patientId.substring(0, 8)}` : `Invoice Generated`}
                  time={format(new Date(activity.createdAt), 'hh:mm A')}
                  desc={activity.type === 'prescription' ? `Diagnosis: ${activity.diagnosis || 'General'}` : `Amount: ₹${activity.amount}`}
                  remedy={activity.type === 'prescription' ? activity.medications?.[0]?.name : null}
                  amount={activity.type === 'invoice' ? `₹${activity.amount}` : null}
                />
              ))
            )}
          </div>
          <button 
            onClick={() => navigate(recentActivity[0]?.type === 'prescription' ? '/prescriptions' : '/billing')}
            className="w-full mt-6 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
          >
            View More
          </button>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">{t('upcoming_consultations')}</h3>
            <button onClick={() => navigate('/appointments')} className="text-xs text-brand-600 font-semibold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingAppts.length === 0 ? (
               <div className="p-8 text-center text-slate-400 text-xs italic">No upcoming appointments confirmed.</div>
            ) : (
              upcomingAppts.map((appt) => (
                <div key={appt.id} onClick={() => navigate('/appointments')} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {appt.patientName?.substring(0, 2).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">{appt.patientName}</p>
                      <p className="text-xs text-slate-400">{appt.type} • {appt.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{format(new Date(appt.date + 'T' + appt.time), 'hh:mm a')}</p>
                    <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                      {appt.type === 'Video' ? 'VIDEO' : 'CLINIC'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-800">Billing Overview</h4>
              <span className="text-[10px] font-bold text-brand-500">SYNCED</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Pending Collections</p>
                <p className="text-xl font-bold text-slate-800">₹1,400</p>
              </div>
              <button className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-[10px] font-bold hover:bg-slate-200 transition-colors">Send Links</button>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-800">Patient Feedback</h4>
              <span className="text-[10px] font-bold text-brand-500">RECENT</span>
            </div>
            {recentFeedbacks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {recentFeedbacks.map(fb => (
                  <div key={fb.id} className="text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-slate-700">{fb.patientName}</span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[10px] font-bold">{fb.rating}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 line-clamp-1">{fb.comment || 'No comment'}</p>
                  </div>
                ))}
              </div>
            )}
            <button className="text-xs text-brand-600 font-bold hover:underline mt-4 text-left">View All Reviews</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, trend, color, className = "" }: any) {
  const colorMap: any = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    emerald: 'bg-brand-50 text-brand-600 border-brand-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className={`bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-[0.98] ${className}`}>
      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
        <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px] sm:max-w-none">{title}</p>
        <div className={`p-1.5 sm:p-2 rounded-lg ${colorMap[color] || colorMap.brand}`}>
          <Icon size={14} className="sm:size-4" />
        </div>
      </div>
      <p className={`text-lg sm:text-2xl font-bold tracking-tight ${color === 'red' ? 'text-red-500' : 'text-slate-900'} leading-none mb-1 sm:mb-2`}>{value}</p>
      <div className="flex items-center gap-1">
        {trend === 'up' && <TrendingUp size={10} className="text-brand-500" />}
        {trend === 'down' && <TrendingDown size={10} className="text-red-500" />}
        <p className={`text-[8px] sm:text-[10px] font-bold tracking-tight ${trend === 'up' ? 'text-brand-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
          {change}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ title, time, desc, remedy, amount }: any) {
  return (
    <div className="flex gap-4">
      <div className="relative">
        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 ring-4 ring-indigo-50"></div>
        <div className="absolute top-4 bottom-0 left-1 w-px bg-slate-100"></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{time}</span>
        </div>
        <p className="text-xs text-slate-500 mb-1">{desc}</p>
        {remedy && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{remedy}</span>}
        {amount && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{amount}</span>}
      </div>
    </div>
  );
}
