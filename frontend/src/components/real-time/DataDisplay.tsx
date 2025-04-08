import React, { useState } from 'react';
import { EnergyData } from '@/services/EnergyDataService';
import EnergyCharts from './EnergyCharts';

interface DataDisplayProps {
  filteredData: EnergyData[];
  deviceList: {id: string, name: string}[];
  selectedDevice: string | null;
  selectedDate: string;
  isHistoricalView: boolean;
  isLoading: boolean;
}

export default function DataDisplay({
  filteredData,
  deviceList,
  selectedDevice,
  selectedDate,
  isHistoricalView,
  isLoading
}: DataDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("table");

  // Helper function for safe rounding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeRound = (value: any): string => {
    if (value === undefined || value === null) {
      return 'N/A';
    }
    return Math.round(value).toString();
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

  const renderTable = () => (
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
  );

  return (
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
        <div>
          <div className="mb-4 border-b border-gray-200">
            <div className="flex space-x-4">
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'table' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('table')}
              >
                Table View
              </button>
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'charts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('charts')}
              >
                Charts
              </button>
            </div>
          </div>
          
          {activeTab === 'table' ? (
            renderTable()
          ) : (
            <EnergyCharts 
              filteredData={filteredData}
              selectedDevice={selectedDevice}
              isHistoricalView={isHistoricalView}
            />
          )}
        </div>
      )}
    </div>
  );
}