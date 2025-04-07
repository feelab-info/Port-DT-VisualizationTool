import DashboardLayout from '@/components/DashboardLayout';

export default function PredictionPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-6">Ship Energy Usage Prediction</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Prediction Model</h2>
          <p className="text-gray-600 mb-4">
            This page will contain tools to predict energy usage for ships based on historical data,
            weather conditions, and ship specifications.
          </p>
          
          <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
            <p className="text-gray-500">Prediction model interface will be implemented here</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Historical Analysis</h2>
            <div className="h-48 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Historical data chart will be displayed here</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Ships</h2>
            <div className="h-48 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Upcoming ships schedule will be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}