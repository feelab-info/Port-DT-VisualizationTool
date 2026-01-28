'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useConverterData } from '@/hooks/useConverterData';
import PowerFlowDiagram from '@/components/converters/PowerFlowDiagram';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function ConverterDiagramPage() {
  const {
    latestData,
    isConnected,
    isLoading,
    isDataStale
  } = useConverterData();

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 mt-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link 
              href="/converters"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Power Flow Diagram
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Real-time visualization of converter power distribution
              </p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            {isDataStale && (
              <div className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                <RefreshCw className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                  Historical data
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading power flow data...</span>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && latestData.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              No converter data available.
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
              {isConnected ? 'Waiting for data updates...' : 'Please check your connection.'}
            </p>
          </div>
        )}

        {/* Power Flow Diagram */}
        {!isLoading && latestData.length > 0 && (
          <>
            <PowerFlowDiagram convertersData={latestData} />

            {/* Data Staleness Warning */}
            {isDataStale && (() => {
              const hasVeryOldData = latestData.some(
                d => (Date.now() - new Date(d.timestamp).getTime()) > 86400000
              );
              
              if (hasVeryOldData) {
                return (
                  <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Note:</strong> The power flow diagram is showing data that is more than 1 day old. 
                          Power values may not reflect current system state.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>Note:</strong> Displaying historical data. The diagram will update automatically when new data arrives.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Converter Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {latestData.map((converter) => {
                const totalPower = ((converter.L1?.P || 0) + (converter.L2?.P || 0) + (converter.L3?.P || 0)) / 1000;
                const batterySOC = converter.node === 'N01' ? ((converter.battery?.V || 0) * 100 / 51).toFixed(0) : null;
                
                return (
                  <div key={converter.node} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {converter.converterName || converter.node}
                    </div>
                    <div className={`text-2xl font-bold ${totalPower > 0 ? 'text-red-500' : totalPower < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                      {totalPower.toFixed(2)} kW
                    </div>
                    {batterySOC && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        SOC: {batterySOC}%
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {new Date(converter.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
