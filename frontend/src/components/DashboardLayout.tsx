'use client';
import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import DeviceDataHealthNotification from './UI/DeviceDataHealthNotification';
import ProtectedRoute from './auth/ProtectedRoute';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  noContentPadding?: boolean;
  showHealthNotification?: boolean;
}

export default function DashboardLayout({ children, noContentPadding = false, showHealthNotification = true }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              aria-label="Open menu"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Menu className="h-6 w-6 text-gray-800 dark:text-gray-100" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">Port Digital Twin</span>
            <span className="w-8" />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-gray-800 dark:bg-gray-800 shadow-xl">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className={`flex-1 ${noContentPadding ? 'overflow-hidden p-0' : 'overflow-auto p-6'} ${'md:pt-0 pt-16'}`}>
          {children}
        </main>

        {showHealthNotification && <DeviceDataHealthNotification />}
      </div>
    </ProtectedRoute>
  );
}