'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEnergyData } from '@/hooks/useEnergyData';
import DeviceSelection from '@/components/real-time/DeviceSelection';
import DataDisplay from '@/components/real-time/DataDisplay';
import HistoricalControls from '@/components/real-time/HistoricalControls';
import { useDeviceDataHealth } from '@/hooks/useDeviceDataHealth';

export default function RealTimeDataPage() {
  const {
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
    handleDeviceSelect,
    handleDateChange,
    fetchHistoricalData,
    switchToLiveData,
  } = useEnergyData();

  // Use device data health to determine connection status
  const { isHealthy: isDeviceDataHealthy } = useDeviceDataHealth();
  
  // Combine both connection statuses - if either is disconnected, show disconnected
  const overallConnectionStatus = isConnected && isDeviceDataHealthy;

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-8 mt-3">
        {/* Simplified Header Section */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isHistoricalView ? 'Historical' : 'Real-Time'} Port Energy Data
          </h1>
          
          <HistoricalControls 
            isHistoricalView={isHistoricalView}
            hasBackgroundUpdates={hasBackgroundUpdates}
            backgroundData={backgroundData}
            isConnected={overallConnectionStatus}
            switchToLiveData={switchToLiveData}
          />
        </div>
        
        <DeviceSelection
          deviceList={deviceList}
          allDeviceList={allDeviceList}
          selectedDevice={selectedDevice}
          selectedDate={selectedDate}
          isSearching={isSearching}
          handleDeviceSelect={handleDeviceSelect}
          handleDateChange={handleDateChange}
          fetchHistoricalData={fetchHistoricalData}
        />
        
        <DataDisplay
          filteredData={filteredData}
          deviceList={deviceList}
          selectedDevice={selectedDevice}
          selectedDate={selectedDate}
          isHistoricalView={isHistoricalView}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  );
}