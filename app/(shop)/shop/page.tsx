'use client';

import { MOCK_PRODUCTS } from '@/lib/mock-data';
import ProductCard from '@/components/shop/ProductCard';
import { motion } from 'framer-motion';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal mb-4">
            The Collection
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Curated pieces for the modern muse. Visualize any item on yourself with our AI technology.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
