import { useState, useEffect, useCallback } from 'react';
import { energyDataService, EnergyData } from '@/services/EnergyDataService';
import { LegacyDevice } from '@/types/Device';

export function useEnergyData() {
  const [allData, setAllData] = useState<EnergyData[]>([]);
  const [filteredData, setFilteredData] = useState<EnergyData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<LegacyDevice[]>([]);
  const [allDeviceList, setAllDeviceList] = useState<LegacyDevice[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [backgroundData, setBackgroundData] = useState<EnergyData[]>([]);
  const [hasBackgroundUpdates, setHasBackgroundUpdates] = useState(false);
  const [historicalData, setHistoricalData] = useState<EnergyData[]>([]);
  const [dateRangeType, setDateRangeType] = useState<'single' | '3days' | 'week' | 'custom'>('single');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Update comprehensive device list - add new devices but never remove them
  const updateAllKnownDevices = (newDevices: LegacyDevice[]) => {
    setDeviceList(prevDevices => {
      const deviceMap = new Map(prevDevices.map(d => [d.id, d]));
      
      // Add any new devices we haven't seen before
      newDevices.forEach(device => {
        if (!deviceMap.has(device.id)) {
          deviceMap.set(device.id, device);
        }
      });
      
      // Return sorted array by name
      return Array.from(deviceMap.values()).sort((a, b) => {
        // Sort alphabetically by display name
        return a.name.localeCompare(b.name);
      });
    });
  };

  // Extract unique devices from data
  const extractUniqueDevices = useCallback((data: EnergyData[]): LegacyDevice[] => {
    const deviceMap = new Map<string, string>();
    
    data.forEach(item => {
      if (!deviceMap.has(item.device)) {
        // Use deviceName from enriched data if available, otherwise use device ID as-is
        // DO NOT format the device ID - use the actual name from producer collection
        deviceMap.set(item.device, item.deviceName || item.device);
      }
    });
    
    const extractedDevices = Array.from(deviceMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => {
        // Sort by name alphabetically - let the natural names determine order
        return a.name.localeCompare(b.name);
      });
    
    return extractedDevices;
  }, []);
  
  // Format device ID - show actual name from producer collection
  // Only truncate very long device IDs (hashes) for display
  const formatDeviceId = (deviceId: string): string => {
    // If it's a long hash, truncate it
    if (deviceId.length > 20) {
      return deviceId.substring(0, 8) + '...';
    }
    // Otherwise, return as-is - this preserves names from producer collection
    return deviceId;
  };

  // Update filtered data based on device selection
  const updateFilteredData = useCallback((data: EnergyData[], deviceId: string | null) => {
    if (!deviceId) {
      // Show all data from today if no device is selected, sorted newest-first
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const todayData = data.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= dayStart && itemDate < dayEnd;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setFilteredData(todayData);
    } else {
      // Filter by selected device in the selected day, sort newest-first
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const deviceData = data
        .filter(item => item.device === deviceId)
        .filter(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate >= dayStart && itemDate < dayEnd;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (deviceData.length === 0) {
        // This indicates a device ID mismatch between selection and data
        // We should ideally show an error or message to the user
        console.warn('❌ NO DATA FOUND FOR SELECTED DEVICE!');
        console.warn('This indicates a device ID mismatch between selection and data');
      }
      
      setFilteredData(deviceData);
    }
  }, [selectedDate]);

  // Handle device selection
  const handleDeviceSelect = (deviceId: string | null) => {
    console.log('🔍 handleDeviceSelect called with:', deviceId);
    console.log('🔍 Device ID length:', deviceId?.length);
    console.log('🔍 Is this a hash?', deviceId && deviceId.length > 20);
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
      
      let newFilteredData: EnergyData[];
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
      
      // Always sort newest-first for consistency
      setFilteredData(newFilteredData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
      
      // Calculate date range based on dateRangeType
      let queryEndDate: string | undefined;
      let queryStartDate = selectedDate;
      
      if (dateRangeType === '3days') {
        // Calculate 3 days before the selected date
        const endDay = new Date(selectedDate);
        const startDay = new Date(endDay);
        startDay.setDate(startDay.getDate() - 2); // 3 days total (including end date)
        queryStartDate = startDay.toISOString().split('T')[0];
        queryEndDate = selectedDate;
      } else if (dateRangeType === 'week') {
        // Calculate 7 days before the selected date
        const endDay = new Date(selectedDate);
        const startDay = new Date(endDay);
        startDay.setDate(startDay.getDate() - 6); // 7 days total (including end date)
        queryStartDate = startDay.toISOString().split('T')[0];
        queryEndDate = selectedDate;
      } else if (dateRangeType === 'custom') {
        // Use custom range
        queryStartDate = selectedDate;
        queryEndDate = endDate;
      }
      // For 'single' day, queryEndDate remains undefined
      
      console.log('Fetching historical data for:', { selectedDevice, queryStartDate, queryEndDate, dateRangeType });
      console.log('Socket connected:', energyDataService.isConnected());
      console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
      
      // Check if socket is connected before proceeding
      if (!energyDataService.isConnected()) {
        throw new Error('Not connected to backend server. Please check if the backend is running.');
      }
      
      if (selectedDevice) {
        // Fetch data for specific device and date range
        console.log('📡 Calling fetchHistoricalData with device:', selectedDevice);
        console.log('📡 Device length:', selectedDevice.length);
        fetchedHistoricalData = await energyDataService.fetchHistoricalData(selectedDevice, queryStartDate, queryEndDate);
      } else {
        // Fetch data for all devices on the selected date range
        fetchedHistoricalData = await energyDataService.fetchHistoricalData('', queryStartDate, queryEndDate);
      }
      
      console.log('Received historical data:', fetchedHistoricalData?.length || 0, 'records');
      
      if (fetchedHistoricalData && fetchedHistoricalData.length > 0) {
        // Store the full historical dataset (newest-first)
        const sortedHistorical = [...fetchedHistoricalData]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistoricalData(sortedHistorical);
        
        // Provide all records for the day; component will paginate for rendering
        setFilteredData(sortedHistorical);
        
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

  // Load all devices on initialization
  useEffect(() => {
    const loadAllDevices = async () => {
      try {
        const allDevices = await energyDataService.fetchAllDevices();
        // Convert Device[] to LegacyDevice[] for backward compatibility
        const legacyDevices: LegacyDevice[] = allDevices.map(device => ({
          id: device.id, // This is the database device ID (hash) - used for queries
          name: device.name // This is the actual display name from producer collection
        }));
        setAllDeviceList(legacyDevices);
        console.log(`✅ Loaded ${legacyDevices.length} devices from backend:`);
        console.log('✅ Sample devices:', legacyDevices.slice(0, 3));
        console.log('✅ D14 device:', legacyDevices.find(d => d.name.includes('D14')));
      } catch (error) {
        console.error('Failed to load all devices:', error);
        // Set fallback devices if loading fails - use actual IDs without formatting
        const fallbackDevices: LegacyDevice[] = [];
        for (let i = 1; i <= 31; i++) {
          fallbackDevices.push({
            id: `D${i}`,
            name: `D${i}` // Use actual ID as name in fallback
          });
        }
        fallbackDevices.push({ id: 'F9', name: 'F9' });
        fallbackDevices.push({ id: 'Entrada de energia', name: 'Entrada de energia' });
        setAllDeviceList(fallbackDevices);
      }
    };
    
    loadAllDevices();
  }, []);

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
  }, [selectedDevice, isHistoricalView, selectedDate, extractUniqueDevices, updateFilteredData]);

  return {
    allData,
    filteredData,
    deviceList,
    allDeviceList,
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
    dateRangeType,
    setDateRangeType,
    endDate,
    setEndDate,
  };
}