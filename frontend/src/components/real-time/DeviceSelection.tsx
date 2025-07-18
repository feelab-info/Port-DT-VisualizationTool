import React, { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EnergyData } from '@/services/EnergyDataService';

interface DeviceSelectionProps {
  deviceList: {id: string, name: string}[];
  selectedDevice: string | null;
  selectedDate: string;
  isSearching: boolean;
  handleDeviceSelect: (deviceId: string | null) => void;
  handleDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fetchHistoricalData: () => Promise<void>;
}

export default function DeviceSelection({
  deviceList,
  selectedDevice,
  selectedDate,
  isSearching,
  handleDeviceSelect,
  handleDateChange,
  fetchHistoricalData
}: DeviceSelectionProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Use only real devices from the data - no fallback devices
  const availableDevices: {id: string, name: string}[] = deviceList;
  const hasData = deviceList.length > 0;

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Simplified Header Section */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Data Filters</h2>
      </div>

      <div className="p-6">
        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Device Dropdown */}
          <div className="flex-1">
            <label htmlFor="device-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Device
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-2 text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100"
                disabled={!hasData}
              >
                <span className={!selectedDevice ? 'text-gray-500 dark:text-gray-400' : ''}>
                  {getSelectedDeviceName()}
                </span>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && hasData && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* Clear Selection Option */}
                  <button
                    onClick={() => {
                      handleDeviceSelect(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                      selectedDevice === null ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    All Devices
                  </button>
                  
                  {/* Device List */}
                  {availableDevices.map((device: {id: string, name: string}) => (
                    <button
                      key={device.id}
                      onClick={() => {
                        handleDeviceSelect(device.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                        selectedDevice === device.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                      title={`Device ID: ${device.id}`} // Show full ID on hover
                    >
                      {getDeviceDisplayName(device)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {!hasData && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                No devices available. Please ensure the backend connection is working.
              </p>
            )}
          </div>

          {/* Date Input */}
          <div className="flex-1">
            <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              id="date-select"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={fetchHistoricalData}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search Historical</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}