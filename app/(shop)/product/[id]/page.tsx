'use client';

import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { use } from 'react';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const product = MOCK_PRODUCTS.find((p) => p.id === resolvedParams.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/shop" 
          className="inline-flex items-center text-gray-500 hover:text-charcoal mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Product Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-gray-100"
          >
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </motion.div>

          {/* Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full justify-center"
          >
            <span className="text-gold font-semibold tracking-wider uppercase mb-2">
              {product.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-charcoal mb-4">
              {product.name}
            </h1>
            <p className="text-2xl text-charcoal-light mb-8">
              ${product.price.toFixed(2)}
            </p>
            
            <div className="prose prose-lg text-gray-600 mb-10">
              <p>{product.description}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 bg-charcoal text-white py-4 px-8 rounded-full font-bold hover:bg-charcoal-light transition-all transform hover:scale-105 shadow-lg">
                Add to Cart
              </button>
              <Link 
                href={`/generator?productId=${product.id}`}
                className="flex-1 flex items-center justify-center gap-2 bg-gold text-white py-4 px-8 rounded-full font-bold hover:bg-gold-dark transition-all transform hover:scale-105 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                Try On with AI
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
