import DashboardLayout from '@/components/DashboardLayout';
import PortEnergyOverview from '@/components/PortEnergyOverview';
import Link from 'next/link';
import { Map, Activity, Database, BarChart2 } from 'lucide-react';

export default function Home() {
  const cards = [
    {
      title: 'Port Map',
      description: 'Interactive 3D visualization of the port with real-time energy data',
      icon: Map,
      href: '/map',
      color: 'bg-blue-500 dark:bg-blue-600',
    },
    {
      title: 'Power Flow Simulation',
      description: 'Simulate and analyze power flow scenarios in the port',
      icon: Activity,
      href: '/simulation',
      color: 'bg-green-500 dark:bg-green-600',
    },
    {
      title: 'Real-time Data',
      description: 'Monitor real-time energy consumption and production data',
      icon: Database,
      href: '/real-time',
      color: 'bg-purple-500 dark:bg-purple-600',
    },
    {
      title: 'Ship Energy Prediction',
      description: 'Predict energy usage for incoming and outgoing vessels',
      icon: BarChart2,
      href: '/prediction',
      color: 'bg-orange-500 dark:bg-orange-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome to the Port Digital Twin platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link 
            key={card.title} 
            href={card.href}
            className="block group"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
              <div className={`${card.color} p-4 flex items-center justify-center`}>
                <card.icon className="h-10 w-10 text-white" />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {card.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                  {card.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <PortEnergyOverview />
      </div>
    </DashboardLayout>
  );
}