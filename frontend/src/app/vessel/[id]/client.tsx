'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import VesselEnergyProfile from '@/components/VesselEnergyProfile';
import vesselSimulationService, { 
  SimulationDetail
} from '@/services/VesselSimulationService';

export function VesselDetailPageClient({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const date = searchParams.get('date');
  const decodedVesselId = decodeURIComponent(id);
  const vesselName = decodedVesselId.replace(/-/g, ' ');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vesselData, setVesselData] = useState<SimulationDetail | null>(null);

  useEffect(() => {
    const fetchVesselData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch simulation data for the date
        const formattedDate = date || new Date().toISOString().split('T')[0];
        const simulationsData = await vesselSimulationService.getDetailedSimulations(formattedDate);
        
        if (!simulationsData.success || !simulationsData.simulations || simulationsData.simulations.length === 0) {
          throw new Error('No vessel data available for the selected date');
        }
        
        // Find the vessel by name (case insensitive)
        const vessel = simulationsData.simulations.find(
          sim => sim.data.vessel.toLowerCase() === vesselName.toLowerCase()
        );
        
        if (!vessel) {
          throw new Error(`Vessel "${vesselName}" not found in the simulation data`);
        }
        
        setVesselData(vessel);
      } catch (error) {
        console.error('Error fetching vessel data:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVesselData();
  }, [id, date, vesselName]);
  
  // Calculate total energy consumption
  const calculateTotalEnergy = (): number => {
    if (!vesselData || !vesselData.data.energy_profile_data || vesselData.data.energy_profile_data.length === 0) {
      return 0;
    }
    
    return vesselData.data.energy_profile_data.reduce((sum, point) => {
      return sum + (point['Chillers Power'] + point['Hotel Power']);
    }, 0) / 12; // Assuming 5-minute intervals (12 readings per hour)
  };
  
  // Get stay duration in hours
  const getStayDuration = (): number => {
    if (!vesselData || !vesselData.data.arrival_time || !vesselData.data.departure_time) {
      return 0;
    }
    
    const arrivalParts = vesselData.data.arrival_time.split(':').map(Number);
    const departureParts = vesselData.data.departure_time.split(':').map(Number);
    
    const arrivalHours = arrivalParts[0] + arrivalParts[1] / 60;
    const departureHours = departureParts[0] + departureParts[1] / 60;
    
    return departureHours - arrivalHours;
  };

  return (
    <DashboardLayout showHealthNotification={false}>
      <div className="container mx-auto space-y-8">
        {/* Simplified Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Vessel Energy Profile</h1>
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{date ? new Date(date).toLocaleDateString('pt-PT') : 'Today'}</span>
            </div>
          </div>
          <Link 
            href="/prediction" 
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Vessels</span>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading vessel data...</h3>
              <p className="text-gray-600 dark:text-gray-400">Fetching detailed energy profile information</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-8">
              <div className="flex items-start space-x-4 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error loading vessel data</h3>
                  <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
                  <Link 
                    href="/prediction" 
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Return to Vessels List</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : vesselData ? (
          <>
            {/* Enhanced Vessel Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 px-8 py-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{vesselData.data.vessel}</h2>
                      <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Based on <span className="font-medium text-blue-600 dark:text-blue-400">{vesselData.closest_ship}</span> model</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="bg-white dark:bg-gray-700 rounded-xl px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Scaling Factor</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{vesselData.scaling_factor.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Info Cards Grid */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Vessel Details Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vessel Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Gross Tonnage</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{vesselData.data.gross_tonnage.toLocaleString()} GT</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Length</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{vesselData.data.length} m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Hotel Energy</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{vesselData.data.hotel_energy.toLocaleString()} kWh</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Port Visit Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-700 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Port Visit</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Arrival Time</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{vesselData.data.arrival_time}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Departure Time</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{vesselData.data.departure_time}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Stay Duration</span>
                        <span className="font-semibold text-green-700 dark:text-green-400">{getStayDuration().toFixed(1)} hours</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Energy Summary Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-700 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Energy Summary</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Energy</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">{calculateTotalEnergy().toFixed(2)} kWh</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Data Points</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{vesselData.data.energy_profile_data.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Energy Rate</span>
                        <span className="font-semibold text-orange-700 dark:text-orange-400">
                          {(calculateTotalEnergy() / getStayDuration()).toFixed(2)} kWh/h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Energy Profile Chart Section */}
            
            <VesselEnergyProfile 
              closest_ship={vesselData.closest_ship}
              data={vesselData.data}
              message={vesselData.message}
              scaling_factor={vesselData.scaling_factor}
              success={vesselData.success}
            />
              
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No vessel data found</h3>
              <p className="text-gray-600 dark:text-gray-400">The requested vessel information is not available.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 