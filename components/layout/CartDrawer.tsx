'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';

import Checkout from '@/components/shop/Checkout';

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-gold text-white rounded-full shadow-lg z-50 hover:bg-gold-dark transition-colors"
      >
        <ShoppingBag />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-charcoal">
                  {showCheckout ? 'Checkout' : 'Your Cart'}
                </h2>
                <button onClick={() => { setIsOpen(false); setShowCheckout(false); }}>
                  <X className="text-charcoal-light hover:text-charcoal" />
                </button>
              </div>

              {showCheckout ? (
                <Checkout />
              ) : (
                <>
                  <div className="text-center text-gray-500 mt-10 mb-10">
                    Your cart is empty.
                  </div>
                  {/* Mock Item for Demo */}
                  <div className="border-t pt-4">
                    <button 
                      onClick={() => setShowCheckout(true)}
                      className="w-full py-3 bg-charcoal text-white rounded-lg font-semibold hover:bg-charcoal-light transition-colors"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
