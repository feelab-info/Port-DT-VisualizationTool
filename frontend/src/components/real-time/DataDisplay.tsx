import React, { useMemo, useState } from 'react';
import { EnergyData } from '@/services/EnergyDataService';
import EnergyCharts from './EnergyCharts';

interface DataDisplayProps {
  filteredData: EnergyData[];
  deviceList: {id: string, name: string}[];
  selectedDevice: string | null;
  selectedDate: string;
  isHistoricalView: boolean;
  isLoading: boolean;
}

export default function DataDisplay({
  filteredData,
  deviceList,
  selectedDevice,
  selectedDate,
  isHistoricalView,
  isLoading
}: DataDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("table");

  // Helper function for safe rounding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeRound = (value: any): string => {
    if (value === undefined || value === null) {
      return 'N/A';
    }
    return Math.round(value).toString();
  };

  // Format device ID to make it more readable
  const formatDeviceId = (deviceId: string): string => {
    // Special formatting for known device patterns
    if (deviceId.startsWith('D') && !isNaN(Number(deviceId.substring(1)))) {
      return `Device ${deviceId}`;
    }
    if (deviceId === 'F9') {
      return 'Device F9';
    }
    if (deviceId === 'Entrada de energia') {
      return 'Entrada de energia';
    }
    
    // For hash-like device IDs, create a shortened display name
    if (deviceId.length > 10) {
      const shortHash = deviceId.substring(0, 8);
      return `Device ${shortHash}`;
    }
    
    // For other device IDs, use the first 8 characters
    return deviceId.substring(0, 8) + '...';
  };

  // Calculate total power for all filtered data - Fixed calculation
  const totalPower = filteredData.reduce((sum, item) => {
    // Use total power consumption (L1 + L2 + L3) instead of measure_cons
    const totalItemPower = (item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0);
    return sum + totalItemPower;
  }, 0);
  const avgPower = filteredData.length > 0 ? totalPower / filteredData.length : 0;

  // Pagination for large historical datasets
  const PAGE_SIZE_OPTIONS = [100, 250, 500, 1000];
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[1]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  const tableRows = visibleRows.map((item, index) => (
    <tr key={item._id} className={`${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {new Date(item.timestamp).toLocaleDateString('pt-PT')}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(item.timestamp).toLocaleTimeString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.deviceName || formatDeviceId(item.device)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {safeRound((item.L1?.P || 0) + (item.L2?.P || 0) + (item.L3?.P || 0))} W
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
          {safeRound(item.L1?.P)} W
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          {safeRound(item.L2?.P)} W
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
          {safeRound(item.L3?.P)} W
        </span>
      </td>
    </tr>
  ));

  const dataTable = (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
      {/* Pagination Controls */}
      {filteredData.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 md:justify-between px-4 py-3 text-sm border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-200">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 rounded border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-600'} border-gray-300 dark:border-gray-600`}
              aria-label="First page"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-2 py-1 rounded border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-600'} border-gray-300 dark:border-gray-600`}
              aria-label="Previous page"
            >‹</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 rounded border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-600'} border-gray-300 dark:border-gray-600`}
              aria-label="Next page"
            >›</button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 rounded border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-600'} border-gray-300 dark:border-gray-600`}
              aria-label="Last page"
            >»</button>
          </div>
          {/* Export Actions */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Export:</span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExportCsv(visibleRows, `energy-data_${selectedDate}_page-${currentPage}.csv`)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-medium shadow-sm hover:shadow-md"
                title="Export current page as CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>CSV Page</span>
              </button>
              
              <button
                onClick={() => handleExportCsv(filteredData, `energy-data_${selectedDate}_all.csv`)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-medium shadow-sm hover:shadow-md"
                title="Export all data as CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>CSV All</span>
              </button>
              
              <button
                onClick={() => handleExportPdf(visibleRows, `energy-report_${selectedDate}_page-${currentPage}.pdf`, selectedDevice, deviceList)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium shadow-sm hover:shadow-md"
                title="Export current page as PDF report"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>PDF Page</span>
              </button>
              
              <button
                onClick={() => handleExportPdf(filteredData, `energy-report_${selectedDate}_all.pdf`, selectedDevice, deviceList)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium shadow-sm hover:shadow-md"
                title="Export all data as PDF report"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>PDF All</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
        <thead className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Timestamp</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span>Device</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Total Consumption</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>L1 Power</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>L2 Power</span>
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>L3 Power</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
          {tableRows}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Simplified Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {selectedDevice 
            ? `Data for ${deviceList.find(d => d.id === selectedDevice)?.name || selectedDevice}`
            : `All Devices Data (${new Date(selectedDate).toLocaleDateString('pt-PT')})`}
        </h2>
        
        {isHistoricalView && (
          <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-700">
            Viewing historical data ({filteredData.length} records)
          </div>
        )}
      </div>

      {/* Stats Section */}
      {!isLoading && filteredData.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{filteredData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Power</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(totalPower)} W</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Power</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{Math.round(avgPower)} W</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Devices</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {selectedDevice ? 1 : new Set(filteredData.map(d => d.device)).size}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading data...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No data available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No data available for {selectedDevice ? 'this device' : 'today'}. Try selecting a different date or device.
          </p>
        </div>
      ) : (
        <div>
          {/* Tab Navigation */}
          <div className="mb-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex space-x-8">
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'table' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('table')}
              >
                Table View
              </button>
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'charts' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('charts')}
              >
                Charts
              </button>
            </div>
          </div>
          
          {activeTab === 'table' ? (
            dataTable
          ) : (
            <EnergyCharts 
              filteredData={filteredData}
              selectedDevice={selectedDevice}
              isHistoricalView={isHistoricalView}
            />
          )}
        </div>
      )}
    </div>
  );
}

function handleExportCsv(rows: EnergyData[], filename: string) {
  if (!rows || rows.length === 0) {
    return;
  }
  const headers = [
    'timestamp', 'device', 'deviceName', 'L1_P', 'L2_P', 'L3_P', 'L1_V', 'L2_V', 'L3_V', 'L1_I', 'L2_I', 'L3_I', 'L1_PF', 'L2_PF', 'L3_PF', 'measure_cons', 'producer'
  ];
  const escape = (val: unknown) => {
    if (val === undefined || val === null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    const line = [
      r.timestamp,
      r.device,
      r.deviceName || '',
      r.L1?.P ?? '', r.L2?.P ?? '', r.L3?.P ?? '',
      r.L1?.V ?? '', r.L2?.V ?? '', r.L3?.V ?? '',
      r.L1?.I ?? '', r.L2?.I ?? '', r.L3?.I ?? '',
      r.L1?.PF ?? '', r.L2?.PF ?? '', r.L3?.PF ?? '',
      r.measure_cons ?? '',
      r.producer ?? ''
    ].map(escape).join(',');
    lines.push(line);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function handleExportPdf(
  rows: EnergyData[],
  filename: string,
  selectedDevice: string | null,
  deviceList: { id: string; name: string }[]
) {
  if (!rows || rows.length === 0) return;
  const [{ default: jsPDF }, autoTableModule] = await Promise.all<[
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  ]>([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTable = (autoTableModule as any).default || (autoTableModule as any);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const deviceName = selectedDevice
    ? (deviceList.find(d => d.id === selectedDevice)?.name || selectedDevice)
    : null;
  const title = deviceName ? `Energy Report - ${deviceName}` : 'Energy Report - All Devices';
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  const generatedAt = new Date().toLocaleString();
  doc.text(`Generated at: ${generatedAt}`, 40, 58);
  doc.text(`Records: ${rows.length.toLocaleString()}`, 40, 72);

  const headers = [
    'Timestamp', 'Device', 'Total P (W)', 'L1 P', 'L2 P', 'L3 P', 'L1 V', 'L2 V', 'L3 V', 'L1 I', 'L2 I', 'L3 I', 'L1 PF', 'L2 PF', 'L3 PF'
  ];
  const body = rows.map(r => [
    new Date(r.timestamp).toLocaleString(),
    r.deviceName || deviceList.find(d => d.id === r.device)?.name || r.device,
    Math.round((r.L1?.P || 0) + (r.L2?.P || 0) + (r.L3?.P || 0)),
    Math.round(r.L1?.P || 0), Math.round(r.L2?.P || 0), Math.round(r.L3?.P || 0),
    Math.round(r.L1?.V || 0), Math.round(r.L2?.V || 0), Math.round(r.L3?.V || 0),
    Math.round(r.L1?.I || 0), Math.round(r.L2?.I || 0), Math.round(r.L3?.I || 0),
    (r.L1?.PF ?? ''), (r.L2?.PF ?? ''), (r.L3?.PF ?? '')
  ]);

  autoTable(doc, {
    startY: 90,
    head: [headers],
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
    didDrawPage: (data: { pageNumber: number }) => {
      const pageCount = doc.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      doc.setFontSize(9);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - 100, pageSize.getHeight() - 20);
    },
  });

  doc.save(filename);
}