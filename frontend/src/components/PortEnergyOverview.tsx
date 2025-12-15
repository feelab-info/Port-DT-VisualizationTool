"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useEnergyData } from '@/hooks/useEnergyData';
import { Activity, Zap, Database, Wifi, WifiOff, TrendingUp, TrendingDown, PieChart, DollarSign } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

export default function PortEnergyOverview() {
  const { 
    isConnected, 
    isLoading,
    allData 
  } = useEnergyData();

  // State to force chart update every minute
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to refresh chart
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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

    // Get the latest data point for "Entrada de Energia" for Current Power display
    const entradaLatest = allData
      .filter(item => {
        const deviceLower = item.device?.toLowerCase() || '';
        const deviceNameLower = item.deviceName?.toLowerCase() || '';
        return deviceLower.includes('entrada de energia') || deviceNameLower.includes('entrada de energia');
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    let currentTotalPower = 0;
    if (entradaLatest) {
      // Current power from "Entrada de Energia" in kW
      const powerW = (entradaLatest.L1?.P || 0) + (entradaLatest.L2?.P || 0) + (entradaLatest.L3?.P || 0);
      currentTotalPower = powerW / 1000; // Convert to kW
    }

    // Get the latest data point for each device (for other stats)
    const deviceLatestData = new Map();
    allData.forEach(item => {
      const existing = deviceLatestData.get(item.device);
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        deviceLatestData.set(item.device, item);
      }
    });

    const latestDataPoints = Array.from(deviceLatestData.values());

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
      totalDevices: 33,
      currentTotalPower: Math.round(currentTotalPower * 100) / 100, // Show in kW with 2 decimals
      averagePowerFactor: Math.round(averagePowerFactor * 100) / 100,
      totalConsumption: 0, // Removed - not used
      activeDevices
    };
  }, [allData]);

  // Calculate advanced analytics
  const analyticsStats = useMemo(() => {
    if (!allData.length) {
      return {
        monthlyEnergy: 0,
        maxPower: 0,
        minPower: 0,
        topConsumer: { name: 'N/A', percentage: 0 },
        estimatedCost: 0
      };
    }

    // Calculate monthly energy from "Entrada de Energia"
    // Each data point = 1-minute average (sent by Raspberry Pi after averaging 60 second readings)
    const entradaData = allData.filter(item => {
      const deviceLower = item.device?.toLowerCase() || '';
      const deviceNameLower = item.deviceName?.toLowerCase() || '';
      return (deviceLower.includes('entrada de energia') || deviceNameLower.includes('entrada de energia'));
    });

    let monthlyEnergy = 0;
    if (entradaData.length > 0) {
      // Sum all power readings (each is a 1-minute average in Watts)
      let totalPowerMinutes = 0;
      entradaData.forEach(item => {
        const power = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
        totalPowerMinutes += power;
      });
      
      // Convert to kWh: (Total Watt-minutes) / 1000 / 60 = kWh
      const energyFromSamples = totalPowerMinutes / 1000 / 60;
      
      // Extrapolate to 30 days based on sample rate
      // 30 days = 43,200 minutes
      const minutesInMonth = 30 * 24 * 60; // 43,200 minutes
      const samplingRate = entradaData.length; // minutes of data we have
      
      if (samplingRate > 0) {
        // Scale up to full month
        monthlyEnergy = (energyFromSamples / samplingRate) * minutesInMonth;
      }
    }

    // Calculate max and min power from all devices (excluding Entrada)
    const filteredData = allData.filter(item => {
      const deviceLower = item.device?.toLowerCase() || '';
      const deviceNameLower = item.deviceName?.toLowerCase() || '';
      return !deviceLower.includes('entrada de energia') && !deviceNameLower.includes('entrada de energia');
    });

    let maxPower = 0;
    let minPower = Infinity;
    
    filteredData.forEach(item => {
      const power = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
      if (power > maxPower) maxPower = power;
      if (power < minPower && power > 0) minPower = power;
    });

    if (minPower === Infinity) minPower = 0;

    // Calculate device contributions (last 15 minutes)
    const now = currentTime;
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const recentData = filteredData.filter(item => new Date(item.timestamp) >= fifteenMinAgo);
    
    const deviceContributions = new Map<string, number>();
    recentData.forEach(item => {
      const power = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
      const deviceName = item.deviceName || item.device;
      deviceContributions.set(deviceName, (deviceContributions.get(deviceName) || 0) + power);
    });

    const totalPower = Array.from(deviceContributions.values()).reduce((sum, p) => sum + p, 0);
    let topConsumer = { name: 'N/A', percentage: 0 };
    
    if (totalPower > 0) {
      let maxContribution = 0;
      deviceContributions.forEach((power, name) => {
        if (power > maxContribution) {
          maxContribution = power;
          topConsumer = {
            name,
            percentage: Math.round((power / totalPower) * 100)
          };
        }
      });
    }

    // Estimate cost
    // Formula: Cost = Energy (kWh) × Price (€/kWh)
    // Price: 0.15 €/kWh (adjust as needed based on actual electricity rates)
    const pricePerKWh = 0.15;
    const estimatedCost = monthlyEnergy * pricePerKWh;

    return {
      monthlyEnergy: Math.round(monthlyEnergy),
      maxPower: Math.round(maxPower / 1000 * 100) / 100,
      minPower: Math.round(minPower / 1000 * 100) / 100,
      topConsumer,
      estimatedCost: Math.round(estimatedCost * 100) / 100
    };
  }, [allData, currentTime]);

  // Helper function for natural (alphanumeric) sorting
  const naturalSort = (a: string, b: string): number => {
    const re = /(\d+)|(\D+)/g;
    const aParts = a.match(re) || [];
    const bParts = b.match(re) || [];
    
    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
      const aPart = aParts[i];
      const bPart = bParts[i];
      
      // Check if both parts are numbers
      const aNum = parseInt(aPart);
      const bNum = parseInt(bPart);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        // Both are numbers, compare numerically
        if (aNum !== bNum) return aNum - bNum;
      } else {
        // At least one is text, compare as strings
        if (aPart !== bPart) return aPart.localeCompare(bPart);
      }
    }
    
    // If all parts are equal, shorter string comes first
    return aParts.length - bParts.length;
  };

  // Helper function to get consistent color for a device based on its name
  const getDeviceColor = (deviceName: string) => {
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(59, 130, 246)' },    // blue
      { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgb(16, 185, 129)' },    // green
      { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)' },    // yellow
      { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgb(239, 68, 68)' },      // red
      { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgb(139, 92, 246)' },    // purple
      { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)' },    // pink
      { bg: 'rgba(6, 182, 212, 0.8)', border: 'rgb(6, 182, 212)' },      // cyan
      { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(251, 146, 60)' },    // orange
      { bg: 'rgba(132, 204, 22, 0.8)', border: 'rgb(132, 204, 22)' },    // lime
      { bg: 'rgba(20, 184, 166, 0.8)', border: 'rgb(20, 184, 166)' },    // teal
      { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgb(234, 179, 8)' },      // amber
      { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(168, 85, 247)' },    // violet
      { bg: 'rgba(244, 114, 182, 0.8)', border: 'rgb(244, 114, 182)' },  // fuchsia
      { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgb(14, 165, 233)' },    // sky
      { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)' },      // emerald
      { bg: 'rgba(249, 115, 22, 0.8)', border: 'rgb(249, 115, 22)' },    // deep orange
      { bg: 'rgba(163, 230, 53, 0.8)', border: 'rgb(163, 230, 53)' },    // lime green
      { bg: 'rgba(20, 184, 166, 0.8)', border: 'rgb(20, 184, 166)' },    // teal
      { bg: 'rgba(124, 58, 237, 0.8)', border: 'rgb(124, 58, 237)' },    // indigo
      { bg: 'rgba(219, 39, 119, 0.8)', border: 'rgb(219, 39, 119)' },    // rose
    ];
    
    // Simple hash function to map device name to color index
    let hash = 0;
    for (let i = 0; i < deviceName.length; i++) {
      hash = deviceName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Prepare stacked chart data for the last 15 minutes
  const stackedChartData = useMemo(() => {
    // Create 15 minute buckets first
    const now = currentTime;
    const buckets: Date[] = [];
    const fifteenMinutesAgo = now.getTime() - (15 * 60000);
    
    for (let i = 14; i >= 0; i--) {
      const bucketTime = new Date(now.getTime() - i * 60000);
      bucketTime.setSeconds(0, 0);
      buckets.push(bucketTime);
    }

    // Filter out "Entrada de energia" device AND only include data from last 15 minutes
    const filteredData = allData.filter(item => {
      const deviceLower = item.device?.toLowerCase() || '';
      const deviceNameLower = item.deviceName?.toLowerCase() || '';
      const timestamp = new Date(item.timestamp).getTime();
      
      return !deviceLower.includes('entrada de energia') && 
             !deviceNameLower.includes('entrada de energia') &&
             timestamp >= fifteenMinutesAgo;
    });

    // Get unique devices and sort them naturally (D1, D2... D9, D10, not D1, D10, D11... D2)
    const deviceSet = new Set(filteredData.map(item => item.device));
    const devices = Array.from(deviceSet).sort((a, b) => {
      // Get display names for sorting
      const aData = filteredData.find(d => d.device === a);
      const bData = filteredData.find(d => d.device === b);
      const aName = aData?.deviceName || a;
      const bName = bData?.deviceName || b;
      return naturalSort(aName, bName);
    });
    
    if (devices.length === 0) {
      return {
        labels: buckets,
        datasets: []
      };
    }

    // For each device, track its latest value before or at each minute bucket
    const deviceDataByMinute = new Map<string, Map<number, number>>();
    
    devices.forEach(device => {
      deviceDataByMinute.set(device, new Map());
    });

    // Create a device data cache sorted by timestamp for efficient lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deviceDataCache = new Map<string, any[]>();
    devices.forEach(device => {
      const devicePoints = filteredData
        .filter(item => item.device === device)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      deviceDataCache.set(device, devicePoints);
    });

    // For each bucket, find the most recent value for each device
    buckets.forEach((bucketTime, bucketIndex) => {
      const bucketTimestamp = bucketTime.getTime();
      
      devices.forEach(device => {
        const devicePoints = deviceDataCache.get(device) || [];
        let latestValue = 0;
        
        // Find the most recent data point for this device at or before this bucket time
        // But within the last 5 minutes (to avoid stale data)
        const fiveMinutesAgo = bucketTimestamp - (5 * 60000);
        
        for (let i = devicePoints.length - 1; i >= 0; i--) {
          const dataPoint = devicePoints[i];
          const dataTimestamp = new Date(dataPoint.timestamp).getTime();
          
          if (dataTimestamp <= bucketTimestamp && dataTimestamp >= fiveMinutesAgo) {
            // Found a recent value (convert W to kW)
            const totalWatts = (dataPoint.L1?.P || 0) + (dataPoint.L2?.P || 0) + (dataPoint.L3?.P || 0);
            latestValue = totalWatts / 1000; // Convert to kW
            break;
          }
        }
        
        deviceDataByMinute.get(device)?.set(bucketIndex, latestValue);
      });
    });

    // Create datasets for each device - stacked area chart style
    const datasets = devices.map((device) => {
      const deviceValues = deviceDataByMinute.get(device);
      // Ensure we have a value for each bucket (0 if no data)
      const data = buckets.map((_, bucketIndex) => {
        const value = deviceValues?.get(bucketIndex);
        return value !== undefined ? value : 0;
      });
      
      // Get device name for label (use deviceName if available)
      const deviceData = filteredData.find(d => d.device === device);
      const deviceLabel = deviceData?.deviceName || device;
      
      // Get consistent color based on device name
      const color = getDeviceColor(deviceLabel);

      return {
        label: deviceLabel,
        data: data,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        fill: true,
        tension: 0.4, // Smooth curves
        pointRadius: 0, // Hide points for cleaner look
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color.border,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      };
    });

    return {
      labels: buckets,
      datasets: datasets
    };
  }, [allData, currentTime]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          padding: 6,
          font: {
            size: 9,
            family: "'Inter', 'system-ui', sans-serif"
          },
          usePointStyle: true,
          pointStyle: 'circle',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sort: (a: any, b: any) => {
            return naturalSort(a.text, b.text);
          }
        },
        maxHeight: 120,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        position: 'nearest' as const,
        backgroundColor: 'rgba(17, 24, 39, 0.97)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        bodySpacing: 5,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
          family: "'Inter', 'system-ui', sans-serif"
        },
        bodyFont: {
          size: 11,
          family: "'Inter', 'system-ui', sans-serif"
        },
        footerFont: {
          size: 12,
          weight: 'bold' as const,
          family: "'Inter', 'system-ui', sans-serif"
        },
        yAlign: 'center' as const,
        xAlign: 'left' as const,
        caretPadding: 10,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: function(tooltipItems: any[]) {
            if (tooltipItems.length > 0) {
              const date = new Date(tooltipItems[0].parsed.x);
              return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });
            }
            return '';
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          beforeBody: function(tooltipItems: any[]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activeDevices = tooltipItems.filter((item: any) => item.parsed.y > 0.1).length;
            if (activeDevices > 10) {
              return [`📊 ${activeDevices} active devices - Top 10 shown`];
            }
            return [];
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function(context: any) {
            // Don't show devices with 0 or very low power
            if (!context.parsed.y || context.parsed.y < 0.1) {
              return null;
            }
            
            // Get all items at this point and sort by power
            const allItems = context.chart.tooltip.dataPoints || [];
            const sortedItems = [...allItems]
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((item: any) => item.parsed.y >= 0.1)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .sort((a: any, b: any) => b.parsed.y - a.parsed.y);
            
            // Find index of current item in sorted list
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentIndex = sortedItems.findIndex((item: any) => 
              item.datasetIndex === context.datasetIndex
            );
            
            // Only show top 10 devices
            if (currentIndex >= 10) {
              return null;
            }
            
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y.toFixed(2) + ' kW';
            return label;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          afterBody: function(tooltipItems: any[]) {
            // Sort by power and calculate others
            const sortedItems = [...tooltipItems]
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((item: any) => item.parsed.y >= 0.1)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .sort((a: any, b: any) => b.parsed.y - a.parsed.y);
            
            if (sortedItems.length > 10) {
              const othersCount = sortedItems.length - 10;
              const othersPower = sortedItems
                .slice(10)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .reduce((sum: number, item: any) => sum + item.parsed.y, 0);
              
              return [`\n+ ${othersCount} other device${othersCount > 1 ? 's' : ''}: ${othersPower.toFixed(2)} kW`];
            }
            return [];
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          footer: function(tooltipItems: any[]) {
            let sum = 0;
            tooltipItems.forEach(function(tooltipItem) {
              sum += tooltipItem.parsed.y;
            });
            return '━━━━━━━━━━━━━\nTotal: ' + sum.toFixed(2) + ' kW';
          }
        }
      },
      filler: {
        propagate: true
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          },
          unit: 'minute' as const,
          tooltipFormat: 'MMM dd, HH:mm',
          minUnit: 'minute' as const,
        },
        stacked: true,
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: {
            size: 11,
            family: "'Inter', 'system-ui', sans-serif"
          },
          color: '#6b7280'
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        stacked: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false,
        },
        ticks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: function(value: any) {
            return value.toLocaleString() + ' kW';
          },
          font: {
            size: 11,
            family: "'Inter', 'system-ui', sans-serif"
          },
          color: '#6b7280',
          padding: 8
        },
        border: {
          display: false,
          dash: [5, 5]
        }
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.4
      }
    }
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
              <p className="text-xs text-gray-500 dark:text-gray-400">kW (Entrada de Energia)</p>
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

      {/* Stacked Device Power Chart */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
          Device Power Distribution - Last 15 Minutes
        </h3>
        <div className="h-96">
          {stackedChartData.datasets.length > 0 ? (
            <Line data={stackedChartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              {isConnected ? "Waiting for device data..." : "Connect to view real-time data"}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Analytics - 4 boxes below */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Energy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analyticsStats.monthlyEnergy.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">kWh (Last 30 days)</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-lg p-4 border border-rose-200 dark:border-rose-700">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Peak Power</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analyticsStats.maxPower.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">kW (Maximum)</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Min Power</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analyticsStats.minPower.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">kW (Minimum)</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center">
            <PieChart className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Top Consumer</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{analyticsStats.topConsumer.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{analyticsStats.topConsumer.percentage}% of total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Cost Estimate */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Estimated Monthly Cost</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">€{analyticsStats.estimatedCost.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            <p>Based on 0.15 €/kWh</p>
            <p>{analyticsStats.monthlyEnergy.toLocaleString()} kWh consumed</p>
          </div>
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