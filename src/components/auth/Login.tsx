import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/db';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Stethoscope, UserCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<'doctor' | 'patient'>('doctor');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'patient') setRole('patient');
    else if (roleParam === 'doctor') setRole('doctor');
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists
      const docPath = `users/${user.uid}`;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            uid: user.uid,
            email: user.email,
            role: role,
            name: user.displayName || (role === 'doctor' ? 'Doctor' : 'Patient')
          });
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.code === 'auth/network-request-failed') {
        toast.error('Network Error: Please check if popups are blocked or if your firewall is blocking Google Auth. Try using the direct App URL if this persists.');
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const docPath = `users/${result.user.uid}`;
        try {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: email,
            role: role,
            name: email.split('@')[0]
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, docPath);
        }
        toast.success('Account created successfully');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 lg:p-10 z-10"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg shadow-indigo-100 italic">K</div>
          <h2 className="text-2xl font-bold text-slate-800">Kayra Homeo Care</h2>
          <p className="text-slate-400 text-sm text-center">Global Homeopathic Consultation Platform</p>
        </div>

        {/* Role Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
          <button 
            onClick={() => setRole('doctor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              role === 'doctor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Stethoscope size={16} /> Doctor
          </button>
          <button 
            onClick={() => setRole('patient')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              role === 'patient' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserCircle size={16} /> Patient
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
              placeholder="e.g. clinic@kayrahomeo.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Security Key</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            className={`w-full py-4 rounded-xl text-white font-bold shadow-xl transition-all active:scale-[0.98] mt-4 uppercase tracking-wider text-sm ${
              role === 'doctor' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
            }`}
          >
            {isRegistering ? 'Create Account' : `Sign In as ${role.toUpperCase()}`}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-3 text-slate-400 font-bold">One-Click Access</span></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 border border-slate-200 rounded-xl flex items-center justify-center gap-3 font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          Google Quick Sign-In
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          {isRegistering ? 'Already have an account?' : "New to the platform?"}{' '}
          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className={`${role === 'doctor' ? 'text-indigo-600' : 'text-emerald-600'} font-bold hover:underline`}
          >
            {isRegistering ? 'Sign In Here' : 'Register Now'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
