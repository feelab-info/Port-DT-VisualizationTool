import React, { useEffect, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EnergyData } from '@/services/EnergyDataService';

interface DeviceSelectionProps {
  deviceList: {id: string, name: string}[];
  allDeviceList: {id: string, name: string}[];
  selectedDevice: string | null;
  selectedDate: string;
  isSearching: boolean;
  handleDeviceSelect: (deviceId: string | null) => void;
  handleDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fetchHistoricalData: () => Promise<void>;
  dateRangeType?: 'single' | '3days' | 'week' | 'custom';
  onDateRangeTypeChange?: (type: 'single' | '3days' | 'week' | 'custom') => void;
  endDate?: string;
  onEndDateChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DeviceSelection({
  deviceList,
  allDeviceList,
  selectedDevice,
  selectedDate,
  isSearching,
  handleDeviceSelect,
  handleDateChange,
  fetchHistoricalData,
  dateRangeType = 'single',
  onDateRangeTypeChange,
  endDate,
  onEndDateChange
}: DeviceSelectionProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Use all devices from the system, not just those with active data
  const availableDevices: {id: string, name: string, hasData?: boolean}[] = allDeviceList.map(device => ({
    ...device,
    hasData: deviceList.some(activeDevice => activeDevice.id === device.id)
  }));
  const hasDevicesAvailable = availableDevices.length > 0;
  
  // Debug logging
  console.log('🔧 DeviceSelection received allDeviceList length:', allDeviceList.length);
  if (allDeviceList.length > 0) {
    console.log('🔧 First device in allDeviceList:', allDeviceList[0]);
    const d14 = allDeviceList.find(d => d.name && d.name.includes('D14'));
    console.log('🔧 D14 device from allDeviceList:', d14);
  }

  // Create device display names based on hash patterns
  const getDeviceDisplayName = (device: {id: string, name: string}) => {
    // If device has a custom name, use it
    if (device.name && device.name !== device.id && !device.name.includes('...')) {
      return device.name;
    }
    
    // For hash-like device IDs, create a shortened display name
    if (device.id.length > 10) {
      // Try to create a meaningful name from the hash
      const shortHash = device.id.substring(0, 8);
      return `Device ${shortHash}`;
    }
    
    // For shorter IDs, use them as-is
    return device.id;
  };

  // Get selected device display name
  const getSelectedDeviceName = () => {
    if (!selectedDevice) return 'Select a device';
    
    const device = availableDevices.find(d => d.id === selectedDevice);
    if (!device) return 'Select a device';
    
    return getDeviceDisplayName(device);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Filters Row - Device, Date, and Search at the top */}
        <div className="mb-6">
          <div className={`grid gap-4 items-end ${
            dateRangeType === 'custom' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]'
          }`}>
            {/* Device Dropdown */}
            <div className="flex-1">
              <label htmlFor="device-select" className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 mr-2 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Select Device
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-2.5 text-left bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-[#3b82f6] dark:hover:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] dark:text-gray-100 transition-all duration-200 shadow-sm"
                  disabled={!hasDevicesAvailable}
                >
                  <span className={!selectedDevice ? 'text-gray-500 dark:text-gray-400' : 'font-medium'}>
                    {getSelectedDeviceName()}
                  </span>
                  <svg className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

              {isDropdownOpen && hasDevicesAvailable && (
                <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-gray-700 border-2 border-[#3b82f6]/30 dark:border-[#3b82f6] rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                  {/* Clear Selection Option */}
                  <button
                    onClick={() => {
                      handleDeviceSelect(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-[#3b82f6]/10 dark:hover:bg-[#3b82f6]/20 transition-colors border-b border-gray-200 dark:border-gray-600 ${
                      selectedDevice === null ? 'bg-[#3b82f6]/20 dark:bg-[#3b82f6]/30 text-[#3b82f6] dark:text-[#3b82f6] font-semibold' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      All Devices
                    </div>
                  </button>
                  
                  {/* Device List */}
                  {availableDevices.map((device: {id: string, name: string, hasData?: boolean}) => (
                    <button
                      key={device.id}
                      onClick={() => {
                        handleDeviceSelect(device.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-[#3b82f6]/10 dark:hover:bg-[#3b82f6]/20 transition-colors flex items-center justify-between ${
                        selectedDevice === device.id ? 'bg-[#3b82f6]/20 dark:bg-[#3b82f6]/30 text-[#3b82f6] dark:text-[#3b82f6] font-semibold' : 'text-gray-900 dark:text-gray-100'
                      }`}
                      title={`Device ID: ${device.id}${device.hasData ? ' (has active data)' : ' (no current data)'}`}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        <span>{getDeviceDisplayName(device)}</span>
                      </div>
                      {device.hasData && (
                        <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {!hasDevicesAvailable && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                Loading devices... Please wait.
              </p>
            )}
          </div>

            {/* Date Input */}
            <div className="flex-1">
              <label htmlFor="date-select" className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 mr-2 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {dateRangeType === 'custom' ? 'Start Date' : dateRangeType === 'single' ? 'Select Date' : 'End Date'}
              </label>
              <input
                type="date"
                id="date-select"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] dark:bg-gray-700/50 dark:text-gray-100 transition-all duration-200 shadow-sm hover:border-[#3b82f6]"
              />
            </div>

            {/* End Date for Custom Range */}
            {dateRangeType === 'custom' && (
              <div className="flex-1">
                <label htmlFor="end-date-select" className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <svg className="w-4 h-4 mr-2 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  End Date
                </label>
                <input
                  type="date"
                  id="end-date-select"
                  value={endDate || selectedDate}
                  onChange={onEndDateChange}
                  min={selectedDate}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] dark:bg-gray-700/50 dark:text-gray-100 transition-all duration-200 shadow-sm hover:border-[#3b82f6]"
                />
              </div>
            )}

            {/* Search Button */}
            <div>
              <label className="block text-sm font-semibold text-transparent mb-2">Search</label>
              <button
                onClick={fetchHistoricalData}
                disabled={isSearching}
                className="px-6 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Searching...</span>
                  </>
                ) : (
                  <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm">Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Query Type Selection - Below the filters */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <svg className="w-4 h-4 mr-2 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Query Time Range
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => onDateRangeTypeChange?.('single')}
              className={`group relative px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
                dateRangeType === 'single'
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#3b82f6] hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center">
                <svg className={`w-5 h-5 mb-1 ${dateRangeType === 'single' ? 'text-white' : 'text-[#3b82f6]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Single Day</span>
              </div>
            </button>
            <button
              onClick={() => onDateRangeTypeChange?.('3days')}
              className={`group relative px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
                dateRangeType === '3days'
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#3b82f6] hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center">
                <svg className={`w-5 h-5 mb-1 ${dateRangeType === '3days' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm">Last 3 Days</span>
              </div>
            </button>
            <button
              onClick={() => onDateRangeTypeChange?.('week')}
              className={`group relative px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
                dateRangeType === 'week'
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#3b82f6] hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center">
                <svg className={`w-5 h-5 mb-1 ${dateRangeType === 'week' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Last 7 Days</span>
              </div>
            </button>
            <button
              onClick={() => onDateRangeTypeChange?.('custom')}
              className={`group relative px-4 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
                dateRangeType === 'custom'
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#3b82f6] hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center">
                <svg className={`w-5 h-5 mb-1 ${dateRangeType === 'custom' ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-sm">Custom Range</span>
              </div>
            </button>
          </div>
        </div>

        {/* Progress Bar when searching */}
        <SearchProgressBar active={isSearching} />
      </div>
    </div>
  );
}

function SearchProgressBar({ active }: { active: boolean }) {
  const [progress, setProgress] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (active) {
      setVisible(true);
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          // Ease towards 90% while active
          if (prev >= 90) return prev;
          const increment = Math.max(0.5, 3 * Math.random());
          return Math.min(90, prev + increment);
        });
      }, 150);
    } else if (!active && visible) {
      // Complete and then hide
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 500);
      return () => clearTimeout(timeout);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div className="mt-4">
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-2 bg-blue-600 dark:bg-blue-500 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Fetching historical data...
      </div>
    </div>
  );
}