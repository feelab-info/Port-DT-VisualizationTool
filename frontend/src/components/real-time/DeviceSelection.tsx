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

// Fallback list of known devices when no data is available
const FALLBACK_DEVICES = [
  { id: 'D1', name: 'Device D1' },
  { id: 'D2', name: 'Device D2' },
  { id: 'D3', name: 'Device D3' },
  { id: 'D4', name: 'Device D4' },
  { id: 'D5', name: 'Device D5' },
  { id: 'D6', name: 'Device D6' },
  { id: 'D7', name: 'Device D7' },
  { id: 'D8', name: 'Device D8' },
  { id: 'D9', name: 'Device D9' },
  { id: 'D10', name: 'Device D10' },
  { id: 'D11', name: 'Device D11' },
  { id: 'D12', name: 'Device D12' },
  { id: 'D13', name: 'Device D13' },
  { id: 'D14', name: 'Device D14' },
  { id: 'D15', name: 'Device D15' },
  { id: 'D16', name: 'Device D16' },
  { id: 'D17', name: 'Device D17' },
  { id: 'D18', name: 'Device D18' },
  { id: 'D19', name: 'Device D19' },
  { id: 'D20', name: 'Device D20' },
  { id: 'D21', name: 'Device D21' },
  { id: 'D22', name: 'Device D22' },
  { id: 'D23', name: 'Device D23' },
  { id: 'D24', name: 'Device D24' },
  { id: 'D25', name: 'Device D25' },
  { id: 'D26', name: 'Device D26' },
  { id: 'D27', name: 'Device D27' },
  { id: 'D28', name: 'Device D28' },
  { id: 'D29', name: 'Device D29' },
  { id: 'D30', name: 'Device D30' },
  { id: 'D31', name: 'Device D31' },
  { id: 'F9', name: 'Device F9' },
  { id: 'Entrada de energia', name: 'Entrada de energia' }
];

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
  
  // Use fallback devices if no devices are available from data
  const availableDevices = deviceList.length > 0 ? deviceList : FALLBACK_DEVICES;
  const hasData = deviceList.length > 0;

  // Group devices by type
  const groupedDevices = availableDevices.reduce((groups, device) => {
    if (device.id.startsWith('D')) {
      groups.dSeries.push(device);
    } else if (device.id === 'F9') {
      groups.special.push(device);
    } else if (device.id === 'Entrada de energia') {
      groups.special.push(device);
    }
    return groups;
  }, { dSeries: [] as {id: string, name: string}[], special: [] as {id: string, name: string}[] });

  // Sort D-series devices numerically
  groupedDevices.dSeries.sort((a, b) => {
    const numA = parseInt(a.id.substring(1));
    const numB = parseInt(b.id.substring(1));
    return numA - numB;
  });

  // Get selected device display name
  const getSelectedDeviceName = () => {
    if (!selectedDevice) return 'Select a device';
    
    const device = availableDevices.find(d => d.id === selectedDevice);
    if (!device) return 'Select a device';
    
    if (device.id.startsWith('D') && !isNaN(Number(device.id.substring(1)))) {
      return `D${device.id.substring(1)}`;
    } else if (device.id === 'F9') {
      return 'F9';
    } else if (device.id === 'Entrada de energia') {
      return 'Entrada';
    }
    return device.name;
  };

  // Format device option label
  const formatDeviceLabel = (device: {id: string, name: string}) => {
    if (device.id.startsWith('D') && !isNaN(Number(device.id.substring(1)))) {
      return `D${device.id.substring(1)}`;
    } else if (device.id === 'F9') {
      return 'F9';
    } else if (device.id === 'Entrada de energia') {
      return 'Entrada';
    }
    return device.name;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Data Filters</h2>
        
        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Device Dropdown */}
          <div className="flex-1">
            <label htmlFor="device-select" className="block text-sm font-medium text-gray-700 mb-1">
              Device
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
              >
                <span className={selectedDevice ? 'text-gray-900' : 'text-gray-500'}>
                  {getSelectedDeviceName()}
                </span>
                <svg 
                  className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {/* Special Devices */}
                  {groupedDevices.special.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                        Special Devices
                      </div>
                      {groupedDevices.special.map((device) => (
                        <button
                          key={device.id}
                          onClick={() => {
                            handleDeviceSelect(device.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                            selectedDevice === device.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                        >
                          {formatDeviceLabel(device)}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* D-Series Devices */}
                  {groupedDevices.dSeries.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                        D-Series Devices ({groupedDevices.dSeries.length})
                      </div>
                      {groupedDevices.dSeries.map((device) => (
                        <button
                          key={device.id}
                          onClick={() => {
                            handleDeviceSelect(device.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                            selectedDevice === device.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                        >
                          {formatDeviceLabel(device)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Date Filter */}
          <div className="flex-1">
            <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date-select"
              value={selectedDate}
              onChange={handleDateChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 items-end">
            <button
              onClick={fetchHistoricalData}
              disabled={isSearching}
              className={`px-4 py-2 rounded-md text-white ${
                isSearching ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              } transition-colors`}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            
            {selectedDevice && (
              <button
                onClick={() => handleDeviceSelect(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Status Message - Moved below filters */}
      {!hasData && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>No live data available.</strong> You can still search for historical data by selecting a device and date above.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}