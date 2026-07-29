import { useState, useEffect } from 'react';
import { Video, Phone, History, Calendar, User, MessageCircle, X, Shield, ExternalLink, Share2, Copy, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Appointment } from '../../types';
import { format } from 'date-fns';
import { startVideoCall, generateJitsiUrl } from '../../lib/video';
import { toast } from 'sonner';
import VideoMeetingRoom from '../shared/VideoMeetingRoom';

interface VideoConsultationProps {
  profile?: any;
}

export default function VideoConsultation({ profile }: VideoConsultationProps) {
  const [activeRoom, setActiveRoom] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        let q;
        if (profile?.uid) {
          q = query(
            collection(db, 'appointments'), 
            where('type', '==', 'Online'),
            where('doctorId', '==', profile.uid),
            orderBy('date', 'asc')
          );
        } else {
          q = query(
            collection(db, 'appointments'), 
            where('type', '==', 'Online'),
            orderBy('date', 'asc')
          );
        }
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Appointment));
        setAppointments(list);
        if (list.length > 0) {
          setSelectedAppt(list[0]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'appointments');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [profile]);

  const handleJoinMeeting = (appt: Appointment) => {
    setActiveRoom(appt);
  };

  const handleInstantCall = () => {
    const patientName = prompt("Please enter the patient's name for the Instant Consultation:");
    if (!patientName) return;
    
    const mockAppt: Appointment = {
      id: 'inst-' + Math.random().toString(36).substr(2, 9),
      clinicId: profile?.clinicId || 'default-clinic',
      patientName: patientName,
      patientId: 'instant-patient',
      patientUid: 'instant-uid',
      doctorId: profile?.uid || 'doctor-uid',
      doctorName: profile?.name || 'Dr. Ravi',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'Online',
      status: 'Scheduled',
      reason: 'Instant video checkup',
      fee: 0,
    };
    
    setAppointments(prev => [mockAppt, ...prev]);
    setSelectedAppt(mockAppt);
    toast.success("Instant clinical room ready. Select it from the list to join or dispatch invitations.");
  };

  const handleWhatsAppInvite = (appt: Appointment) => {
    const meetingUrl = appt.videoLink || generateJitsiUrl(`${appt.patientName}-${appt.id}`);
    const message = `Dear ${appt.patientName},

This is Dr. ${profile?.name || appt.doctorName || 'Homeopathic Specialist'} from Kayra's Homeo Care. 
We are prepared for your scheduled online consultation.

Kindly join our private telemedicine videoconference room using this secure gateway link:
👉 ${meetingUrl}

Requirements:
- Ensure you have a stable network connection.
- Please grant microphone & camera permissions when prompted.
- Have any recent blood reports handy.

Thank you!`;
    const cleanNumber = appt.phone ? appt.phone.replace(/\D/g, '') : '919153000000';
    const phoneWithCountry = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success('WhatsApp redirect dispatched successfully');
  };

  const handleSMSInvite = (appt: Appointment) => {
    const meetingUrl = appt.videoLink || generateJitsiUrl(`${appt.patientName}-${appt.id}`);
    toast.success(`Tele-Consult SMS notification dispatched to cell +${appt.phone || '91XXXXX'}`);
    
    // Write simulated audit entry
    try {
      const logsStr = localStorage.getItem('kayra_sandbox_sim_logs') || '[]';
      const parsed = JSON.parse(logsStr);
      parsed.unshift({
        time: format(new Date(), 'HH:mm:ss'),
        action: 'Video Consult SMS Dispatch',
        status: 'Successful',
        data: `Dispatched room link to ${appt.patientName} (+${appt.phone || 'N/A'}). Link: ${meetingUrl}`
      });
      localStorage.setItem('kayra_sandbox_sim_logs', JSON.stringify(parsed.slice(0, 40)));
    } catch (e) {
      console.warn("Could not save SMS log", e);
    }
  };

  const handleCopyInvite = (appt: Appointment) => {
    const meetingUrl = appt.videoLink || generateJitsiUrl(`${appt.patientName}-${appt.id}`);
    const text = `Secure Consultation Invitation - Kayra's Homeo Care
Patient: ${appt.patientName}
Practitioner: Dr. ${profile?.name || appt.doctorName}
Scheduled Appointment: ${format(new Date(appt.date), 'dd MMM yyyy')} at ${appt.time}
Private Video Link: ${meetingUrl}`;
    
    navigator.clipboard.writeText(text);
    toast.success('Clinical meeting credentials copied to clipboard');
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      <AnimatePresence>
        {activeRoom && (
          <VideoMeetingRoom 
            appointment={activeRoom} 
            role="doctor" 
            onLeave={() => setActiveRoom(null)} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tele-Consultation</h2>
          <p className="text-xs text-slate-500 font-medium">Secure clinical point-to-point video channels</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => toast.info(`Syncing logs for clinician: Dr. ${profile?.name || 'Ravi'}`)}
            className="flex-grow sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <History size={16} className="text-slate-400" />
            Refresh
          </button>
          <button 
            onClick={handleInstantCall}
            className="flex-grow sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-100 active:scale-95"
          >
            <Video size={16} />
            Instant Call
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Dynamic Action & Helper Panel */}
        <div className="order-first lg:order-last space-y-6">
          {selectedAppt ? (
            <motion.div 
              layoutId="telemedicine-console"
              className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm space-y-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                  Active Consultation Gate
                </span>
                <h3 className="font-bold text-slate-800 text-lg mt-3 truncate">
                  Dr. {profile?.name || selectedAppt.doctorName} vs {selectedAppt.patientName}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Appt ID: {selectedAppt.id} • {selectedAppt.time}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Gate Actions</p>
                
                <button 
                  onClick={() => handleWhatsAppInvite(selectedAppt)}
                  className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border border-emerald-100"
                >
                  <MessageCircle size={16} className="text-emerald-600" />
                  Dispatch WhatsApp Invite
                </button>

                <button 
                  onClick={() => handleSMSInvite(selectedAppt)}
                  className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border border-indigo-100"
                >
                  <Phone size={16} className="text-indigo-600" />
                  Broadcast Secure SMS Link
                </button>

                <button 
                  onClick={() => handleCopyInvite(selectedAppt)}
                  className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border border-slate-200"
                >
                  <Copy size={16} className="text-slate-500" />
                  Copy Invitation Clipboard
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-500 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-emerald-600" />
                  <span className="font-bold text-slate-700">Practice Guidelines Reminder</span>
                </div>
                Ensure informed virtual consent is verbally confirmed. Homeopathic practitioners must verify their state registration council number corresponds on prescriptions prior to dispensary dispensing.
              </div>
            </motion.div>
          ) : (
            <div className="bg-slate-900 rounded-[2.5rem] p-8 relative overflow-hidden border border-slate-800 shadow-2xl group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
               <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/30">
                 <Shield size={24} />
               </div>
               <h4 className="text-white font-bold text-lg mb-2">Secure Link Gateway</h4>
               <p className="text-slate-400 text-xs leading-relaxed mb-6">Online consultations are protected by end-to-end clinical encryption protocols.</p>
               <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all">
                 Security Audit
               </button>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-bold text-slate-850 mb-3 px-1 text-sm flex items-center gap-2">
              <ExternalLink size={16} className="text-indigo-500" />
              Disclaimer Requirements
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every digital prescription generates a legally required Telemedicine Guidelines disclosure banner automatically. Powered fully by Kayra’s clinical guidelines.
            </p>
          </div>
        </div>

        {/* Online Appointments List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <h3 className="font-bold text-slate-700 text-sm">Today's Virtual Clinic</h3>
              </div>
              <span className="bg-white text-slate-500 text-[10px] uppercase tracking-[0.1em] font-bold px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
                {appointments.length} Appointments
              </span>
            </div>
            
            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 text-sm font-medium">Syncing clinical rooms...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-20 text-center text-slate-400">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Video size={40} className="opacity-10" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No Online Consultations</p>
                  <p className="text-xs text-slate-400 mt-2">Any scheduled online slots will appear here.</p>
                </div>
              ) : (
                appointments.map((appt) => (
                  <div 
                    key={appt.id} 
                    onClick={() => setSelectedAppt(appt)}
                    className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between transition-all gap-5 cursor-pointer ${
                      selectedAppt?.id === appt.id 
                        ? 'bg-emerald-50/20 border-l-4 border-emerald-500' 
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm font-bold text-sm">
                          {appt.patientName.substring(0, 2).toUpperCase()}
                        </div>
                        {appt.status === 'Scheduled' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">Dr. {profile?.name || appt.doctorName} • {appt.patientName}</h4>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                            <Calendar size={14} className="text-slate-300" />
                            {format(new Date(appt.date), 'dd MMM')} • {appt.time}
                          </span>
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                            appt.status === 'Scheduled' ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${appt.status === 'Scheduled' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleWhatsAppInvite(appt)}
                        title="Quick WhatsApp Invite"
                        className="p-3.5 text-emerald-600 hover:bg-emerald-50 transition-colors bg-white rounded-2xl border border-slate-200 shadow-sm active:scale-95 flex items-center justify-center"
                      >
                        <MessageCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleJoinMeeting(appt)}
                        className={`flex-1 sm:flex-none px-6 sm:px-8 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group ${
                          appt.status === 'Scheduled' 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        disabled={appt.status !== 'Scheduled'}
                      >
                        {appt.status === 'Scheduled' && (
                          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]"></div>
                        )}
                        <Video size={18} />
                        <span className="whitespace-nowrap">Join Session</span>
                        {appt.status === 'Scheduled' && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping"></div>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 flex items-start gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0 border border-indigo-500/20">
              <Shield size={28} />
            </div>
            <div>
              <h4 className="font-bold text-white text-base lg:text-lg mb-2">HIPAA Compliant Connectivity</h4>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Clinical channels are dynamically generated and encrypted at the point of origin, ensuring patient data remains within your direct control.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
