import React, { useState, useEffect, ReactNode } from 'react';
import { MapRef } from 'react-map-gl/maplibre';
import { energyDataService, EnergyData, LineData } from '../services/EnergyDataService';

interface SlidingSidebarProps {
  position: 'left' | 'right';
  title?: string;
  children?: ReactNode;
  mapRef?: MapRef | null;
}

type DeviceGroup = {
  deviceId: string;
  data: EnergyData[];
}

const SlidingSidebar: React.FC<SlidingSidebarProps> = ({
  position = 'left',
  title = 'Energy Dashboard',
  children,
  mapRef
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleDataUpdate = (newData: EnergyData[]) => {
      // Update device groups while preserving historical data
      setDeviceGroups(prevGroups => {
        // Create a map of existing device groups for easier lookup
        const existingGroupsMap: Record<string, EnergyData[]> = {};
        prevGroups.forEach(group => {
          existingGroupsMap[group.deviceId] = group.data;
        });
        
        // Process new data and merge with existing data
        const updatedDevices: Record<string, EnergyData[]> = { ...existingGroupsMap };
        
        newData.forEach(item => {
          const deviceId = item.device;
          
          if (!updatedDevices[deviceId]) {
            updatedDevices[deviceId] = [];
          }
          
          // Check if this data point already exists (by _id or timestamp)
          const exists = updatedDevices[deviceId].some(
            existingItem => existingItem._id === item._id
          );
          
          if (!exists) {
            updatedDevices[deviceId].push(item);
          }
        });
        
        // Sort data by timestamp for each device
        Object.keys(updatedDevices).forEach(deviceId => {
          updatedDevices[deviceId].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          // Optionally limit history length (e.g., keep last 100 readings)
          if (updatedDevices[deviceId].length > 100) {
            updatedDevices[deviceId] = updatedDevices[deviceId].slice(-100);
          }
        });
        
        // Convert back to array format
        return Object.entries(updatedDevices).map(([deviceId, data]) => ({
          deviceId,
          data
        }));
      });
      
      setLoading(false);
    };
    
    const handleError = (errorMsg: string) => {
      setError(errorMsg);
    };
    
    const handleConnected = () => {
      setError(null);
    };
    
    // Set initial state with existing data from service
    handleDataUpdate(energyDataService.getData());
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

  // Format date for grouping in history view
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Format device ID to make it more readable
  // Update the formatDeviceId function to handle device names
  const formatDeviceId = (deviceId: string, deviceName?: string) => {
    if (deviceName) {
      return deviceName;
    }
    return deviceId.substring(0, 8) + '...';
  };

  // Get latest data for a specific device
  const getDeviceData = (deviceId: string) => {
    const deviceData = deviceGroups.find(group => group.deviceId === deviceId);
    return deviceData ? deviceData.data : [];
  };


  // Handle device selection
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  // Go back to device selection
  const handleBackToDevices = () => {
    setSelectedDevice(null);
  };

  // Render device selection screen
  const renderDeviceSelection = () => {
    return (
      <div className="device-selection">
        <h3 className="text-lg font-semibold mb-4">Select a Device</h3>
        <div className="grid grid-cols-1 gap-3">
          {deviceGroups.map((group) => {
            if (group.data.length === 0) return null;
            
            const latestData = group.data[group.data.length - 1];
            // Debug the data structure            
            return (
              <button
                key={group.deviceId}
                onClick={() => handleDeviceSelect(group.deviceId)}
                className="bg-white p-3 rounded shadow-sm hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      Device: {latestData.deviceName || formatDeviceId(group.deviceId)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Producer: {latestData.ownerName || (latestData.producer ? latestData.producer.substring(0, 8) + '...' : 'Unknown')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{latestData.measure_cons.toFixed(2)} W</p>
                    <p className="text-xs text-gray-500">{formatTimestamp(latestData.timestamp)}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {group.data.length} data points
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render device details screen
  const renderDeviceDetails = () => {
    if (!selectedDevice) return null;
    
    const deviceData = getDeviceData(selectedDevice);
    if (deviceData.length === 0) return <p>No data available for this device</p>;
    
    const latestData = deviceData[deviceData.length - 1];
    
    return (
      <div className="device-details">
        <div className="flex items-center mb-4">
          <button 
            onClick={handleBackToDevices}
            className="mr-2 p-1 rounded hover:bg-gray-100"
          >
            ← Back
          </button>
          <h3 className="text-lg font-semibold">
            Device: {latestData.deviceName || formatDeviceId(selectedDevice)}
          </h3>
        </div>
        
        {/* Latest reading summary */}
        <div className="bg-blue-50 p-4 rounded mb-4">
          <h3 className="text-lg font-semibold mb-2">Latest Reading</h3>
          <p className="text-sm text-gray-600 mb-2">
            {formatTimestamp(latestData.timestamp)}
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2 rounded shadow-sm">
              <span className="text-sm text-gray-500">Total Consumption</span>
              <p className="font-bold text-lg">{latestData.measure_cons.toFixed(2)} W</p>
            </div>
            <div className="bg-white p-2 rounded shadow-sm">
              <span className="text-sm text-gray-500">Frequency</span>
              <p className="font-bold text-lg">{latestData.L1_frequency.toFixed(2)} Hz</p>
            </div>
          </div>
        </div>
        
        {/* Line details */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Line Details</h3>
          <div className="space-y-2">
            {['L1', 'L2', 'L3'].map((line) => {
              const lineData = latestData[line as keyof EnergyData] as LineData;
              return (
                <div key={line} className="bg-white p-3 rounded shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{line}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      lineData.P > 500 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
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
          <h3 className="text-lg font-semibold mb-2">Historical Data ({deviceData.length} points)</h3>
          <div className="overflow-y-auto max-h-64">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-right">Consumption</th>
                  <th className="px-2 py-1 text-right">L1 (W)</th>
                  <th className="px-2 py-1 text-right">L2 (W)</th>
                  <th className="px-2 py-1 text-right">L3 (W)</th>
                </tr>
              </thead>
              <tbody>
                {deviceData.slice().reverse().map((data, index) => {
                  // Add date headers to group by day
                  const date = formatDate(data.timestamp);
                  const prevDate = index > 0 ? formatDate(deviceData[deviceData.length - index].timestamp) : null;
                  const showDateHeader = date !== prevDate;
                  
                  return (
                    <React.Fragment key={data._id}>
                      {showDateHeader && (
                        <tr>
                          <td colSpan={5} className="px-2 py-1 bg-gray-100 font-medium">
                            {date}
                          </td>
                        </tr>
                      )}
                      <tr className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="px-2 py-1">{formatTimestamp(data.timestamp)}</td>
                        <td className="px-2 py-1 text-right">{data.measure_cons.toFixed(2)} W</td>
                        <td className="px-2 py-1 text-right">{(data.L1 as LineData).P.toFixed(1)}</td>
                        <td className="px-2 py-1 text-right">{(data.L2 as LineData).P.toFixed(1)}</td>
                        <td className="px-2 py-1 text-right">{(data.L3 as LineData).P.toFixed(1)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

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
              {deviceGroups.length === 0 ? (
                <p>No devices available yet</p>
              ) : (
                <>
                  {selectedDevice ? renderDeviceDetails() : renderDeviceSelection()}
                </>
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
