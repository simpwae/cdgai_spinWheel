import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
interface LockedScreenProps {
  onSeeLeaderboard: () => void;
}
export const LockedScreen: React.FC<LockedScreenProps> = ({
  onSeeLeaderboard
}) => {
  const { currentStudent, leaderboard } = useAppContext();
  const rank = currentStudent ?
  leaderboard.findIndex((s) => s.id === currentStudent.id) + 1 :
  0;
  return (
    <div className="min-h-screen w-full bg-cdgai-dark flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <motion.div
        initial={{
          scale: 0.9,
          opacity: 0
        }}
        animate={{
          scale: 1,
          opacity: 1
        }}
        transition={{
          duration: 0.5
        }}
        className="max-w-md w-full flex flex-col items-center text-center">
        
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 border border-white/20">
          <Lock size={40} className="text-gray-400" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight">
          You've used all your spins!
        </h1>

        <p className="text-gray-400 text-base sm:text-lg mb-8 sm:mb-10">
          Check your final score below. See you at the top of the leaderboard!
        </p>

        {currentStudent &&
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-8 mb-6 sm:mb-10 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/10">
              <div className="text-left">
                <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {currentStudent.name}
                </div>
                <div className="text-sm font-mono text-gray-400">
                  {currentStudent.studentId}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-1">
                  Rank
                </div>
                <div className="text-2xl sm:text-3xl font-black text-cdgai-accent flex items-center justify-end">
                  #{rank}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-300">
                Total Score
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white">
                {currentStudent.score}
              </span>
            </div>
          </div>
        }

        <button
          onClick={onSeeLeaderboard}
          className="w-full bg-white text-cdgai-dark font-bold text-lg sm:text-xl py-3 sm:py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-colors mb-6">
          
          See Leaderboard
        </button>

        <p className="text-sm text-gray-500 font-medium">
          Need more tries? Check with the booth admin.
        </p>
      </motion.div>
    </div>);

};