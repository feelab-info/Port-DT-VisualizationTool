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
    
    // For hash-like device IDs, create a shortened display name
    if (deviceId.length > 10) {
      const shortHash = deviceId.substring(0, 8);
      return `Device ${shortHash}`;
    }
    
    // For other device IDs, use the first 8 characters
    return deviceId.substring(0, 8) + '...';
  };

  // Calculate total power for all filtered data - Fixed calculation
  const totalPower = filteredData.reduce((sum, item) => {
    // Use total power consumption (L1 + L2 + L3) instead of measure_cons
    const totalItemPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
    return sum + totalItemPower;
  }, 0);
  const avgPower = filteredData.length > 0 ? totalPower / filteredData.length : 0;

  // Generate table rows for all filtered data
  const tableRows = filteredData.map((item, index) => (
    <tr key={item._id} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {new Date(item.timestamp).toLocaleDateString('pt-PT')}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(item.timestamp).toLocaleTimeString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.deviceName || formatDeviceId(item.device)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {safeRound(item.measure_cons)} W
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
          {safeRound(item.L1?.P)} W
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          {safeRound(item.L2?.P)} W
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
          {safeRound(item.L3?.P)} W
        </span>
      </td>
    </tr>
  ));

  const dataTable = (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
        <thead className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Timestamp</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span>Device</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Total Consumption</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>L1 Power</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>L2 Power</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>L3 Power</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
          {tableRows}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Simplified Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {selectedDevice 
            ? `Data for ${deviceList.find(d => d.id === selectedDevice)?.name || selectedDevice}`
            : `All Devices Data (${new Date(selectedDate).toLocaleDateString('pt-PT')})`}
        </h2>
        
        {isHistoricalView && (
          <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-700">
            Viewing historical data ({filteredData.length} records)
          </div>
        )}
      </div>

      {/* Stats Section */}
      {!isLoading && filteredData.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{filteredData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Power</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(totalPower)} W</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Power</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{Math.round(avgPower)} W</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Devices</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {selectedDevice ? 1 : new Set(filteredData.map(d => d.device)).size}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading data...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No data available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No data available for {selectedDevice ? 'this device' : 'today'}. Try selecting a different date or device.
          </p>
        </div>
      ) : (
        <div>
          {/* Tab Navigation */}
          <div className="mb-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex space-x-8">
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'table' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('table')}
              >
                Table View
              </button>
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'charts' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('charts')}
              >
                Charts
              </button>
            </div>
          </div>
          
          {activeTab === 'table' ? (
            dataTable
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