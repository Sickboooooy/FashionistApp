'use client';

import { Product } from '@/types';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
    >
      <div className="relative h-[400px] w-full overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        
        {/* Quick Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2">
          <Link 
            href={`/product/${product.id}`}
            className="flex-1 bg-white text-charcoal py-3 text-center font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            View Details
          </Link>
          <button className="flex-1 bg-gold text-white py-3 font-semibold rounded-lg hover:bg-gold-dark transition-colors">
            Try with AI
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-charcoal mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-2">{product.category}</p>
        <p className="text-gold-dark font-semibold">${product.price.toFixed(2)}</p>
      </div>
    </motion.div>
  );
}
