import React, { useState, useEffect } from 'react';
import { simulationService } from '../services/SimulationService';

interface VesselInputProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void;
}

export default function VesselInput({ onSubmit }: VesselInputProps) {
  const [mode, setMode] = useState<'registered' | 'custom'>('registered');
  const [availableVessels, setAvailableVessels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      const vessels = await simulationService.getAvailableVessels();
      setAvailableVessels(vessels);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load vessels');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Convert string values to numbers for the custom vessel
      const processedData = mode === 'registered' 
        ? {
            vessel_name: formData.vessel_name,
            arrival_time: formData.arrival_time,
            departure_time: formData.departure_time
          }
        : {
            name: formData.name,
            gross_tonnage: formData.gross_tonnage ? parseFloat(formData.gross_tonnage) : 0,
            length: formData.length ? parseFloat(formData.length) : 0,
            hotel_energy: formData.hotel_energy ? parseFloat(formData.hotel_energy) : 0,
            arrival_time: formData.arrival_time,
            departure_time: formData.departure_time
          };
      
      const result = mode === 'registered' 
        ? await simulationService.submitRegisteredVessel(processedData)
        : await simulationService.submitCustomVessel(processedData);
      
      onSubmit(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit vessel data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow">
      <div className="mb-4">
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            value="registered"
            checked={mode === 'registered'}
            onChange={(e) => setMode(e.target.value as 'registered' | 'custom')}
            className="mr-2"
          />
          Registered Vessel
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            value="custom"
            checked={mode === 'custom'}
            onChange={(e) => setMode(e.target.value as 'registered' | 'custom')}
            className="mr-2"
          />
          Custom Vessel
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'registered' ? (
          <div className="mb-4">
            <label className="block mb-2">Vessel Name</label>
            <select
              value={formData.vessel_name}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a vessel</option>
              {availableVessels.map(vessel => (
                <option key={vessel} value={vessel}>{vessel}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block mb-2">Vessel Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block mb-2">Gross Tonnage</label>
                <input
                  type="number"
                  value={formData.gross_tonnage}
                  onChange={(e) => setFormData({ ...formData, gross_tonnage: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Length (m)</label>
                <input
                  type="number"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Hotel Energy (kW)</label>
                <input
                  type="number"
                  value={formData.hotel_energy}
                  onChange={(e) => setFormData({ ...formData, hotel_energy: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
          </>
        )}
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2">Arrival Time (HH:MM:SS)</label>
            <input
              type="time"
              step="1"
              value={formData.arrival_time}
              onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Departure Time (HH:MM:SS)</label>
            <input
              type="time"
              step="1"
              value={formData.departure_time}
              onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-2 text-white rounded ${
            loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Processing...' : 'Submit Vessel Data'}
        </button>
      </form>
    </div>
  );
}