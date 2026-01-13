'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
} from 'chart.js';
import { 
  Sun, 
  MapPin, 
  Clock, 
  Compass, 
  Gauge, 
  Zap, 
  Calendar, 
  TrendingUp, 
  BarChart3,
  Settings,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import pvModelService, {
  PVSystemConfig,
  PVSystemStatus,
  PowerSeriesRequest,
  PowerSeriesResponse,
} from '@/services/PVModelService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PVModelMonitor() {
  const [systemStatus, setSystemStatus] = useState<PVSystemStatus | null>(null);
  const [powerData, setPowerData] = useState<PowerSeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [config, setConfig] = useState<PVSystemConfig>(pvModelService.getDefaultConfig());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [intervalHours, setIntervalHours] = useState<number>(24);
  const [samplingMinutes, setSamplingMinutes] = useState<number>(15);
  const [startAtMidnight, setStartAtMidnight] = useState<boolean>(true);

  // Load initial system status
  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const status = await pvModelService.getPVSystemStatus();
      setSystemStatus(status);
      setConfig(status);
    } catch (err) {
      console.error('Failed to load system status:', err);
      setError('Failed to load system status');
    }
  };

  const handleConfigureSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfiguring(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await pvModelService.configurePVSystem(config);
      setSuccessMessage('PV system configured successfully');
      await loadSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed');
    } finally {
      setConfiguring(false);
    }
  };

  const handleCalculatePowerSeries = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const request: PowerSeriesRequest = {
        date: new Date(selectedDate).toISOString(),
        interval_hours: intervalHours,
        sampling_minutes: samplingMinutes,
        start_at_midnight: startAtMidnight,
      };

      const data = await pvModelService.calculatePowerSeries(request);
      setPowerData(data);
      setSuccessMessage('Power series calculated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate power series');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    const defaultConfig = pvModelService.getDefaultConfig();
    setConfig(defaultConfig);
  };

  // Calculate summary statistics
  const summaryStats = powerData ? {
    dataPoints: powerData.power_kw.length,
    peakPower: Math.max(...powerData.power_kw),
    averagePower: powerData.power_kw.reduce((a, b) => a + b, 0) / powerData.power_kw.length,
    totalEnergy: (powerData.power_kw.reduce((a, b) => a + b, 0) * samplingMinutes) / 60,
  } : null;

  // Prepare chart data
  const chartData = powerData
    ? {
        labels: powerData.times.map((time) => {
          const date = new Date(time);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }),
        datasets: [
          {
            label: 'PV Power Output (kW)',
            data: powerData.power_kw,
            borderColor: 'rgb(251, 191, 36)',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: 'rgb(251, 191, 36)',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
          },
        ],
      }
    : null;

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12,
            family: "'Inter', 'system-ui', sans-serif",
            weight: '500',
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
          family: "'Inter', 'system-ui', sans-serif",
        },
        bodyFont: {
          size: 12,
          family: "'Inter', 'system-ui', sans-serif",
        },
        callbacks: {
          label: (context) => ` ${context.parsed.y.toFixed(2)} kW`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false,
        },
        ticks: {
          callback: function(value) {
            return value.toLocaleString() + ' kW';
          },
          font: {
            size: 11,
            family: "'Inter', 'system-ui', sans-serif",
          },
          color: '#6b7280',
          padding: 8,
        },
        border: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
          font: {
            size: 11,
            family: "'Inter', 'system-ui', sans-serif",
          },
          color: '#6b7280',
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
            <div>
              <strong className="font-bold text-red-800 dark:text-red-200">Error: </strong>
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <strong className="font-bold text-green-800 dark:text-green-200">Success: </strong>
              <span className="text-green-700 dark:text-green-300">{successMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Current System Status */}
      {systemStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
            <Sun className="h-6 w-6 mr-2 text-amber-600 dark:text-amber-400" />
            Current PV System Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Location</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {systemStatus.latitude.toFixed(4)}°
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {systemStatus.longitude.toFixed(4)}°
                  </p>
                </div>
              </div>
            </div>

            {/* Timezone Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Timezone</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{systemStatus.timezone}</p>
                </div>
              </div>
            </div>

            {/* Module Power Card */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Module Power</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{systemStatus.module_power_kw} kW</p>
                </div>
              </div>
            </div>

            {/* Surface Tilt Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="flex items-center">
                <Gauge className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Surface Tilt</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{systemStatus.surface_tilt}°</p>
                </div>
              </div>
            </div>

            {/* Surface Azimuth Card */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-lg p-4 border border-rose-200 dark:border-rose-700">
              <div className="flex items-center">
                <Compass className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Surface Azimuth</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{systemStatus.surface_azimuth}°</p>
                </div>
              </div>
            </div>

            {/* System Efficiency Card */}
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">System Status</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">Active</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Ready to calculate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
            <Settings className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
            Configure PV System
          </h2>
          <form onSubmit={handleConfigureSystem} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={config.latitude}
                  onChange={(e) => setConfig({ ...config, latitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={config.longitude}
                  onChange={(e) => setConfig({ ...config, longitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Timezone
              </label>
              <input
                type="text"
                value={config.timezone}
                onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                placeholder="UTC"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Surface Tilt (°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.surface_tilt}
                  onChange={(e) => setConfig({ ...config, surface_tilt: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Surface Azimuth (°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.surface_azimuth}
                  onChange={(e) =>
                    setConfig({ ...config, surface_azimuth: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Module Power (kW)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={config.module_power_kw}
                onChange={(e) => setConfig({ ...config, module_power_kw: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={configuring}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center text-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                {configuring ? 'Configuring...' : 'Configure System'}
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                title="Reset to default"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Power Series Calculation */}
        <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-amber-600 dark:text-amber-400" />
            Calculate Power Series
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Interval: <span className="text-amber-600 dark:text-amber-400 font-bold">{intervalHours} hours</span>
              </label>
              <input
                type="range"
                min="1"
                max="24"
                value={intervalHours}
                onChange={(e) => setIntervalHours(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-amber-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>1h</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Sampling Interval
              </label>
              <select
                value={samplingMinutes}
                onChange={(e) => setSamplingMinutes(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                <option value={1}>1 minute</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              <input
                type="checkbox"
                id="startAtMidnight"
                checked={startAtMidnight}
                onChange={(e) => setStartAtMidnight(e.target.checked)}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <label
                htmlFor="startAtMidnight"
                className="ml-3 block text-sm text-gray-700 dark:text-gray-300 font-medium"
              >
                Start at midnight (00:00)
              </label>
            </div>

            <button
              onClick={handleCalculatePowerSeries}
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center mt-4"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Calculate Power Series
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary Statistics - Always Visible */}
        <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-amber-600 dark:text-amber-400" />
            Summary Statistics
          </h2>
          {summaryStats ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data Points</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.dataPoints}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Peak Power</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryStats.peakPower.toFixed(2)} <span className="text-lg">kW</span>
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Power</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryStats.averagePower.toFixed(2)} <span className="text-lg">kW</span>
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Energy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryStats.totalEnergy.toFixed(2)} <span className="text-lg">kWh</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 mb-4">
                <BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                No data available yet.<br />
                Calculate power series to see statistics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Power Series Chart */}
      {chartData && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
            <Sun className="h-6 w-6 mr-2 text-amber-600 dark:text-amber-400" />
            PV Power Generation Profile
          </h2>
          <div style={{ height: '450px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
}

