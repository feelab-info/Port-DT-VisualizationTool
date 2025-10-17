import React, { useState, useEffect } from 'react';
import vesselSimulationService, { SimulationDetail } from '@/services/VesselSimulationService';
import VesselEnergyProfile from './VesselEnergyProfile';
import { Ship, Clock, Users, Ruler, Zap, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface VesselInputProps {
  onSubmit: (data: SimulationDetail) => void;
}

export default function VesselInput({ onSubmit }: VesselInputProps) {
  const [mode, setMode] = useState<'registered' | 'custom'>('registered');
  const [availableVessels, setAvailableVessels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vesselResult, setVesselResult] = useState<SimulationDetail | null>(null);
  const [isLoadingVessels, setIsLoadingVessels] = useState(true);
  
  const [formData, setFormData] = useState({
    vessel_name: '',
    name: '',
    gross_tonnage: '',
    length: '',
    hotel_energy: '',
    arrival_time: '',
    departure_time: ''
  });

  useEffect(() => {
    loadAvailableVessels();
  }, []);

  const loadAvailableVessels = async () => {
    try {
      setIsLoadingVessels(true);
      const vessels = await vesselSimulationService.getAvailableVessels();
      setAvailableVessels(vessels);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load vessels');
    } finally {
      setIsLoadingVessels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let result;
      if (mode === 'registered') {
        const payload = {
          vessel_name: formData.vessel_name,
          arrival_time: formData.arrival_time,
          departure_time: formData.departure_time,
        };
        console.log('🚢 Submitting registered vessel with payload:', payload);
        result = await vesselSimulationService.submitRegisteredVessel(payload);
        console.log('🚢 Received result from backend:', result);
        console.log('🚢 Result has energy_profile_data?', result?.data?.energy_profile_data ? 'YES' : 'NO');
        if (result?.data?.energy_profile_data) {
          console.log('🚢 Energy profile data length:', result.data.energy_profile_data.length);
        }
      } else {
        const payload = {
          name: formData.name,
          gross_tonnage: formData.gross_tonnage ? parseFloat(formData.gross_tonnage) : 0,
          length: formData.length ? parseFloat(formData.length) : 0,
          hotel_energy: formData.hotel_energy ? parseFloat(formData.hotel_energy) : 0,
          arrival_time: formData.arrival_time,
          departure_time: formData.departure_time,
        };
        console.log('🚢 Submitting custom vessel with payload:', payload);
        result = await vesselSimulationService.submitCustomVessel(payload);
        console.log('🚢 Received result from backend:', result);
        console.log('🚢 Result has energy_profile_data?', result?.data?.energy_profile_data ? 'YES' : 'NO');
        if (result?.data?.energy_profile_data) {
          console.log('🚢 Energy profile data length:', result.data.energy_profile_data.length);
        }
      }
      
      setVesselResult(result);
      onSubmit(result);
    } catch (error) {
      console.error('🚢 Error submitting vessel:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit vessel data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vessel_name: '',
      name: '',
      gross_tonnage: '',
      length: '',
      hotel_energy: '',
      arrival_time: '',
      departure_time: ''
    });
    setError(null);
    setVesselResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Compact Header Section */}
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
            <Ship className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Vessel Energy Profile Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-sm">
          Generate detailed energy consumption profiles for vessels based on historical data or custom specifications
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Mode Selection Header */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Select Vessel Type
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                value="registered"
                checked={mode === 'registered'}
                onChange={(e) => setMode(e.target.value as 'registered' | 'custom')}
                className="mr-3 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <div className="flex items-center">
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg mr-3 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-700">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">Registered Vessel</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Use existing vessel from our database</p>
                </div>
              </div>
            </label>
            
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                value="custom"
                checked={mode === 'custom'}
                onChange={(e) => setMode(e.target.value as 'registered' | 'custom')}
                className="mr-3 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg mr-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-700">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">Custom Vessel</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enter custom vessel specifications</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Vessel Selection/Input Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <Ship className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Vessel Information
            </h3>
            
            {mode === 'registered' ? (
              <div>
                <label htmlFor="vessel-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Vessel
                </label>
                {isLoadingVessels ? (
                  <div className="flex items-center justify-center py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-300">Loading vessels...</span>
                  </div>
                ) : (
                  <select
                    id="vessel-select"
                    value={formData.vessel_name}
                    onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="" className="text-gray-500 dark:text-gray-400">Choose a vessel from database</option>
                    {availableVessels.map(vessel => (
                      <option key={vessel} value={vessel} className="text-gray-900 dark:text-gray-100">{vessel}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="vessel-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vessel Name
                  </label>
                  <input
                    type="text"
                    id="vessel-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter vessel name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="gross-tonnage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    Gross Tonnage
                  </label>
                  <input
                    type="number"
                    id="gross-tonnage"
                    value={formData.gross_tonnage}
                    onChange={(e) => setFormData({ ...formData, gross_tonnage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 50000"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="length" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Ruler className="h-4 w-4 mr-1" />
                    Length (meters)
                  </label>
                  <input
                    type="number"
                    id="length"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 200"
                    min="0"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="hotel-energy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Zap className="h-4 w-4 mr-1" />
                    Hotel Energy (kW)
                  </label>
                  <input
                    type="number"
                    id="hotel-energy"
                    value={formData.hotel_energy}
                    onChange={(e) => setFormData({ ...formData, hotel_energy: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 1500"
                    min="0"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Schedule Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Schedule Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="arrival-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Arrival Time
                </label>
                <input
                  type="time"
                  id="arrival-time"
                  step="1"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="departure-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Departure Time
                </label>
                <input
                  type="time"
                  id="departure-time"
                  step="1"
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
                loading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Generate Energy Profile
                </>
              )}
            </button>
            
            {(vesselResult || error) && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Reset Form
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Section */}
      {vesselResult && vesselResult.success && (
        <div className="mt-8">
          <VesselEnergyProfile 
            closest_ship={vesselResult.closest_ship}
            data={vesselResult.data}
            message={vesselResult.message}
            scaling_factor={vesselResult.scaling_factor}
            success={vesselResult.success}
          />
        </div>
      )}
    </div>
  );
}