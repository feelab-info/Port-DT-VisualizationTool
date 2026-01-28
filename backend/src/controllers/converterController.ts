import { Request, Response } from 'express';
import { collectLatestConverterData, collectHistoricalConverterData, getConverterNodes, getConverterStatistics, getConverterMappings } from '../services/converterDataService';

/**
 * Get all converter nodes with their friendly names
 */
export async function getConverterNodesList(req: Request, res: Response): Promise<void> {
  try {
    const nodes = getConverterNodes();
    const mappings = getConverterMappings();
    
    const nodesWithNames = nodes.map(node => ({
      node,
      name: mappings[node] || node
    }));
    
    res.json({
      status: 'success',
      nodes: nodesWithNames,
      mappings,
      count: nodes.length
    });
  } catch (error) {
    console.error('Error getting converter nodes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve converter nodes'
    });
  }
}

/**
 * Get latest converter data for all nodes
 */
export async function getLatestConverterData(req: Request, res: Response): Promise<void> {
  try {
    const converterData = await collectLatestConverterData();
    const statistics = getConverterStatistics(converterData);
    
    res.json({
      status: 'success',
      data: converterData,
      statistics,
      count: converterData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting latest converter data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve latest converter data'
    });
  }
}

/**
 * Get historical converter data with optional filters
 */
export async function getHistoricalConverterData(req: Request, res: Response): Promise<void> {
  try {
    const { node, startDate, endDate } = req.query;
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    // Validate node if provided
    if (node && typeof node !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid node parameter'
      });
      return;
    }
    
    const converterData = await collectHistoricalConverterData(
      node as string | undefined,
      start,
      end
    );
    
    const statistics = getConverterStatistics(converterData);
    
    res.json({
      status: 'success',
      data: converterData,
      statistics,
      count: converterData.length,
      filters: {
        node: node || 'all',
        startDate: startDate || 'none',
        endDate: endDate || 'none'
      }
    });
  } catch (error) {
    console.error('Error getting historical converter data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve historical converter data'
    });
  }
}

/**
 * Get converter statistics
 */
export async function getConverterStats(req: Request, res: Response): Promise<void> {
  try {
    const converterData = await collectLatestConverterData();
    const statistics = getConverterStatistics(converterData);
    
    res.json({
      status: 'success',
      statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting converter statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve converter statistics'
    });
  }
}
