'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TermsModal({ onAccept }: { onAccept: () => void }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleAccept = () => {
    setIsOpen(false);
    onAccept();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white rounded-xl p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-charcoal mb-4">Terms of Use</h2>
            <p className="text-gray-600 mb-6">
              By using the AI Generator, you acknowledge that the images are simulations. 
              You agree to respect intellectual property rights and understand that 
              generated content is for personal visualization purposes only.
            </p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={handleAccept}
                className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors font-semibold"
              >
                I Agree
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
