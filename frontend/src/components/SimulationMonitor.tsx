'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface BusData {
  vm_pu: number;
  va_degree: number;
  p_mw: number;
  q_mvar: number;
}

interface LineSizingData {
  "Line Index": number;
  "From Bus": number;
  "To Bus": number;
  "Section (mm²)": number | null;
}

interface ConverterSizingData {
  "Converter Index": number;
  "Converter Name": string;
  "From Bus": number;
  "To Bus": number;
  "Nominal Power Installed (kW)": number;
}

interface SizingData {
  "Line Sizing": LineSizingData[];
  "Converter Sizing": ConverterSizingData[];
}

interface SimulationData {
  timestamp: number;
  res_bus: BusData[];
  sizing_data?: SizingData;
  is_mock?: boolean;
}

// Add a more specific interface for timesteps data
interface TimestepData {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  // Add other fields as needed
  [key: string]: string | number | boolean | object | undefined; // More specific types for additional fields
}

export default function SimulationMonitor() {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [sizingData, setSizingData] = useState<SizingData | null>(null);
  const [timestepsData, setTimestepsData] = useState<TimestepData[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('No updates yet');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [activeTab, setActiveTab] = useState<'powerFlow' | 'sizing' | 'timesteps'>('powerFlow');
  
  // Reference to the socket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Fetch timesteps results
  const fetchTimestepsResults = async () => {
    try {
      // Try fetching from the backend first
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/timesteps-results`);
        if (response.ok) {
          const data = await response.json();
          setTimestepsData(data);
          return;
        } else {
          console.warn('Backend endpoint failed, trying direct API access');
        }
      } catch (error) {
        console.warn('Error using backend endpoint, trying direct API access:', error);
      }
      
      // If backend fails, try direct access to the DC power flow API
      const directResponse = await fetch('http://localhost:5002/get-timesteps-results');
      if (directResponse.ok) {
        const directData = await directResponse.json();
        setTimestepsData(directData);
        console.log('Successfully fetched timesteps data directly from DC power flow API');
      } else {
        console.error('Failed to fetch timesteps results from both sources');
      }
    } catch (error) {
      console.error('Error fetching timesteps results:', error);
    }
  };
  
  // Fetch sizing results separately
  const fetchSizingResults = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/sizing-results`);
      if (response.ok) {
        const data = await response.json();
        setSizingData(data);
      } else {
        console.error('Failed to fetch sizing results');
      }
    } catch (error) {
      console.error('Error fetching sizing results:', error);
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
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/latest-results`);
        if (response.ok) {
          const data = await response.json();
          setSimulationData(data);
          if (data.sizing_data) {
            setSizingData(data.sizing_data);
          }
          setLastUpdate(new Date(data.timestamp * 1000).toLocaleTimeString());
          setIsRunning(true);
        } else {
          const errorData = await response.json();
          setError(`Error fetching data: ${errorData.error || response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching initial simulation data:', error);
        setError(`Error connecting to server: ${(error as Error).message}`);
      }
    };
    
    fetchInitialData();
    fetchSizingResults();
    fetchTimestepsResults(); // Fetch timesteps data
    
    // Listen for real-time updates
    socketConnection.on('simulation_update', (data: SimulationData) => {
      // Only update if not paused
      if (!isPaused) {
        setSimulationData(data);
        if (data.sizing_data) {
          setSizingData(data.sizing_data);
        }
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
  
  // Function to start the simulation service
  const startSimulationService = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/start-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Simulation service status:', data.status);
        setIsRunning(true);
        setIsPaused(false); // Resume updates when starting
      } else {
        const errorData = await response.json();
        setError(`Failed to start simulation: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error starting simulation service:', error);
      setError(`Error connecting to server: ${(error as Error).message}`);
    }
  };
  
  // Function to toggle pausing updates (client-side only)
  const togglePauseUpdates = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Also inform the server about this client's preference
    if (socket && socket.connected) {
      socket.emit('toggle_simulation_updates', newPausedState);
    }
    
    console.log(`${newPausedState ? 'Paused' : 'Resumed'} receiving updates from simulation`);
  };
  
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
            onClick={startSimulationService}
            className={`px-4 py-2 ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white rounded`}
            disabled={isRunning}
          >
            Start Simulation
          </button>
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
        {simulationData?.is_mock && (
          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            Using mock data
          </span>
        )}
      </div>
      
      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <div className="flex">
          <button
            className={`px-4 py-2 ${activeTab === 'powerFlow' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('powerFlow')}
          >
            Power Flow Results
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'sizing' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('sizing')}
          >
            Sizing Results
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'timesteps' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('timesteps')}
          >
            Timesteps Results
          </button>
        </div>
      </div>
      
      {activeTab === 'powerFlow' && (
        simulationData ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Bus</th>
                  <th className="py-2 px-4 border">Voltage (p.u.)</th>
                  <th className="py-2 px-4 border">Angle (deg)</th>
                  <th className="py-2 px-4 border">Active Power (MW)</th>
                  <th className="py-2 px-4 border">Reactive Power (Mvar)</th>
                </tr>
              </thead>
              <tbody>
                {simulationData.res_bus.map((bus, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-2 px-4 border">{`Bus ${index}`}</td>
                    <td className="py-2 px-4 border">
                      {bus.vm_pu !== null && typeof bus.vm_pu === 'number' ? bus.vm_pu.toFixed(4) : '-'}
                    </td>
                    <td className="py-2 px-4 border">
                      {bus.va_degree !== null && typeof bus.va_degree === 'number' ? 
                        bus.va_degree.toFixed(4) : '-'}
                    </td>
                    <td className="py-2 px-4 border">
                      {bus.p_mw !== null && typeof bus.p_mw === 'number' ? bus.p_mw.toFixed(6) : '-'}
                    </td>
                    <td className="py-2 px-4 border">
                      {bus.q_mvar !== null && typeof bus.q_mvar === 'number' ? 
                        bus.q_mvar.toFixed(6) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p>No simulation data available yet. Please start the simulation service.</p>
          </div>
        )
      )}
      
      {activeTab === 'sizing' && (
        sizingData ? (
          <div>
            <h3 className="text-lg font-semibold mb-2">Line Sizing</h3>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border">Line Index</th>
                    <th className="py-2 px-4 border">From Bus</th>
                    <th className="py-2 px-4 border">To Bus</th>
                    <th className="py-2 px-4 border">Section (mm²)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizingData["Line Sizing"].map((line, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border">{line["Line Index"]}</td>
                      <td className="py-2 px-4 border">{line["From Bus"]}</td>
                      <td className="py-2 px-4 border">{line["To Bus"]}</td>
                      <td className="py-2 px-4 border">
                        {line["Section (mm²)"] !== null ? line["Section (mm²)"] : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Converter Sizing</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border">Converter Index</th>
                    <th className="py-2 px-4 border">Converter Name</th>
                    <th className="py-2 px-4 border">From Bus</th>
                    <th className="py-2 px-4 border">To Bus</th>
                    <th className="py-2 px-4 border">Nominal Power (kW)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizingData["Converter Sizing"].map((converter, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border">{converter["Converter Index"]}</td>
                      <td className="py-2 px-4 border">{converter["Converter Name"]}</td>
                      <td className="py-2 px-4 border">{converter["From Bus"]}</td>
                      <td className="py-2 px-4 border">{converter["To Bus"]}</td>
                      <td className="py-2 px-4 border">{converter["Nominal Power Installed (kW)"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p>No sizing data available yet. Please start the simulation service.</p>
          </div>
        )
      )}
      
      {activeTab === 'timesteps' && (
        timestepsData ? (
          <div className="overflow-x-auto">
            <div className="mb-4 text-sm">
              <p className="text-gray-600">This is the time series data from the simulation. It shows how values change over time for each bus.</p>
            </div>
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
                {timestepsData.slice(0, 100).map((step, index) => {
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
            {timestepsData.length > 100 && (
              <div className="mt-2 text-sm text-gray-500">
                Showing first 100 of {timestepsData.length} records
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p>No timesteps data available yet. Please start the simulation service.</p>
          </div>
        )
      )}
    </div>
  );
}