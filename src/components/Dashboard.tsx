import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, BarChart2 } from 'lucide-react';

const CheckStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PENDING: 'pending'
} as const;

interface Check {
  id: number;
  name: string;
  status: typeof CheckStatus[keyof typeof CheckStatus];
  lastRun: string;
  findings: string;
  message: string;
}

// Mock data - in a real app, this would come from an API
const mockChecks: Check[] = [
  { 
    id: 1, 
    name: 'Order Duplicates', 
    status: CheckStatus.SUCCESS, 
    lastRun: '2025-04-06T17:00:00Z',
    findings: '0 duplicates found',
    message: 'All checks passed'
  },
  { 
    id: 2, 
    name: 'Order Duplicates', 
    status: CheckStatus.SUCCESS, 
    lastRun: '2025-04-05T17:00:00Z',
    findings: '0 duplicates found',
    message: 'All checks passed'
  },
  { 
    id: 3, 
    name: 'Order Duplicates', 
    status: CheckStatus.FAILURE, 
    lastRun: '2025-04-04T17:00:00Z',
    findings: '2 duplicates found',
    message: 'Found duplicate orders: #ORD-5523, #ORD-5524'
  },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Dashboard = () => {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);

  useEffect(() => {
    // In a real app, fetch data from an API
    setChecks(mockChecks);
    setLoading(false);
    
    // Calculate next scheduled run (19:00 UTC daily)
    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(19, 0, 0, 0);
    if (nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    setNextScheduled(nextRun);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SQL Check Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Internal monitoring for automatic SQL checks
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-medium">Next Check</h2>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {nextScheduled ? formatDate(nextScheduled.toISOString()) : 'Loading...'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <BarChart2 className="mr-2 h-5 w-5 text-emerald-500" />
            <h2 className="text-sm font-medium">Success Rate</h2>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {Math.round((checks.filter(c => c.status === CheckStatus.SUCCESS).length / checks.length) * 100)}%
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-medium">Last Issues</h2>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {checks.filter(c => c.status === CheckStatus.FAILURE).length}
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium">Recent Check Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Findings</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {checks.map((check) => (
                <tr key={check.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {check.status === CheckStatus.SUCCESS ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {check.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(check.lastRun)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {check.findings}
                    <p className="text-xs mt-1">{check.message}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        SQL Check System • Database Monitoring Tool • {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Dashboard;