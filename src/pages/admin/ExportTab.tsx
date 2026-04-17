import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Users,
  Activity,
  Trophy,
  Download,
  CheckCircle } from
'lucide-react';
export const ExportTab: React.FC = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handleExport = (type: string) => {
    setExporting(type);
    // Mock export delay
    setTimeout(() => {
      setExporting(null);
      setSuccess(type);
      setTimeout(() => setSuccess(null), 3000);
    }, 1500);
  };
  const exportOptions = [
  {
    id: 'full',
    title: 'Full Session Export',
    description: 'All 4 sheets combined into one .xlsx file.',
    icon: <FileSpreadsheet size={32} className="text-blue-600" />,
    bg: 'bg-blue-50',
    lastExport: 'Today, 10:30 AM'
  },
  {
    id: 'participants',
    title: 'Participants Only',
    description: 'Sheet 1: Student details and final status.',
    icon: <Users size={32} className="text-green-600" />,
    bg: 'bg-green-50',
    lastExport: 'Yesterday, 04:15 PM'
  },
  {
    id: 'spins',
    title: 'Spin Log',
    description: 'Sheet 2: Detailed log of every spin and result.',
    icon: <Activity size={32} className="text-purple-600" />,
    bg: 'bg-purple-50',
    lastExport: 'Never'
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard Snapshot',
    description: 'Sheet 3: Current rankings and scores.',
    icon: <Trophy size={32} className="text-yellow-600" />,
    bg: 'bg-yellow-50',
    lastExport: 'Today, 11:00 AM'
  }];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Data</h2>
        <p className="text-gray-500">
          Download session data as Excel spreadsheets for reporting and
          analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) =>
        <div
          key={option.id}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
          
            <div className="flex items-start space-x-4 mb-6">
              <div className={`p-4 rounded-xl ${option.bg}`}>{option.icon}</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {option.description}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-400">
                Last exported: {option.lastExport}
              </div>

              <button
              onClick={() => handleExport(option.id)}
              disabled={exporting !== null}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${success === option.id ? 'bg-green-100 text-green-700' : exporting === option.id ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'}`}>
              
                {success === option.id ?
              <>
                    <CheckCircle size={16} />
                    <span>Exported</span>
                  </> :
              exporting === option.id ?
              <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Exporting...</span>
                  </> :

              <>
                    <Download size={16} />
                    <span>Export Now</span>
                  </>
              }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>);

};