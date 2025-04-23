/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import VesselInput from '@/components/VesselInput';

export default function PredictionPage() {
  const [vesselResult, setVesselResult] = useState<any>(null);

  const handleVesselSubmit = (data: any) => {
    console.log('Vessel data submitted:', data);
    setVesselResult(data);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Ship Energy Prediction</h1>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Enter Vessel Details</h2>
            <VesselInput onSubmit={handleVesselSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}