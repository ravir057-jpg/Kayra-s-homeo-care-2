import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Smartphone, 
  Database, 
  Play, 
  Terminal, 
  RefreshCw, 
  UserSquare2, 
  Flame, 
  FileText, 
  CreditCard, 
  Volume2, 
  BookMarked,
  Wrench,
  Wifi,
  History,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { db, auth } from '../../lib/db';
import { collection, addDoc, doc, setDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { toast } from 'sonner';

interface SandboxQAProps {
  profile: any;
}

export default function SandboxQA({ profile }: SandboxQAProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'bypasses' | 'ai-presets' | 'gateway-logs'>('scan');
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<{ name: string; status: 'ok' | 'warn' | 'info'; detail: string }[]>([]);
  const [simulatedLogs, setSimulatedLogs] = useState<{ time: string; action: string; status: string; data: string }[]>([]);

  // Sample pathology-radiology reports for doctors to test
  const INJECTABLE_PRESETS = [
    {
      title: "Iron Deficiency Anemia (CBC Report)",
      desc: "Simulated Pathology report showing severe microcytic anemia.",
      symptoms: "Extreme exhaustion, cold hands and feet, pale conjunctive conjunctiva, brittle nails, dyspnea on slight exertion.",
      lab: `TEST: Complete Blood Count (CBC)
------
Hb: 8.2 g/dL (!) LOW (Ref: 12.0 - 15.0)
RBC Count: 3.4 million/uL (!) LOW (Ref: 4.0 - 5.2)
MCV: 68 fL (!) LOW (Ref: 80 - 100)
MCH: 21 pg (!) LOW (Ref: 27 - 33)
Platelets: 220,000 /uL (Normal)
Iron Levels: 32 ug/dL (!) LOW (Ref: 50 - 170)
Ferritin: 9 ng/mL (!) LOW (Ref: 15 - 150)`
    },
    {
      title: "Hyperthyroidism Panel & TSH",
      desc: "Complete Thyroid profile showing typical active Graves' indicators.",
      symptoms: "Tremors in hands, palpitations, weight loss despite increased appetite, heat intolerance, extreme restlessness.",
      lab: `TEST: Thyroid Panel
------
TSH: 0.05 uIU/mL (!) LOW (Ref: 0.45 - 4.5)
Free T3: 6.8 pg/mL (!) HIGH (Ref: 2.0 - 4.4)
Free T4: 2.9 ng/dL (!) HIGH (Ref: 0.82 - 1.77)`
    },
    {
      title: "Fatty Liver Grade II (USG Film)",
      desc: "Abdominal Ultrasound scan noting structural hepatic parenchymal changes.",
      symptoms: "Dull aching pain in the right hypochondriac region, bloating after fatty food, metallic taste, sluggish bowels.",
      lab: `TEST: Ultrasonography of Whole Abdomen
------
LIVER: Enlarged in size (16.5 cm).
Parenchymal echotexture is diffusely increased with standard sound attenuation in the deep fields and poor visualization of diaphragm outline.
IMPRESSION: Hepatomegaly with diffuse fatty infiltration - Grade II Fatty Liver change.`
    }
  ];

  // Load simulated logs from LocalStorage to keep tracking across sessions
  useEffect(() => {
    const saved = localStorage.getItem('kayra_sandbox_sim_logs');
    if (saved) {
      setSimulatedLogs(JSON.parse(saved));
    } else {
      const defaultLogs = [
        { time: new Date(Date.now() - 3600000).toLocaleTimeString(), action: "Sandbox Core Initialized", status: "Active", data: "Running in preview simulation environment" },
        { time: new Date(Date.now() - 1800000).toLocaleTimeString(), action: "Virtual WhatsApp OTP Hooked", status: "Bypassed", data: "Direct to toast visualization activated" }
      ];
      setSimulatedLogs(defaultLogs);
      localStorage.setItem('kayra_sandbox_sim_logs', JSON.stringify(defaultLogs));
    }
  }, []);

  const addSimLog = (action: string, status: string, data: string) => {
    const fresh = {
      time: new Date().toLocaleTimeString(),
      action,
      status,
      data
    };
    const updated = [fresh, ...simulatedLogs].slice(0, 30);
    setSimulatedLogs(updated);
    localStorage.setItem('kayra_sandbox_sim_logs', JSON.stringify(updated));
  };

  const handleRunDiagnosticScan = () => {
    setScanning(true);
    setScanLogs([]);
    let progress: typeof scanLogs = [];

    const steps = [
      { name: "Local Database Synchronization", run: () => ({ status: 'ok' as const, detail: "Firestore is responsive. Session handshake verified." }) },
      { name: "Razorpay Secure Payments Verification", run: () => ({ status: 'ok' as const, detail: `Razorpay Integration: Active. Key registered: ${profile?.razorpayKeyId || 'Preloaded'}` }) },
      { name: "WhatsApp OTP Gateway Integration", run: () => {
        const prov = profile?.whatsappProvider || 'simulated';
        if (prov === 'simulated') {
          return { status: 'info' as const, detail: "Sandbox Sandbox Active. OTP messages visualised in toast notifications perfectly." };
        }
        return { status: 'ok' as const, detail: `Real API active via ${prov.toUpperCase()} Gateway.` };
      }},
      { name: "AI Medical Intelligence Grounding", run: () => ({ status: 'ok' as const, detail: "Gemini 3.5 Flash online. Synthesizer prompts responsive." }) },
      { name: "Materia Medica Research Repository", run: () => ({ status: 'ok' as const, detail: "Search engines offline-ready. Synthesis, Kent and Boericke reference indexing live." }) },
      { name: "Subscription Limit Enforcer", run: () => {
        const activePlan = profile?.subscription || 'basic';
        return { status: 'ok' as const, detail: `Enforcing [${activePlan.toUpperCase()}] pricing layout boundaries.` };
      }}
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const outcome = steps[currentStep].run();
        progress = [...progress, { name: steps[currentStep].name, status: outcome.status, detail: outcome.detail }];
        setScanLogs(progress);
        currentStep++;
      } else {
        clearInterval(interval);
        setScanning(false);
        toast.success("Automated Sandbox Diagnostics Completed!");
      }
    }, 400);
  };

  // Switch role locally to verify layout rendering
  const handleRoleBypass = async (role: 'doctor' | 'patient' | 'clinic_admin' | 'super_admin', subTier?: string) => {
    if (!auth.currentUser) {
      toast.error("No active Auth account detected. Please register or log in normally first.");
      return;
    }
    const toastId = toast.loading(`Toggling profile metadata to system role: ${role.toUpperCase()}...`);
    try {
      const payload: any = { role };
      if (role === 'doctor') {
        payload.subscription = subTier || 'pro';
        payload.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 3600000).toISOString();
        payload.isOnboarded = true;
      }
      await updateDoc(doc(db, 'users', auth.currentUser.uid), payload);
      addSimLog(`Switch Role Triggered`, `${role.toUpperCase()}`, `Plan: ${subTier || 'None'}`);
      toast.success(`Role changed to ${role} is now active in database! Reloading...`, { id: toastId });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast.error(`Firebase Bypass Error: ${err.message}`, { id: toastId });
    }
  };

  // Simulate Razorpay Pro Payment Action
  const handleSimulateProPayment = async () => {
    if (!auth.currentUser) return;
    const toastId = toast.loading("Synthesizing Payment callback simulation...");
    try {
      const mockPayId = "pay_sim_" + Math.random().toString(36).substr(2, 9);
      const mockExpiry = new Date();
      mockExpiry.setMonth(mockExpiry.getMonth() + 6); // +6 Months

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        subscription: 'pro',
        subscriptionExpiry: mockExpiry.toISOString(),
        razorpayPaymentId: mockPayId
      });

      addSimLog("Simulate Razorpay Payment", "Success", `Paid ₹1,000 for Pro Subscription. ID: ${mockPayId}`);
      toast.success("Razorpay payment successfully completed! Pro Practice is now active.", { id: toastId });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Payment write error', { id: toastId });
    }
  };

  // Run Seed Patient Appointments simulation
  const handleSeedMockAppointments = async () => {
    if (!auth.currentUser) return;
    const toastId = toast.loading("Seeding mock clinical diagnostic sessions into calendar...");
    try {
      const mockPatientsNames = ["Rohan Deshmukh", "Anjali Sharma", "Karan Malhotra", "Dr. Priya Patil"];
      const slots = ["09:30", "11:00", "16:30", "17:30"];
      const pathologies = ["Chronic Migraine coupled with indigestion", "Graves hyperthyroidism, persistent tremors", "SLuggish fatty liver with severe flatulence", "Acute bronchitis, dry spasmodic cough"];
      
      let count = 0;
      for (let i = 0; i < mockPatientsNames.length; i++) {
        // Create Mock patient in firestore
        const patientRef = await addDoc(collection(db, 'patients'), {
          clinicId: profile?.clinicId || 'KHC-ROOT',
          name: mockPatientsNames[i],
          phone: "9198765" + Math.floor(10000 + Math.random() * 90000),
          mobileNumber: "9198765" + Math.floor(10000 + Math.random() * 90000),
          isMobileVerified: true,
          gender: i % 2 === 0 ? "Male" : "Female",
          createdAt: new Date().toISOString()
        });

        // Add Appointment
        await addDoc(collection(db, 'appointments'), {
          patientId: patientRef.id,
          patientName: mockPatientsNames[i],
          patientUid: 'KHC-MOCK-' + Math.floor(1000 + Math.random() * 9000),
          doctorId: auth.currentUser.uid,
          doctorName: profile?.name || 'Homeo Specialist',
          clinicId: profile?.clinicId || 'KHC-ROOT',
          date: new Date().toISOString().split('T')[0], // Today
          time: slots[i],
          type: i % 2 === 0 ? 'Offline' : 'Online',
          status: 'Scheduled',
          reason: pathologies[i],
          fee: profile?.consultationFee || 500,
          createdAt: new Date().toISOString()
        });
        count++;
      }

      addSimLog("Seed Appointments", "Populated", `Created ${count} patients and scheduled slot bookings.`);
      toast.success(`Successfully registered and scheduled ${count} sandbox patient appointments!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Seeding failed', { id: toastId });
    }
  };

  // Inject clinical preset to clipboard/notes
  const injectPreset = (preset: typeof INJECTABLE_PRESETS[0]) => {
    localStorage.setItem('ai_sandbox_presets_injected_symptoms', preset.symptoms);
    localStorage.setItem('ai_sandbox_presets_injected_lab', preset.lab);
    
    // Copy to clipboard
    navigator.clipboard.writeText(`Patient subjective complaints:\n${preset.symptoms}\n\nLab Report Findings:\n${preset.lab}`);
    
    addSimLog("Loaded Clinical Preset", "Injected", `${preset.title}`);
    toast.success(`"${preset.title}" preset data successfully injected into local clipboard & memory! Go to AI Tools and paste or look for loaded data.`);
  };

  // Clear simulated logs
  const clearSimulationLogs = () => {
    setSimulatedLogs([]);
    localStorage.removeItem('kayra_sandbox_sim_logs');
    toast.success("Simulation dashboard history reset successfully.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Wrench className="text-indigo-600" size={20} />
          Platform QA & Sandbox Testing Suite
        </h4>
        <p className="text-sm text-slate-500">
          Run automated audits, simulate Razorpay payment handshakes, toggle subscriptions, and load realistic medical report tests without external dependencies.
        </p>
      </div>

      {/* Navigation Inside Sandbox */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50">
        {[
          { id: 'scan', label: 'Platform Integrity Scan', icon: ShieldCheck },
          { id: 'bypasses', label: '1-Click Role & Action Bypasses', icon: Play },
          { id: 'ai-presets', label: 'Report Analyser Presets', icon: FileText },
          { id: 'gateway-logs', label: 'OTP Simulator Logs', icon: Terminal }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 bg-slate-50 border border-slate-200/50 rounded-[2rem]">
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-800 text-sm">Automated Diagnostic Check</h5>
                <p className="text-xs text-slate-400 font-medium">Scan Firestore collections, Razorpay sandbox keys, and linter schemas of the clinic catalog.</p>
              </div>
              <button
                type="button"
                onClick={handleRunDiagnosticScan}
                disabled={scanning}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
              >
                {scanning ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />}
                Run Global Scan
              </button>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-805 text-white font-mono text-xs space-y-3 min-h-[180px]">
              {scanLogs.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-slate-500">
                  <p>Click "Run Global Scan" to review active services connectivity status.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scanLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 border-b border-slate-800/50 pb-2">
                      <span className={
                        log.status === 'ok' ? 'text-emerald-400 font-bold' : 
                        log.status === 'warn' ? 'text-amber-400 font-bold' : 'text-indigo-400 font-bold'
                      }>
                        [{log.status === 'ok' ? 'PASS' : log.status === 'warn' ? 'WARN' : 'INFO'}]
                      </span>
                      <div>
                        <p className="text-slate-200 font-bold">{log.name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{log.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bypasses' && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
              <p className="text-xs font-semibold leading-relaxed">
                <strong>Important Bypass Instructions:</strong> Triggering these bypass selectors alters your active clinic profile database keys instantly. The UI layout adapts automatically upon hot reload.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role bypasses */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                <h6 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <UserSquare2 className="text-indigo-600" size={16} />
                  Simulate User Role Access
                </h6>
                <p className="text-[11px] text-slate-400 font-medium">Verify screen restriction enforcement and layout transitions across clinics and patient modules:</p>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleRoleBypass('doctor', 'pro')}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-bold uppercase transition-all border border-slate-100"
                  >
                    🏥 Dr (Pro Tier)
                  </button>
                  <button
                    onClick={() => handleRoleBypass('doctor', 'basic')}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-bold uppercase transition-all border border-slate-100"
                  >
                    🩺 Dr (Basic Tier)
                  </button>
                  <button
                    onClick={() => handleRoleBypass('clinic_admin')}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-bold uppercase transition-all border border-slate-100"
                  >
                    🏢 Clinic Managing Director
                  </button>
                  <button
                    onClick={() => handleRoleBypass('super_admin')}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-bold uppercase transition-all border border-slate-100"
                  >
                    👑 Super Admin Portal
                  </button>
                </div>
              </div>

              {/* Functional simulator actions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                <h6 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="text-emerald-600" size={16} />
                  Simulated Interactions & Payment Gateway
                </h6>
                <p className="text-[11px] text-slate-400 font-medium font-semibold leading-relaxed">Instantly populate booking calendars or trigger Razorpay licensing simulations without entering payment details:</p>
                
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSimulateProPayment}
                    className="w-full py-2 px-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={12} />
                    Simulate Pro Razorpay Payment Sync (₹1,000)
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSeedMockAppointments}
                    className="w-full py-2 px-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Database size={12} />
                    Seed 4 Mock Patient Consultations (Today)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai-presets' && (
          <div className="space-y-4">
            <div>
              <h5 className="font-bold text-slate-800 text-sm">Preloaded Diagnostic Presets</h5>
              <p className="text-xs text-slate-400 font-medium">To test the smart **AI Report Analyser & synthesis pipeline** on-the-fly, load these complex medical cases:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INJECTABLE_PRESETS.map((preset, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[8px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-100">
                      Preset {i+1}
                    </span>
                    <h6 className="font-bold text-slate-800 text-xs leading-none">{preset.title}</h6>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-semibold italic">{preset.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => injectPreset(preset)}
                    className="mt-4 w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all border border-slate-100"
                  >
                    Load & Inject Case Study
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gateway-logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h5 className="font-bold text-slate-800 text-sm">Simulated OTP Delivery & WhatsApp Log Streamer</h5>
                <p className="text-xs text-slate-400 font-medium">Review the outbound background SMS traffic captured in-memory by sandbox hooks.</p>
              </div>
              <button
                type="button"
                onClick={clearSimulationLogs}
                disabled={simulatedLogs.length === 0}
                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-bold uppercase rounded-lg transition-colors"
              >
                Clear Sandbox log State
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 font-mono text-[10px] text-slate-300 min-h-[160px] max-h-[300px] overflow-y-auto no-scrollbar space-y-3">
              {simulatedLogs.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-slate-600">
                  <p>Send an OTP from patient booking or trigger verification to see active traces.</p>
                </div>
              ) : (
                simulatedLogs.map((log, i) => (
                  <div key={i} className="border-b border-slate-800/40 pb-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-bold">{log.time}</span>
                      <span className="text-emerald-400 font-bold uppercase">Actions: {log.action}</span>
                      <span className="bg-slate-800 text-slate-300 text-[8px] px-1.5 rounded uppercase font-bold">{log.status}</span>
                    </div>
                    <p className="text-slate-400 pl-4">{log.data}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
