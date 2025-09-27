import { EventEmitter } from 'events';
import axios from 'axios';
import { authService } from './AuthService';

export interface VesselData {
  vesselId?: string;
  name: string;
  type: string;
  length: number;
  width: number;
  draft: number;
  arrivalTime: string;
  departureTime: string;
  cargoType?: string;
  cargoAmount?: number;
}

export interface VesselSimulationResult {
  vesselId: string;
  vesselName: string;
  arrivalTime: string;
  departureTime: string;
  energyConsumption: number;
  status: string;
  timestamp: number;
}

export interface EnergyProfileDataPoint {
  'Chillers Power': number;
  'Hotel Power': number;
  Timestamp: string;
}

export interface VesselDetailedData {
  arrival_time: string;
  departure_time: string;
  energy_profile_data: EnergyProfileDataPoint[];
  gross_tonnage: number;
  hotel_energy: number;
  length: number;
  vessel: string;
}

export interface SimulationDetail {
  closest_ship: string;
  data: VesselDetailedData;
  filename: string;
  message: string;
  scaling_factor: number;
  success: boolean;
}

export interface DetailedSimulationsResponse {
  success: boolean;
  simulations: SimulationDetail[];
  date?: string;
}

class VesselSimulationService extends EventEmitter {
  private baseUrl: string;

  constructor() {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
  }

  /**
   * Get a list of available vessel names
   */
  public async getAvailableVessels(): Promise<string[]> {
    try {
      const token = authService.getToken();
      const response = await axios.get(`${this.baseUrl}/api/vessel/available`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = response.data;
      if (data && Array.isArray(data.vessels)) {
        return data.vessels as string[];
      }
      if (Array.isArray(data)) {
        return data as string[];
      }
      console.warn('Unexpected response format from available vessels API:', data);
      return [];
    } catch (error) {
      console.error('Error fetching available vessels:', error);
      return [];
    }
  }

  /**
   * Submit vessel data for energy prediction
   */
  public async predictVesselEnergy(vesselData: VesselData): Promise<VesselSimulationResult> {
    try {
      const token = authService.getToken();
      const response = await axios.post(`${this.baseUrl}/api/vessel/registered`, vesselData, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Error predicting vessel energy:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Submit a registered vessel prediction using snake_case payload expected by backend
   */
  public async submitRegisteredVessel(payload: {
    vessel_name: string;
    arrival_time: string;
    departure_time: string;
  }): Promise<SimulationDetail> {
    try {
      const token = authService.getToken();
      const response = await axios.post(`${this.baseUrl}/api/vessel/registered`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data as SimulationDetail;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Submit a custom vessel prediction via backend
   */
  public async submitCustomVessel(payload: {
    name: string;
    gross_tonnage: number;
    length: number;
    hotel_energy: number;
    arrival_time: string;
    departure_time: string;
  }): Promise<SimulationDetail> {
    try {
      const token = authService.getToken();
      const response = await axios.post(`${this.baseUrl}/api/vessel/custom`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data as SimulationDetail;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get all recent vessel simulations
   */
  public async getVesselSimulations(): Promise<VesselSimulationResult[]> {
    try {
      const token = authService.getToken();
      const response = await axios.get(`${this.baseUrl}/api/vessel/simulations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = response.data;
      
      // Check if the response has a simulations array property
      if (data && data.simulations && Array.isArray(data.simulations)) {
        return data.simulations;
      }
      
      // If the response is already an array, return it directly
      if (Array.isArray(data)) {
        return data;
      }
      
      // If we got here, the response format is unexpected
      console.warn('Unexpected response format from vessel simulations API:', data);
      return [];
    } catch (error) {
      console.error('Error fetching vessel simulations:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get detailed energy profiles for vessels
   * @param date Optional date in YYYY-MM-DD format
   * @returns Detailed simulations with energy profiles
   */
  public async getDetailedSimulations(date?: string): Promise<DetailedSimulationsResponse> {
    try {
      const token = authService.getToken();
      
      // Try date-specific endpoint if a date is provided
      if (date) {
        try {
          const response = await axios.get(`${this.baseUrl}/api/vessel/simulations/${date}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.warn('❌ Status:', error.response?.status, 'Message:', error.response?.data);
          }
        }
      }
      
      // Skip the general endpoint as it returns old data - go straight to current-simulations
      const response = await axios.get(`${this.baseUrl}/api/vessel/current-simulations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        throw new Error(`All simulation endpoints failed. Last error: ${errorMessage}`);
      }
      throw error;
    }
  }
}

// Create a singleton instance
const vesselSimulationService = new VesselSimulationService();
export default vesselSimulationService;