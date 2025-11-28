'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-cream/20 to-background z-10" />
        {/* Placeholder for video/image background */}
        <div className="w-full h-full bg-charcoal opacity-5" />
      </div>

      <main className="z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold text-charcoal mb-6 tracking-tight"
        >
          Redefine Your Style with <span className="text-gold">AI</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
        >
          Experience the future of fashion. Visualize outfits on yourself instantly using our advanced AI technology.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link 
            href="/shop" 
            className="px-8 py-4 bg-charcoal text-white rounded-full font-semibold hover:bg-charcoal-light transition-all transform hover:scale-105 shadow-lg"
          >
            Shop Collection
          </Link>
          <Link 
            href="/generator" 
            className="px-8 py-4 bg-gold text-white rounded-full font-semibold hover:bg-gold-dark transition-all transform hover:scale-105 shadow-lg"
          >
            Try AI Generator
          </Link>
        </motion.div>
      </main>

      <footer className="absolute bottom-8 text-sm text-gray-400">
        © 2025 FashionistAPP. All rights reserved.
      </footer>
    </div>
  );
}
