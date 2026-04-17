import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Upload, AlertCircle, Save } from 'lucide-react';
export const SettingsTab: React.FC = () => {
  const { maxTriesDefault, resetLeaderboard } = useAppContext();
  const [maxTries, setMaxTries] = useState(maxTriesDefault);
  const [rewardPoints, setRewardPoints] = useState(5);
  const [eventName, setEventName] = useState('CDGAI Career Fair 2025');
  const [departments, setDepartments] = useState(
    'Architecture, Computer Science, Life Sciences, Allied Health Sciences'
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const handleReset = () => {
    if (resetText === 'RESET') {
      resetLeaderboard();
      setShowResetConfirm(false);
      setResetText('');
    }
  };
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Participation Rules */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">
            Participation Rules
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between max-w-md">
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Max tries per student
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Default number of spins allowed.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={maxTries}
                onChange={(e) => setMaxTries(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-center font-bold" />
              
              <button className="p-2 text-cdgai-accent hover:bg-blue-50 rounded-lg transition-colors">
                <Save size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <label className="block text-sm font-bold text-gray-700">
                Segment 2 Reward Points
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Points awarded for "3 Followers + Freebee".
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={rewardPoints}
                onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-center font-bold" />
              
              <button className="p-2 text-cdgai-accent hover:bg-blue-50 rounded-lg transition-colors">
                <Save size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Question Bank */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Question Bank</h2>
          <button className="text-sm font-bold text-cdgai-accent hover:underline">
            View Questions
          </button>
        </div>
        <div className="p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="w-12 h-12 bg-blue-50 text-cdgai-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">.xlsx files only (Max 5MB)</p>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-gray-900">
                questions_v2_final.xlsx
              </p>
              <p className="text-xs text-gray-500">
                Uploaded today at 09:41 AM • 120 rows
              </p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase tracking-wider">
              Active
            </span>
          </div>
        </div>
      </section>

      {/* Event Settings */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Event Details</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent" />
            
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Departments (comma separated)
            </label>
            <textarea
              value={departments}
              onChange={(e) => setDepartments(e.target.value)}
              className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent resize-none h-24">
            </textarea>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
            Save Event Details
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-100/50 flex items-center space-x-2 text-red-800">
          <AlertCircle size={20} />
          <h2 className="text-lg font-bold">Danger Zone</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-red-800 mb-4 font-medium">
            This will permanently delete all student records, scores, and spin
            history. This action cannot be undone.
          </p>

          {!showResetConfirm ?
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
            
              Reset Leaderboard
            </button> :

          <div className="bg-white p-4 rounded-lg border border-red-200 inline-block">
              <p className="text-sm font-bold text-gray-900 mb-2">
                Type RESET to confirm
              </p>
              <div className="flex space-x-2">
                <input
                type="text"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder="RESET"
                className="w-32 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-red-500 text-center font-bold" />
              
                <button
                onClick={handleReset}
                disabled={resetText !== 'RESET'}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                
                  Confirm
                </button>
                <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetText('');
                }}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">
                
                  Cancel
                </button>
              </div>
            </div>
          }
        </div>
      </section>
    </div>);

};