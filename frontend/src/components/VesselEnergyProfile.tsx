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
  closest_ship,
  data,
  message,
  scaling_factor,
  success
}) => {
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  if (!success) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Failed to generate energy profile.
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
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.1
      },
      {
        label: 'Hotel Power (kW)',
        data: hotelPower,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1
      },
      {
        label: 'Total Power (kW)',
        data: totalPower,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Energy Profile for ${data.vessel}`,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return new Date(context[0].label).toLocaleString();
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
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Power (kW)'
        }
      }
    }
  };

  // Calculate total energy consumption
  const totalEnergyConsumption = data.energy_profile_data.reduce(
    (sum, point) => sum + (point['Chillers Power'] + point['Hotel Power']), 
    0
  ) / 12; // Convert from 5-minute intervals to kWh (divide by 12)

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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{message}</h2>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Vessel</p>
            <p className="font-medium">{data.vessel}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Closest Ship</p>
            <p className="font-medium">{closest_ship}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Arrival Time</p>
            <p className="font-medium">{data.arrival_time}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Departure Time</p>
            <p className="font-medium">{data.departure_time}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Scaling Factor</p>
            <p className="font-medium">{scaling_factor.toFixed(4)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-500">Total Energy Consumption</p>
            <p className="font-medium">{totalEnergyConsumption.toFixed(2)} kWh</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Energy Profile Chart</h3>
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Energy Data Table</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chillers Power (kW)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel Power (kW)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Power (kW)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.map((point, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(point.Timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {point['Chillers Power'].toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {point['Hotel Power'].toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(point['Chillers Power'] + point['Hotel Power']).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstRecord + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastRecord, data.energy_profile_data.length)}
                  </span>{' '}
                  of <span className="font-medium">{data.energy_profile_data.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    &larr;
                  </button>
                  
                  {/* Page buttons - show limited numbers if there are many pages */}
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                    // Determine which pages to show
                    let pageNumber: number;
                    if (totalPages <= 5) {
                      // If 5 or fewer pages, show all
                      pageNumber = idx + 1;
                    } else if (currentPage <= 3) {
                      // If near start, show first 5
                      pageNumber = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      // If near end, show last 5
                      pageNumber = totalPages - 4 + idx;
                    } else {
                      // Otherwise show current ± 2
                      pageNumber = currentPage - 2 + idx;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white focus:z-20'
                            : 'bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VesselEnergyProfile;