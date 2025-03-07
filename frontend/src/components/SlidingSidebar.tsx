import React, { useState, useEffect, ReactNode } from 'react';
import { MapRef } from 'react-map-gl/maplibre';
import { energyDataService, EnergyData, LineData } from '../services/EnergyDataService';

interface SlidingSidebarProps {
  position: 'left' | 'right';
  title?: string;
  children?: ReactNode;
  mapRef?: MapRef | null;
}

const SlidingSidebar: React.FC<SlidingSidebarProps> = ({
  position = 'left',
  title = 'Energy Dashboard',
  children,
  mapRef
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleDataUpdate = (data: EnergyData[]) => {
      setEnergyData(data);
      setLoading(false);
    };
    
    const handleError = (errorMsg: string) => {
      setError(errorMsg);
    };
    
    const handleConnected = () => {
      setError(null);
    };
    
    // Set initial state
    setEnergyData(energyDataService.getData());
    setLoading(!energyDataService.isConnected());
    
    // Subscribe to events
    energyDataService.on('data-update', handleDataUpdate);
    energyDataService.on('error', handleError);
    energyDataService.on('connected', handleConnected);
    
    return () => {
      // Cleanup listeners
      energyDataService.removeListener('data-update', handleDataUpdate);
      energyDataService.removeListener('error', handleError);
      energyDataService.removeListener('connected', handleConnected);
    };
  }, []);

  const toggleSidebar = () => {
    // Explicitly define the padding object with all required properties
    const padding: { top: number; bottom: number; left: number; right: number } = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };
    
    if (collapsed) {
      // Set the specific side to 300
      padding[position] = 300;
      
      if (mapRef && mapRef.easeTo) {
        mapRef.easeTo({
          padding,
          duration: 1000
        });
      }
    } else {
      // Reset the specific side to 0
      padding[position] = 0;
      
      if (mapRef && mapRef.easeTo) {
        mapRef.easeTo({
          padding,
          duration: 1000
        });
      }
    }
    
    setCollapsed(!collapsed);
  };

  // Format timestamp to a readable format
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  useEffect(() => {
    // Optional: auto-expand the sidebar on load
    if (position === 'left' && mapRef) {
      toggleSidebar();
    }
  }, [mapRef]); // Run when the map is loaded

  return (
    <div
      className={`sidebar flex-center ${position} ${collapsed ? 'collapsed' : ''}`}
      id={position}
    >
      <div className="sidebar-content rounded-rect flex-center">
        <div className="p-4 w-full">
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading && !error ? (
            <div className="text-center py-4">Loading energy data...</div>
          ) : (
            <div className="energy-data-container">
              {energyData.length === 0 ? (
                <p>No data available yet</p>
              ) : (
                <div className="space-y-4">
                  {/* Latest reading summary */}
                  <div className="bg-blue-50 p-4 rounded">
                    <h3 className="text-lg font-semibold mb-2">Latest Reading</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatTimestamp(energyData[energyData.length - 1].timestamp)}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded shadow-sm">
                        <span className="text-sm text-gray-500">Total Consumption</span>
                        <p className="font-bold text-lg">{energyData[energyData.length - 1].measure_cons.toFixed(2)} W</p>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm">
                        <span className="text-sm text-gray-500">Frequency</span>
                        <p className="font-bold text-lg">{energyData[energyData.length - 1].L1_frequency.toFixed(2)} Hz</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Line details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Line Details</h3>
                    <div className="space-y-2">
                      {['L1', 'L2', 'L3'].map((line) => {
                        const lineData = energyData[energyData.length - 1][line as keyof EnergyData] as LineData;
                        return (
                          <div key={line} className="bg-white p-3 rounded shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold">{line}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                line === 'L3' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {lineData.P.toFixed(2)} W
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Voltage</span>
                                <p>{lineData.V.toFixed(1)} V</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Current</span>
                                <p>{lineData.I.toFixed(2)} A</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Power Factor</span>
                                <p>{lineData.PF.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* History section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Recent History</h3>
                    <div className="overflow-y-auto max-h-48">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left">Time</th>
                            <th className="px-2 py-1 text-right">Consumption</th>
                          </tr>
                        </thead>
                        <tbody>
                          {energyData.slice().reverse().map((data, index) => (
                            <tr key={data._id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                              <td className="px-2 py-1">{formatTimestamp(data.timestamp)}</td>
                              <td className="px-2 py-1 text-right">{data.measure_cons.toFixed(2)} W</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {children}
        </div>
        
        <div
          className={`sidebar-toggle rounded-rect ${position}`}
          onClick={toggleSidebar}
        >
          {position === 'left' ? '→' : '←'}
        </div>
      </div>
    </div>
  );
};

export default SlidingSidebar;
