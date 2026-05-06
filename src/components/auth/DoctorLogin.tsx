import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/db';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, ArrowLeft, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [boardRegNumber, setBoardRegNumber] = useState('');
  const [nchRegNumber, setNchRegNumber] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          role: 'doctor',
          name: name || user.displayName || 'Doctor',
          createdAt: new Date().toISOString(),
        };

        if (isRegistering) {
          Object.assign(userData, {
            specialization: specialization || 'Homoeopathy Practitioner',
            experience: Number(experience) || 0,
            qualification: qualification || 'Medical Graduate',
            stateBoardRegistrationNumber: boardRegNumber || 'Under Verification',
            nchRegistrationNumber: nchRegNumber || 'Under Verification',
          });
        }

        await setDoc(docRef, userData);
      } else {
        const existingData = docSnap.data();
        if (existingData.role !== 'doctor') {
          toast.error(`This account is registered as a ${existingData.role}. Please use the correct portal.`);
          await auth.signOut();
          return;
        }
      }
      
      toast.success('Welcome Doctor');
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: email,
          role: 'doctor',
          name: name || email.split('@')[0],
          specialization,
          experience: Number(experience),
          qualification,
          stateBoardRegistrationNumber: boardRegNumber,
          nchRegistrationNumber: nchRegNumber,
        });
        toast.success('Practitioner account created');
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const docRef = doc(db, 'users', result.user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().role === 'doctor') {
          toast.success('System Access Granted');
        } else {
          toast.error('Access denied. This portal is for Doctors only.');
          await auth.signOut();
          return;
        }
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 lg:p-10 z-10"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Gateway
        </Link>

        <div>
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" />
            <h2 className="text-xl font-bold text-slate-800 mt-6 tracking-tight">Practitioner Portal</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold mt-3 uppercase tracking-widest leading-none">
              <ShieldCheck size={12} /> Secure Access
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Professional Identity</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input 
                      required={isRegistering}
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Dr. Rajesh Kumar"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Specialization</label>
                      <input 
                        required={isRegistering}
                        type="text" 
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="Homeopathy Expert"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Exp. (Years)</label>
                      <input 
                        required={isRegistering}
                        type="number" 
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Qualifications</label>
                    <input 
                      required={isRegistering}
                      type="text" 
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="BHMS, MD (Homeo)"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Medical License</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Board Reg. Number</label>
                      <input 
                         required={isRegistering}
                         type="text" 
                         value={boardRegNumber}
                         onChange={(e) => setBoardRegNumber(e.target.value)}
                         className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm"
                         placeholder="State Board Reg No."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NCH Reg. Number</label>
                      <input 
                         required={isRegistering}
                         type="text" 
                         value={nchRegNumber}
                         onChange={(e) => setNchRegNumber(e.target.value)}
                         className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm"
                         placeholder="NCH Reg No."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-slate-900 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Secure Credentials</span>
                </div>
              </motion.div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Practice Email</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="clinic@kayrahomeo.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] mt-4 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
            >
              {isRegistering ? 'Register Practice' : 'Authenticate Identity'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-3 text-slate-400 font-bold">Fast-Track Access</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full py-4 border border-slate-200 rounded-xl flex items-center justify-center gap-3 font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Sign in with Google
          </button>

          <p className="mt-8 text-center text-sm text-slate-400">
            {isRegistering ? 'Already a registered doctor?' : "New practitioner?"}{' '}
            <Link 
              to="/register-clinic"
              className="text-indigo-600 font-bold hover:underline"
            >
              Register Clinic with OTP
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
