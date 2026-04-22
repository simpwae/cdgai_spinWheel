import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Users,
  Activity,
  Trophy,
  Download,
  CheckCircle } from
'lucide-react';
import { useAppContext } from '../../context/AppContext';

export const ExportTab: React.FC = () => {
  const { students, segments, leaderboard } = useAppContext();
  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const buildParticipantsSheet = () =>
    students.map((s, i) => ({
      '#': i + 1,
      Name: s.name,
      'Student ID': s.studentId,
      Email: s.email || '',
      Phone: s.phone || '',
      Faculty: s.faculty || '',
      Department: s.department || '',
      Score: s.score,
      'Spins Used': s.spinsUsed,
      'Max Spins': s.maxSpins,
      Status: s.status,
      'Prize Awarded': s.awardedPrize || '',
    }));

  const buildSpinLogSheet = () => {
    const rows: Record<string, unknown>[] = [];
    let rowNum = 1;
    for (const s of students) {
      s.spinHistory.forEach((segId, idx) => {
        const seg = segments.find((sg) => sg.id === segId);
        rows.push({
          '#': rowNum++,
          'Student Name': s.name,
          'Student ID': s.studentId,
          'Spin #': idx + 1,
          Segment: seg ? seg.name : segId,
        });
      });
    }
    return rows;
  };

  const buildLeaderboardSheet = () =>
    leaderboard.map((s, i) => ({
      Rank: i + 1,
      Name: s.name,
      'Student ID': s.studentId,
      Faculty: s.faculty || '',
      Department: s.department || '',
      Score: s.score,
      'Spins Used': s.spinsUsed,
      Status: s.status,
    }));

  const downloadSheet = (data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const handleExport = (type: string) => {
    setExporting(type);
    try {
      if (type === 'full') {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildParticipantsSheet()), 'Participants');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSpinLogSheet()), 'Spin Log');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildLeaderboardSheet()), 'Leaderboard');
        XLSX.writeFile(wb, 'session-full-export.xlsx');
      } else if (type === 'participants') {
        downloadSheet(buildParticipantsSheet(), 'participants.xlsx', 'Participants');
      } else if (type === 'spins') {
        downloadSheet(buildSpinLogSheet(), 'spin-log.xlsx', 'Spin Log');
      } else if (type === 'leaderboard') {
        downloadSheet(buildLeaderboardSheet(), 'leaderboard.xlsx', 'Leaderboard');
      }
      setExporting(null);
      setSuccess(type);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setExporting(null);
    }
  };
  const [lastExportTime, setLastExportTime] = useState<Record<string, string>>({});

  const handleExportWithTime = (type: string) => {
    handleExport(type);
    setLastExportTime((prev) => ({
      ...prev,
      [type]: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
    }));
  };

  const exportOptions = [
  {
    id: 'full',
    title: 'Full Session Export',
    description: 'All 3 sheets combined into one .xlsx file.',
    icon: <FileSpreadsheet size={32} className="text-blue-600" />,
    bg: 'bg-blue-50',
  },
  {
    id: 'participants',
    title: 'Participants Only',
    description: 'Student details: name, ID, email, department, score, status.',
    icon: <Users size={32} className="text-green-600" />,
    bg: 'bg-green-50',
  },
  {
    id: 'spins',
    title: 'Spin Log',
    description: 'Detailed log of every spin and segment result per student.',
    icon: <Activity size={32} className="text-purple-600" />,
    bg: 'bg-purple-50',
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard Snapshot',
    description: 'Current rankings and scores sorted by points.',
    icon: <Trophy size={32} className="text-yellow-600" />,
    bg: 'bg-yellow-50',
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
                Last exported: {lastExportTime[option.id] ?? 'Never'}
              </div>

              <button
              onClick={() => handleExportWithTime(option.id)}
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