'use client';

import React from 'react';
import { ConverterData } from '@/services/ConverterDataService';
import { useTranslation } from '@/hooks/useTranslation';

interface ConverterCardProps {
  data: ConverterData;
}

export default function ConverterCard({ data }: ConverterCardProps) {
  const t = useTranslation();
  // Calculate totals
  const totalActivePower = ((data.L1?.P || 0) + (data.L2?.P || 0) + (data.L3?.P || 0)) / 1000; // kW
  const batteryPower = (data.battery?.P || 0) / 1000; // kW
  const gridPower = (data.grid?.P || 0) / 1000; // kW
  
  // Format timestamp and calculate age
  const timestamp = new Date(data.timestamp).toLocaleString();
  const dataAge = Date.now() - new Date(data.timestamp).getTime();
  const dataAgeMinutes = Math.floor(dataAge / 60000);
  const dataAgeHours = Math.floor(dataAge / 3600000);
  const dataAgeDays = Math.floor(dataAge / 86400000);
  
  const isDataOld = dataAge > 60000; // More than 1 minute old
  const isDataVeryOld = dataAge > 86400000; // More than 1 day old
  
  // Format age display
  const getAgeDisplay = () => {
    if (dataAgeDays > 0) {
      return `${dataAgeDays}d ${dataAgeHours % 24}h ago`;
    } else if (dataAgeHours > 0) {
      return `${dataAgeHours}h ${dataAgeMinutes % 60}m ago`;
    } else {
      return `${dataAgeMinutes}m ago`;
    }
  };
  
  // System state text
  const getSystemStateText = (state: number) => {
    const states: Record<number, string> = {
      0: t.off,
      1: t.on,
      2: t.fault,
      3: t.standby
    };
    return states[state] || t.unknown;
  };

  const systemState = getSystemStateText(data.status?.SystemState || 0);
  const isHealthy = data.status?.itfc_critical_fault_word === 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {data.converterName || data.node}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{data.node}</p>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isHealthy 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isHealthy ? `✓ ${t.healthy}` : `⚠ ${t.fault}`}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemState === 'On' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {systemState}
            </span>
          </div>
        </div>
      </div>

      {/* Power Summary */}
      <div className="mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t.activePower}</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {totalActivePower.toFixed(2)} <span className="text-sm">{t.kW}</span>
          </p>
        </div>
      </div>

      {/* Phase Details */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.phaseDetails}</h4>
        {['L1', 'L2', 'L3'].map((phase) => {
          const phaseData = data[phase as keyof Pick<ConverterData, 'L1' | 'L2' | 'L3'>];
          return (
            <div key={phase} className="grid grid-cols-4 gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <div className="font-medium text-gray-700 dark:text-gray-300">{phase}</div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">V:</span> {phaseData?.V?.toFixed(2) || 0}V
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">I:</span> {phaseData?.I?.toFixed(2) || 0}A
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">P:</span> {((phaseData?.P || 0) / 1000).toFixed(2)}kW
              </div>
            </div>
          );
        })}
      </div>

      {/* Battery & Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t.battery}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.battery?.V?.toFixed(2) || 0}V • {data.battery?.I?.toFixed(2) || 0}A
          </p>
          <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
            {batteryPower.toFixed(2)} {t.kW}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t.grid}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.grid?.V?.toFixed(2) || 0}V • {data.grid?.I?.toFixed(2) || 0}A
          </p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">
            {gridPower.toFixed(2)} {t.kW}
          </p>
        </div>
      </div>

      {/* Available Power */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded p-3 mb-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t.availablePower}</p>
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t.active}:</span>
          <span className="ml-2 font-bold text-indigo-700 dark:text-indigo-400">
            {((data.available_power?.itfc_pos_active_available_power || 0) / 1000).toFixed(2)} {t.kW}
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className={`text-xs pt-2 border-t border-gray-200 dark:border-gray-600 ${
        isDataVeryOld 
          ? 'bg-red-50 dark:bg-red-900/20 -mx-6 -mb-6 px-6 pb-6 mt-3'
          : isDataOld 
            ? 'bg-yellow-50 dark:bg-yellow-900/20 -mx-6 -mb-6 px-6 pb-6 mt-3' 
            : 'text-center'
      }`}>
        {isDataVeryOld ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-red-700 dark:text-red-400 font-bold">
                ⚠️ {t.dataMoreThan1DayOld}
              </span>
              <span className="text-red-600 dark:text-red-500 font-bold">
                {getAgeDisplay()}
              </span>
            </div>
            <div className="text-red-600 dark:text-red-400 text-xs">
              {t.lastUpdated}: {timestamp}
            </div>
          </div>
        ) : (
          <div className={`flex items-center ${isDataOld ? 'justify-between' : 'justify-center'}`}>
            <span className={isDataOld ? 'text-yellow-700 dark:text-yellow-400 font-medium' : 'text-gray-500 dark:text-gray-400'}>
              {t.lastUpdated}: {timestamp}
            </span>
            {isDataOld && (
              <span className="text-yellow-600 dark:text-yellow-500 text-xs">
                {getAgeDisplay()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
