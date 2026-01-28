import { connectToMongo } from './databaseService';

// Configuration
const CONVERTER_NODES = ['N01', 'N02', 'N03', 'N04', 'N05'];

// Converter name mappings
const CONVERTER_NAMES: Record<string, string> = {
  'N01': 'ConverterBAT',
  'N02': 'ConverterPV',
  'N03': 'ConverterEV1',
  'N04': 'ConverterEV2',
  'N05': 'ConverterACDC'
};

/**
 * Get converter friendly name by node ID
 */
export function getConverterName(node: string): string {
  return CONVERTER_NAMES[node] || node;
}

/**
 * Get all converter mappings
 */
export function getConverterMappings(): Record<string, string> {
  return { ...CONVERTER_NAMES };
}

/**
 * Converter data interface matching MongoDB structure
 */
export interface ConverterData {
  _id: string;
  timestamp: string;
  node: string;
  aggregation: {
    period_start: string;
    period_end: string;
    sample_count: number;
    duration_seconds: number;
  };
  status: {
    SystemState: number;
    SystemSubState: number;
    SystemDcdcState: number;
    SystemMode: number;
    SystemConfiguration: number;
    itfc_critical_fault_word: number;
  };
  flags: {
    CurrentRegulationFlag: number;
    VoltageRegulationFlag: number;
    ActivePowerRegulationFlag: number;
    ReactivePowerRegulationFlag: number;
    MaxBatteryChargingCurrentFlag: number;
    MaxBatteryDishargingCurrentFlag: number;
    SafeCFlag: number;
    PfcOnFlag: number;
    DcdcOnFlag: number;
    InputCurrentLimitationFlag: number;
    LoadImpedanceLimitationFlag: number;
    ThermalLimitationFlag: number;
    GridDetectionFlag: number;
    AggregatedPlusFalg: number;
  };
  limits: {
    itfc_v_batt_max: number;
    itfc_i_batt_max: number;
    itfc_i_grid_max: number;
    itfc_P_max: number;
  };
  available_power: {
    itfc_pos_active_available_power: number;
    itfc_neg_active_available_power: number;
    itfc_pos_ractive_available_power: number;
    itfc_neg_ractive_available_power: number;
  };
  L1: {
    V: number;
    I: number;
    P: number;
    Q: number;
  };
  L2: {
    V: number;
    I: number;
    P: number;
    Q: number;
  };
  L3: {
    V: number;
    I: number;
    P: number;
    Q: number;
  };
  grid: {
    V: number;
    I: number;
    P: number;
    Q: number;
  };
  battery: {
    V: number;
    I: number;
    P: number;
    available_I: number;
  };
  producer: string;
  device: string;
}

/**
 * Get the list of converter nodes
 */
export function getConverterNodes(): string[] {
  return CONVERTER_NODES;
}

/**
 * Collect latest converter data from MongoDB
 */
export async function collectLatestConverterData(): Promise<ConverterData[]> {
  try {
    const db = await connectToMongo();
    const convertersCollection = db.collection('Converters');
    
    console.log('Fetching latest converter data for nodes:', CONVERTER_NODES);
    
    // Get the latest reading for each converter node
    // Look back 7 days to ensure we find data even if it's old
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const latestReadings = await convertersCollection.aggregate([
      // Match documents for our target nodes (within last 7 days)
      { 
        $match: { 
          node: { $in: CONVERTER_NODES },
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      
      // Sort within each node group
      { $sort: { node: 1, timestamp: -1 } },
      
      // Group by node and get only the first (most recent) document
      { 
        $group: {
          _id: "$node",
          latestDoc: { $first: "$$ROOT" }
        }
      },
      
      // Replace the root to get the original document structure
      { $replaceRoot: { newRoot: "$latestDoc" } },
      
      // Sort by node name for consistent ordering
      { $sort: { node: 1 } }
    ]).toArray();
    
    console.log(`Retrieved ${latestReadings.length} converter readings out of ${CONVERTER_NODES.length} nodes`);
    
    // Enrich with converter names
    const enrichedReadings = latestReadings.map(reading => ({
      ...reading,
      converterName: getConverterName(reading.node)
    }));
    
    return enrichedReadings as any[];
  } catch (error) {
    console.error('Error collecting converter data:', error);
    return [];
  }
}

/**
 * Collect historical converter data for a specific node and date range
 */
export async function collectHistoricalConverterData(
  node?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ConverterData[]> {
  try {
    const db = await connectToMongo();
    const convertersCollection = db.collection('Converters');
    
    // Build query
    const query: any = {};
    
    // Add node filter if provided
    if (node) {
      if (!CONVERTER_NODES.includes(node)) {
        console.warn(`Node ${node} not in the list of valid converter nodes`);
        return [];
      }
      query.node = node;
    } else {
      // If no specific node, get all converter nodes
      query.node = { $in: CONVERTER_NODES };
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    }
    
    console.log('Querying historical converter data with:', JSON.stringify(query));
    
    // Calculate appropriate limit based on date range
    let recordLimit = 10000; // Default limit
    if (startDate && endDate) {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      // Each converter sends data every 30 seconds, so ~2 records/minute, 120/hour, 2880/day
      recordLimit = Math.max(10000, daysDiff * 3000 * (node ? 1 : CONVERTER_NODES.length));
    }
    
    const historicalData = await convertersCollection
      .find(query)
      .sort({ timestamp: 1 }) // Sort by timestamp ascending
      .limit(recordLimit)
      .toArray();
    
    console.log(`Found ${historicalData.length} historical converter records`);
    
    // Enrich with converter names
    const enrichedData = historicalData.map(reading => ({
      ...reading,
      converterName: getConverterName(reading.node)
    }));
    
    return enrichedData as any[];
  } catch (error) {
    console.error('Error collecting historical converter data:', error);
    return [];
  }
}

/**
 * Calculate total power across all three phases for a converter
 */
export function calculateConverterTotalPower(converter: ConverterData): number {
  const totalP = (converter.L1?.P || 0) + (converter.L2?.P || 0) + (converter.L3?.P || 0);
  return totalP / 1000; // Convert to kW
}

/**
 * Get converter statistics summary
 */
export function getConverterStatistics(data: ConverterData[]): any {
  const stats = {
    totalConverters: CONVERTER_NODES.length,
    activeConverters: data.length,
    totalActivePower: 0,
    totalReactivePower: 0,
    totalAvailablePower: 0,
    byNode: {} as Record<string, any>
  };
  
  data.forEach(converter => {
    const totalP = calculateConverterTotalPower(converter);
    const totalQ = ((converter.L1?.Q || 0) + (converter.L2?.Q || 0) + (converter.L3?.Q || 0)) / 1000;
    
    stats.totalActivePower += totalP;
    stats.totalReactivePower += totalQ;
    stats.totalAvailablePower += (converter.available_power?.itfc_pos_active_available_power || 0) / 1000;
    
    stats.byNode[converter.node] = {
      activePower: totalP,
      reactivePower: totalQ,
      batteryVoltage: converter.battery?.V || 0,
      batteryCurrent: converter.battery?.I || 0,
      batteryPower: (converter.battery?.P || 0) / 1000,
      gridVoltage: converter.grid?.V || 0,
      systemState: converter.status?.SystemState || 0,
      lastUpdate: converter.timestamp
    };
  });
  
  return stats;
}
