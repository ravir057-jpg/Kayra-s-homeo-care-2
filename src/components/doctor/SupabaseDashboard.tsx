import { useState, useEffect } from 'react';
import { 
  Database, 
  Activity, 
  Terminal, 
  Search, 
  Shield, 
  Zap, 
  Server, 
  HardDrive,
  Clock,
  RefreshCw,
  ExternalLink,
  Lock,
  Cpu,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

const mockPerformanceData = [
  { time: '00:00', latency: 45, throughput: 120 },
  { time: '04:00', latency: 52, throughput: 80 },
  { time: '08:00', latency: 40, throughput: 340 },
  { time: '12:00', latency: 38, throughput: 450 },
  { time: '16:00', latency: 42, throughput: 520 },
  { time: '20:00', latency: 44, throughput: 280 },
  { time: '23:59', latency: 46, throughput: 150 },
];

export default function SupabaseDashboard() {
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'storage'>('overview');
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const timer = setInterval(() => setIsLive(prev => !prev), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg shadow-emerald-500/20">
              <Database size={24} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Supabase Engine</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-12">Universal backend infrastructure and clinical data monitoring</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
            configured ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            {configured ? 'Synchronized' : 'Pending Configuration'}
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        {(['overview', 'queries', 'storage'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* System Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusBadge icon={Server} label="Region" value="Asia South 1" color="indigo" />
              <StatusBadge icon={Cpu} label="Compute Unit" value="Nano-v2" color="emerald" />
              <StatusBadge icon={Globe} label="API Status" value="Healthy" color="blue" />
              <StatusBadge icon={Shield} label="RLS Guard" value="Active" color="emerald" />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Performance Chart */}
              <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Latency Analytics</h3>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Real-time edge monitoring</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Latency (ms)</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockPerformanceData}>
                        <defs>
                          <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#ffffff08" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                        <YAxis hide={true} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="latency" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#latencyGrad)" 
                          strokeWidth={3}
                          animationDuration={2000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Visual Flair */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]"></div>
              </div>

              {/* Status Feed */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={18} className="text-emerald-500" />
                    System Logs
                  </h3>
                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                </div>
                
                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                  <LogItem time="Just now" action="Edge Function Executed" details="patient_notify_v2" status="success" />
                  <LogItem time="2m ago" action="Database Sync" details="Inventory batch update" status="success" />
                  <LogItem time="5m ago" action="RLS Authentication" details="Dr. Rao • Access Verified" status="security" />
                  <LogItem time="12m ago" action="Bucket Storage" details="Report-4929.pdf created" status="success" />
                  <LogItem time="15m ago" action="Realtime Sub" details="Channel: appointment_waitlist" status="success" />
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-slate-200">
                    Open Inspector
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'queries' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-950 rounded-[2.5rem] p-10 min-h-[500px] border border-white/5 relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Query Explorer</h3>
                  <p className="text-slate-400 text-sm">Direct interface for clinical data optimization</p>
                </div>
                <div className="flex items-center gap-4">
                  <button className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-400 transition-all">
                    <Zap size={14} /> New Query
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl border border-white/5 p-6 font-mono text-sm group">
                <div className="flex items-center gap-4 mb-4 border-b border-white/5 pb-4">
                  <Terminal size={16} className="text-emerald-500" />
                  <span className="text-slate-500 text-xs">SQL EDITOR</span>
                </div>
                <pre className="text-emerald-400 leading-relaxed">
                  <code className="block mb-2"><span className="text-indigo-400">SELECT</span> * <span className="text-indigo-400">FROM</span> clinical_patients</code>
                  <code className="block mb-2"><span className="text-indigo-400">WHERE</span> appointment_date = <span className="text-amber-400">'2024-05-01'</span></code>
                  <code className="block"><span className="text-indigo-400">AND</span> status = <span className="text-amber-400">'completed'</span>;</code>
                </pre>
                
                <div className="mt-8 flex justify-end">
                   <span className="text-slate-700 text-[9px] font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors italic">Executing via Edge Runtime...</span>
                </div>
              </div>

              {!configured && (
                <div className="mt-12 p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-center gap-6">
                  <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-500 mb-1">Configuration Required</h5>
                    <p className="text-slate-400 text-xs leading-relaxed">Please provide your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment settings to enable live data exploration.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px] -z-0"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integration Info */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Shield size={24} />
          </div>
          <h4 className="font-black text-slate-800 uppercase tracking-tighter">Clinical Security</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Row Level Security (RLS) ensures that doctors can only access their patients, providing HIPAA-grade isolation.</p>
        </div>
        <div className="space-y-4 lg:border-x lg:border-slate-100 lg:px-10">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <h4 className="font-black text-slate-800 uppercase tracking-tighter">Real-time Healing</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Broadcast symptoms, prescriptions, and live vitals instantly across all devices without page reloads.</p>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
             <Server size={24} />
          </div>
          <h4 className="font-black text-slate-800 uppercase tracking-tighter">Serverless Edge</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Auto-scaling infrastructure that grows with your practice, handling millions of records with millisecond latency.</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon: Icon, label, value, color }: any) {
  const colorMap: any = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
  };

  return (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${colorMap[color]} shadow-inner`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function LogItem({ time, action, details, status }: any) {
  return (
    <div className="flex gap-4 group">
      <div className="relative pt-1">
        <div className={`w-2 h-2 rounded-full ring-4 ${
          status === 'success' ? 'bg-emerald-500 ring-emerald-50' : 'bg-indigo-500 ring-indigo-50'
        }`}></div>
        <div className="absolute top-4 bottom-0 left-1 w-px bg-slate-100"></div>
      </div>
      <div className="flex-1 pb-4">
        <div className="flex justify-between items-start mb-0.5">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{action}</span>
          <span className="text-[9px] font-bold text-slate-400">{time}</span>
        </div>
        <p className="text-xs text-slate-500">{details}</p>
      </div>
    </div>
  );
}
