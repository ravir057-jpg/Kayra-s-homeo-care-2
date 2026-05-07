import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Calendar, Heart, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../../lib/db';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export default function PatientProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Other',
    area: '',
    city: '',
    weight: '',
    height: '',
    bloodGroup: '',
    allergies: ''
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const patientId = `KHC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const payload = {
        ...formData,
        patientId,
        uid: user?.uid || null,
        createdAt: new Date().toISOString(),
        role: 'patient'
      };

      // Create patient document
      const docRef = await addDoc(collection(db, 'patients'), payload);
      
      // If user is authenticated, update their profile too
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: formData.name,
          role: 'patient',
          createdAt: new Date().toISOString()
        });
      }

      // Store session
      localStorage.setItem('kayra_patient_session', JSON.stringify({
        patientId: docRef.id,
        name: formData.name,
        loginType: 'onboarding'
      }));

      toast.success('Your health sanctuary is ready!');
      navigate('/portal');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Left side info */}
      <div className="hidden md:flex w-1/3 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-indigo-600/20 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="mb-12">
             <h1 className="text-3xl font-black text-white italic tracking-tighter">KAYRA<span className="text-emerald-500">HOLISTIC</span></h1>
          </div>
          
          <div className="space-y-8">
            <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">Welcome to the future of personal health.</h2>
            <p className="text-slate-400 text-lg">Let's set up your profile to provide you with personalized holistic care.</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <Check size={16} /> Data Encryption Standard
          </div>
          <div className="flex items-center gap-3 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <Check size={16} /> HIPAA Compliant Storage
          </div>
        </div>
      </div>

      {/* Right side form */}
      <div className="flex-1 p-6 md:p-24 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-xl relative z-10">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-12">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="space-y-8"
          >
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Identity Details</h3>
                  <p className="text-slate-400 text-sm font-medium">Your basic information for medical records.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         type="text" 
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                         className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700"
                         placeholder="e.g. John Doe"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                         type="number" 
                         value={formData.age}
                         onChange={(e) => setFormData({...formData, age: e.target.value})}
                         className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700"
                         placeholder="25"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                      <select 
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700 appearance-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={nextStep}
                  disabled={!formData.name || !formData.age}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  Continue Part II <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Location Context</h3>
                  <p className="text-slate-400 text-sm font-medium">This helps us find experts near you.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Village / Area</label>
                    <div className="relative">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         type="text" 
                         value={formData.area}
                         onChange={(e) => setFormData({...formData, area: e.target.value})}
                         className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700"
                         placeholder="e.g. Model Town"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Town / City</label>
                    <div className="relative">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         type="text" 
                         value={formData.city}
                         onChange={(e) => setFormData({...formData, city: e.target.value})}
                         className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700"
                         placeholder="e.g. Mumbai"
                       />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={prevStep}
                    className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={nextStep}
                    className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Continue Part III
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Health Metrics</h3>
                  <p className="text-slate-400 text-sm font-medium">Final details to complete your profile.</p>
                </div>

                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blood Group</label>
                        <select 
                          value={formData.bloodGroup}
                          onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                          className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700 appearance-none"
                        >
                          <option value="">Unknown</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vital Stat</label>
                        <div className="relative">
                          <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                           type="text" 
                           value={formData.weight}
                           onChange={(e) => setFormData({...formData, weight: e.target.value})}
                           className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700"
                           placeholder="Weight (kg)"
                          />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Known Allergies</label>
                    <textarea 
                      value={formData.allergies}
                      onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                      className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-700 min-h-[100px]"
                      placeholder="e.g. Penicillin, Peanuts (Optional)"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={prevStep}
                    className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Initializing...' : 'Construct Sanctuary'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
