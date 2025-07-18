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
      
      // Apply timestep filter if specified - match exact timestep number
      if (timestepFilter && step.timestamp) {
        const timestampStr = step.timestamp.toString();
        const match = timestampStr.match(/Timestep (\d+)/);
        const timestepNumber = match ? match[1] : '';
        if (timestepNumber !== timestepFilter) {
          return false;
        }
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
        className={`px-3 py-1 mx-1 ${currentPage === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500'} rounded border border-gray-300 dark:border-gray-600 transition-colors`}
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
      buttons.push(<span key="ellipsis1" className="px-2 text-gray-500 dark:text-gray-400">...</span>);
    }
    
    // Add pages in the middle
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button 
          key={i} 
          onClick={() => goToPage(i)} 
          className={`px-3 py-1 mx-1 ${currentPage === i ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500'} rounded border border-gray-300 dark:border-gray-600 transition-colors`}
        >
          {i}
        </button>
      );
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      buttons.push(<span key="ellipsis2" className="px-2 text-gray-500 dark:text-gray-400">...</span>);
    }
    
    // Always show last page if there is more than 1 page
    if (totalPages > 1) {
      buttons.push(
        <button 
          key="last" 
          onClick={() => goToPage(totalPages)} 
          className={`px-3 py-1 mx-1 ${currentPage === totalPages ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500'} rounded border border-gray-300 dark:border-gray-600 transition-colors`}
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
        const match = step.timestamp.toString().match(/Timestep (\d+)/);
        if (match) {
          timesteps.add(match[1]); // Add just the timestep number
        }
      }
    });
    
    return Array.from(timesteps).sort((a, b) => parseInt(a) - parseInt(b));
  }, [timestepsData]);
  
  // Prepare data for charts - redesigned for better readability
  const prepareChartData = useMemo(() => {
    if (!timestepsData) {
      console.log('No timestepsData available');
      return [];
    }
    
    console.log('timestepsData length:', timestepsData.length);
    console.log('filteredTimesteps length:', filteredTimesteps.length);
    
    if (filteredTimesteps.length === 0) {
      console.log('No filtered timesteps available');
      return [];
    }
    
    // Group data by timestamp and calculate statistics
    const timestepGroups = new Map<string, {
      timestamp: string;
      avgVoltage: number;
      minVoltage: number;
      maxVoltage: number;
      totalLoad: number;
      busCount: number;
      voltageStd: number;
      totalConverterPower: number;
      avgConverterPower: number;
      converterCount: number;
    }>();
    
    // Process all timesteps data or just the filtered ones
    const dataToProcess = filteredTimesteps;
    
    // Group by timestamp
    const rawGroups = new Map<string, number[]>();
    const loadGroups = new Map<string, number[]>();
    const converterPowerGroups = new Map<string, number[]>();
    
    dataToProcess.forEach(step => {
      const timestamp = step.timestamp?.toString() || '';
      
      if (!rawGroups.has(timestamp)) {
        rawGroups.set(timestamp, []);
        loadGroups.set(timestamp, []);
        converterPowerGroups.set(timestamp, []);
      }
      
      if (step.voltage !== undefined && step.voltage !== null) {
        rawGroups.get(timestamp)!.push(step.voltage);
      }
      
      if (step.load !== undefined && step.load !== null) {
        loadGroups.get(timestamp)!.push(step.load);
      }

      // Collect converter power data from all converter_X_power fields
      Object.keys(step).forEach(key => {
        if (key.includes('converter_') && key.includes('_power')) {
          const powerValue = step[key];
          if (powerValue !== undefined && powerValue !== null) {
            converterPowerGroups.get(timestamp)!.push(Number(powerValue));
          }
        }
      });
    });
    
    console.log('rawGroups size:', rawGroups.size);
    console.log('rawGroups keys:', Array.from(rawGroups.keys()));
    
    // Calculate statistics for each timestamp
    rawGroups.forEach((voltages, timestamp) => {
      if (voltages.length === 0) return;
      
      const loads = loadGroups.get(timestamp) || [];
      const converterPowers = converterPowerGroups.get(timestamp) || [];
      
      const avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
      const minVoltage = Math.min(...voltages);
      const maxVoltage = Math.max(...voltages);
      const totalLoad = loads.reduce((sum, l) => sum + l, 0);
      const totalConverterPower = converterPowers.reduce((sum, p) => sum + p, 0);
      const avgConverterPower = converterPowers.length > 0 ? totalConverterPower / converterPowers.length : 0;
      
      // Calculate standard deviation
      const variance = voltages.reduce((sum, v) => sum + Math.pow(v - avgVoltage, 2), 0) / voltages.length;
      const voltageStd = Math.sqrt(variance);
      
      timestepGroups.set(timestamp, {
        timestamp,
        avgVoltage,
        minVoltage,
        maxVoltage,
        totalLoad,
        busCount: voltages.length,
        voltageStd,
        totalConverterPower,
        avgConverterPower,
        converterCount: converterPowers.length
      });
    });
    
    // Convert to chart data
    const chartData = Array.from(timestepGroups.values()).map(group => ({
      name: group.timestamp,
      'Average Voltage': Number(group.avgVoltage.toFixed(6)),
      'Min Voltage': Number(group.minVoltage.toFixed(6)),
      'Max Voltage': Number(group.maxVoltage.toFixed(6)),
      'Total Load': Number(group.totalLoad.toFixed(6)),
      'Voltage Std Dev': Number(group.voltageStd.toFixed(6)),
      'Bus Count': group.busCount,
      'Total Converter Power': Number(group.totalConverterPower.toFixed(6)),
      'Average Converter Power': Number(group.avgConverterPower.toFixed(6)),
      'Converter Count': group.converterCount
    }));
    
    // Sort data by timestamp
    chartData.sort((a, b) => {
      const getTimestepNumber = (ts: string) => {
        const match = ts.match(/Timestep (\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const aNum = getTimestepNumber(a.name);
      const bNum = getTimestepNumber(b.name);
      return aNum - bNum;
    });
    
    console.log('Final chartData:', chartData);
    console.log('Sample chartData item:', chartData[0]);
    
    return chartData;
  }, [filteredTimesteps]);
  
  return (
    <div className="space-y-8">
      {/* Status Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className={`h-4 w-4 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  connectionStatus === 'connected' ? 'text-green-700 dark:text-green-400' : 
                  connectionStatus === 'connecting' ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium mr-2">Last Update:</span>
                <span>{lastUpdate}</span>
                {isPaused && (
                  <span className="ml-3 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full border border-yellow-200 dark:border-yellow-700 font-medium">
                    Paused
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={togglePauseUpdates}
              className={`px-4 py-2 ${isPaused ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700'} text-white rounded-lg font-medium transition-colors`}
            >
              {isPaused ? 'Resume Updates' : 'Pause Updates'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Connection Error</h3>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-600">
          <div className="flex px-6">
            <button
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timesteps' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('timesteps')}
            >
              Timesteps Results
            </button>
            <button
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kpi' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('kpi')}
            >
              KPI Results
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {activeTab === 'timesteps' && (
            timestepsData ? (
              <div className="space-y-8">
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p>This is the time series data from the simulation. It shows how values change over time for each bus.</p>
                </div>
                
                {/* Visualization controls */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Visualization Type:</h3>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button 
                        onClick={() => setVisualizationType('table')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          visualizationType === 'table' 
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Table
                      </button>
                      <button 
                        onClick={() => setVisualizationType('lineChart')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          visualizationType === 'lineChart' 
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Line Chart
                      </button>
                      <button 
                        onClick={() => setVisualizationType('areaChart')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          visualizationType === 'areaChart' 
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Area Chart
                      </button>
                    </div>
                  </div>
                  
                  {visualizationType !== 'table' && (
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Metric:</h3>
                      <select
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value as 'voltage' | 'load' | 'converterPower')}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="voltage">Voltage (pu)</option>
                        <option value="load">Load (MW)</option>
                        <option value="converterPower">Converter Power (MW)</option>
                      </select>
                    </div>
                  )}
                </div>
                
                {/* Filters */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Filters</h3>
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label htmlFor="busFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Bus ID:</label>
                      <select 
                        id="busFilter" 
                        value={busIdFilter === '' ? '' : busIdFilter.toString()}
                        onChange={(e) => setBusIdFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                          <label htmlFor="timestepFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Timestep:</label>
                          <select 
                            id="timestepFilter" 
                            value={timestepFilter}
                            onChange={(e) => setTimestepFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="">All Timesteps</option>
                            {uniqueTimesteps.map((ts) => (
                              <option key={ts} value={ts}>{ts}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="itemsPerPage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items per page:</label>
                          <select 
                            id="itemsPerPage" 
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1); // Reset to first page when changing items per page
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                        className="px-4 py-2 bg-gray-600 dark:bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">No timesteps data available yet</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please start the simulation service to begin collecting data.</p>
              </div>
            )
          )}
          
          {activeTab === 'kpi' && (
            <div className="text-center py-12">
              <div className="mx-auto max-w-md">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-3">KPI Results - Coming Soon</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    The Key Performance Indicators (KPI) view is under development. This tab will display efficiency, economic, and environmental metrics for your DC power flow simulations.
                  </p>
                  <div className="text-left bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-600">
                    <p className="text-gray-600 dark:text-gray-400 mb-3 font-medium">
                      Future metrics will include:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        Energy efficiency and losses
                      </li>
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        Capital and operational expenses
                      </li>
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        Carbon footprint and environmental impact
                      </li>
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        System reliability statistics
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart and Table Sections - Only show when timestepsData is available and there are filtered results */}
      {activeTab === 'timesteps' && timestepsData && filteredTimesteps.length > 0 && (
        <>
          {/* Table visualization */}
          {visualizationType === 'table' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V7a2 2 0 012-2h8a2 2 0 012 2v13H5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Simulation Data Table</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Power flow simulation timestep data</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredTimesteps.length} records
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bus ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Voltage (pu)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Load (MW)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Converter Power (MW)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Converter Loading (%)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {currentPageData.map((step, index) => {
                      // Find converter power and loading values
                      const converterPowerKeys = Object.keys(step).filter(key => key.includes('converter_') && key.includes('_power'));
                      const converterPower = converterPowerKeys.length > 0 ? step[converterPowerKeys[0]] : null;
                      
                      const converterLoadingKeys = Object.keys(step).filter(key => key.includes('converter_') && key.includes('_loading'));
                      const converterLoading = converterLoadingKeys.length > 0 ? step[converterLoadingKeys[0]] : null;
                      
                      return (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.timestamp || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.bus_id !== undefined ? step.bus_id : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.voltage !== undefined && step.voltage !== null ? step.voltage.toFixed(4) : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.load !== undefined && step.load !== null ? step.load.toFixed(6) : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{converterPower !== undefined && converterPower !== null ? Number(converterPower).toFixed(6) : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{converterLoading !== undefined && converterLoading !== null ? Number(converterLoading).toFixed(2) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-600 flex flex-wrap justify-between items-center">
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 md:mb-0">
                  Showing {filteredTimesteps.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredTimesteps.length)} of {filteredTimesteps.length} records
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center">
                    <button 
                      onClick={() => goToPage(currentPage - 1)} 
                      disabled={currentPage === 1}
                      className={`px-3 py-1 mx-1 ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500'} rounded border border-gray-300 dark:border-gray-600 transition-colors`}
                    >
                      Previous
                    </button>
                    
                    {renderPageButtons()}
                    
                    <button 
                      onClick={() => goToPage(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 mx-1 ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500'} rounded border border-gray-300 dark:border-gray-600 transition-colors`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Line Chart visualization */}
          {visualizationType === 'lineChart' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedMetric === 'voltage' ? 'Voltage Statistics Over Time' : 
                       selectedMetric === 'load' ? 'Total Load Over Time' : 
                       'Converter Power Over Time'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMetric === 'voltage' ? 'Average, minimum, and maximum voltage across all buses' : 
                       selectedMetric === 'load' ? 'Total load consumption across all buses' : 
                       'Total and average converter power across all converters'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="h-96 w-full">
                  {prepareChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">No chart data available</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          Data points: {prepareChartData.length} | 
                          Filtered timesteps: {filteredTimesteps.length} |
                          Raw timesteps: {timestepsData?.length || 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={prepareChartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6B7280"
                          label={{ value: 'Timestep', position: 'insideBottomRight', offset: -10 }} 
                        />
                        <YAxis 
                          stroke="#6B7280"
                          label={{ 
                            value: selectedMetric === 'voltage' ? 'Voltage (pu)' : 
                                   selectedMetric === 'load' ? 'Load (MW)' : 
                                   'Converter Power (MW)', 
                            angle: -90, 
                            position: 'insideLeft' 
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                        />
                        <Legend />
                        {selectedMetric === 'voltage' && (
                          <>
                            <Line 
                              type="monotone" 
                              dataKey="Average Voltage" 
                              stroke="#3B82F6"
                              strokeWidth={2}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="Min Voltage" 
                              stroke="#EF4444"
                              strokeWidth={1}
                              strokeDasharray="5 5"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="Max Voltage" 
                              stroke="#10B981"
                              strokeWidth={1}
                              strokeDasharray="5 5"
                            />
                          </>
                        )}
                        {selectedMetric === 'load' && (
                          <Line 
                            type="monotone" 
                            dataKey="Total Load" 
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                          />
                        )}
                        {selectedMetric === 'converterPower' && (
                          <>
                            <Line 
                              type="monotone" 
                              dataKey="Total Converter Power" 
                              stroke="#F59E0B"
                              strokeWidth={2}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="Average Converter Power" 
                              stroke="#06B6D4"
                              strokeWidth={1}
                              strokeDasharray="3 3"
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Area Chart visualization */}
          {visualizationType === 'areaChart' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedMetric === 'voltage' ? 'Voltage Range Over Time' : 
                       selectedMetric === 'load' ? 'Load Accumulation Over Time' : 
                       'Converter Power Over Time'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMetric === 'voltage' ? 'Voltage range showing min-max spread across all buses' : 
                       selectedMetric === 'load' ? 'Cumulative load showing total system demand' : 
                       'Total converter power showing system power conversion'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="h-96 w-full">
                  {prepareChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">No chart data available</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                          Data points: {prepareChartData.length} | 
                          Filtered timesteps: {filteredTimesteps.length} |
                          Raw timesteps: {timestepsData?.length || 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={prepareChartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6B7280"
                          label={{ value: 'Timestep', position: 'insideBottomRight', offset: -10 }} 
                        />
                        <YAxis 
                          stroke="#6B7280"
                          label={{ 
                            value: selectedMetric === 'voltage' ? 'Voltage (pu)' : 
                                   selectedMetric === 'load' ? 'Load (MW)' : 
                                   'Converter Power (MW)', 
                            angle: -90, 
                            position: 'insideLeft' 
                          }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                        />
                        <Legend />
                        {selectedMetric === 'voltage' && (
                          <>
                            <Area 
                              type="monotone" 
                              dataKey="Max Voltage" 
                              stackId="1"
                              stroke="#10B981"
                              fill="#10B981"
                              fillOpacity={0.3}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="Average Voltage" 
                              stackId="1"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.6}
                            />
                          </>
                        )}
                        {selectedMetric === 'load' && (
                          <Area 
                            type="monotone" 
                            dataKey="Total Load" 
                            stroke="#8B5CF6"
                            fill="#8B5CF6"
                            fillOpacity={0.4}
                          />
                        )}
                        {selectedMetric === 'converterPower' && (
                          <Area 
                            type="monotone" 
                            dataKey="Total Converter Power" 
                            stroke="#F59E0B"
                            fill="#F59E0B"
                            fillOpacity={0.4}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* No data fallback when filtered results are empty */}
          {filteredTimesteps.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-12 text-center bg-gray-50 dark:bg-gray-700/50">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-600">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">No data found with the current filters</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}