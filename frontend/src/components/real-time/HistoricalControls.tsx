import React from 'react';
import { EnergyData } from '@/services/EnergyDataService';

interface HistoricalControlsProps {
  isHistoricalView: boolean;
  hasBackgroundUpdates: boolean;
  backgroundData: EnergyData[];
  isConnected: boolean;
  switchToLiveData: () => void;
}

export default function HistoricalControls({
  isHistoricalView,
  hasBackgroundUpdates,
  backgroundData,
  isConnected,
  switchToLiveData
}: HistoricalControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {isHistoricalView && hasBackgroundUpdates && (
        <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md">
          <span>{backgroundData.length} new updates available</span>
          <button 
            onClick={switchToLiveData}
            className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-0.5 rounded text-sm"
          >
            Switch to Live
          </button>
        </div>
      )}
      {isHistoricalView && !hasBackgroundUpdates && (
        <button
          onClick={switchToLiveData}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          Switch to Live Data
        </button>
      )}
      <div className={`px-3 py-1 rounded-full text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}