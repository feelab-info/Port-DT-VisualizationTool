'use client';

import DashboardLayout from '@/components/DashboardLayout';
import VesselInput from '@/components/VesselInput';

export default function PredictionPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleVesselSubmit = (data: any) => {
    console.log('Vessel data submitted:', data);
    // Handle the vessel data as needed for prediction
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-6">Ship Energy Usage Prediction</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VesselInput onSubmit={handleVesselSubmit} />
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Prediction Model</h2>
            <p className="text-gray-600 mb-4">
              This tool predicts energy usage for ships based on vessel specifications and schedule.
            </p>
            
            <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Prediction results will appear here</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Historical Analysis</h2>
            <div className="h-48 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Historical data chart will be displayed here</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Ships</h2>
            <div className="h-48 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Upcoming ships schedule will be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}