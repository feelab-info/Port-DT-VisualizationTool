'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEnergyData } from '@/hooks/useEnergyData';
import DeviceSelection from '@/components/real-time/DeviceSelection';
import DataDisplay from '@/components/real-time/DataDisplay';
import HistoricalControls from '@/components/real-time/HistoricalControls';

export default function RealTimeDataPage() {
  const {
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
    handleDeviceSelect,
    handleDateChange,
    fetchHistoricalData,
    switchToLiveData,
  } = useEnergyData();

  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {isHistoricalView ? 'Historical' : 'Real-Time'} Port Energy Data
          </h1>
          
          <HistoricalControls 
            isHistoricalView={isHistoricalView}
            hasBackgroundUpdates={hasBackgroundUpdates}
            backgroundData={backgroundData}
            isConnected={isConnected}
            switchToLiveData={switchToLiveData}
          />
        </div>
        
        <DeviceSelection
          deviceList={deviceList}
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