/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import VesselInput from '@/components/VesselInput';
import Link from 'next/link';
import vesselSimulationService, { 
  VesselSimulationResult, 
  VesselData, 
  DetailedSimulationsResponse,
  SimulationDetail 
} from '@/services/VesselSimulationService';

export default function PredictionPage() {
  const [vesselResult, setVesselResult] = useState<VesselSimulationResult | null>(null);
  const [simulationResults, setSimulationResults] = useState<VesselSimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationsData, setSimulationsData] = useState<DetailedSimulationsResponse | null>(null);
  const [detailedSimulationError, setDetailedSimulationError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Fetch initial vessel simulation data using the service
    const fetchVesselSimulations = async () => {
      try {
        setIsLoading(true);
        const data = await vesselSimulationService.getVesselSimulations();
        setSimulationResults(data);
      } catch (error) {
        console.error('Error fetching vessel simulations:', error);
        setError(`Error fetching data: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch detailed energy profiles
    const fetchDetailedSimulations = async () => {
      setDetailedSimulationError(null);
      try {
        const data = await vesselSimulationService.getDetailedSimulations(selectedDate);
        setSimulationsData(data);
      } catch (error) {
        console.error('Error fetching detailed simulations:', error);
        setDetailedSimulationError((error as Error).message);
      }
    };
    
    fetchVesselSimulations();
    fetchDetailedSimulations();
    
    // Set up a polling interval to refresh data periodically if needed
    const intervalId = setInterval(() => {
      fetchVesselSimulations();
      fetchDetailedSimulations();
    }, 3000000); // Refresh every 3000 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [selectedDate]); // Add selectedDate as a dependency

  const handleVesselSubmit = async (data: VesselData) => {
    try {
      setIsLoading(true);
      setError(null);
      setVesselResult(null); // Clear previous result
      
      // Use the service to predict energy
      const result = await vesselSimulationService.predictVesselEnergy(data);
      setVesselResult(result);
      
      
    } catch (error) {
      console.error('Error submitting vessel data:', error);
      setError(`Prediction failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The useEffect will automatically trigger with the new selectedDate
  };

  // Function to calculate total energy consumption from energy profile data
  const calculateTotalEnergy = (simulation: SimulationDetail): number => {
    if (!simulation.data.energy_profile_data || simulation.data.energy_profile_data.length === 0) {
      return 0;
    }
    
    return simulation.data.energy_profile_data.reduce((sum, point) => {
      return sum + (point['Chillers Power'] + point['Hotel Power']);
    }, 0) / 12; // Assuming 5-minute intervals (12 readings per hour)
  };

  // Function to get stay duration in hours
  const getStayDuration = (simulation: SimulationDetail): number => {
    if (!simulation.data.arrival_time || !simulation.data.departure_time) {
      return 0;
    }
    
    const arrivalParts = simulation.data.arrival_time.split(':').map(Number);
    const departureParts = simulation.data.departure_time.split(':').map(Number);
    
    const arrivalHours = arrivalParts[0] + arrivalParts[1] / 60;
    const departureHours = departureParts[0] + departureParts[1] / 60;
    
    return departureHours - arrivalHours;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ship Energy Prediction</h1>
        </div>
        
        {/* Vessel Input Section */}
        <VesselInput onSubmit={handleVesselSubmit} />
        
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Processing simulation...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          </div>
        )}
        
        {vesselResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <h3 className="text-lg font-medium text-green-800 dark:text-green-300 mb-2">Prediction Results</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vessel Name</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{vesselResult.vesselName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Energy Consumption</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{vesselResult.energyConsumption || 'N/A'} kWh</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Arrival Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{vesselResult.arrivalTime ? new Date(vesselResult.arrivalTime).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Departure Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{vesselResult.departureTime ? new Date(vesselResult.departureTime).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* Date Selection Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historical Detailed Simulations</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select a date to view historical vessel energy data</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleDateSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="simulation-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  id="simulation-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 font-medium transition-colors"
              >
                Update
              </button>
            </form>
          </div>
        </div>

        {/* Vessel Energy Profiles Section */}
        {detailedSimulationError ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vessel Energy Profiles</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Historical vessel energy consumption data</p>
            </div>
            <div className="p-6">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium">No vessel data available</h3>
                    <p className="text-sm mt-1">{detailedSimulationError}</p>
                    <p className="text-sm mt-2">The server may not have any vessel data available yet or is experiencing technical difficulties.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          simulationsData && simulationsData.success && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vessel Energy Profiles</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {simulationsData.simulations.length} vessel{simulationsData.simulations.length !== 1 ? 's' : ''} found for {new Date(selectedDate).toLocaleDateString('pt-PT')}
                </p>
              </div>
              <div className="p-6">
                {simulationsData.simulations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {simulationsData.simulations.map((simulation, index) => {
                      const totalEnergy = calculateTotalEnergy(simulation);
                      const stayDuration = getStayDuration(simulation);
                      
                      // Create a URL-friendly vessel identifier
                      const vesselId = encodeURIComponent(simulation.data.vessel.replace(/\s+/g, '-').toLowerCase());
                      
                      return (
                        <div key={index} className="group border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 overflow-hidden">
                          <div className="p-5 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 group-hover:text-blue-900 dark:group-hover:text-blue-200 transition-colors">
                              {simulation.data.vessel}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Based on {simulation.closest_ship} model</p>
                          </div>
                          
                          <div className="p-5">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Arrival</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{simulation.data.arrival_time}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Departure</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{simulation.data.departure_time}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{stayDuration.toFixed(1)} hours</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Est. Energy</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{totalEnergy.toFixed(2)} kWh</p>
                              </div>
                            </div>
                            
                            <Link 
                              href={`/vessel/${vesselId}?date=${simulation.data.energy_profile_data[0]?.Timestamp?.split(' ')[0] || ''}`} 
                              className="block w-full py-3 px-4 text-center bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium group-hover:bg-blue-700 dark:group-hover:bg-blue-700"
                            >
                              View Detailed Profile
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No vessel energy profiles available</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try selecting a different date to view historical data.</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}