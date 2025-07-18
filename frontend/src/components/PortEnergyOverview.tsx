"use client";

import React, { useMemo } from 'react';
import { useEnergyData } from '@/hooks/useEnergyData';
import { Activity, Zap, Database, Wifi, WifiOff } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export default function PortEnergyOverview() {
  const { 
    deviceList, 
    isConnected, 
    isLoading,
    allData 
  } = useEnergyData();

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!allData.length) {
      return {
        totalDevices: 0,
        currentTotalPower: 0,
        averagePowerFactor: 0,
        totalConsumption: 0,
        activeDevices: 0
      };
    }

    // Get the latest data point for each device
    const deviceLatestData = new Map();
    allData.forEach(item => {
      const existing = deviceLatestData.get(item.device);
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        deviceLatestData.set(item.device, item);
      }
    });

    const latestDataPoints = Array.from(deviceLatestData.values());
    
    const totalPower = latestDataPoints.reduce((sum, item) => {
      return sum + (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
    }, 0);

    const totalConsumption = latestDataPoints.reduce((sum, item) => {
      return sum + (item.measure_cons || 0);
    }, 0);

    const powerFactors = latestDataPoints.flatMap(item => [
      item.L1?.PF || 0,
      item.L2?.PF || 0,
      item.L3?.PF || 0
    ]).filter(pf => pf > 0);

    const averagePowerFactor = powerFactors.length > 0 
      ? powerFactors.reduce((sum, pf) => sum + pf, 0) / powerFactors.length 
      : 0;

    const activeDevices = latestDataPoints.filter(item => 
      (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0) > 0
    ).length;

    return {
      totalDevices: deviceList.length,
      currentTotalPower: Math.round(totalPower),
      averagePowerFactor: Math.round(averagePowerFactor * 100) / 100,
      totalConsumption: Math.round(totalConsumption),
      activeDevices
    };
  }, [allData, deviceList]);

  // Prepare chart data for recent power trends (last 20 data points)
  const trendChartData = useMemo(() => {
    // Sort data by timestamp and take last 20 points
    const sortedData = [...allData]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-20);

    // Group by timestamp and sum power
    const powerByTime = new Map();
    
    sortedData.forEach(item => {
      const timestamp = item.timestamp;
      const totalPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
      
      if (powerByTime.has(timestamp)) {
        powerByTime.set(timestamp, powerByTime.get(timestamp) + totalPower);
      } else {
        powerByTime.set(timestamp, totalPower);
      }
    });

    const timeLabels = Array.from(powerByTime.keys()).map(ts => new Date(ts));
    const powerValues = Array.from(powerByTime.values());

    return {
      labels: timeLabels,
      datasets: [
        {
          label: 'Total Power (W)',
          data: powerValues,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'rgb(59, 130, 246)',
          pointRadius: 3,
        },
      ],
    };
  }, [allData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          }
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Port Energy Overview</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-500 dark:text-gray-400">Loading energy data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Port Energy Overview</h2>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <Wifi className="h-4 w-4 mr-1" />
              <span className="text-sm">Live</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <WifiOff className="h-4 w-4 mr-1" />
              <span className="text-sm">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.totalDevices}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Devices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.activeDevices}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Power</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.currentTotalPower.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Watts</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Power Factor</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.averagePowerFactor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Power Trend Chart */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Real-time Power Trend</h3>
        <div className="h-48">
          {allData.length > 0 ? (
            <Line data={trendChartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              {isConnected ? "Waiting for data..." : "Connect to view real-time data"}
            </div>
          )}
        </div>
      </div>

      {/* Quick Status */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          Last updated: {allData.length > 0 ? new Date(allData[allData.length - 1]?.timestamp).toLocaleTimeString() : 'N/A'}
        </p>
      </div>
    </div>
  );
} 