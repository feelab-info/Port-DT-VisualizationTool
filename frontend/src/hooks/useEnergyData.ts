import { useState, useEffect } from 'react';
import { energyDataService, EnergyData } from '@/services/EnergyDataService';

export function useEnergyData() {
  const [allData, setAllData] = useState<EnergyData[]>([]);
  const [filteredData, setFilteredData] = useState<EnergyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<{id: string, name: string}[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [backgroundData, setBackgroundData] = useState<EnergyData[]>([]);
  const [hasBackgroundUpdates, setHasBackgroundUpdates] = useState(false);
  const [historicalData, setHistoricalData] = useState<EnergyData[]>([]);

  // Update comprehensive device list - add new devices but never remove them
  const updateAllKnownDevices = (newDevices: {id: string, name: string}[]) => {
    setDeviceList(prevDevices => {
      const deviceMap = new Map(prevDevices.map(d => [d.id, d]));
      
      // Add any new devices we haven't seen before
      newDevices.forEach(device => {
        if (!deviceMap.has(device.id)) {
          deviceMap.set(device.id, device);
        }
      });
      
      // Return sorted array
      return Array.from(deviceMap.values()).sort((a, b) => {
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
    });
  };

  // Extract unique devices from data
  const extractUniqueDevices = (data: EnergyData[]): {id: string, name: string}[] => {
    const deviceMap = new Map<string, string>();
    
    data.forEach(item => {
      if (!deviceMap.has(item.device)) {
        deviceMap.set(item.device, item.deviceName || formatDeviceId(item.device));
      }
    });
    
    const extractedDevices = Array.from(deviceMap.entries())
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
    
    return extractedDevices;
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
      
      if (deviceData.length === 0) {
        // This indicates a device ID mismatch between selection and data
        // We should ideally show an error or message to the user
        console.warn('❌ NO DATA FOUND FOR SELECTED DEVICE!');
        console.warn('This indicates a device ID mismatch between selection and data');
      }
      
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
      
      console.log('Fetching historical data for:', { selectedDevice, selectedDate });
      console.log('Socket connected:', energyDataService.isConnected());
      console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
      
      // Check if socket is connected before proceeding
      if (!energyDataService.isConnected()) {
        throw new Error('Not connected to backend server. Please check if the backend is running.');
      }
      
      if (selectedDevice) {
        // Fetch data for specific device and date
        fetchedHistoricalData = await energyDataService.fetchHistoricalData(selectedDevice, selectedDate);
      } else {
        // Fetch data for all devices on the selected date
        fetchedHistoricalData = await energyDataService.fetchHistoricalData('', selectedDate);
      }
      
      console.log('Received historical data:', fetchedHistoricalData?.length || 0, 'records');
      
      if (fetchedHistoricalData && fetchedHistoricalData.length > 0) {
        // Store the full historical dataset
        setHistoricalData(fetchedHistoricalData);
        
        // The backend already filtered the data correctly based on our request
        // No need to filter again on the frontend
        setFilteredData(fetchedHistoricalData);
        
        console.log(`Set ${fetchedHistoricalData.length} historical records for display`);
        
        setIsHistoricalView(true);
      } else {
        // If no data returned, show an empty array
        console.warn('No historical data returned for the selected criteria');
        setHistoricalData([]);
        setFilteredData([]);
        setIsHistoricalView(true); // Still set historical view to true
        
        // Show user-friendly message (you can add a state for this)
        alert('No historical data found for the selected device and date. Please try a different date or device.');
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      
      // Display error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to fetch historical data: ${errorMessage}`);
      
      // Reset states on error
      setHistoricalData([]);
      setFilteredData([]);
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

  useEffect(() => {
    const handleDataUpdate = (newData: EnergyData[]) => {
      // Only update data if we're not in historical view
      if (!isHistoricalView) {
        setAllData(newData);
        
        // Update device list
        const devices = extractUniqueDevices(newData);
        
        // Update comprehensive device list
        updateAllKnownDevices(devices);
        
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
      
      // Set comprehensive device list
      updateAllKnownDevices(devices);

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
  }, [selectedDevice, isHistoricalView, selectedDate]);

  return {
    allData,
    filteredData,
    deviceList,
    selectedDevice,
    selectedDate,
    isHistoricalView,
    isConnected,
    isLoading,
    isSearching,
    hasBackgroundUpdates,
    backgroundData,
    formatDeviceId,
    handleDeviceSelect,
    handleDateChange,
    fetchHistoricalData,
    switchToLiveData,
  };
}