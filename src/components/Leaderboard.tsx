import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Department } from '../context/AppContext';
import { Trophy } from 'lucide-react';
interface LeaderboardProps {
  students: Student[];
}
export const Leaderboard: React.FC<LeaderboardProps> = ({ students }) => {
  const [activeTab, setActiveTab] = useState<Department | 'All'>('All');
  const filteredStudents = students.
  filter((s) => {
    if (activeTab === 'All') return true;
    return s.department === activeTab;
  }).
  sort((a, b) => b.score - a.score).
  slice(0, 10); // Show top 10
  const tabs: (Department | 'All')[] = [
  'All',
  'Guest',
  'Computer Science',
  'Architecture',
  'Life Sciences',
  'Allied Health Sciences'];

  return (
    <div className="w-full h-full flex flex-col bg-cdgai-dark/50 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-6">
          Live Leaderboard
        </h2>

        {/* Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) =>
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-cdgai-maroon text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            
              {tab || 'Other'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-12 gap-4 text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-5">Student</div>
          <div className="col-span-3">Department</div>
          <div className="col-span-2 text-right">Score</div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredStudents.length === 0 ?
            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              className="text-center py-12 text-gray-400">
              
                No scores recorded yet.
              </motion.div> :

            filteredStudents.map((student, index) => {
              const isTop3 = index < 3;
              const rankColors = [
              'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
              'bg-gray-300/20 text-gray-300 border-gray-300/30',
              'bg-amber-700/20 text-amber-600 border-amber-700/30' // Bronze
              ];
              return (
                <motion.div
                  key={student.id}
                  layout
                  initial={{
                    opacity: 0,
                    y: 20
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05
                  }}
                  className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border ${isTop3 ? rankColors[index] : 'bg-white/5 border-white/5 text-white'}`}>
                  
                    <div className="col-span-2 flex justify-center">
                      {isTop3 ?
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-current/10">
                          <Trophy size={18} className="text-current" />
                        </div> :

                    <span className="font-bold text-lg text-gray-400">
                          #{index + 1}
                        </span>
                    }
                    </div>
                    <div className="col-span-5">
                      <div className="font-bold text-lg truncate">
                        {student.name}
                      </div>
                      <div className="text-xs opacity-70 font-mono">
                        {student.studentId}
                      </div>
                    </div>
                    <div className="col-span-3 text-sm opacity-80 truncate">
                      {student.department === 'Guest' ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
                          Guest
                        </span>
                      ) : (
                        student.department || 'N/A'
                      )}
                    </div>
                    <div className="col-span-2 text-right font-black text-2xl">
                      {student.score}
                    </div>
                  </motion.div>);

            })
            }
          </AnimatePresence>
        </div>
      </div>
    </div>);

};