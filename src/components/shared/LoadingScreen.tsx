import React from 'react';
import { motion } from 'motion/react';
import Logo from '../Logo';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-8 bg-emerald-500 rounded-full blur-3xl"
          />
          <Logo size="lg" />
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -6, 0],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 bg-emerald-500 rounded-full"
              />
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">
            Harmonizing Data
          </p>
        </div>
      </motion.div>
    </div>
  );
}
