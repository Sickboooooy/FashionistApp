'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, MapPin, CreditCard, Bell, Shield } from 'lucide-react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal">Account Settings</h1>
        <p className="text-gray-500">Manage your profile and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-charcoal text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-charcoal mb-4">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue="Fashionista User" 
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        defaultValue="user@example.com" 
                        className="w-full p-3 pl-10 rounded-xl border border-gray-200 focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        defaultValue="Mexico City, MX" 
                        className="w-full p-3 pl-10 rounded-xl border border-gray-200 focus:border-gold focus:ring-1 focus:ring-gold outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button className="px-6 py-3 bg-gold text-white rounded-xl font-bold hover:bg-gold-dark transition-colors shadow-lg">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Billing settings will be available after Stripe integration.</p>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-charcoal mb-4">Notification Preferences</h2>
                {['New Collection Alerts', 'Generation Complete', 'Special Offers', 'Weekly Newsletter'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="font-medium text-charcoal">{item}</span>
                    <div className="w-12 h-6 bg-gold rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Security settings are managed via Supabase Auth.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
