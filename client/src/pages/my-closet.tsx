import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GoldText from '@/components/ui/gold-text';
import GoldButton from '@/components/ui/gold-button';
import GoldBorder from '@/components/ui/gold-border';
import SpotlightContainer from '@/components/ui/spotlight-container';
import FileUpload from '@/components/ui/file-upload';
import { useToast } from '@/hooks/use-toast';

const MyCloset = () => {
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  
  // In a real app, we would fetch user's garments from the API
  const { data: garments = [], isLoading } = useQuery({
    queryKey: ['/api/users/1/garments'],
    // This will execute when the endpoint is implemented
    enabled: false, 
  });
  
  const handleAddGarment = (file: File) => {
    toast({
      title: 'Upload Successful',
      description: 'Your garment has been added to your closet',
    });
  };
  
  const garmentTypes = [
    { id: 'all', label: 'All Items' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' },
  ];

  return (
    <>
      <SpotlightContainer>
        <div className="container mx-auto max-w-4xl">
          <h1 className="font-playfair text-3xl md:text-4xl mb-2 text-center">
            My <GoldText>Personal</GoldText> Closet
          </h1>
          <p className="font-cormorant text-center text-lg mb-10 opacity-80 max-w-2xl mx-auto">
            Manage your garments and create stunning outfit combinations
          </p>
          
          {/* Garment Type Filters */}
          <div className="flex flex-wrap justify-center mb-8 space-x-2 space-y-2">
            <div className="w-full"></div> {/* This forces the items below to wrap */}
            {garmentTypes.map(type => (
              <button
                key={type.id}
                className={`px-4 py-2 rounded-full text-sm font-montserrat ${
                  activeTab === type.id 
                    ? 'gold-button text-black' 
                    : 'border border-amber-deep text-cream-soft hover:text-amber-deep'
                }`}
                onClick={() => setActiveTab(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          {/* Upload Area */}
          <div className="mb-12">
            <GoldBorder className="p-8 text-center">
              <h3 className="font-playfair text-xl mb-4 gold-text">Add New Item to Your Closet</h3>
              <p className="font-cormorant mb-6">
                Upload photos of your garments to create personalized outfit combinations
              </p>
              <div className="max-w-xs mx-auto">
                <FileUpload
                  onFileSelected={handleAddGarment}
                  label="Upload Garment"
                  description="Add to your virtual closet"
                  icon={<i className="fas fa-tshirt"></i>}
                />
              </div>
            </GoldBorder>
          </div>
          
          {/* Garment Grid */}
          <div className="mb-8">
            <h3 className="font-playfair text-xl mb-6">
              Your Garments <span className="text-sm font-montserrat text-cream-soft opacity-60">(0 items)</span>
            </h3>
            {isLoading ? (
              <p className="text-center font-cormorant py-12">Loading your closet...</p>
            ) : garments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Garment items would go here */}
              </div>
            ) : (
              <GoldBorder className="p-8 text-center">
                <p className="font-cormorant mb-6">Your closet is empty. Add garments to get started!</p>
                <GoldButton>EXPLORE EXAMPLE OUTFITS</GoldButton>
              </GoldBorder>
            )}
          </div>
        </div>
      </SpotlightContainer>
    </>
  );
};

export default MyCloset;
