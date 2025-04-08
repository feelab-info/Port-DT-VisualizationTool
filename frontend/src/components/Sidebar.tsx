'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Activity, Database, Anchor, BarChart2, Sun, Moon, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

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
      
      {/* User profile placeholder */}
      <div className="mb-6 p-3 bg-gray-700 rounded-lg flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-full">
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">Welcome, Admin</p>
          <p className="text-xs text-gray-400">Port Authority</p>
        </div>
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
      
      <div className="mt-auto pt-4 border-t border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-400">v1.0</span>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center gap-2"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <>
              <Moon className="h-4 w-4" />
              <span className="text-sm">Dark</span>
            </>
          ) : (
            <>
              <Sun className="h-4 w-4" />
              <span className="text-sm">Light</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}