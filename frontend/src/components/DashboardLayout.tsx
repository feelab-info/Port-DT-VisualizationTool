import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  noContentPadding?: boolean;
}

export default function DashboardLayout({ children, noContentPadding = false }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 ${noContentPadding ? 'overflow-hidden p-0' : 'overflow-auto p-6'}`}>
        {children}
      </main>
    </div>
  );
}