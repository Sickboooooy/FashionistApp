import React from 'react';
import APIDebugPanel from '@/components/api-debug-panel';

const APIDebugPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-8">
        <APIDebugPanel />
      </div>
    </div>
  );
};

export default APIDebugPage;