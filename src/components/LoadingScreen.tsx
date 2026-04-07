import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart } from 'lucide-react';
import logoAsset from '../assets/img/pcs_logo.png';
import { cn } from '../lib/utils';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  message = "Sedang menyiapkan halaman...", 
  subMessage = "Mohon tunggu sejenak sementara kami mengolah data Anda.",
  fullScreen = false 
}: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center",
      fullScreen ? "fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md" : "flex-1 min-h-[70vh] bg-transparent"
    )}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        {/* Animated Brand Logo Area */}
        <div className="relative mb-6">
          <motion.div
            animate={{ 
              scale: [1, 1.08, 1],
              rotate: [0, 3, -3, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-32 h-32 flex items-center justify-center relative z-10"
          >
            <img src={logoAsset} alt="myStore Logo" className="w-full h-full object-contain drop-shadow-2xl" />
          </motion.div>
          
          {/* Soft Glow/Ring background */}
          <motion.div 
             animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
             transition={{ duration: 4, repeat: Infinity }}
             className="absolute inset-0 bg-[#8b7365]/15 rounded-full blur-3xl -z-10"
          />
        </div>

        {/* Text Area */}
        <div className="space-y-3 max-w-xs">
          <div className="pt-2">
            <p className="text-base font-bold text-slate-700 tracking-tight mb-1">
                {message}
            </p>
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed px-4">
                {subMessage}
            </p>
          </div>
          
          {/* Subtle Progress Indicator */}
          <div className="mt-8 w-48 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden">
             <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-full h-full bg-[#8b7365]/40 rounded-full"
             />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
