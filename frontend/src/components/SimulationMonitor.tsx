'use client';

import { useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, 
  Area, AreaChart
} from 'recharts';
import { simulationService } from '@/services/SimulationService';

interface BusData {
  vm_pu: number;
  va_degree: number;
  p_mw: number;
  q_mvar: number;
}

interface SimulationData {
  timestamp: number;
  res_bus: BusData[];
  is_mock?: boolean;
}

// Interface for timesteps data
interface TimestepData {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  // Add other fields as needed
  [key: string]: string | number | boolean | object | undefined;
}

// Add a KPI interface for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface KpiData {
  efficiency?: {
    [key: string]: number;
  };
  economic?: {
    [key: string]: number;
  };
  environmental?: {
    [key: string]: number;
  };
  [key: string]: Record<string, number> | undefined;
}

// Create a type for chart data
interface ChartDataPoint {
  name: string;
  [key: string]: string | number | null | undefined;
}

export default function SimulationMonitor() {
  const [timestepsData, setTimestepsData] = useState<TimestepData[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('No updates yet');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [activeTab, setActiveTab] = useState<'timesteps' | 'kpi'>('timesteps');
  const [visualizationType, setVisualizationType] = useState<'table' | 'lineChart' | 'areaChart'>('table');
  const [selectedMetric, setSelectedMetric] = useState<'voltage' | 'load' | 'converterPower'>('voltage');
  
  // Pagination for timesteps data
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [busIdFilter, setBusIdFilter] = useState<number | ''>('');
  const [timestepFilter, setTimestepFilter] = useState<string>('');
  
  // Reference to the socket connection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Fetch timesteps results
  const fetchTimestepsResults = async () => {
    try {
      const data = await simulationService.getTimestepsResults();
      setTimestepsData(data);
    } catch (error) {
      console.error('Error fetching timesteps results:', error);
    }
  };
  
  // Fetch KPI results
  const fetchKpiResults = async () => {
    try {
      await simulationService.getKpiResults();
      console.log('KPI data fetched successfully, will be implemented in future');
    } catch (error) {
      console.warn('KPI API not available yet:', error);
    }
  };
  
  useEffect(() => {
    // Connect to the backend Socket.IO server
    const socketConnection = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    setSocket(socketConnection);
    
    // Handle connection status
    socketConnection.on('connect', () => {
      setConnectionStatus('connected');
      setError(null);
    });
    
    socketConnection.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });
    
    socketConnection.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnectionStatus('disconnected');
      setError(`Connection error: ${err.message}`);
    });
    
    
    fetchTimestepsResults(); // Fetch timesteps data
    fetchKpiResults(); // Fetch KPI data (for future)
    
    // Listen for real-time updates
    socketConnection.on('simulation_update', (data: SimulationData) => {
      // Only update if not paused
      if (!isPaused) {
        setLastUpdate(new Date(data.timestamp * 1000).toLocaleTimeString());
        
        // Refresh timesteps data when simulation updates
        fetchTimestepsResults();
      }
      setIsRunning(true);
    });
    
    // Listen for simulation stopped event
    socketConnection.on('simulation_stopped', () => {
      setIsRunning(false);
      console.log('Simulation has been stopped by the server');
    });
    
    // Clean up on unmount
    return () => {
      socketConnection.off('simulation_update');
      socketConnection.off('simulation_stopped');
      socketConnection.off('connect');
      socketConnection.off('disconnect');
      socketConnection.off('connect_error');
      socketConnection.disconnect();
    };
  }, [isPaused]);
  

  
  // Function to toggle pausing updates
  const togglePauseUpdates = async () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    try {
      await simulationService.toggleSimulationUpdates(newPausedState);
      console.log(`${newPausedState ? 'Paused' : 'Resumed'} receiving updates from simulation`);
    } catch (error) {
      console.error('Error toggling simulation updates:', error);
      // Revert the state if the server request failed
      setIsPaused(!newPausedState);
    }
  };

  // Apply filters to timesteps data
  const filteredTimesteps = useMemo(() => {
    if (!timestepsData) return [];
    
    return timestepsData.filter(step => {
      // Apply bus ID filter if specified
      if (busIdFilter !== '' && step.bus_id !== busIdFilter) {
        return false;
      }
      
      // Apply timestep filter if specified
      if (timestepFilter && !step.timestamp.toString().includes(timestepFilter)) {
        return false;
      }
      
      return true;
    });
  }, [timestepsData, busIdFilter, timestepFilter]);
  
  // Get current page data
  const currentPageData = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredTimesteps.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredTimesteps, currentPage, itemsPerPage]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTimesteps.length / itemsPerPage);
  }, [filteredTimesteps, itemsPerPage]);
  
  // Functions for pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  // Render page buttons
  const renderPageButtons = () => {
    const buttons = [];
    const maxButtonsToShow = 5; // Show 5 page buttons at a time
    
    // Always show first page
    buttons.push(
      <button 
        key="first" 
        onClick={() => goToPage(1)} 
        className={`px-3 py-1 mx-1 ${currentPage === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}
      >
        1
      </button>
    );
    
    // Calculate range of pages to show
    const startPage = Math.max(2, currentPage - Math.floor(maxButtonsToShow / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxButtonsToShow - 3);
    
    // Adjust if we're near the end
    if (endPage <= startPage) {
      endPage = startPage;
    }
    
    // Add ellipsis if needed
    if (startPage > 2) {
      buttons.push(<span key="ellipsis1" className="px-2">...</span>);
    }
    
    // Add pages in the middle
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button 
          key={i} 
          onClick={() => goToPage(i)} 
          className={`px-3 py-1 mx-1 ${currentPage === i ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}
        >
          {i}
        </button>
      );
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      buttons.push(<span key="ellipsis2" className="px-2">...</span>);
    }
    
    // Always show last page if there is more than 1 page
    if (totalPages > 1) {
      buttons.push(
        <button 
          key="last" 
          onClick={() => goToPage(totalPages)} 
          className={`px-3 py-1 mx-1 ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}
        >
          {totalPages}
        </button>
      );
    }
    
    return buttons;
  };
  
  // Get unique bus IDs for filter dropdown
  const uniqueBusIds = useMemo(() => {
    if (!timestepsData) return [];
    
    const busIds = new Set<number>();
    timestepsData.forEach(step => {
      if (step.bus_id !== undefined) {
        busIds.add(step.bus_id);
      }
    });
    
    return Array.from(busIds).sort((a, b) => a - b);
  }, [timestepsData]);
  
  // Get unique timesteps for filter
  const uniqueTimesteps = useMemo(() => {
    if (!timestepsData) return [];
    
    const timesteps = new Set<string>();
    timestepsData.forEach(step => {
      if (step.timestamp) {
        const timestamp = step.timestamp.toString().split(' ')[1]; // Extract timestep number
        timesteps.add(timestamp);
      }
    });
    
    return Array.from(timesteps).sort();
  }, [timestepsData]);
  
  // Prepare data for charts
  const prepareChartData = useMemo(() => {
    if (!timestepsData) return [];
    
    // Group data by timestamp
    const timestepGroups = new Map<string, {
      timestamp: string;
      buses: Map<string | number, {
        voltage: number | undefined;
        load: number | undefined;
        converterPower: number | null;
        converterLoading: number | null;
      }>;
    }>();
    
    // Process all timesteps data or just the filtered ones
    const dataToProcess = filteredTimesteps;
    
    dataToProcess.forEach(step => {
      const timestamp = step.timestamp?.toString() || '';
      if (!timestepGroups.has(timestamp)) {
        timestepGroups.set(timestamp, {
          timestamp,
          buses: new Map()
        });
      }
      
      const group = timestepGroups.get(timestamp)!;
      const busId = step.bus_id !== undefined ? step.bus_id : 'unknown';
      
      // Find converter power and loading values
      const converterPowerKeys = Object.keys(step).filter(key => key.includes('converter_') && key.includes('_power'));
      const converterPower = converterPowerKeys.length > 0 ? step[converterPowerKeys[0]] : null;
      
      const converterLoadingKeys = Object.keys(step).filter(key => key.includes('converter_') && key.includes('_loading'));
      const converterLoading = converterLoadingKeys.length > 0 ? step[converterLoadingKeys[0]] : null;
      
      // Store bus-specific data
      group.buses.set(busId, {
        voltage: step.voltage,
        load: step.load,
        converterPower: converterPower !== null ? Number(converterPower) : null,
        converterLoading: converterLoading !== null ? Number(converterLoading) : null
      });
    });
    
    // For line chart - create series by bus
    const lineChartData: ChartDataPoint[] = [];
    
    // Process each timestep
    timestepGroups.forEach((group, timestamp) => {
      const entry: ChartDataPoint = { name: timestamp };
      
      // Extract all bus values for this timestep
      group.buses.forEach((busData, busId) => {
        if (busIdFilter === '' || busIdFilter === busId) {
          entry[`Bus ${busId} Voltage`] = busData.voltage;
          entry[`Bus ${busId} Load`] = busData.load;
          entry[`Bus ${busId} ConverterPower`] = busData.converterPower;
          entry[`Bus ${busId} ConverterLoading`] = busData.converterLoading;
        }
      });
      
      lineChartData.push(entry);
    });
    
    // Sort data by timestamp
    lineChartData.sort((a, b) => {
      const getTimestepNumber = (ts: string) => {
        const match = ts.match(/Timestep (\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const aNum = getTimestepNumber(a.name);
      const bNum = getTimestepNumber(b.name);
      return aNum - bNum;
    });
    
    return lineChartData;
  }, [filteredTimesteps, busIdFilter]);
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold mr-3">Power Flow Simulation Monitor</h2>
          <div className={`h-3 w-3 rounded-full mr-1 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-500">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        <div className="space-x-2">
          
          <button 
            onClick={togglePauseUpdates}
            className={`px-4 py-2 ${isPaused ? 'bg-blue-500 hover:bg-blue-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded`}
          >
            {isPaused ? 'Resume Updates' : 'Pause Updates'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-2 flex items-center">
        <span className="font-semibold mr-2">Last Update:</span> {lastUpdate}
        {isPaused && (
          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            Updates paused
          </span>
        )}
      </div>
      
      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <div className="flex">
          <button
            className={`px-4 py-2 ${activeTab === 'timesteps' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('timesteps')}
          >
            Timesteps Results
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'kpi' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('kpi')}
          >
            KPI Results
          </button>
        </div>
      </div>
      
      {activeTab === 'timesteps' && (
        timestepsData ? (
          <div className="overflow-x-auto">
            <div className="mb-4 text-sm">
              <p className="text-gray-600">This is the time series data from the simulation. It shows how values change over time for each bus.</p>
            </div>
            
            {/* Visualization controls */}
            <div className="mb-4 flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-4 mb-2 md:mb-0">
                <h3 className="text-md font-medium">Visualization Type:</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button 
                    onClick={() => setVisualizationType('table')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      visualizationType === 'table' 
                        ? 'bg-white text-blue-600 shadow' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Table
                  </button>
                  <button 
                    onClick={() => setVisualizationType('lineChart')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      visualizationType === 'lineChart' 
                        ? 'bg-white text-blue-600 shadow' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Line Chart
                  </button>
                  <button 
                    onClick={() => setVisualizationType('areaChart')}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      visualizationType === 'areaChart' 
                        ? 'bg-white text-blue-600 shadow' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Area Chart
                  </button>
                </div>
              </div>
              
              {visualizationType !== 'table' && (
                <div className="flex items-center gap-2">
                  <h3 className="text-md font-medium">Metric:</h3>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as 'voltage' | 'load' | 'converterPower')}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="voltage">Voltage (pu)</option>
                    <option value="load">Load (MW)</option>
                    <option value="converterPower">Converter Power (MW)</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="busFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Bus ID:</label>
                <select 
                  id="busFilter" 
                  value={busIdFilter === '' ? '' : busIdFilter.toString()}
                  onChange={(e) => setBusIdFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  className="p-2 border border-gray-300 rounded-md w-32"
                >
                  <option value="">All Buses</option>
                  {uniqueBusIds.map((id) => (
                    <option key={id} value={id}>Bus {id}</option>
                  ))}
                </select>
              </div>
              
              {visualizationType === 'table' && (
                <>
                  <div>
                    <label htmlFor="timestepFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Timestep:</label>
                    <select 
                      id="timestepFilter" 
                      value={timestepFilter}
                      onChange={(e) => setTimestepFilter(e.target.value)}
                      className="p-2 border border-gray-300 rounded-md w-32"
                    >
                      <option value="">All Timesteps</option>
                      {uniqueTimesteps.map((ts) => (
                        <option key={ts} value={ts}>{ts}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700 mb-1">Items per page:</label>
                    <select 
                      id="itemsPerPage" 
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      className="p-2 border border-gray-300 rounded-md w-24"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </>
              )}
              
              <div>
                <button 
                  onClick={() => {
                    setBusIdFilter('');
                    setTimestepFilter('');
                  }}
                  className="mt-6 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            {filteredTimesteps.length > 0 ? (
              <>
                {/* Table visualization */}
                {visualizationType === 'table' && (
                  <>
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-2 px-4 border">Time</th>
                          <th className="py-2 px-4 border">Bus ID</th>
                          <th className="py-2 px-4 border">Voltage (pu)</th>
                          <th className="py-2 px-4 border">Load (MW)</th>
                          <th className="py-2 px-4 border">Converter Power (MW)</th>
                          <th className="py-2 px-4 border">Converter Loading (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPageData.map((step, index) => {
                          // Find converter power and loading values
                          const converterPowerKeys = Object.keys(step).filter(key => key.includes('converter_') && key.includes('_power'));
                          const converterPower = converterPowerKeys.length > 0 ? step[converterPowerKeys[0]] : null;
                          
                          const converterLoadingKeys = Object.keys(step).filter(key => key.includes('converter_') && key.includes('_loading'));
                          const converterLoading = converterLoadingKeys.length > 0 ? step[converterLoadingKeys[0]] : null;
                          
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                              <td className="py-2 px-4 border">{step.timestamp || '—'}</td>
                              <td className="py-2 px-4 border">{step.bus_id !== undefined ? step.bus_id : '—'}</td>
                              <td className="py-2 px-4 border">{step.voltage !== undefined && step.voltage !== null ? step.voltage.toFixed(4) : '—'}</td>
                              <td className="py-2 px-4 border">{step.load !== undefined && step.load !== null ? step.load.toFixed(6) : '—'}</td>
                              <td className="py-2 px-4 border">{converterPower !== undefined && converterPower !== null ? Number(converterPower).toFixed(6) : '—'}</td>
                              <td className="py-2 px-4 border">{converterLoading !== undefined && converterLoading !== null ? Number(converterLoading).toFixed(2) : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {/* Pagination */}
                    <div className="mt-4 flex flex-wrap justify-between items-center">
                      <div className="text-sm text-gray-500 mb-2 md:mb-0">
                        Showing {filteredTimesteps.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredTimesteps.length)} of {filteredTimesteps.length} records
                      </div>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center">
                          <button 
                            onClick={() => goToPage(currentPage - 1)} 
                            disabled={currentPage === 1}
                            className={`px-3 py-1 mx-1 ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'} rounded`}
                          >
                            Previous
                          </button>
                          
                          {renderPageButtons()}
                          
                          <button 
                            onClick={() => goToPage(currentPage + 1)} 
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1 mx-1 ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'} rounded`}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {/* Line Chart visualization */}
                {visualizationType === 'lineChart' && (
                  <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">
                      {selectedMetric === 'voltage' ? 'Voltage Over Time' : 
                       selectedMetric === 'load' ? 'Load Over Time' : 
                       'Converter Power Over Time'}
                    </h3>
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={prepareChartData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            label={{ value: 'Timestep', position: 'insideBottomRight', offset: -10 }} 
                          />
                          <YAxis 
                            label={{ 
                              value: selectedMetric === 'voltage' ? 'Voltage (pu)' : 
                                     selectedMetric === 'load' ? 'Load (MW)' : 
                                     'Converter Power (MW)', 
                              angle: -90, 
                              position: 'insideLeft' 
                            }}
                          />
                          <Tooltip />
                          <Legend />
                          {prepareChartData.length > 0 && Object.keys(prepareChartData[0])
                            .filter(key => key !== 'name' && key.includes(selectedMetric === 'voltage' ? 'Voltage' : 
                                                                        selectedMetric === 'load' ? 'Load' : 
                                                                        'ConverterPower'))
                            .map((key, index) => (
                              <Line 
                                type="monotone" 
                                dataKey={key} 
                                key={key}
                                stroke={
                                  ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'][index % 8]
                                }
                                activeDot={{ r: 8 }}
                              />
                            ))
                          }
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Area Chart visualization */}
                {visualizationType === 'areaChart' && (
                  <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">
                      {selectedMetric === 'voltage' ? 'Voltage Area Chart' : 
                       selectedMetric === 'load' ? 'Load Area Chart' : 
                       'Converter Power Area Chart'}
                    </h3>
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={prepareChartData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            label={{ value: 'Timestep', position: 'insideBottomRight', offset: -10 }} 
                          />
                          <YAxis 
                            label={{ 
                              value: selectedMetric === 'voltage' ? 'Voltage (pu)' : 
                                     selectedMetric === 'load' ? 'Load (MW)' : 
                                     'Converter Power (MW)', 
                              angle: -90, 
                              position: 'insideLeft' 
                            }}
                          />
                          <Tooltip />
                          <Legend />
                          {prepareChartData.length > 0 && Object.keys(prepareChartData[0])
                            .filter(key => key !== 'name' && key.includes(selectedMetric === 'voltage' ? 'Voltage' : 
                                                                        selectedMetric === 'load' ? 'Load' : 
                                                                        'ConverterPower'))
                            .map((key, index) => (
                              <Area 
                                type="monotone" 
                                dataKey={key} 
                                key={key}
                                stroke={
                                  ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'][index % 8]
                                }
                                fillOpacity={0.3}
                                fill={
                                  ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'][index % 8]
                                }
                              />
                            ))
                          }
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p>No data found with the current filters. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p>No timesteps data available yet. Please start the simulation service.</p>
          </div>
        )
      )}
      
      {activeTab === 'kpi' && (
        <div className="text-center py-4">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">KPI Results - Coming Soon</h3>
            <p className="text-gray-600">
              The Key Performance Indicators (KPI) view is under development. This tab will display efficiency, economic, and environmental metrics for your DC power flow simulations.
            </p>
          </div>
          <p className="text-gray-600">
            Future metrics will include:
          </p>
          <ul className="mt-2 inline-block text-left text-gray-600">
            <li className="mb-1">• Energy efficiency and losses</li>
            <li className="mb-1">• Capital and operational expenses</li>
            <li className="mb-1">• Carbon footprint and environmental impact</li>
            <li className="mb-1">• System reliability statistics</li>
          </ul>
        </div>
      )}
    </div>
  );
}