/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import DashboardLayout from '@/components/DashboardLayout';
import SimulationMonitor from '@/components/SimulationMonitor';

export default function SimulationPage() {

  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-6">Power Flow Simulation</h1>
          <SimulationMonitor />
      </div>
    </DashboardLayout>
  );
}