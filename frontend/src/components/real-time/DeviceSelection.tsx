import React from 'react';
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
  // Format device ID to make it more readable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  return (
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
  );
}