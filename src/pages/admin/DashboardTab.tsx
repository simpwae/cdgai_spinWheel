import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { Users, Activity, HelpCircle, Trophy, X } from 'lucide-react';
export const DashboardTab: React.FC = () => {
  const { students, currentStudent, segments, recordSpin } = useAppContext();
  const [pendingSpin, setPendingSpin] = useState<{
    segmentId: string;
    timeout: number;
  } | null>(null);
  const activeStudents = students.filter((s) => s.status === 'active').length;
  const totalQuestions =
  students.reduce(
    (acc, s) => acc + s.spinHistory.filter((h) => h.includes('q')).length,
    0
  ) + 12; // Mock number
  const topScore =
  students.length > 0 ? Math.max(...students.map((s) => s.score)) : 0;
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pendingSpin && pendingSpin.timeout > 0) {
      timer = setTimeout(() => {
        setPendingSpin((prev) =>
        prev ?
        {
          ...prev,
          timeout: prev.timeout - 1
        } :
        null
        );
      }, 1000);
    } else if (pendingSpin && pendingSpin.timeout === 0) {
      // Commit spin
      if (currentStudent) {
        // Mock points based on segment
        const points = pendingSpin.segmentId === 's2' ? 5 : 0;
        recordSpin(currentStudent.id, pendingSpin.segmentId, points);
      }
      setPendingSpin(null);
    }
    return () => clearTimeout(timer);
  }, [pendingSpin, currentStudent, recordSpin]);
  const handleSegmentClick = (segmentId: string) => {
    if (!currentStudent || currentStudent.spinsUsed >= currentStudent.maxSpins)
    return;
    setPendingSpin({
      segmentId,
      timeout: 5
    }); // 5 seconds for demo instead of 10
  };
  const cancelSpin = () => {
    setPendingSpin(null);
  };
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Total Students
            </div>
            <div className="text-2xl font-black text-gray-900">
              {students.length}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Active Now
            </div>
            <div className="text-2xl font-black text-gray-900">
              {activeStudents}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Questions Answered
            </div>
            <div className="text-2xl font-black text-gray-900">
              {totalQuestions}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
            <Trophy size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Top Score
            </div>
            <div className="text-2xl font-black text-gray-900">{topScore}</div>
          </div>
        </div>
      </div>

      {/* Current Student Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Current Student</h2>
          {currentStudent &&
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentStudent.spinsUsed >= currentStudent.maxSpins ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            
              {currentStudent.spinsUsed >= currentStudent.maxSpins ?
            'Locked' :
            'Active'}
            </span>
          }
        </div>

        <div className="p-8">
          {currentStudent ?
          <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Name
                  </div>
                  <div className="text-3xl font-black text-gray-900">
                    {currentStudent.name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Student ID
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.studentId}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Department
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.department || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Tries Used
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.spinsUsed} / {currentStudent.maxSpins}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Score
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.score} pts
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 p-6 rounded-xl border border-gray-200 w-full">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                  Register Spin Result
                </h3>

                <div className="flex flex-wrap gap-2">
                  {segments.map((segment) =>
                <button
                  key={segment.id}
                  onClick={() => handleSegmentClick(segment.id)}
                  disabled={
                  !!pendingSpin ||
                  currentStudent.spinsUsed >= currentStudent.maxSpins
                  }
                  className="px-4 py-3 rounded-lg font-bold text-white text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: segment.color
                  }}>
                  
                      {segment.name}
                    </button>
                )}
                </div>

                <AnimatePresence>
                  {pendingSpin &&
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0,
                    y: -10
                  }}
                  className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                  
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {pendingSpin.timeout}
                        </div>
                        <div className="text-sm font-medium text-blue-800">
                          Committing spin result...
                        </div>
                      </div>
                      <button
                    onClick={cancelSpin}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-100 rounded-md text-sm font-bold border border-gray-200 transition-colors">
                    
                        <X size={16} />
                        <span>Undo</span>
                      </button>
                    </motion.div>
                }
                </AnimatePresence>
              </div>
            </div> :

          <div className="text-center py-12 text-gray-400 font-medium">
              No active student. Waiting for registration on the student
              monitor...
            </div>
          }
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-0">
          <div className="divide-y divide-gray-100">
            {/* Mock Activity Log */}
            <div className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="text-sm text-gray-600 flex-1">
                <span className="font-bold text-gray-900">Alex Johnson</span>{' '}
                registered for the event.
              </div>
              <div className="text-xs text-gray-400 font-medium">2 min ago</div>
            </div>
            <div className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="text-sm text-gray-600 flex-1">
                <span className="font-bold text-gray-900">Sarah Smith</span>{' '}
                spun{' '}
                <span className="font-bold text-blue-600">
                  Career Questions
                </span>
                .
              </div>
              <div className="text-xs text-gray-400 font-medium">5 min ago</div>
            </div>
            <div className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <div className="text-sm text-gray-600 flex-1">
                <span className="font-bold text-gray-900">Michael Chen</span>{' '}
                answered a question correctly (+10 pts).
              </div>
              <div className="text-xs text-gray-400 font-medium">
                12 min ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

};