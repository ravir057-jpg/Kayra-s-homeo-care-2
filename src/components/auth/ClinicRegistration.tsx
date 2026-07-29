import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, signInAnonymouslyWithFallback } from '../../lib/db';
import { 
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  ArrowLeft, 
  ArrowRight, 
  Smartphone, 
  Mail, 
  Building2, 
  ShieldCheck, 
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  CheckSquare,
  Square,
  UserPlus,
  Trash2,
  Plus,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Logo from '../Logo';

type RegistrationStep = 'details' | 'mobile' | 'email' | 'complete';

export default function ClinicRegistration() {
  const [step, setStep] = useState<RegistrationStep>('details');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Clinic Details
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [boardRegNumber, setBoardRegNumber] = useState('');
  const [nchRegNumber, setNchRegNumber] = useState('');

  // Additional Doctors under Clinic
  const [additionalDoctors, setAdditionalDoctors] = useState<Array<{
    name: string;
    email: string;
    phone: string;
    specialization: string;
    qualification: string;
    boardRegNumber: string;
    nchRegNumber: string;
    fees: number;
  }>>([]);

  const [newDocForm, setNewDocForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    boardRegNumber: '',
    nchRegNumber: '',
    fees: 500
  });
  const [showAddDocForm, setShowAddDocForm] = useState(false);

  // Mobile Auth
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Email Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      toast.error('Please enter a valid mobile WhatsApp number (e.g. 9876543210)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobileNumber, digits: 6 })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp verification code');
      }

      setOtpSent(true);
      setResendTimer(60);
      toast.success(`WhatsApp verification code sent successfully! [DEMO MODE CODE: ${data.code}]`, {
        duration: 8000
      });
    } catch (error: any) {
      console.error('OTP Send Error:', error);
      toast.error(error.message || 'Failed to send OTP via WhatsApp. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobileNumber, code: otp })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification response');
      }

      // Ensure authenticated session is active
      if (!auth.currentUser) {
        await signInAnonymouslyWithFallback();
      }

      toast.success('WhatsApp number verified successfully!');
      setStep('email');
    } catch (error: any) {
      console.error('Verify Error:', error);
      toast.error(error.message || 'Invalid WhatsApp OTP. Please use the active demo code or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('You must agree to the Terms & Conditions and Privacy Protected Policy of Kayra\'s Care.');
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // If user is already authenticated via Phone, we might want to link email or just create profile
      // But typically, we'll create a new account with Email/Password and link details
      // Since they already did Phone Auth, auth.currentUser is authenticated with Phone.
      
      // Update the existing phone-authenticated user with profile details
      const user = auth.currentUser;
      if (!user) throw new Error('Session expired. Please restart registration.');

      // We should ideally use email too. 
      // If we want both, we might need to link accounts. 
      // For simplicity, we'll save everything to Firestore associated with the current UID.
      
      const clinicId = 'cl-' + Math.random().toString(36).substring(2, 10);
      
      // 1. Create Clinic Document
      const clinicData = {
        id: clinicId,
        name: clinicName,
        ownerId: user.uid,
        address: clinicAddress,
        phone: mobileNumber,
        email: email,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
        createdAt: new Date().toISOString(),
        settings: {
          enableAI: true,
          enableVideo: true
        }
      };

      await setDoc(doc(db, 'clinics', clinicId), clinicData);

      // 2. Create User Profile
      const profileData = {
        uid: user.uid,
        name: doctorName,
        email: email,
        role: 'clinic_admin',
        clinicId: clinicId,
        ownedClinicId: clinicId,
        clinicName,
        clinicAddress,
        mobileNumber,
        isMobileVerified: true,
        specialization,
        experience: Number(experience),
        qualification,
        stateBoardRegistrationNumber: boardRegNumber,
        nchRegistrationNumber: nchRegNumber,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      
      // 3. Register as a Doctor in the clinic too (Optional, but usually clinic owner is also a doctor)
      const doctorProfile = {
        uid: user.uid,
        clinicId,
        name: doctorName,
        qualification,
        specialization: [specialization],
        isActive: true,
        isVerified: true
      };
      await setDoc(doc(db, 'doctors', user.uid), doctorProfile);
      
      // 4. Register any additional doctors pre-configured under this clinic
      if (additionalDoctors && additionalDoctors.length > 0) {
        for (const docInfo of additionalDoctors) {
          // Unique claimable key for the pre-registered doctor
          const docId = `pre-doc-${docInfo.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          
          const addDocProfile = {
            uid: docId,
            name: docInfo.name,
            email: docInfo.email.toLowerCase(),
            phone: docInfo.phone,
            mobileNumber: docInfo.phone,
            role: 'doctor',
            clinicId: clinicId,
            clinicName: clinicName,
            clinicAddress: clinicAddress,
            specialization: docInfo.specialization,
            qualification: docInfo.qualification,
            stateBoardRegistrationNumber: docInfo.boardRegNumber,
            nchRegistrationNumber: docInfo.nchRegNumber,
            consultationFee: Number(docInfo.fees) || 500,
            isOnboarded: true, // Auto-onboard so they don't have to fill onboarding form again
            isVerified: false,
            isPreRegistered: true,
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'users', docId), addDocProfile);

          await setDoc(doc(db, 'doctors', docId), {
            uid: docId,
            clinicId: clinicId,
            name: docInfo.name,
            qualification: docInfo.qualification,
            specialization: [docInfo.specialization],
            isActive: true,
            isVerified: false
          });
        }
      }

      // Optionally update Firebase Profile
      await updateProfile(user, { displayName: doctorName });

      // Send email verification if user has an email
      if (email && !user.emailVerified) {
        try {
          await sendEmailVerification(user);
          toast.info('Verification email sent to ' + email);
        } catch (e) {
          console.error('Email verification error:', e);
        }
      }

      setStep('complete');
      toast.success('Clinic registered successfully!');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'clinic-registration');
      console.error('Final Submit Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Account already exists.', {
          description: 'A practitioner account with this email is already registered. Please sign in.',
          action: {
            label: 'Sign In',
            onClick: () => navigate('/doctor-login')
          }
        });
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Registration disabled.', {
          description: 'You must enable "Email/Password" authentication in your Firebase Project console.'
        });
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Minimum 6 characters required.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('The email address provided is invalid.');
      } else {
        toast.error(error.message || 'Registration failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'details':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="text-emerald-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800">Clinic Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clinic Name</label>
                  <input 
                    type="text" 
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="e.g. Kayra Homoeo Clinic"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Practice Location</label>
                  <input 
                    type="text" 
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="City, State"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="text-indigo-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800">Practitioner Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Doctor Name</label>
                  <input 
                    type="text" 
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Specialization</label>
                  <input 
                    type="text" 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="e.g. Chronic Diseases"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Qualifications</label>
                  <input 
                    type="text" 
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="BHMS, MD"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Years of Exp.</label>
                  <input 
                    type="number" 
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Years"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2 mb-4">
                <FileText className="text-slate-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800">Registration Proofs</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">State Board Reg.</label>
                  <input 
                    type="text" 
                    value={boardRegNumber}
                    onChange={(e) => setBoardRegNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Reg No."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NCH Reg. No.</label>
                  <input 
                    type="text" 
                    value={nchRegNumber}
                    onChange={(e) => setNchRegNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Reg No."
                  />
                </div>
              </div>
            </div>

            {/* Additional Doctors List & Register Sub-Form */}
            <div className="space-y-4 pt-6 mt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <UserPlus className="text-emerald-600" size={20} />
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Clinic’s Other Doctors</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Multi-Doctor Practice Setup (Optional)</p>
                  </div>
                </div>
                {!showAddDocForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddDocForm(true)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-emerald-100"
                  >
                    <Plus size={14} /> Add Doctor
                  </button>
                )}
              </div>

              {/* Render existing added doctors list */}
              {additionalDoctors.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {additionalDoctors.map((doc, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Dr. {doc.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {doc.specialization || 'General Homoeopath'} • {doc.qualification || 'BHMS'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {doc.email} • {doc.phone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalDoctors(prev => prev.filter((_, i) => i !== idx));
                          toast.success('Doctor removed from registration list.');
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              {showAddDocForm && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4 relative animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => setShowAddDocForm(false)}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={16} />
                  </button>
                  <p className="text-xs font-bold text-slate-700">Enter Doctor Details</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Doctor Name *</label>
                      <input
                        type="text"
                        placeholder="Dr. Shreyas Patil"
                        value={newDocForm.name}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email (For Login) *</label>
                      <input
                        type="email"
                        placeholder="dr.shreyas@gmail.com"
                        value={newDocForm.email}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Phone / WhatsApp *</label>
                      <input
                        type="tel"
                        placeholder="Mobile Number"
                        value={newDocForm.phone}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Specialization</label>
                      <input
                        type="text"
                        placeholder="e.g. Paediatric Homeopathy"
                        value={newDocForm.specialization}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, specialization: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Qualifications</label>
                      <input
                        type="text"
                        placeholder="BHMS, LCEH"
                        value={newDocForm.qualification}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, qualification: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Consultation Fees (₹)</label>
                      <input
                        type="number"
                        placeholder="500"
                        value={newDocForm.fees}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, fees: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Board Reg. No.</label>
                      <input
                        type="text"
                        placeholder="Reg Number"
                        value={newDocForm.boardRegNumber}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, boardRegNumber: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">NCH Reg. No.</label>
                      <input
                        type="text"
                        placeholder="National Reg Number"
                        value={newDocForm.nchRegNumber}
                        onChange={(e) => setNewDocForm(prev => ({ ...prev, nchRegNumber: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddDocForm(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newDocForm.name || !newDocForm.email || !newDocForm.phone) {
                          toast.error('Name, Email, and Phone/WhatsApp number are required fields.');
                          return;
                        }
                        if (additionalDoctors.some(d => d.email.toLowerCase() === newDocForm.email.toLowerCase())) {
                          toast.error('A doctor with this email is already added to the list.');
                          return;
                        }
                        setAdditionalDoctors(prev => [...prev, { ...newDocForm }]);
                        setNewDocForm({
                          name: '',
                          email: '',
                          phone: '',
                          specialization: '',
                          qualification: '',
                          boardRegNumber: '',
                          nchRegNumber: '',
                          fees: 500
                        });
                        setShowAddDocForm(false);
                        toast.success('Doctor details pre-configured for this clinic.');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                    >
                      Add to Registration
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                if (!clinicName) {
                  toast.error('Please enter the clinic name.');
                  return;
                }
                if (!doctorName) {
                  toast.error('Please enter the primary doctor name.');
                  return;
                }
                setStep('mobile');
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px]"
            >
              Next: Mobile Verification <ArrowRight size={16} />
            </button>
          </motion.div>
        );
      case 'mobile':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Mobile Verification</h3>
              <p className="text-sm text-slate-500 px-6">We'll send a 6-digit OTP to verify your registered mobile number.</p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mobile Number (with Country Code)</label>
                  <div className="relative">
                    <input 
                      type="tel" 
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all text-lg font-medium"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP Code'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-1.5 ml-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enter 6-Digit OTP</label>
                    <button 
                      onClick={handleSendOtp}
                      disabled={resendTimer > 0 || loading}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest disabled:text-slate-400 hover:underline"
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 rounded-xl border-2 border-emerald-100 focus:border-emerald-500 outline-none transition-all text-center text-3xl font-bold tracking-[0.5em]"
                    placeholder="000000"
                  />
                </div>
                <button 
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <button 
                  onClick={() => setOtpSent(false)}
                  className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Change Mobile Number
                </button>
              </div>
            )}

            <button 
              onClick={() => setStep('details')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest mx-auto mt-4"
            >
              <ArrowLeft size={14} /> Back to Details
            </button>
          </motion.div>
        );
      case 'email':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center space-y-2 mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Email Registration</h3>
              <p className="text-sm text-slate-500 px-6">Provide your practice email to receive notifications and digital prescriptions.</p>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Practice Email</label>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  placeholder="clinic@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Secure Password</label>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><CheckCircle2 className="text-emerald-500" size={16} /></div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Mobile Verified</h4>
                    <p className="text-[10px] text-slate-500">{mobileNumber}</p>
                  </div>
                </div>
              </div>

              {/* Terms and conditions agreement checkbox */}
              <div 
                onClick={() => setAgreed(!agreed)}
                className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer select-none hover:bg-slate-100/50 transition-all text-left"
              >
                <button
                  type="button"
                  className="mt-0.5 text-emerald-600 transition-transform active:scale-95 shrink-0 animate-none"
                >
                  {agreed ? (
                    <CheckSquare size={16} className="text-emerald-650 fill-emerald-100" />
                  ) : (
                    <Square size={16} className="text-slate-300" />
                  )}
                </button>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-500 leading-normal">
                  I agree to the <Link to="/legal/terms" className="text-emerald-650 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Terms &amp; Conditions</Link> and <Link to="/legal/privacy" className="text-emerald-650 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link> as a clinical practitioner, obeying Medical Council Registration laws.
                </p>
              </div>

              <button 
                type="submit"
                disabled={loading || !agreed}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] disabled:opacity-50 mt-4"
              >
                {loading ? 'Registering...' : 'Register Registration'} <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        );
      case 'complete':
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto relative">
              <CheckCircle2 size={48} />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500 rounded-full"
              ></motion.div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">Clinic Registered!</h3>
              <p className="text-sm text-slate-500 px-8">Your clinical practice is now active on Kayra Homoeo Care network.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Status</p>
                  <p className="text-[11px] font-bold text-slate-800">Identity & Practice Verified</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
                  <UserPlus size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Staff Doctors Loaded</p>
                  <p className="text-[11px] font-bold text-slate-800">
                    Primary Practitioner + {additionalDoctors.length} staff doctor{additionalDoctors.length === 1 ? '' : 's'} registered
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Next Step</p>
                  <p className="text-[11px] font-bold text-slate-800">Login and Complete AI Profile Setup</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all uppercase tracking-widest text-[11px]"
            >
              Enter Dashboard
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden border border-slate-100">
        {/* Progress Sidebar */}
        <div className="md:w-64 bg-slate-50 border-r border-slate-100 p-8 flex flex-col">
          <Logo size="md" />
          <div className="mt-12 space-y-8 flex-1">
            <div className="flex items-center gap-4 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'details' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>1</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 'details' ? 'text-slate-900' : 'text-slate-400'}`}>Clinical Details</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'mobile' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 'mobile' ? 'text-slate-900' : 'text-slate-400'}`}>Mobile OTP</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 'email' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>3</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 'email' ? 'text-slate-900' : 'text-slate-400'}`}>Verification</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-200">
            <Link to="/doctor-login" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest">
              <ArrowLeft size={14} /> Practitioner Sign In
            </Link>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-12 max-h-[90vh] overflow-y-auto">
          {renderStep()}
        </div>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}
