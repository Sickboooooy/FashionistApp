import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GoldText from '@/components/ui/gold-text';
import GoldBorder from '@/components/ui/gold-border';
import SpotlightContainer from '@/components/ui/spotlight-container';
import PreferenceManager from '@/components/preference-manager';
import OutfitCard from '@/components/outfit-card';
import { useOutfit } from '@/contexts/outfit-context';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('preferences');
  const { savedOutfits } = useOutfit();
  
  // In a real app, we would fetch user data from the API
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users/1'],
    // This will execute when the endpoint is implemented
    enabled: false,
  });

  return (
    <SpotlightContainer>
      <div className="container mx-auto max-w-4xl">
        <h1 className="font-playfair text-3xl md:text-4xl mb-2 text-center">
          Your Style <GoldText>Profile</GoldText>
        </h1>
        <p className="font-cormorant text-center text-lg mb-10 opacity-80 max-w-2xl mx-auto">
          Manage your preferences and saved outfits
        </p>
        
        {/* Profile navigation tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex border border-amber-deep rounded-full p-1 bg-black">
            <button
              className={`px-6 py-2 rounded-full text-sm font-montserrat ${activeTab === 'preferences' ? 'gold-button text-black' : 'text-cream-soft hover:text-amber-deep'}`}
              onClick={() => setActiveTab('preferences')}
            >
              Style Preferences
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-montserrat ${activeTab === 'saved' ? 'gold-button text-black' : 'text-cream-soft hover:text-amber-deep'}`}
              onClick={() => setActiveTab('saved')}
            >
              Saved Outfits
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-montserrat ${activeTab === 'account' ? 'gold-button text-black' : 'text-cream-soft hover:text-amber-deep'}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        <div className="mb-12">
          {activeTab === 'preferences' && (
            <div className="py-4">
              <PreferenceManager />
            </div>
          )}
          
          {activeTab === 'saved' && (
            <div className="py-4">
              <h3 className="font-playfair text-xl mb-6 gold-text">Your Saved Outfits</h3>
              
              {savedOutfits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {savedOutfits.map(outfit => (
                    <OutfitCard key={outfit.id} outfit={outfit} />
                  ))}
                </div>
              ) : (
                <GoldBorder className="p-8 text-center">
                  <p className="font-cormorant mb-6">You haven't saved any outfits yet</p>
                  <button className="gold-button font-montserrat text-sm font-medium px-8 py-3 rounded-full">
                    EXPLORE OUTFITS
                  </button>
                </GoldBorder>
              )}
            </div>
          )}
          
          {activeTab === 'account' && (
            <div className="py-4">
              <GoldBorder className="p-8">
                <h3 className="font-playfair text-xl mb-6 gold-text">Account Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-cormorant text-sm mb-2">Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-black gold-border rounded p-3 text-cream-soft font-cormorant focus:border-amber-deep focus:outline-none"
                      value="Guest User"
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block font-cormorant text-sm mb-2">Email</label>
                    <input 
                      type="email" 
                      className="w-full bg-black gold-border rounded p-3 text-cream-soft font-cormorant focus:border-amber-deep focus:outline-none"
                      value="guest@example.com"
                      readOnly
                    />
                  </div>
                  
                  <div className="pt-4">
                    <button className="gold-button font-montserrat text-sm font-medium px-8 py-3 rounded-full">
                      UPDATE ACCOUNT
                    </button>
                  </div>
                </div>
              </GoldBorder>
            </div>
          )}
        </div>
      </div>
    </SpotlightContainer>
  );
};

export default Profile;
