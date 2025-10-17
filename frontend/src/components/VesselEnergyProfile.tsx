/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
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

interface EnergyProfileDataPoint {
  'Chillers Power': number;
  'Hotel Power': number;
  Timestamp: string;
}

interface VesselData {
  arrival_time: string;
  departure_time: string;
  energy_profile_data: EnergyProfileDataPoint[];
  vessel: string;
}

interface VesselEnergyProfileProps {
  closest_ship: string;
  data: VesselData;
  message: string;
  scaling_factor: number;
  success: boolean;
}

const VesselEnergyProfile: React.FC<VesselEnergyProfileProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  closest_ship,
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  message,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scaling_factor,
  success
}) => {
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  if (!success) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Failed to generate energy profile</h3>
            <p className="text-sm mt-1">Unable to process vessel energy data</p>
          </div>
        </div>
      </div>
    );
  }

  // Safety check for energy_profile_data
  if (!data || !data.energy_profile_data || !Array.isArray(data.energy_profile_data) || data.energy_profile_data.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">No Energy Data Available</h3>
            <p className="text-sm mt-1">The vessel simulation completed but no energy profile data was generated</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for the chart
  const timestamps = data.energy_profile_data.map(point => new Date(point.Timestamp));
  const chillersPower = data.energy_profile_data.map(point => point['Chillers Power']);
  const hotelPower = data.energy_profile_data.map(point => point['Hotel Power']);
  const totalPower = data.energy_profile_data.map(point => point['Chillers Power'] + point['Hotel Power']);

  const chartData = {
    labels: timestamps,
    datasets: [
      {
        label: 'Chillers Power (kW)',
        data: chillersPower,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 6,
        fill: false
      },
      {
        label: 'Hotel Power (kW)',
        data: hotelPower,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 6,
        fill: false
      },
      {
        label: 'Total Power (kW)',
        data: totalPower,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 7,
        fill: true,
        fillOpacity: 0.1
      }
    ]
  };

  const chartOptions = {
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
          title: function(context: any) {
            return new Date(context[0].label).toLocaleString();
          },
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kW`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'hour' as const,
          displayFormats: {
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
        title: {
          display: true,
          text: 'Power (kW)',
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

  // Pagination calculations
  const totalPages = Math.ceil(data.energy_profile_data.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = data.energy_profile_data.slice(indexOfFirstRecord, indexOfLastRecord);

  // Change page handler
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Navigate to next and previous pages
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Chart Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Power Consumption Chart</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time energy usage patterns over time</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="h-96 w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
      
      {/* Enhanced Data Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V7a2 2 0 012-2h8a2 2 0 012 2v13H5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detailed Energy Data</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Timestamped power consumption readings</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {data.energy_profile_data.length} total records
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Timestamp</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Chillers Power</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Hotel Power</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Total Power</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {currentRecords.map((point, index) => (
                <tr key={index} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(point.Timestamp).toLocaleDateString('pt-PT')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(point.Timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {point['Chillers Power'].toFixed(2)} kW
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {point['Hotel Power'].toFixed(2)} kW
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                      {(point['Chillers Power'] + point['Hotel Power']).toFixed(2)} kW
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Enhanced Pagination */}
        <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-semibold">{indexOfFirstRecord + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(indexOfLastRecord, data.energy_profile_data.length)}
              </span>{' '}
              of <span className="font-semibold">{data.energy_profile_data.length}</span> records
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm'
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, idx) => {
                  let pageNumber: number;
                  if (totalPages <= 7) {
                    pageNumber = idx + 1;
                  } else if (currentPage <= 4) {
                    pageNumber = idx + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNumber = totalPages - 6 + idx;
                  } else {
                    pageNumber = currentPage - 3 + idx;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={`inline-flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm'
                }`}
              >
                Next
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VesselEnergyProfile;