'use client';

import DashboardLayout from '@/components/DashboardLayout';
import PVModelMonitor from '@/components/PVModelMonitor';

export default function PVModelPage() {
  return (
    <DashboardLayout showHealthNotification={false}>
      <div className="container mx-auto space-y-8 mt-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              PV Solar Model
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure and simulate photovoltaic system power generation
            </p>
          </div>
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </div>
        <PVModelMonitor />
      </div>
    </DashboardLayout>
  );
}

