import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Stethoscope, 
  ShieldCheck, 
  Building2, 
  Clock, 
  Brain, 
  ChevronRight, 
  ChevronLeft,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  MapPin,
  Globe,
  Plus,
  X,
  CreditCard,
  Zap,
  Info
} from 'lucide-react';
import { auth, db } from '../../lib/db';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Clinic } from '../../types';

interface OnboardingProps {
  user: UserProfile;
  onComplete: () => void;
}

export default function DoctorOnboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(user.onboardingStep || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UserProfile & Clinic>>({
    name: user.name || '',
    gender: user.gender || 'Male',
    dob: user.dob || '',
    languages: user.languages || [],
    qualification: user.qualification || '',
    stateBoardRegistrationNumber: user.stateBoardRegistrationNumber || '',
    registrationYear: user.registrationYear || '',
    experience: user.experience || 0,
    specializations: user.specializations || [],
    identityProofType: user.identityProofType || 'Aadhar',
    telemedicineConsent: user.telemedicineConsent || false,
    disclaimerAccepted: user.disclaimerAccepted || false,
    clinicName: user.clinicName || '',
    whatsappLink: '',
    formspreeId: '',
    onlineConsultationFee: 0,
    physicalConsultationFee: 0,
    consultationFee: 500,
    commissionRate: 10,
    consultationModes: ['Online'],
    aiAnalyzerEnabled: true,
    privacyAgreementAccepted: false,
    address: user.clinicAddress || '',
  });

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
      // Save progress to Firebase
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { onboardingStep: step + 1 });
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    } else {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      const clinicId = user.clinicId || `clinic_${user.uid}`;
      const clinicRef = doc(db, 'clinics', clinicId);

      // 1. Update User Profile
      await updateDoc(userRef, {
        ...formData,
        consultationFee: formData.onlineConsultationFee || formData.physicalConsultationFee || 500,
        isOnboarded: true,
        clinicId,
        onboardingStep: totalSteps,
        isVerified: false, // Pending manual verification
      });

      // 2. Create/Update Clinic
      const clinicData: Partial<Clinic> = {
        name: formData.clinicName,
        ownerId: user.uid,
        whatsappLink: formData.whatsappLink,
        formspreeId: formData.formspreeId,
        onlineConsultationFee: formData.onlineConsultationFee,
        physicalConsultationFee: formData.physicalConsultationFee,
        consultationModes: formData.consultationModes,
        aiAnalyzerEnabled: formData.aiAnalyzerEnabled,
        address: formData.address,
        privacyAgreementAccepted: formData.privacyAgreementAccepted,
        createdAt: new Date().toISOString(),
      };

      await setDoc(clinicRef, clinicData, { merge: true });

      onComplete();
    } catch (err) {
      setError("Failed to complete onboarding. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Personal Profile', icon: User },
    { id: 2, title: 'Professional Credentials', icon: Stethoscope },
    { id: 3, title: 'Legal & Compliance', icon: ShieldCheck },
    { id: 4, title: 'Clinic Branding', icon: Building2 },
    { id: 5, title: 'Operations & Pricing', icon: Clock },
    { id: 6, title: 'Diagnostics', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Dynamic Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
                <ShieldCheck size={20} />
             </div>
             <div>
                <h1 className="text-lg font-black tracking-tight leading-none">Kayra Clinical Onboarding</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Professional Verification Engine</p>
             </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-black text-brand-600 uppercase tracking-widest">Step {step} of {totalSteps}</span>
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden ml-2">
              <motion.div 
                className="h-full bg-brand-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar Nav */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-4 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-100' : 
                    isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-300 border border-slate-100'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${
                      isActive ? 'text-brand-600' : isCompleted ? 'text-emerald-500' : 'text-slate-400'
                    }`}>Section {String.fromCharCode(64 + s.id)}</p>
                    <p className={`text-xs font-bold leading-tight ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 md:p-12"
              >
                {step === 1 && <SectionA data={formData} update={setFormData} />}
                {step === 2 && <SectionB data={formData} update={setFormData} />}
                {step === 3 && <SectionC data={formData} update={setFormData} />}
                {step === 4 && <SectionD data={formData} update={setFormData} />}
                {step === 5 && <SectionE data={formData} update={setFormData} />}
                {step === 6 && <SectionF data={formData} update={setFormData} />}

                {error && (
                  <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                  </div>
                )}

                <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-100">
                  <button
                    onClick={handleBack}
                    disabled={step === 1 || loading}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={loading}
                    className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {step === totalSteps ? 'Complete Onboarding' : 'Continue'}
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Form Sections ---

function SectionA({ data, update }: { data: any, update: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Personal Profile</h2>
        <p className="text-sm text-slate-400 font-medium">Verify your core identity for clinical records.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField 
          label="Full Name" 
          value={data.name} 
          onChange={(v) => update({ ...data, name: v })}
          placeholder="As per medical council"
        />
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
          <div className="flex gap-2">
            {['Male', 'Female', 'Other'].map((g) => (
              <button
                key={g}
                onClick={() => update({ ...data, gender: g })}
                className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-all border ${
                  data.gender === g ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-100' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <InputField 
          label="Date of Birth" 
          type="date"
          value={data.dob} 
          onChange={(v) => update({ ...data, dob: v })}
        />
        <InputField 
          label="Contact Number" 
          type="tel"
          value={data.mobileNumber} 
          onChange={(v) => update({ ...data, mobileNumber: v })}
          placeholder="+91"
        />
        <InputField 
          label="Official Email" 
          type="email"
          value={data.email} 
          onChange={(v) => update({ ...data, email: v })}
          placeholder="doctor@kayra.care"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Languages Spoken</label>
        <div className="flex flex-wrap gap-2">
          {['English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil'].map(lang => (
            <button
              key={lang}
              onClick={() => {
                const langs = data.languages.includes(lang) 
                  ? data.languages.filter((l: string) => l !== lang)
                  : [...data.languages, lang];
                update({ ...data, languages: langs });
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                data.languages.includes(lang) ? 'bg-brand-50 text-brand-600 border-brand-200' : 'bg-white text-slate-400 border-slate-100'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionB({ data, update }: { data: any, update: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Academic Credentials</h2>
        <p className="text-sm text-slate-400 font-medium">Professional background and specializations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField 
          label="Primary Qualification" 
          value={data.qualification} 
          onChange={(v) => update({ ...data, qualification: v })}
          placeholder="e.g., MD - Homeopathy, BHMS"
        />
        <InputField 
          label="Registration Number" 
          value={data.stateBoardRegistrationNumber} 
          onChange={(v) => update({ ...data, stateBoardRegistrationNumber: v })}
          placeholder="State/Central Council No."
        />
        <InputField 
          label="Year of Registration" 
          type="number"
          value={data.registrationYear} 
          onChange={(v) => update({ ...data, registrationYear: v })}
          placeholder="YYYY"
        />
        <InputField 
          label="Total Experience (Years)" 
          type="number"
          value={data.experience} 
          onChange={(v) => update({ ...data, experience: parseInt(v) || 0 })}
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specializations</label>
        <div className="flex flex-wrap gap-3">
          {['Respiratory', 'Pediatrics', 'Chronic Care', 'Skin', 'Gastro', 'Psychiatry'].map(spec => (
            <button
              key={spec}
              onClick={() => {
                const specs = data.specializations.includes(spec)
                  ? data.specializations.filter((s: string) => s !== spec)
                  : [...data.specializations, spec];
                update({ ...data, specializations: specs });
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                data.specializations.includes(spec) ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadCard 
          label="Degree Certificate" 
          value={data.degreeUrl}
          onUpload={(v) => update({ ...data, degreeUrl: v })}
        />
        <UploadCard 
          label="Registration Certificate" 
          value={data.registrationCertificateUrl}
          onUpload={(v) => update({ ...data, registrationCertificateUrl: v })}
        />
      </div>
    </div>
  );
}

function SectionC({ data, update }: { data: any, update: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Legal & Compliance</h2>
        <p className="text-sm text-slate-400 font-medium">Identity verification and regulatory consent.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Proof Type</label>
          <select 
            value={data.identityProofType}
            onChange={(e) => update({ ...data, identityProofType: e.target.value as any })}
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-brand-600 transition-all font-bold text-sm"
          >
            <option value="Aadhar">Aadhar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="VoterID">Voter ID</option>
          </select>
        </div>
        <UploadCard 
          label="ID Proof Document" 
          value={data.identityProofUrl}
          onUpload={(v) => update({ ...data, identityProofUrl: v })}
        />
        <UploadCard 
          label="Digital Signature (PNG/JPG)" 
          value={data.digitalSignatureUrl}
          onUpload={(v) => update({ ...data, digitalSignatureUrl: v })}
        />
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group cursor-pointer" onClick={() => update({ ...data, telemedicineConsent: !data.telemedicineConsent })}>
           <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${data.telemedicineConsent ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
             {data.telemedicineConsent && <CheckCircle2 size={16} />}
           </div>
           <div>
             <p className="text-xs font-bold text-slate-700 leading-relaxed">I hereby agree to follow the Telemedicine Practice Guidelines as per the Ministry of Health and Family Welfare (MoHFW) standards.</p>
           </div>
        </div>

        <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group cursor-pointer" onClick={() => update({ ...data, disclaimerAccepted: !data.disclaimerAccepted })}>
           <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${data.disclaimerAccepted ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
             {data.disclaimerAccepted && <CheckCircle2 size={16} />}
           </div>
           <div>
             <p className="text-xs font-bold text-slate-700 leading-relaxed">I accept the platform's disclaimer and trademark policies.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function SectionD({ data, update }: { data: any, update: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Clinic Branding</h2>
        <p className="text-sm text-slate-400 font-medium">Setup your medical infrastructure identity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField 
          label="Clinic Name" 
          value={data.clinicName} 
          onChange={(v) => update({ ...data, clinicName: v })}
          placeholder="e.g., Kayra's Homeo Care - Mumbai"
        />
        <InputField 
          label="WhatsApp Direct Link" 
          value={data.whatsappLink} 
          onChange={(v) => update({ ...data, whatsappLink: v })}
          placeholder="https://wa.me/number"
        />
        <InputField 
          label="Formspree ID" 
          value={data.formspreeId} 
          onChange={(v) => update({ ...data, formspreeId: v })}
          placeholder="For lead routing"
        />
        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinic Logo</label>
           <div className="relative group">
             <input 
               type="file" 
               className="absolute inset-0 opacity-0 cursor-pointer z-10"
               accept="image/*"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onload = () => update({ ...data, logoUrl: reader.result as string });
                   reader.readAsDataURL(file);
                 }
               }}
             />
             <div className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
               data.logoUrl ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 hover:bg-white hover:border-brand-300'
             }`}>
                <div className="flex items-center gap-3">
                  {data.logoUrl ? (
                    <img src={data.logoUrl} className="w-10 h-10 rounded-lg object-contain bg-white" alt="Logo preview" />
                  ) : (
                    <Camera size={20} />
                  )}
                  <span className="text-xs font-bold">{data.logoUrl ? 'Logo Uploaded' : 'Upload Logo'}</span>
                </div>
                {data.logoUrl && <CheckCircle2 size={16} className="text-brand-600" />}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SectionE({ data, update }: { data: any, update: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Availability & Pricing</h2>
        <p className="text-sm text-slate-400 font-medium">Manage how and when you consult patients.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Consultation Mode</label>
          <div className="flex gap-4">
             {['Online', 'Physical', 'Both'].map(mode => (
               <button
                 key={mode}
                 onClick={() => {
                   const modes = mode === 'Both' ? ['Online', 'Physical'] : [mode];
                   update({ ...data, consultationModes: modes });
                 }}
                 className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${
                   (mode === 'Both' ? data.consultationModes.length === 2 : data.consultationModes.length === 1 && data.consultationModes[0] === mode) ? 'bg-brand-600 text-white border-brand-500 shadow-xl shadow-brand-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                 }`}
               >
                 {mode}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <InputField 
             label="Online Fee (₹)" 
             type="number"
             value={data.onlineConsultationFee} 
             onChange={(v) => update({ ...data, onlineConsultationFee: parseInt(v) || 0 })}
           />
           <InputField 
             label="Offline Fee (₹)" 
             type="number"
             value={data.physicalConsultationFee} 
             onChange={(v) => update({ ...data, physicalConsultationFee: parseInt(v) || 0 })}
           />
        </div>

        {data.consultationModes.includes('Physical') && (
          <InputField 
            label="Clinic Address" 
            value={data.address} 
            onChange={(v) => update({ ...data, address: v })}
            placeholder="Complete physical address"
          />
        )}

        <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                 <Clock size={24} className="text-brand-400" />
              </div>
              <div>
                 <h4 className="font-black tracking-tight">Time Slot Management</h4>
                 <p className="text-[10px] uppercase tracking-widest text-slate-400">Configure Weekly Schedule</p>
              </div>
           </div>
           
           <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <button key={idx} className="aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-brand-600 transition-all font-black text-xs">
                  {day}
                </button>
              ))}
           </div>
           <p className="mt-6 text-[10px] font-medium text-slate-400 italic">Detailed timing grid will be available in Main Dashboard Settings after verification.</p>
        </div>
      </div>
    </div>
  );
}

function SectionF({ data, update }: { data: any, update: any }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Diagnostic Integration</h2>
        <p className="text-sm text-slate-400 font-medium">AI-powered medical report analysis permissions.</p>
      </div>

      <div className="space-y-6">
        <div className="p-8 bg-brand-50 border border-brand-100 rounded-[2.5rem] space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center">
                    <Brain size={24} />
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 tracking-tight">AI Report Analyser</h4>
                    <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Powered by Google Gemini</p>
                 </div>
              </div>
              <button 
                onClick={() => update({ ...data, aiAnalyzerEnabled: !data.aiAnalyzerEnabled })}
                className={`w-14 h-8 rounded-full transition-all relative ${data.aiAnalyzerEnabled ? 'bg-brand-600' : 'bg-slate-200'}`}
              >
                <motion.div 
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                  animate={{ x: data.aiAnalyzerEnabled ? 24 : 0 }}
                />
              </button>
           </div>
           <p className="text-xs text-brand-700 font-bold leading-relaxed opacity-80">
             Enable AI-assisted processing of patient diagnostic reports (Radiology, Pathology). This permission allows our local clinical engine to generate summaries using Material Medica context.
           </p>
        </div>

        <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 cursor-pointer" onClick={() => update({ ...data, privacyAgreementAccepted: !data.privacyAgreementAccepted })}>
           <div className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${data.privacyAgreementAccepted ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
             {data.privacyAgreementAccepted && <CheckCircle2 size={16} />}
           </div>
           <div>
             <p className="text-xs font-bold text-slate-700 leading-relaxed">I agree to maintain patient confidentiality and use report data only for clinical diagnosis. Patient data will remain encrypted and strictly protected.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- Shared Components ---

function InputField({ label, placeholder, value, onChange, type = "text" }: { label: string, placeholder?: string, value: any, onChange: (v: string) => void, type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-brand-600 transition-all font-bold text-sm placeholder:text-slate-300"
      />
    </div>
  );
}

function UploadCard({ label, value, onUpload }: { label: string, value?: string, onUpload?: (v: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onload = () => onUpload?.(reader.result as string);
       reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={`p-4 border rounded-2xl flex items-center justify-between group cursor-pointer transition-all ${
        value ? 'bg-emerald-50 border-emerald-200' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-brand-200'
      }`}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg transition-colors ${
          value ? 'bg-white text-emerald-600' : 'bg-white text-slate-400 group-hover:text-brand-600'
        }`}>
          {value ? <CheckCircle2 size={16} /> : <Upload size={16} />}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
          {value && <span className="text-[8px] text-emerald-600 font-black uppercase tracking-tighter mt-0.5">Attached Successfully</span>}
        </div>
      </div>
      {!value && <Plus size={16} className="text-slate-300" />}
    </div>
  );
}
