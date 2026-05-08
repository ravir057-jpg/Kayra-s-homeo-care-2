import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  clinicName?: string;
}

export default function WhatsAppButton({ 
  phoneNumber = '919153000000', 
  message = 'Namaste! I would like to inquire about homeopathic consultation.',
  clinicName = "Kayra's Homoeo Care"
}: WhatsAppButtonProps) {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8 z-50 flex items-center justify-center w-14 h-14 bg-emerald-500 text-white rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all border-4 border-white group"
      aria-label="Contact on WhatsApp"
    >
      <MessageCircle size={28} fill="currentColor" className="text-white" />
      <span className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
        Consult on WhatsApp
      </span>
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
    </motion.a>
  );
}
