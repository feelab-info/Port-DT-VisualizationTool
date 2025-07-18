import React, { useMemo } from 'react';
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

  // Prepare data for power consumption line chart
  const powerChartData = useMemo(() => {
    // Limit to last 50 points for better visualization if not in historical view
    const dataPoints = isHistoricalView 
      ? sortedData 
      : sortedData.slice(-50);

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
          pointRadius: 2,
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
          pointRadius: 2,
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
          pointRadius: 2,
          pointHoverRadius: 6,
          fill: false
        },
      ],
    };
  }, [sortedData, isHistoricalView]);

  // Prepare data for total consumption bar chart
  const totalConsumptionData = useMemo(() => {
    console.log('=== HOURLY CHART DEBUG ===');
    console.log('Sorted data length:', sortedData.length);
    
    if (sortedData.length === 0) {
      console.log('No data available for hourly chart');
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

    // Sample first few items to understand data structure
    console.log('First 3 data items with power breakdown:', sortedData.slice(0, 3).map(item => ({
      timestamp: item.timestamp,
      measure_cons: item.measure_cons,
      L1_P: item.L1?.P || 0,
      L2_P: item.L2?.P || 0,
      L3_P: item.L3?.P || 0,
      total_power: (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0)
    })));

    // Group data by hour for better visualization
    const hourlyData: Record<string, { total: number, count: number }> = {};
    
    sortedData.forEach(item => {
      const date = new Date(item.timestamp);
      const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { total: 0, count: 0 };
      }
      
      // Use total power consumption (L1 + L2 + L3) instead of measure_cons
      const totalPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
      hourlyData[hourKey].total += totalPower;
      hourlyData[hourKey].count += 1;
    });
    
    console.log('Hourly data aggregation:', hourlyData);
    
    // Convert to arrays for chart - use average consumption per hour
    const sortedHours = Object.keys(hourlyData).sort();
    const labels = sortedHours;
    const data = sortedHours.map(hour => hourlyData[hour].total / hourlyData[hour].count);
    
    console.log('Chart labels:', labels);
    console.log('Chart data:', data);
    console.log('Chart data sum:', data.reduce((sum, val) => sum + val, 0));
    console.log('=== END HOURLY CHART DEBUG ===');
    
    return {
      labels,
      datasets: [
        {
          label: 'Average Total Power (W)',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [sortedData]);

  // Enhanced chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: isHistoricalView ? 'hour' as const : 'minute' as const,
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
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        displayColors: true
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hour of Day',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
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
        }
      }
    }
  };

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
              : 'Multi-line power consumption trends'}
          </p>
        </div>
        <div className="p-6">
          <div className="h-96 w-full">
            <Line data={powerChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* Hourly Consumption Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hourly Energy Consumption</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedDevice 
              ? `Aggregated hourly consumption for ${selectedDevice}` 
              : 'Total hourly energy usage patterns'}
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