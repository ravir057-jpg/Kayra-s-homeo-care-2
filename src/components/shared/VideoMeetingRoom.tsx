import React, { useState, useEffect, useRef } from 'react';
import { Video, Phone, Shield, X, Mic, MicOff, VideoOff, MessageCircle, MonitorUp, Settings, Users, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment } from '../../types';
import { generateJitsiUrl } from '../../lib/video';

interface VideoMeetingRoomProps {
  appointment: Appointment;
  onLeave: () => void;
  role: 'doctor' | 'patient';
}

export default function VideoMeetingRoom({ appointment, onLeave, role }: VideoMeetingRoomProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Use stored videoLink if available, otherwise generate a unique one based on patient name and appointment ID
  const meetingUrl = appointment.videoLink || generateJitsiUrl(`${appointment.patientName}-${appointment.id || Date.now()}`);

  useEffect(() => {
    // Start local preview when the modal opens (pre-call state)
    if (!isJoined) {
      startLocalPreview();
    }
    return () => stopLocalPreview();
  }, [isJoined]);

  const startLocalPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermissions(true);
    } catch (err) {
      console.error("Camera/Mic permissions failed:", err);
      setHasPermissions(false);
    }
  };

  const stopLocalPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => track.enabled = isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950 z-[100] flex flex-col pt-safe overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {!isJoined ? (
          <motion.div 
            key="pre-call"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Preview Area */}
              <div className="relative aspect-video bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                {hasPermissions === false ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h4 className="text-white font-bold text-lg mb-2">Permissions Blocked</h4>
                    <p className="text-slate-400 text-sm max-w-xs">
                      Please allow camera and microphone access in your browser to proceed with the consultation.
                    </p>
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    muted 
                    playsInline
                    className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                  />
                )}
                
                {isVideoOff && hasPermissions !== false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {(role === 'doctor' ? (appointment.doctorName || 'D') : appointment.patientName).substring(0,1)}
                    </div>
                  </div>
                )}

                {/* Pre-call Controls Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
                  <button 
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button 
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                </div>
              </div>

              {/* Info & Join Area */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                      Private Meeting
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5">
                      <Shield size={10} /> Secured
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white leading-tight">Ready to join your consultation?</h2>
                  <p className="text-slate-400 mt-4 leading-relaxed">
                    Consulting with <span className="text-indigo-400 font-bold">{role === 'doctor' ? appointment.patientName : appointment.doctorName}</span>. 
                    Ensure you are in a quiet environment with stable internet.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>Camera and Microphone verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>Secure end-to-end tunnel active</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    onClick={() => setIsJoined(true)}
                    className="flex-1 px-8 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-bold shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                  >
                    Join Meeting <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={onLeave}
                    className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-bold transition-all border border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="active-meeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-white/5 flex justify-between items-center z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {role === 'doctor' ? 'DR' : 'P'}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-none flex items-center gap-2">
                    {appointment.patientName}
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  </h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Live Tele-Consultation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <button 
                  onClick={onLeave}
                  className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <X size={14} /> End Call
                </button>
              </div>
            </div>

            {/* Jitsi Iframe Container */}
            <div className="flex-1 bg-slate-950 relative">
              <iframe 
                src={`${meetingUrl}#config.prejoinPageEnabled=false&config.startWithAudioMuted=${isMuted}&config.startWithVideoMuted=${isVideoOff}`}
                allow="camera; microphone; display-capture; autoplay; clipboard-write"
                className="w-full h-full border-none"
                title="Clinical MeetingRoom"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
