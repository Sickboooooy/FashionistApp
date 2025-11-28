'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';

export default function Checkout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setIsSuccess(true);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-charcoal mb-6">Checkout</h2>
      
      {!isSuccess ? (
        <div className="space-y-6">
          <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-charcoal" />
              <span className="font-semibold text-charcoal">Payment Method</span>
            </div>
            <p className="text-sm text-gray-500">Ending in •••• 4242</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>$249.99</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-charcoal text-lg">
              <span>Total</span>
              <span>$249.99</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full py-4 bg-charcoal text-white rounded-xl font-bold hover:bg-charcoal-light transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-charcoal mb-2">Payment Successful!</h3>
          <p className="text-gray-500 mb-6">Thank you for your purchase. Your order is being prepared.</p>
          <button 
            onClick={() => setIsSuccess(false)}
            className="text-gold font-semibold hover:underline"
          >
            Continue Shopping
          </button>
        </motion.div>
      )}
    </div>
  );
}
