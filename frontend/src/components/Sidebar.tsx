'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Activity, Database, Anchor, BarChart2 } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Port Map', href: '/map', icon: Map },
    { name: 'Simulation', href: '/simulation', icon: Activity },
    { name: 'Historical Port Data', href: '/real-time', icon: Database },
    { name: 'Ship Energy Prediction', href: '/prediction', icon: BarChart2 },
  ];

  return (
    <div className="h-full w-64 bg-gray-800 text-white p-4 flex flex-col">
      <div className="mb-8 flex items-center gap-3">
        <Anchor className="h-8 w-8" />
        <h1 className="text-xl font-bold text-white">Port Digital Twin</h1>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="mt-auto pt-4 border-t border-gray-700 text-sm text-gray-400">
        <p>Port Digital Twin v1.0</p>
      </div>
    </div>
  );
}