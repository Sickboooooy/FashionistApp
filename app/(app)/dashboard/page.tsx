'use client';

import { motion } from 'framer-motion';
import { MOCK_GENERATIONS } from '@/lib/mock-data';
import Image from 'next/image';
import { Sparkles, Heart, Zap, Clock } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    { label: 'Total Generations', value: '124', icon: Sparkles, color: 'bg-gold/10 text-gold' },
    { label: 'Saved Outfits', value: '18', icon: Heart, color: 'bg-red-50 text-red-500' },
    { label: 'Credits Remaining', value: '450', icon: Zap, color: 'bg-blue-50 text-blue-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal">My Closet</h1>
        <p className="text-gray-500">Welcome back, Fashionista.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Generations */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-bold text-charcoal flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" />
          Recent Creations
        </h2>
        <button className="text-sm text-gold font-semibold hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_GENERATIONS.map((gen, index) => (
          <motion.div
            key={gen.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-all"
          >
            <Image
              src={gen.imageUrl}
              alt={gen.prompt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
              <p className="text-white font-medium truncate">{gen.prompt}</p>
              <p className="text-white/70 text-sm">{gen.date}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
