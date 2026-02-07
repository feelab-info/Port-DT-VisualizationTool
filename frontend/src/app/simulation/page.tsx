/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import DashboardLayout from '@/components/DashboardLayout';
import SimulationMonitor from '@/components/SimulationMonitor';
import { useTranslation } from '@/hooks/useTranslation';

export default function SimulationPage() {
  const t = useTranslation();

  return (
    <DashboardLayout showHealthNotification={false}>
      <div className="container mx-auto space-y-8 mt-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.powerFlowSimulationTitle}</h1>
        </div>
        <SimulationMonitor />
      </div>
    </DashboardLayout>
  );
}