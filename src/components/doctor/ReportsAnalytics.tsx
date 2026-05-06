import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CircleDollarSign as IndianRupee, 
  Calendar,
  FileBarChart,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const data = [
  { name: 'Jan', revenue: 45000, patients: 120 },
  { name: 'Feb', revenue: 52000, patients: 145 },
  { name: 'Mar', revenue: 48000, patients: 132 },
  { name: 'Apr', revenue: 61000, patients: 168 },
  { name: 'May', revenue: 55000, patients: 154 },
  { name: 'Jun', revenue: 67000, patients: 189 },
];

const medicineData = [
  { name: 'Arnica', value: 400 },
  { name: 'Belladonna', value: 300 },
  { name: 'Nux Vomica', value: 300 },
  { name: 'Rhus Tox', value: 200 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

import { useLanguage } from '../../lib/i18n';
import { getDashboardStats, getRevenueChartData } from '../../services/analyticsService';
import { auth } from '../../lib/db';

export default function ReportsAnalytics() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const s = await getDashboardStats(user.uid);
      const c = await getRevenueChartData(user.uid);
      setStats(s);
      setChartData(c);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="h-96 flex items-center justify-center">Loading Analytics...</div>;

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('reports')}</h2>
          <p className="text-sm text-slate-500">Insights into clinical performance</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard 
          title="Revenue" 
          value={`₹${(stats.revenue / 1000).toFixed(1)}k`} 
          trend={`${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%`} 
          positive={stats.revenueChange >= 0} 
          icon={<IndianRupee size={18} />} 
          color="emerald"
        />
        <StatCard 
          title="Patients" 
          value={stats.patients.toString()} 
          trend={`${stats.patientsChange >= 0 ? '+' : ''}${stats.patientsChange}%`} 
          positive={stats.patientsChange >= 0} 
          icon={<Users size={18} />} 
          color="blue"
        />
        <StatCard 
          title="Rating" 
          value={stats.rating > 0 ? stats.rating.toString() : 'N/A'} 
          trend={`${stats.reviewCount} Reviews`} 
          positive={true} 
          icon={<TrendingUp size={18} />} 
          color="amber"
        />
        <StatCard 
          title="Visits" 
          value={stats.appointments.toString()} 
          trend={`${stats.appointmentsChange >= 0 ? '+' : ''}${stats.appointmentsChange}%`} 
          positive={stats.appointmentsChange >= 0} 
          icon={<Calendar size={18} />} 
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Revenue & Growth</h3>
            <select className="bg-slate-50 border-none text-[10px] font-bold text-slate-500 rounded-lg px-2 py-1 outline-none">
              <option>WEEKS</option>
              <option>MONTHS</option>
            </select>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  hide={window.innerWidth < 640}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`₹${(value as number).toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Medicine Analytics */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-sm sm:text-base">Top Medicines</h3>
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={medicineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {medicineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {medicineData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}u</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Acquisition */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-sm sm:text-base">Monthly Visits</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis hide={window.innerWidth < 640} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="patients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Insights */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-sm sm:text-base">Metric Insights</h3>
          <div className="space-y-4">
            <InsightItem 
              label="Peak Hours" 
              value="4 PM - 7 PM" 
              description="Most busy timeslot during the week."
            />
            <InsightItem 
              label="Returning Patients" 
              value="62%" 
              description="Patients recurring within 30 days."
            />
            <InsightItem 
              label="Common Ailment" 
              value="Skin Allergies" 
              description="Most frequent diagnosis this month."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, positive, icon, color }: { 
  title: string, value: string, trend: string, positive: boolean, icon: React.ReactNode, color: string 
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
      </div>
    </div>
  );
}

function InsightItem({ label, value, description }: { label: string, value: string, description: string }) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-slate-800">{value}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}
