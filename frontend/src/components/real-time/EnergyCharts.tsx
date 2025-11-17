import React, { useMemo, useCallback } from 'react';
import { EnergyData } from '@/services/EnergyDataService';
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
  TooltipItem
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
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
  TimeScale
);

interface EnergyChartsProps {
  filteredData: EnergyData[];
  selectedDevice: string | null;
  isHistoricalView: boolean;
}

export default function EnergyCharts({ 
  filteredData, 
  selectedDevice,
  isHistoricalView
}: EnergyChartsProps) {
  // Sort data by timestamp to ensure chronological order
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [filteredData]);

  // Detect if this is multi-day data
  const isMultiDay = useMemo(() => {
    if (sortedData.length === 0) return false;
    const firstDate = new Date(sortedData[0].timestamp).toDateString();
    const lastDate = new Date(sortedData[sortedData.length - 1].timestamp).toDateString();
    return firstDate !== lastDate;
  }, [sortedData]);

  // Downsample data for performance - improved algorithm
  const downsampleData = useCallback((data: EnergyData[], targetPoints: number): EnergyData[] => {
    if (data.length <= targetPoints) return data;

    // Use a more conservative approach - take every Nth point but ensure we keep important ones
    const samplingRate = Math.ceil(data.length / targetPoints);
    const sampled: EnergyData[] = [];
    
    for (let i = 0; i < data.length; i += samplingRate) {
      sampled.push(data[i]);
    }
    
    // Always include the last point if not already included
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1]);
    }
    
    console.log(`Downsampled from ${data.length} to ${sampled.length} points (target: ${targetPoints})`);
    return sampled;
  }, []);

  // Prepare data for power consumption line chart with intelligent downsampling
  const powerChartData = useMemo(() => {
    // More generous limits to preserve data visibility
    const MAX_POINTS = isMultiDay ? 1000 : 500; // Increased limits
    
    // Downsample only if significantly over the limit
    let dataPoints = sortedData;
    if (sortedData.length > MAX_POINTS * 2) {
      dataPoints = downsampleData(sortedData, MAX_POINTS);
    } else if (sortedData.length > MAX_POINTS) {
      // Use a lighter downsampling for moderate datasets
      dataPoints = downsampleData(sortedData, Math.floor(sortedData.length * 0.7));
    }

    // Further limit for live view
    if (!isHistoricalView && dataPoints.length > 200) {
      dataPoints = dataPoints.slice(-200);
    }

    return {
      labels: dataPoints.map(item => new Date(item.timestamp)),
      datasets: [
        {
          label: 'L1 Power (W)',
          data: dataPoints.map(item => item.L1?.P || 0),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: dataPoints.length > 200 ? 0 : 2, // Hide points if too many
          pointHoverRadius: 6,
          fill: false
        },
        {
          label: 'L2 Power (W)',
          data: dataPoints.map(item => item.L2?.P || 0),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: dataPoints.length > 200 ? 0 : 2,
          pointHoverRadius: 6,
          fill: false
        },
        {
          label: 'L3 Power (W)',
          data: dataPoints.map(item => item.L3?.P || 0),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: dataPoints.length > 200 ? 0 : 2,
          pointHoverRadius: 6,
          fill: false
        },
      ],
    };
  }, [sortedData, isHistoricalView, isMultiDay, downsampleData]);

  // Prepare data for total consumption bar chart (enhanced for multi-day)
  const totalConsumptionData = useMemo(() => {
    if (sortedData.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Total Consumption (W)',
          data: [],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }],
      };
    }

    if (isMultiDay) {
      // For multi-day data, group by date
      const dailyData: Record<string, { total: number, count: number }> = {};
      
      sortedData.forEach(item => {
        const date = new Date(item.timestamp);
        const dayKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { total: 0, count: 0 };
        }
        
        const totalPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
        dailyData[dayKey].total += totalPower;
        dailyData[dayKey].count += 1;
      });
      
      const sortedDays = Object.keys(dailyData).sort();
      const labels = sortedDays.map(day => new Date(day).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' }));
      const data = sortedDays.map(day => dailyData[day].total / dailyData[day].count);
      
      return {
        labels,
        datasets: [
          {
            label: 'Average Daily Power (W)',
            data,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      };
    } else {
      // For single day data, group by hour
      const hourlyData: Record<string, { total: number, count: number }> = {};
      
      sortedData.forEach(item => {
        const date = new Date(item.timestamp);
        const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
        
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { total: 0, count: 0 };
        }
        
        const totalPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
        hourlyData[hourKey].total += totalPower;
        hourlyData[hourKey].count += 1;
      });
      
      const sortedHours = Object.keys(hourlyData).sort();
      const labels = sortedHours;
      const data = sortedHours.map(hour => hourlyData[hour].total / hourlyData[hour].count);
      
      return {
        labels,
        datasets: [
          {
            label: 'Average Hourly Power (W)',
            data,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      };
    }
  }, [sortedData, isMultiDay]);

  // Daily comparison chart for multi-day data
  const dailyComparisonData = useMemo(() => {
    if (!isMultiDay || sortedData.length === 0) {
      return null;
    }

    const dailyStats: Record<string, { min: number, max: number, avg: number, count: number, sum: number }> = {};
    
    sortedData.forEach(item => {
      const date = new Date(item.timestamp);
      const dayKey = date.toLocaleDateString('en-CA');
      
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = { min: Infinity, max: -Infinity, avg: 0, count: 0, sum: 0 };
      }
      
      const totalPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
      dailyStats[dayKey].min = Math.min(dailyStats[dayKey].min, totalPower);
      dailyStats[dayKey].max = Math.max(dailyStats[dayKey].max, totalPower);
      dailyStats[dayKey].sum += totalPower;
      dailyStats[dayKey].count += 1;
    });

    // Calculate averages
    Object.keys(dailyStats).forEach(day => {
      dailyStats[day].avg = dailyStats[day].sum / dailyStats[day].count;
    });
    
    const sortedDays = Object.keys(dailyStats).sort();
    const labels = sortedDays.map(day => new Date(day).toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' }));
    
    return {
      labels,
      datasets: [
        {
          label: 'Peak Power (W)',
          data: sortedDays.map(day => dailyStats[day].max),
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: 'Average Power (W)',
          data: sortedDays.map(day => dailyStats[day].avg),
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: 'Minimum Power (W)',
          data: sortedDays.map(day => dailyStats[day].min),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  }, [sortedData, isMultiDay]);

  // Enhanced chart options with performance optimizations
  const lineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: sortedData.length > 5000 ? 0 : 750 // Disable animation only for very large datasets
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            return new Date(context[0].label).toLocaleString();
          },
          label: function(context: TooltipItem<'line'>) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} W`;
          }
        }
      },
      decimation: {
        enabled: sortedData.length > 2000,
        algorithm: 'lttb' as const,
        samples: 1000
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: isMultiDay ? 'hour' as const : isHistoricalView ? 'hour' as const : 'minute' as const,
          tooltipFormat: 'PPpp',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          }
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          maxTicksLimit: isMultiDay ? 20 : 15, // Limit ticks for performance
          autoSkip: true,
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Power (W)',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          maxTicksLimit: 10 // Limit ticks for performance
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    elements: {
      point: {
        radius: sortedData.length > 1000 ? 0 : sortedData.length > 500 ? 1 : 2 // Progressively reduce point size
      },
      line: {
        borderWidth: 2
      }
    }
  }), [sortedData.length, isHistoricalView, isMultiDay]);

  const barChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} W`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: isMultiDay ? 'Date' : 'Hour of Day',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Power (W)',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          maxTicksLimit: 10
        }
      }
    }
  }), [isMultiDay]);

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No chart data available</h3>
        <p className="text-gray-600 dark:text-gray-400">No data available for charts. Try selecting a different date or device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Power Consumption Line Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Power Consumption Over Time</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedDevice 
              ? `Line-by-line power analysis for ${selectedDevice}` 
              : isMultiDay 
                ? 'Multi-day power consumption trends across all phases'
                : 'Real-time power consumption trends'}
          </p>
        </div>
        <div className="p-6">
          <div className="h-96 w-full">
            <Line data={powerChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* Daily Comparison Chart (only for multi-day) */}
      {isMultiDay && dailyComparisonData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Daily Power Comparison</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Peak, average, and minimum power consumption per day
            </p>
          </div>
          <div className="p-6">
            <div className="h-96 w-full">
              <Bar data={dailyComparisonData} options={barChartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Aggregated Consumption Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isMultiDay ? 'Daily Energy Consumption' : 'Hourly Energy Consumption'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedDevice 
              ? `Aggregated ${isMultiDay ? 'daily' : 'hourly'} consumption for ${selectedDevice}` 
              : `Total ${isMultiDay ? 'daily' : 'hourly'} energy usage patterns`}
          </p>
        </div>
        <div className="p-6">
          <div className="h-96 w-full">
            <Bar data={totalConsumptionData} options={barChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}