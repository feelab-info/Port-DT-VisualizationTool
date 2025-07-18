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
    <div className="flex items-center gap-4">
      {/* Background Updates Notification */}
      {isHistoricalView && hasBackgroundUpdates && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 text-yellow-800 dark:text-yellow-300 px-4 py-2 rounded-lg border border-yellow-200 dark:border-yellow-700 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{backgroundData.length} new updates available</span>
          </div>
          <button 
            onClick={switchToLiveData}
            className="inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-200 to-amber-200 hover:from-yellow-300 hover:to-amber-300 dark:from-yellow-700 dark:to-amber-700 dark:hover:from-yellow-600 dark:hover:to-amber-600 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Switch to Live</span>
          </button>
        </div>
      )}
      
      {/* Switch to Live Button (when no updates) */}
      {isHistoricalView && !hasBackgroundUpdates && (
        <button
          onClick={switchToLiveData}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-700 transition-all duration-200 hover:shadow-md font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Switch to Live Data</span>
        </button>
      )}
      
      {/* Enhanced Connection Status */}
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all duration-200 ${
        isConnected 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' 
          : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected 
            ? 'bg-green-500 animate-pulse' 
            : 'bg-red-500'
        }`}></div>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        {isConnected && (
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {!isConnected && (
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
    </div>
  );
}