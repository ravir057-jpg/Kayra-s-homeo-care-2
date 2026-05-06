import { useState, useEffect } from 'react';
import { Video, Phone, History, Calendar, User, MessageCircle, X, Shield, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Appointment } from '../../types';
import { format } from 'date-fns';
import { startVideoCall } from '../../lib/video';
import { toast } from 'sonner';
import VideoMeetingRoom from '../shared/VideoMeetingRoom';

export default function VideoConsultation() {
  const [activeRoom, setActiveRoom] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const q = query(
          collection(db, 'appointments'), 
          where('type', '==', 'Online'),
          orderBy('date', 'asc')
        );
        const snap = await getDocs(q);
        setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'appointments');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const handleJoinMeeting = (appt: Appointment) => {
    setActiveRoom(appt);
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
          <h2 className="text-2xl font-bold text-slate-800">Tele-Consultation</h2>
          <p className="text-sm text-slate-500">Secure clinical video channels</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <History size={16} className="text-slate-400" />
            History
          </button>
          <button 
            onClick={() => toast.info('Schedule an online appointment first')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Video size={16} />
            Instant Call
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Helper Panel */}
        <div className="order-first lg:order-last space-y-6">
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

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hidden lg:block">
            <h4 className="font-bold text-slate-800 mb-5 px-1 text-sm flex items-center gap-2">
              <ExternalLink size={16} className="text-indigo-500" />
              Quick Procedures
            </h4>
            <div className="space-y-1">
              <QuickAction icon={<Phone size={14} />} label="Send SMS Link" />
              <QuickAction icon={<MessageCircle size={14} />} label="WhatsApp Call" />
              <QuickAction icon={<ExternalLink size={14} />} label="Generate Invite" />
            </div>
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
                    className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between transition-all gap-5 ${
                      activeRoom?.id === appt.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm font-bold text-sm">
                          {appt.patientName.substring(0, 2).toUpperCase()}
                        </div>
                        {appt.status === 'Scheduled' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{appt.patientName}</h4>
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
                    
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <button className="flex-1 sm:flex-none p-3.5 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded-2xl border border-slate-200 shadow-sm active:scale-95 flex items-center justify-center">
                        <MessageCircle size={20} />
                        <span className="sm:hidden ml-2 text-xs font-bold">Chat</span>
                      </button>
                      <button 
                        onClick={() => handleJoinMeeting(appt)}
                        className={`flex-[3] sm:flex-none px-6 sm:px-8 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group ${
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

function QuickAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">{icon}</div>
        <span className="font-medium">{label}</span>
      </div>
      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300" />
    </button>
  );
}

function ChevronRight({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
