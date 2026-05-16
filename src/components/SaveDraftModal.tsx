import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-stone-900 rounded-xl max-w-sm w-full shadow-xl border border-stone-200 dark:border-stone-800"
      >
        <div className="p-5 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Simpan Draft</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Beri nama untuk katalog ini.</p>
        </div>

        <div className="p-5">
          <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Nama draft</label>
          <input 
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Contoh: Promo Lebaran 2026"
            className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
          />
        </div>

        <div className="p-5 pt-0 flex gap-2 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onConfirm(name)}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
          >
            Simpan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
