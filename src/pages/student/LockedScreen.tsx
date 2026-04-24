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
  const { currentStudent } = useAppContext();
  return (
    <div className="min-h-screen w-full bg-cdgai-dark flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full flex flex-col items-center text-center">
        
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 border border-white/20">
          <Lock size={40} className="text-gray-400" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight">
          You've used all your spins!
        </h1>

        <p className="text-gray-400 text-base sm:text-lg mb-8 sm:mb-10">
          Thanks for participating! Hope you had fun. 🎉
        </p>

        {currentStudent &&
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-8 mb-6 sm:mb-10 backdrop-blur-sm">
            <div className="text-left">
              <div className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">
                {currentStudent.name}
              </div>
              <div className="text-sm font-mono text-gray-400 truncate">
                {currentStudent.studentId}
              </div>
            </div>
            {currentStudent.awardedPrize && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-gray-300 font-medium">Prize Won</span>
                <span className="text-cdgai-accent font-black">{currentStudent.awardedPrize} 🎁</span>
              </div>
            )}
          </div>
        }

        <button
          onClick={onSeeLeaderboard}
          className="w-full bg-white text-cdgai-dark font-bold text-lg sm:text-xl py-3 sm:py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-colors mb-6">
          Back to Start
        </button>

        <p className="text-sm text-gray-500 font-medium">
          Need more tries? Check with the booth admin.
        </p>
      </motion.div>
    </div>);

};