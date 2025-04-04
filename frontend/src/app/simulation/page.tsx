'use client';

import SimulationMonitor from '@/components/SimulationMonitor';

export default function SimulationPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Power Flow Simulation</h1>
      <SimulationMonitor />
    </div>
  );
}