import { useState, useEffect } from 'react';
import { converterDataService, ConverterData } from '@/services/ConverterDataService';

export function useConverterData() {
  const [allData, setAllData] = useState<ConverterData[]>([]);
  const [latestData, setLatestData] = useState<ConverterData[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataStale, setIsDataStale] = useState(false);

  useEffect(() => {
    // Set up event listeners
    const handleDataUpdate = (data: ConverterData[]) => {
      setAllData(data);
      setIsLoading(false);
      setIsDataStale(false);
    };

    const handleLatestUpdate = (data: ConverterData[]) => {
      setLatestData(data);
      setIsDataStale(false);
      setIsLoading(false); // Also stop loading when we get latest data
    };

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleError = (error: string) => {
      console.error('Converter data service error:', error);
      setIsConnected(false);
    };

    // Add listeners
    converterDataService.on('data-update', handleDataUpdate);
    converterDataService.on('latest-update', handleLatestUpdate);
    converterDataService.on('connected', handleConnected);
    converterDataService.on('error', handleError);

    // Check initial connection state and data
    setIsConnected(converterDataService.isConnected());
    const initialData = converterDataService.getData();
    const initialLatest = converterDataService.getLatestByNode();
    
    if (initialData.length > 0 || initialLatest.length > 0) {
      setAllData(initialData);
      setLatestData(initialLatest);
      setIsLoading(false);
    }

    // Check data staleness periodically
    const staleCheckInterval = setInterval(() => {
      setIsDataStale(converterDataService.isDataStale());
    }, 10000); // Check every 10 seconds

    // Clean up listeners on unmount
    return () => {
      converterDataService.off('data-update', handleDataUpdate);
      converterDataService.off('latest-update', handleLatestUpdate);
      converterDataService.off('connected', handleConnected);
      converterDataService.off('error', handleError);
      clearInterval(staleCheckInterval);
    };
  }, []);

  // Filter data by selected node
  const filteredData = selectedNode === 'all' 
    ? allData 
    : allData.filter(item => item.node === selectedNode);

  // Get filtered latest data
  const filteredLatestData = selectedNode === 'all'
    ? latestData
    : latestData.filter(item => item.node === selectedNode);

  return {
    allData,
    latestData,
    filteredData,
    filteredLatestData,
    selectedNode,
    setSelectedNode,
    isConnected,
    isLoading,
    isDataStale
  };
}
