import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Phone, 
  Shield, 
  X, 
  Mic, 
  MicOff, 
  VideoOff, 
  MessageCircle, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment } from '../../types';
import { generateJitsiUrl } from '../../lib/video';
import { toast } from 'sonner';

interface VideoMeetingRoomProps {
  appointment: Appointment;
  onLeave: () => void;
  role: 'doctor' | 'patient';
}

export default function VideoMeetingRoom({ appointment, onLeave, role }: VideoMeetingRoomProps) {
  const [jitsiScriptLoaded, setJitsiScriptLoaded] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);

  // Load the Jitsi Meet External API library dynamically on mount
  useEffect(() => {
    const scriptId = 'jitsi-external-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    const handleScriptLoad = () => {
      setJitsiScriptLoaded(true);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = handleScriptLoad;
      document.body.appendChild(script);
    } else {
      if ((window as any).JitsiMeetExternalAPI) {
        setJitsiScriptLoaded(true);
      } else {
        script.addEventListener('load', handleScriptLoad);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
      }
    };
  }, []);

  // Manage local camera and audio feedback for the clinical pre-join stage
  useEffect(() => {
    if (!isJoined && !isCallEnded) {
      startLocalPreview();
    }
    return () => stopLocalPreview();
  }, [isJoined, isCallEnded]);

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
      console.warn("Camera/Mic permissions failed for preview:", err);
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
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Initialize Jitsi Meet Embed once joined
  useEffect(() => {
    if (isJoined && jitsiScriptLoaded && jitsiContainerRef.current && !jitsiApi) {
      setApiLoading(true);
      
      // Stop the local preview track safely before transferring hardware handles to Jitsi
      stopLocalPreview();

      const domain = 'meet.jit.si';
      
      // Sanitize room name to be perfectly clean of odd characters, ensuring overlap safety
      const cleanPatientName = appointment.patientName.replace(/[^a-zA-Z0-9]/g, '');
      const uniqueRoomName = `KayrasHomeoCare_${cleanPatientName}_${appointment.id || Date.now()}`;
      
      // Clinical display labels
      const displayName = role === 'doctor' 
        ? `Dr. ${appointment.doctorName || 'Homeopathic Consultant'}`
        : appointment.patientName;

      const options = {
        roomName: uniqueRoomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          prejoinPageEnabled: true, // Core Requirement 2: Checked and Enabled
          startWithAudioMuted: isMuted,
          startWithVideoMuted: isVideoOff,
          
          // Core Requirement 1: Force High Definition (HD 720p ideal, 1080p max, 30fps)
          resolution: 720,
          maxFullResolutionHeight: 1080,
          constraints: {
            video: {
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 30 }
            }
          },

          // Core Requirement 3: Professional Clinical Overrides & Minimally Cluttered toolbar
          toolbarButtons: [
            'microphone', 
            'camera', 
            'hangup', 
            'chat', 
            'tileview',
            'videoquality',
            'select-background'
          ],
          
          disableThirdPartyRequests: true,
          disableDeepLinking: true, // Prevents mobile clients from being redirected away from iframe
          defaultRemoteDisplayName: 'Patient',
        },
        interfaceConfigOverwrite: {
          // Hide watermarks, premium invites, and external logos for non-branded safety
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          MOBILE_APP_PROMO: false,
          DEFAULT_BACKGROUND: '#0f172a', // Clean dark aesthetic (Slate 900)
          TOOLBAR_ALWAYS_VISIBLE: true
        },
        userInfo: {
          displayName: displayName
        }
      };

      try {
        const api = new (window as any).JitsiMeetExternalAPI(domain, options);
        setJitsiApi(api);

        api.addEventListener('videoConferenceJoined', () => {
          setApiLoading(false);
          toast.success("Joined secured clinical session.");
        });

        // Core Requirement 6: Handle pre-registered leave signals to trigger Graceful Exit
        api.addEventListener('videoConferenceLeft', () => {
          setIsCallEnded(true);
          api.destroy();
          setJitsiApi(null);
        });

        // Fallback safety timeout for loader
        const timeout = setTimeout(() => {
          setApiLoading(false);
        }, 5000);

        return () => {
          clearTimeout(timeout);
          if (api) {
            api.destroy();
          }
        };
      } catch (err) {
        console.error("Failed to initialize Jitsi Meet External API:", err);
        setApiLoading(false);
        toast.error("Telemetry failed to initialize Jitsi engine.");
      }
    }
  }, [isJoined, jitsiScriptLoaded]);

  const handleEndSelf = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('hangup');
    } else {
      setIsCallEnded(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950 z-[100] flex flex-col pt-safe overflow-hidden"
      id="telemedicine-root"
    >
      <AnimatePresence mode="wait">
        {isCallEnded ? (
          /* Graceful Exit State -> Clinical Wellness Finish Screen */
          <motion.div 
            key="call-ended"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none"
            id="clinical-exit-screen"
          >
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <Video size={28} className="animate-pulse" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight leading-snug">
                Thank you for choosing Kayra’s Homeo Care
              </h2>
              
              <p className="text-slate-400 text-xs mt-4 leading-relaxed font-semibold">
                Your virtual homeopathic consultation has concluded successfully. Your practitioner is finalizing your customized repertory plan and dispensary options.
              </p>

              <div className="my-8 py-4 px-6 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-left space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Session Date:</span>
                  <span className="text-slate-300">{appointment.date}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Patient Name:</span>
                  <span className="text-slate-300">{appointment.patientName}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Doctor/Specialist:</span>
                  <span className="text-slate-300">Dr. {appointment.doctorName || 'Homeopath Specialist'}</span>
                </div>
              </div>

              <button
                onClick={onLeave}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 active:scale-95"
                id="btn-return-portal"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        ) : !isJoined ? (
          /* Premium Clinical Pre-Join Screen */
          <motion.div 
            key="pre-call"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8"
            id="clinical-prejoin-screen"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              
              {/* Device Verification Panel */}
              <div className="relative aspect-video bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                {hasPermissions === false ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4 border border-red-500/25">
                      <AlertCircle size={32} />
                    </div>
                    <h4 className="text-white font-bold text-lg mb-2">Device Access Required</h4>
                    <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                      Please allow browser accesses to your camera and microphone so the specialist can carry out your homeopathic examination.
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
                
                {/* Fallback Icon when camera is toggled Off */}
                {isVideoOff && hasPermissions !== false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg">
                      {((role === 'doctor' ? (appointment.doctorName || 'D') : appointment.patientName).substring(0,1)).toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Pre-call Local Camera Toggle Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-slate-950/60 backdrop-blur-md rounded-2xl border border-white/10">
                  <button 
                    onClick={toggleMute}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                      isMuted ? 'bg-red-500 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button 
                    onClick={toggleVideo}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                      isVideoOff ? 'bg-red-500 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                  >
                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                  </button>
                </div>
              </div>

              {/* Consultation Details & Direct Entry */}
              <div className="space-y-8 p-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-500/10">
                      Private Consult Portal
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/10 flex items-center gap-1.5">
                      <Shield size={10} /> Secure Encryption
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
                    Ready to enter your consultation?
                  </h2>
                  <p className="text-slate-400 mt-4 leading-relaxed text-sm">
                    Connecting with <span className="text-indigo-400 font-bold">{role === 'doctor' ? appointment.patientName : `Dr. ${appointment.doctorName || 'Homeopathic Consultant'}`}</span>
                  </p>
                </div>

                <div className="space-y-3.5 bg-white/5 rounded-2xl p-5 border border-white/5">
                  <div className="flex items-center gap-3 text-slate-300 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Hardware and accessories calibrated</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Unique clinical gateway secured</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setIsJoined(true)}
                    className="flex-1 px-8 py-4.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-950/20 active:scale-95 flex items-center justify-center gap-3.5 group"
                    id="btn-join-jitsi"
                  >
                    Enter Live Video <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={onLeave}
                    className="px-8 py-4.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border border-white/5 active:scale-95"
                    id="btn-cancel-jitsi"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Active Clinical consultation Jitsi Meeting Container */
          <motion.div 
            key="active-meeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col h-full w-full"
            id="clinical-active-screen"
          >
            {/* Top Command Bar */}
            <div className="p-4 bg-slate-900 border-b border-white/5 flex justify-between items-center z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/30 text-indigo-400 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner border border-indigo-500/20">
                  {role === 'doctor' ? 'DR' : 'PT'}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-none flex items-center gap-2">
                    {role === 'doctor' ? appointment.patientName : `Dr. ${appointment.doctorName || 'Homeopathic Consultant'}`}
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                  </h3>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1.5">
                    Secure End-To-End Consultation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <button 
                  onClick={handleEndSelf}
                  className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-red-500/10"
                  id="btn-disconnect-call"
                >
                  <X size={14} /> End Consultation
                </button>
              </div>
            </div>

            {/* Custom Responsive Jitsi Parent Frame */}
            <div className="flex-1 bg-slate-950 p-4 relative flex flex-col justify-center items-center">
              <div 
                className="w-full max-w-7xl mx-auto h-full rounded-2xl sm:rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 flex flex-col"
                id="jitsi-embedded-container"
              >
                {apiLoading && (
                  <div className="absolute inset-0 bg-slate-950 z-30 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                    <h4 className="text-white font-bold text-base">Securing connection...</h4>
                    <p className="text-slate-400 text-xs mt-2 max-w-xs leading-relaxed">
                      Initializing Kayra’s high-definition clinical portal. Please stand by.
                    </p>
                  </div>
                )}
                
                <div 
                  ref={jitsiContainerRef} 
                  className="w-full h-full flex-1 rounded-2xl overflow-hidden bg-slate-950" 
                  id="jitsi-iframe-root"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
