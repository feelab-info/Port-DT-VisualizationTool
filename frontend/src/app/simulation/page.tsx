/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import DashboardLayout from '@/components/DashboardLayout';
import SimulationMonitor from '@/components/SimulationMonitor';

export default function SimulationPage() {

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Power Flow Simulation</h1>
        </div>
        <SimulationMonitor />
      </div>
    </DashboardLayout>
  );
}