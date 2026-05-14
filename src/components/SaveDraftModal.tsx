import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface SaveDraftModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
  initialName: string;
}

export default function SaveDraftModal({ isOpen, onCancel, onConfirm, initialName }: SaveDraftModalProps) {
  const [name, setName] = useState(initialName);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
      >
        <div className="mb-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Simpan Draft</h2>
          <p className="text-slate-500 text-sm mt-1">Beri nama atau tema untuk draf katalog ini.</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tema / Nama Draft</label>
            <input 
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Promo Lebaran 2026"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onConfirm(name)}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Simpan Sekarang
          </button>
        </div>
      </motion.div>
    </div>
  );
}
