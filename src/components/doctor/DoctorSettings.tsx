import { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Database, 
  Shield, 
  ShieldCheck,
  Globe, 
  Mail, 
  Smartphone,
  Save,
  RotateCcw,
  ArrowRight,
  IndianRupee,
  Wallet,
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { UserProfile } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/db';
import { toast } from 'sonner';
import AuditLogs from './AuditLogs';
import SupabaseDashboard from './SupabaseDashboard';

interface DoctorSettingsProps {
  profile: UserProfile | null;
}

export default function DoctorSettings({ profile }: DoctorSettingsProps) {
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    consultationFee: profile?.consultationFee || 500,
    followUpFee: profile?.followUpFee || 200,
    specialization: profile?.specialization || '',
    experience: profile?.experience || 0,
    qualification: profile?.qualification || '',
    city: profile?.city || '',
    area: profile?.area || '',
    pincode: profile?.pincode || '',
    stateBoardRegistrationNumber: profile?.stateBoardRegistrationNumber || '',
    nchRegistrationNumber: profile?.nchRegistrationNumber || '',
    clinicName: profile?.clinicName || '',
    clinicAddress: profile?.clinicAddress || '',
    photoURL: profile?.photoURL || '',
    razorpayKeyId: profile?.razorpayKeyId || '',
    razorpayKeySecret: profile?.razorpayKeySecret || '',
  });
  const [paymentStatus, setPaymentStatus] = useState<'configured' | 'missing'>('missing');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        consultationFee: profile.consultationFee || 500,
        followUpFee: profile.followUpFee || 200,
        specialization: profile.specialization || '',
        experience: profile.experience || 0,
        qualification: profile.qualification || '',
        city: profile.city || '',
        area: profile.area || '',
        pincode: profile.pincode || '',
        stateBoardRegistrationNumber: profile.stateBoardRegistrationNumber || '',
        nchRegistrationNumber: profile.nchRegistrationNumber || '',
        clinicName: profile.clinicName || '',
        clinicAddress: profile.clinicAddress || '',
        photoURL: profile.photoURL || '',
        razorpayKeyId: profile.razorpayKeyId || '',
        razorpayKeySecret: profile.razorpayKeySecret || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    const checkPaymentKey = async () => {
      try {
        const { data } = await axios.get('/api/payment/key');
        setPaymentStatus(data.key ? 'configured' : 'missing');
      } catch (err) {
        setPaymentStatus('missing');
      }
    };
    checkPaymentKey();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Base64 storage in Firestore
        toast.error('File size too large. Please select an image under 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        name: formData.name,
        consultationFee: Number(formData.consultationFee),
        followUpFee: Number(formData.followUpFee),
        specialization: formData.specialization,
        experience: Number(formData.experience),
        qualification: formData.qualification,
        city: formData.city,
        area: formData.area,
        pincode: formData.pincode,
        stateBoardRegistrationNumber: formData.stateBoardRegistrationNumber,
        nchRegistrationNumber: formData.nchRegistrationNumber,
        clinicName: formData.clinicName,
        clinicAddress: formData.clinicAddress,
        photoURL: formData.photoURL,
        razorpayKeyId: formData.razorpayKeyId,
        razorpayKeySecret: formData.razorpayKeySecret,
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20 sm:pb-0 px-0 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Settings</h2>
          <p className="text-sm text-slate-500">Manage your practice configuration and profile</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 sm:gap-8 bg-white p-4 sm:p-8 rounded-none sm:rounded-[2.5rem] border-y sm:border border-slate-200 shadow-sm">
        {/* Sidebar / Mobile Tabs */}
        <aside className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 border-b sm:border-b-0 border-slate-100 sm:border-slate-0 shrink-0">
          <SettingsNavLink 
            id="profile" 
            label="Profile" 
            icon={<User size={18} />} 
            active={activeSection === 'profile'} 
            onClick={() => setActiveSection('profile')}
          />
          <SettingsNavLink 
            id="billing" 
            label="Fees" 
            icon={<Wallet size={18} />} 
            active={activeSection === 'billing'} 
            onClick={() => setActiveSection('billing')}
          />
          <SettingsNavLink 
            id="security" 
            label="Privacy" 
            icon={<Lock size={18} />} 
            active={activeSection === 'security'} 
            onClick={() => setActiveSection('security')}
          />
          <SettingsNavLink 
            id="notifications" 
            label="Notifications" 
            icon={<Bell size={18} />} 
            active={activeSection === 'notifications'} 
            onClick={() => setActiveSection('notifications')}
          />
          <SettingsNavLink 
            id="database" 
            label="Data" 
            icon={<Database size={18} />} 
            active={activeSection === 'database'} 
            onClick={() => setActiveSection('database')}
          />
          <SettingsNavLink 
            id="logs" 
            label="Audit Trail" 
            icon={<Shield size={18} />} 
            active={activeSection === 'logs'} 
            onClick={() => setActiveSection('logs')}
          />
          <SettingsNavLink 
            id="supabase" 
            label="Supabase Engine" 
            icon={<Database size={18} />} 
            active={activeSection === 'supabase'} 
            onClick={() => setActiveSection('supabase')}
          />
        </aside>

        {/* Content */}
        <div className="space-y-8 pt-4 sm:pt-0">
          {activeSection === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                <div 
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 relative group overflow-hidden cursor-pointer border-2 border-dashed border-slate-200 hover:border-emerald-500 transition-all"
                >
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={32} />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white uppercase">Upload</span>
                  </div>
                  <input 
                    id="photo-upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Clinic Profile Photo</h4>
                  <p className="text-sm text-slate-500">Professional photo for your clinic profile</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">MAX 1MB • PNG/JPG</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Specialization</label>
                  <input 
                    type="text" 
                    value={formData.specialization}
                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Experience (Years)</label>
                  <input 
                    type="number" 
                    value={formData.experience}
                    onChange={e => setFormData({ ...formData, experience: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Qualification</label>
                  <input 
                    type="text" 
                    value={formData.qualification}
                    onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">City / शहर</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Area / क्षेत्र</label>
                  <input 
                    type="text" 
                    value={formData.area}
                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pincode / पिनकोड</label>
                  <input 
                    type="text" 
                    value={formData.pincode}
                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Clinic Name</label>
                  <input 
                    type="text" 
                    value={formData.clinicName}
                    onChange={e => setFormData({ ...formData, clinicName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="e.g. Kayra Homeo Care"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-slate-700">Clinic Address</label>
                  <textarea 
                    value={formData.clinicAddress}
                    onChange={e => setFormData({ ...formData, clinicAddress: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px]"
                    placeholder="Full physical address of your clinic"
                  />
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 mt-4 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Medical Accreditations</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">State Board Reg. Number</label>
                      <input 
                        type="text" 
                        value={formData.stateBoardRegistrationNumber}
                        onChange={e => setFormData({ ...formData, stateBoardRegistrationNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                        placeholder="e.g. 12345/State"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">NCH Reg. Number</label>
                      <input 
                        type="text" 
                        value={formData.nchRegistrationNumber}
                        onChange={e => setFormData({ ...formData, nchRegistrationNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                        placeholder="e.g. NCH-98765"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'billing' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <IndianRupee size={20} className="text-emerald-500" />
                  Fee Structure
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Consultation Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input 
                        type="number"
                        value={formData.consultationFee}
                        onChange={e => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Follow-up Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input 
                        type="number"
                        value={formData.followUpFee}
                        onChange={e => setFormData({ ...formData, followUpFee: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  Razorpay Integration
                </h4>
                  <div className={`p-6 rounded-[2rem] border-2 border-dashed transition-all ${
                  paymentStatus === 'configured' || formData.razorpayKeyId
                  ? 'border-emerald-200 bg-emerald-50/50' 
                  : 'border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          paymentStatus === 'configured' || formData.razorpayKeyId ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {paymentStatus === 'configured' || formData.razorpayKeyId ? 'Gateway Active' : 'Gateway Inactive'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Configure your personal Razorpay account for direct settlements.
                          </p>
                        </div>
                      </div>
                      {(paymentStatus === 'configured' || formData.razorpayKeyId) ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          Verified
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200">
                          Pending
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Razorpay Key ID</label>
                        <input 
                          type="text"
                          value={formData.razorpayKeyId}
                          onChange={e => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-mono text-xs"
                          placeholder="rzp_live_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Razorpay Key Secret</label>
                        <input 
                          type="password"
                          value={formData.razorpayKeySecret}
                          onChange={e => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-mono text-xs"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="text-indigo-600 mt-1" />
                  <div>
                    <h5 className="text-sm font-bold text-indigo-900">Platform Commission</h5>
                    <p className="text-xs text-indigo-700 font-medium mb-2">Automated deduction on every digital payment settlement.</p>
                    <div className="flex items-center gap-2">
                       <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-sm">{profile?.commissionRate || 10}%</span>
                       <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest italic">Current Rate</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-emerald-900 rounded-[2rem] text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h5 className="font-bold text-lg mb-2">Instant Billing</h5>
                  <p className="text-emerald-100 text-sm mb-6">These fees will be automatically calculated when creating new invoices in the Billing Manager.</p>
                  <button 
                    onClick={() => setActiveSection('billing')}
                    className="px-6 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-50 transition-colors"
                  >
                    View All Invoices <ArrowRight size={14} />
                  </button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              </div>
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  Session Privacy
                </h4>
                <div className="p-4 border border-slate-100 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Auto-lock on inactive</p>
                      <p className="text-xs text-slate-400">Lock the portal after 15 minutes of inactivity</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'notifications' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Bell size={20} className="text-emerald-500" />
                  Notification Preferences
                </h4>
                <div className="p-4 border border-slate-100 rounded-xl space-y-4">
                   <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Email Notifications</p>
                      <p className="text-xs text-slate-400">Receive daily agenda summaries</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-100 rounded-full relative cursor-pointer">
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'database' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 items-start">
                <Shield size={20} className="text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Last backup was completed on **26 Apr 2024 at 11:45 PM**. We recommend weekly manual exports.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <Database size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">Export All Data</h4>
                      <p className="text-xs text-slate-500">Full JSON backup including patient history and prescriptions</p>
                    </div>
                  </div>
                  <button className="text-emerald-600 text-sm font-bold uppercase tracking-wider hover:underline">Download</button>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">Clinic Branding</h4>
                      <p className="text-xs text-slate-500">Customize logo and header for PDF prescriptions</p>
                    </div>
                  </div>
                  <button className="text-emerald-600 text-sm font-bold uppercase tracking-wider hover:underline">Configure</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'logs' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <AuditLogs profile={profile} />
            </motion.div>
          )}

          {activeSection === 'supabase' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <SupabaseDashboard />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsNavLink({ id, label, icon, active, onClick }: { 
  id: string, label: string, icon: React.ReactNode, active: boolean, onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 sm:px-3 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs sm:text-sm font-bold sm:font-medium transition-all whitespace-nowrap ${
        active 
          ? 'bg-emerald-50 text-emerald-700 shadow-sm sm:shadow-none' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
