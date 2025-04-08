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
  TimeScale
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
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.2,
        },
        {
          label: 'L2 Power (W)',
          data: dataPoints.map(item => item.L2?.P || 0),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          tension: 0.2,
        },
        {
          label: 'L3 Power (W)',
          data: dataPoints.map(item => item.L3?.P || 0),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.2,
        },
      ],
    };
  }, [sortedData, isHistoricalView]);

  // Prepare data for total consumption bar chart
  const totalConsumptionData = useMemo(() => {
    // Group data by hour for better visualization
    const hourlyData: Record<string, number> = {};
    
    sortedData.forEach(item => {
      const date = new Date(item.timestamp);
      const hourKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:00`;
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = 0;
      }
      
      hourlyData[hourKey] += item.measure_cons || 0;
    });
    
    // Convert to arrays for chart
    const labels = Object.keys(hourlyData);
    const data = Object.values(hourlyData);
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Consumption (W)',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
        },
      ],
    };
  }, [sortedData]);

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
          text: 'Time'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Power (W)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: selectedDevice 
          ? `Power Consumption for ${selectedDevice}` 
          : 'Power Consumption Over Time',
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: selectedDevice 
          ? `Hourly Consumption for ${selectedDevice}` 
          : 'Hourly Consumption',
      },
    },
  };

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for charts. Try selecting a different date or device.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Power Consumption Over Time</h3>
        <div className="h-80">
          <Line options={lineChartOptions} data={powerChartData} />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Hourly Energy Consumption</h3>
        <div className="h-80">
          <Bar options={barChartOptions} data={totalConsumptionData} />
        </div>
      </div>
    </div>
  );
}