'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { energyDataService, EnergyData } from '@/services/EnergyDataService';

export default function RealTimeDataPage() {
  const [allData, setAllData] = useState<EnergyData[]>([]);
  const [filteredData, setFilteredData] = useState<EnergyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<{id: string, name: string}[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // Add state for background updates
  const [backgroundData, setBackgroundData] = useState<EnergyData[]>([]);
  const [hasBackgroundUpdates, setHasBackgroundUpdates] = useState(false);
  // Add separate state for historical data
  const [historicalData, setHistoricalData] = useState<EnergyData[]>([]);

  useEffect(() => {
    const handleDataUpdate = (newData: EnergyData[]) => {
      // Only update data if we're not in historical view
      if (!isHistoricalView) {
        setAllData(newData);
        
        // Update device list
        const devices = extractUniqueDevices(newData);
        setDeviceList(devices);
        
        // Update filtered data based on current selection
        updateFilteredData(newData, selectedDevice);
      } else {
        // If in historical view, just store the updates in the background
        setBackgroundData((prev) => {
          // Merge with existing background data
          const mergedData = [...prev];
          
          // Add new items that don't exist yet
          newData.forEach(item => {
            if (!mergedData.some(existing => existing._id === item._id)) {
              mergedData.push(item);
            }
          });
          
          return mergedData;
        });
        
        setHasBackgroundUpdates(true);
      }
      
      setIsLoading(false);
    };
    
    // Add handler for background updates
    const handleBackgroundUpdate = (newData: EnergyData[]) => {
      setBackgroundData(newData);
      setHasBackgroundUpdates(true);
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
      setAllData(currentData);
      
      // Extract unique devices
      const devices = extractUniqueDevices(currentData);
      setDeviceList(devices);
      
      // Set filtered data only if not in historical view
      if (!isHistoricalView) {
        updateFilteredData(currentData, selectedDevice);
      }
      
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
    energyDataService.on('background-update', handleBackgroundUpdate);
    energyDataService.on('connected', handleConnection);
    energyDataService.on('error', handleError);
    
    return () => {
      // Cleanup listeners
      energyDataService.removeListener('data-update', handleDataUpdate);
      energyDataService.removeListener('background-update', handleBackgroundUpdate);
      energyDataService.removeListener('connected', handleConnection);
      energyDataService.removeListener('error', handleError);
    };
  }, [selectedDevice, isHistoricalView]); // Add isHistoricalView to dependencies

  // Extract unique devices from data
  const extractUniqueDevices = (data: EnergyData[]): {id: string, name: string}[] => {
    const deviceMap = new Map<string, string>();
    
    data.forEach(item => {
      if (!deviceMap.has(item.device)) {
        deviceMap.set(item.device, item.deviceName || formatDeviceId(item.device));
      }
    });
    
    return Array.from(deviceMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => {
        // Sort D1-D31 numerically
        if (a.id.startsWith('D') && b.id.startsWith('D')) {
          const numA = parseInt(a.id.substring(1));
          const numB = parseInt(b.id.substring(1));
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
        }
        
        // Special case for F9 and Entrada de energia
        if (a.id === 'F9' && b.id.startsWith('D')) return 1;
        if (b.id === 'F9' && a.id.startsWith('D')) return -1;
        if (a.id === 'Entrada de energia') return 1;
        if (b.id === 'Entrada de energia') return -1;
        
        // Default alphabetical sort
        return a.name.localeCompare(b.name);
      });
  };
  
  // Format device ID to make it more readable
  const formatDeviceId = (deviceId: string): string => {
    // Special formatting for known device patterns
    if (deviceId.startsWith('D') && !isNaN(Number(deviceId.substring(1)))) {
      return `Device ${deviceId}`;
    }
    if (deviceId === 'F9') {
      return 'Device F9';
    }
    if (deviceId === 'Entrada de energia') {
      return 'Entrada de energia';
    }
    return deviceId.substring(0, 8) + '...';
  };

  // Update filtered data based on device selection
  const updateFilteredData = (data: EnergyData[], deviceId: string | null) => {
    if (!deviceId) {
      // Show all data from today if no device is selected
      const today = new Date(selectedDate);
      today.setHours(0, 0, 0, 0);
      
      const todayData = data.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= today;
      });
      
      setFilteredData(todayData);
    } else {
      // Filter by selected device
      const deviceData = data.filter(item => item.device === deviceId);
      setFilteredData(deviceData);
    }
  };

  // Handle device selection
  const handleDeviceSelect = (deviceId: string | null) => {
    setSelectedDevice(deviceId);
    
    // If in historical view, update filtering on historical data
    if (isHistoricalView) {
      // Filter the historical data by the new device
      if (!deviceId) {
        setFilteredData(historicalData); // Show all historical data
      } else {
        const filteredHistorical = historicalData.filter(item => item.device === deviceId);
        setFilteredData(filteredHistorical);
      }
    } else {
      // If in live view, filter the live data
      updateFilteredData(allData, deviceId);
    }
  };
  
  // Handle date selection
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    
    // Don't reset historical view when just changing the date
    // The search button must be clicked to apply the new date
    
    if (!isHistoricalView) {
      // If in live view, filter based on the new date
      const selectedDay = new Date(newDate);
      selectedDay.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(selectedDay);
      nextDay.setDate(nextDay.getDate() + 1);
      
      let newFilteredData;
      if (selectedDevice) {
        // Filter by device and date
        newFilteredData = allData.filter(item => {
          const itemDate = new Date(item.timestamp);
          return item.device === selectedDevice && itemDate >= selectedDay && itemDate < nextDay;
        });
      } else {
        // Filter by date only
        newFilteredData = allData.filter(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate >= selectedDay && itemDate < nextDay;
        });
      }
      
      setFilteredData(newFilteredData);
    }
  };

  // Fetch historical data
  const fetchHistoricalData = async () => {
    if (!selectedDate) return;
    
    setIsSearching(true);
    setIsLoading(true);
    
    try {
      let fetchedHistoricalData: EnergyData[] = [];
      
      // Reset background updates when fetching new historical data
      setBackgroundData([]);
      setHasBackgroundUpdates(false);
      
      if (selectedDevice) {
        // Fetch data for specific device and date
        fetchedHistoricalData = await energyDataService.fetchHistoricalData(selectedDevice, selectedDate);
      } else {
        // Fetch data for all devices on the selected date
        fetchedHistoricalData = await energyDataService.fetchHistoricalData('', selectedDate);
      }
      
      if (fetchedHistoricalData && fetchedHistoricalData.length > 0) {
        // Store the full historical dataset
        setHistoricalData(fetchedHistoricalData);
        
        // Set filtered data based on the current selection
        if (selectedDevice) {
          const deviceData = fetchedHistoricalData.filter(item => item.device === selectedDevice);
          setFilteredData(deviceData);
        } else {
          setFilteredData(fetchedHistoricalData);
        }
        
        setIsHistoricalView(true);
      } else {
        // If no data returned, show an empty array
        setHistoricalData([]);
        setFilteredData([]);
        setIsHistoricalView(true); // Still set historical view to true
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Show error message
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  // Switch to live data
  const switchToLiveData = () => {
    setIsHistoricalView(false);
    
    // Exit historical mode and merge background updates
    energyDataService.exitHistoricalMode();
    
    // Reset historical data
    setHistoricalData([]);
    
    // Reset background update indicators
    setHasBackgroundUpdates(false);
    setBackgroundData([]);
    
    // Get the latest data which now includes merged background updates
    const latestData = energyDataService.getData();
    setAllData(latestData);
    
    // Update filtered data based on current selection
    updateFilteredData(latestData, selectedDevice);
  };

  // Helper function for safe rounding
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
          <h1 className="text-2xl font-bold">
            {isHistoricalView ? 'Historical' : 'Real-Time'} Port Energy Data
          </h1>
          <div className="flex items-center gap-3">
            {isHistoricalView && hasBackgroundUpdates && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md">
                <span>{backgroundData.length} new updates available</span>
                <button 
                  onClick={switchToLiveData}
                  className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-0.5 rounded text-sm"
                >
                  Switch to Live
                </button>
              </div>
            )}
            {isHistoricalView && !hasBackgroundUpdates && (
              <button
                onClick={switchToLiveData}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Switch to Live Data
              </button>
            )}
            <div className={`px-3 py-1 rounded-full text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
              <h2 className="text-xl font-semibold">Device Selection</h2>
              <p className="text-sm text-gray-600">Select a device to view its data</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date-select"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={fetchHistoricalData}
                disabled={isSearching}
                className={`px-4 py-2 rounded-md text-white self-end ${
                  isSearching ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                } transition-colors`}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              
              {selectedDevice && (
                <button
                  onClick={() => handleDeviceSelect(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors self-end"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {deviceList.map(device => {
              // Extract device number for D-series devices
              let deviceLabel = device.name;
              if (device.id.startsWith('D') && !isNaN(Number(device.id.substring(1)))) {
                deviceLabel = `D${device.id.substring(1)}`;
              } else if (device.id === 'F9') {
                deviceLabel = 'F9';
              } else if (device.id === 'Entrada de energia') {
                deviceLabel = 'Entrada';
              }
              
              return (
                <button
                  key={device.id}
                  onClick={() => handleDeviceSelect(device.id)}
                  className={`px-3 py-1.5 text-sm rounded-md text-center transition-colors min-w-[60px] ${
                    selectedDevice === device.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  title={device.name}
                >
                  {deviceLabel}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedDevice 
                ? `Data for ${deviceList.find(d => d.id === selectedDevice)?.name || selectedDevice}`
                : `All Devices Data (${new Date(selectedDate).toLocaleDateString()})`}
            </h2>
            
            {isHistoricalView && (
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                Viewing historical data ({filteredData.length} records)
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available for {selectedDevice ? 'this device' : 'today'}. Try selecting a different date or device.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    {!selectedDevice && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L1 Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L2 Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L3 Power (W)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (W)</th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      {!selectedDevice && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.deviceName || formatDeviceId(item.device)}
                        </td>
                      )}
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