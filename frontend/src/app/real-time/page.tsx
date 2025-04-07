'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { energyDataService, EnergyData } from '@/services/EnergyDataService';

export default function RealTimeDataPage() {
  const [data, setData] = useState<EnergyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleDataUpdate = (newData: EnergyData[]) => {
      setData(newData);
      setIsLoading(false);
    };
    
    const handleConnection = () => {
      setIsConnected(true);
      // Request initial data when connection is established
      energyDataService.requestInitialData();
    };
    
    const handleError = (error: string) => {
      setIsConnected(false);
      console.error('Connection error:', error);
      setIsLoading(false);
    };
    
    // Set initial state
    try {
      const currentData = energyDataService.getData();
      setData(currentData);
      setIsConnected(energyDataService.isConnected());
      
      // If we already have data, we're not loading
      if (currentData.length > 0) {
        setIsLoading(false);
      } else if (energyDataService.isConnected()) {
        // If connected but no data, request it
        energyDataService.requestInitialData();
      }
    } catch (err) {
      console.error('Error initializing data:', err);
      setIsConnected(false);
      setIsLoading(false);
    }
    
    // Subscribe to events
    energyDataService.on('data-update', handleDataUpdate);
    energyDataService.on('connected', handleConnection);
    energyDataService.on('error', handleError);
    
    return () => {
      // Cleanup listeners
      energyDataService.removeListener('data-update', handleDataUpdate);
      energyDataService.removeListener('connected', handleConnection);
      energyDataService.removeListener('error', handleError);
    };
  }, []);

  // Add this helper function near the top of your component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeRound = (value: any): string => {
    if (value === undefined || value === null) {
      return 'N/A';
    }
    return Math.round(value).toString();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Real-time Port Energy Data</h1>
          <div className={`px-3 py-1 rounded-full text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Latest Readings</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading today&apos;s data...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available for today. Waiting for readings...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L1 Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L2 Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L3 Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (W)</th>
                  </tr>
                </thead>
                

                <tbody className="bg-white divide-y divide-gray-200">
                  {data.slice(-10).map((item) => (
                    <tr key={item._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.deviceName || item.device}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {safeRound(item.L1?.P)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {safeRound(item.L2?.P)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {safeRound(item.L3?.P)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {safeRound(item.measure_cons)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}