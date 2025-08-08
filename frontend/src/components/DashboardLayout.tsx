'use client';
import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import DeviceDataHealthNotification from './UI/DeviceDataHealthNotification';
import ProtectedRoute from './auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: ReactNode;
  noContentPadding?: boolean;
  showHealthNotification?: boolean;
}

export default function DashboardLayout({ children, noContentPadding = false, showHealthNotification = true }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 ${noContentPadding ? 'overflow-hidden p-0' : 'overflow-auto p-6'}`}>
          {children}
        </main>
        {showHealthNotification && <DeviceDataHealthNotification />}
      </div>
    </ProtectedRoute>
  );
}