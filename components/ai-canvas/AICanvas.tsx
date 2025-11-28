'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Share2, Download } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/types';
import WatermarkOverlay from '@/components/legal/WatermarkOverlay';

interface AICanvasProps {
  product: Product;
}

const LOADING_MESSAGES = [
  "Analyzing fabric texture...",
  "Setting up studio lighting...",
  "Matching accessories...",
  "Rendering final look..."
];

export default function AICanvas({ product }: AICanvasProps) {
  const [scenario, setScenario] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    if (!isGenerating) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[currentIndex]);
    }, 2000);

    return () => {
      clearInterval(interval);
      setLoadingMessage(LOADING_MESSAGES[0]);
    };
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!scenario || !isAgreed) return;

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          userScenario: scenario,
          modelPreferences: 'Professional model' // Default for now
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Controls Panel */}
      <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-lg flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">Design Your Look</h2>
          <p className="text-gray-500 text-sm">Describe the setting where you want to see this outfit.</p>
        </div>

        {/* Selected Product Preview */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden">
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-charcoal">{product.name}</p>
            <p className="text-sm text-gray-500">${product.price}</p>
          </div>
        </div>

        {/* Scenario Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-charcoal">Scenario / Context</label>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="E.g., A sunset dinner in Paris, walking down a busy street in Tokyo..."
            className="w-full p-4 rounded-xl border border-gray-200 focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none h-32 transition-all"
          />
        </div>

        {/* Liability Shield */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <input 
            type="checkbox" 
            id="liability-check"
            checked={isAgreed}
            onChange={(e) => setIsAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 text-gold rounded border-gray-300 focus:ring-gold"
          />
          <label htmlFor="liability-check" className="text-xs text-gray-600 cursor-pointer">
            I agree that this image is an AI simulation for visualization purposes.
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!scenario || isGenerating || !isAgreed}
          className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
            !scenario || isGenerating || !isAgreed
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-gold hover:bg-gold-dark shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Magic...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Outfit
            </>
          )}
        </button>
      </div>

      {/* Canvas / Result Area */}
      <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden relative min-h-[500px] flex items-center justify-center border-2 border-dashed border-gray-300">
        {!generatedImage && !isGenerating && (
          <div className="text-center text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Your creation will appear here</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <Loader2 className="w-12 h-12 text-gold animate-spin mb-4" />
            <p className="text-charcoal font-semibold animate-pulse">{loadingMessage}</p>
          </div>
        )}

        {generatedImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-full"
          >
            <Image 
              src={generatedImage} 
              alt="Generated Outfit" 
              fill 
              className="object-contain"
            />
            
            {/* Action Overlay */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
              <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 text-charcoal transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 text-charcoal transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Watermark */}
            <WatermarkOverlay />
          </motion.div>
        )}
      </div>
    </div>
  );
}
