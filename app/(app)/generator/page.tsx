'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import AICanvas from '@/components/ai-canvas/AICanvas';
import TermsModal from '@/components/legal/TermsModal';
import CompleteTheLook from '@/components/shop/CompleteTheLook';
import { useState, useEffect } from 'react';

function GeneratorContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const product = MOCK_PRODUCTS.find((p) => p.id === productId);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-charcoal">No product selected</h2>
        <p className="text-gray-500">Please select a product from the shop first.</p>
      </div>
    );
  }

  return (
    <>
      {!hasAcceptedTerms && <TermsModal onAccept={() => setHasAcceptedTerms(true)} />}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal">AI Studio</h1>
          <p className="text-gray-500">Visualize {product.name} in any scenario.</p>
        </div>
        <AICanvas product={product} />
        
        {/* Cross-Selling Section */}
        {product.shop_the_look && (
          <CompleteTheLook items={product.shop_the_look} />
        )}
      </div>
    </>
  );
}

export default function GeneratorPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Loading Studio...</div>}>
        <GeneratorContent />
      </Suspense>
    </div>
  );
}
