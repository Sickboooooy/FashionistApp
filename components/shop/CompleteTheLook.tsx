'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface ShopTheLookItem {
  item_name: string;
  affiliate_url: string;
  image_url: string;
}

interface CompleteTheLookProps {
  items: ShopTheLookItem[];
}

export default function CompleteTheLook({ items }: CompleteTheLookProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-12 border-t border-gray-100 pt-8">
      <h3 className="text-xl font-bold text-charcoal mb-6 flex items-center gap-2">
        Complete the Vibe
        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Ad</span>
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.a
            key={index}
            href={item.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group block bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gold/50 transition-colors shadow-sm hover:shadow-md"
          >
            <div className="relative aspect-square w-full bg-gray-50">
              <Image
                src={item.image_url}
                alt={item.item_name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-3 h-3 text-charcoal" />
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-charcoal truncate">{item.item_name}</p>
              <p className="text-xs text-gold font-semibold mt-1">Shop Now</p>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
