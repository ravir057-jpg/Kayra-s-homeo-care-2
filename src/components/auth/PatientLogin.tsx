import { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType, signInAnonymouslyWithFallback } from '../../lib/db';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { UserCircle, ArrowLeft, Heart, ArrowRight, LogOut, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';

export default function PatientLogin() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || !registrationNumber) {
      toast.error('Please enter both mobile number and registration number (KHC-ID)');
      return;
    }

    setLoading(true);
    try {
      // 1. Find record by mobile and PatientId
      const q = query(
        collection(db, 'patients'), 
        where('mobileNumber', '==', mobileNumber),
        where('patientId', '==', registrationNumber.toUpperCase())
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const patientDoc = querySnapshot.docs[0];
        const patientData = patientDoc.data();
        
        // 2. Sign in anonymously to get a UID for Firestore rules
        const userCredential = await signInAnonymouslyWithFallback();
        const uid = userCredential.user.uid;

        // 3. Keep the UID in sync for direct DB queries based on Auth UID and security rules
        await updateDoc(doc(db, 'patients', patientDoc.id), {
          uid: uid,
          lastLoginAt: new Date().toISOString()
        });

        // Also create/update a user profile record in users so App.tsx can subscribe to it directly
        await setDoc(doc(db, 'users', uid), {
          uid: uid,
          name: patientData.name,
          role: 'patient',
          createdAt: patientData.createdAt || new Date().toISOString()
        });
        
        // 4. Store session info for the UI
        localStorage.setItem('kayra_patient_session', JSON.stringify({
          patientId: patientDoc.id,
          name: patientData.name,
          mobileNumber: patientData.mobileNumber,
          loginType: 'phone-id'
        }));
        
        toast.success(`Welcome back, ${patientData.name}`);
        navigate('/portal');
      } else {
        toast.error('Details not matching any current registration. Please verify your mobile number and KHC-ID.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'System error during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      localStorage.removeItem('kayra_patient_session');
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          role: 'patient',
          name: user.displayName || 'Patient',
          createdAt: new Date().toISOString()
        });

        // Also check if they exist in patients collection by email
        const pQuery = query(collection(db, 'patients'), where('email', '==', user.email));
        const pSnap = await getDocs(pQuery);
        if (pSnap.empty) {
          await addDoc(collection(db, 'patients'), {
            uid: user.uid,
            name: user.displayName || 'Patient',
            email: user.email,
            createdAt: new Date().toISOString(),
            source: 'google-login'
          });
        }
      }
      toast.success('Patient Portal accessed');
      navigate('/portal');
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.code === 'auth/network-request-failed') {
        toast.error('Network Error: Please check if popups are blocked or if your firewall is blocking Google Auth. Try using the direct App URL if this persists.');
      } else {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-emerald-50/40 rounded-full blur-[80px] sm:blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] sm:rounded-3xl shadow-2xl shadow-slate-200/80 p-5 sm:p-10 z-10 border border-slate-100"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="flex flex-col items-center mb-8">
          <Logo size="md" />
          <div className="mt-6 text-center space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Health Portal</h2>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Healing with Precision</p>
          </div>
        </div>

        <form onSubmit={handlePatientLogin} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">KHC-ID / पंजीयन</label>
              <button 
                type="button"
                onClick={() => toast.info('KHC-ID is on your prescription or billing receipt.')}
                className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
              >
                Forgot?
              </button>
            </div>
            <input 
              required
              type="text" 
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
              className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-sm font-black text-slate-700 placeholder:font-medium placeholder:text-slate-300"
              placeholder="KHC-XXXXXX"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 leading-none">Mobile / मोबाइल</label>
            <input 
              required
              type="tel" 
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-sm font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-300"
              placeholder="98765 43210"
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group text-[11px] uppercase tracking-[0.2em] disabled:opacity-70"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Verifying Health Profile...
              </>
            ) : (
              <>Access Patient Portal <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-4 text-slate-400 font-bold">Safe Sign-In</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Continue with Google
        </button>

        <div className="mt-8 bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
              <Plus size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">New Patient?</p>
              <p className="text-[11px] text-emerald-700/70 font-medium leading-relaxed mb-3">If you haven't consulted with us before, please register to get your KHC-ID.</p>
              <Link 
                to="/book-appointment"
                className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest group"
              >
                Register & Book <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-600/30 uppercase tracking-widest">
          <Heart size={14} fill="currentColor" />
          <span>Healing with precision</span>
        </div>
      </motion.div>
    </div>
  );
}
