'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useConverterData } from '@/hooks/useConverterData';
import ConverterCard from '@/components/converters/ConverterCard';
import ConverterStats from '@/components/converters/ConverterStats';
import { useTranslation } from '@/hooks/useTranslation';

export default function ConvertersPage() {
  const t = useTranslation();
  const {
    latestData,
    selectedNode,
    setSelectedNode,
    isConnected,
    isLoading,
    isDataStale
  } = useConverterData();

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 mt-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t.converterMonitoringSystem}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t.realTimeMonitoring}
            </p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? t.connected : t.disconnected}
              </span>
            </div>
            {isDataStale && (
              <div className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                  {t.showingLastAvailableData}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data Staleness Warning */}
        {isDataStale && !isLoading && latestData.length > 0 && (() => {
          // Check if any data is more than a day old
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
                      <strong>{t.criticalDataOld}</strong> {t.criticalDataOldMessage}
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
                    <strong>{t.noRecentUpdates}</strong> {t.noRecentUpdatesMessage}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Node Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <label htmlFor="node-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t.filterByConverter}
          </label>
          <select
            id="node-select"
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="block w-full md:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t.allConverters}</option>
            <option value="N01">N01 - {t.converterBattery}</option>
            <option value="N02">N02 - {t.converterPV}</option>
            <option value="N03">N03 - {t.converterEV1}</option>
            <option value="N04">N04 - {t.converterEV2}</option>
            <option value="N05">N05 - {t.converterACDC}</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">{t.loadingConverterData}</span>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && latestData.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              {t.noConverterData}
            </p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
              {isConnected ? t.waitingForData : t.checkConnection}
            </p>
          </div>
        )}


        {/* 
          SYSTEM OVERVIEW
          Aggregate statistics calculated from all converter data
          Component: ConverterStats
          See detailed explanation in ConverterStats.tsx
        */}
        {!isLoading && latestData.length > 0 && (
          <ConverterStats data={latestData} />
        )}

        {/* 
          DETAILED CONVERTER CARDS
          Shows comprehensive information for each converter
          
          Grid Layout: 2 cards per row (max) for better readability
          - Mobile: 1 column
          - Large screens: 2 columns
          
          Each card shows:
          - Converter name and node ID
          - Health and system state
          - Total active and reactive power
          - Three-phase breakdown (L1, L2, L3)
          - Battery/Grid specific data
          - Available power capacity
          - Last update timestamp
        */}
        {!isLoading && latestData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {latestData
              .filter(data => selectedNode === 'all' || data.node === selectedNode)
              .sort((a, b) => a.node.localeCompare(b.node))
              .map((data) => (
                <ConverterCard key={data.node} data={data} />
              ))}
          </div>
        )}

        {/* Empty Filter Result */}
        {!isLoading && latestData.length > 0 && selectedNode !== 'all' && 
         latestData.filter(data => data.node === selectedNode).length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {t.noDataForConverter} <strong>{selectedNode}</strong>
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
