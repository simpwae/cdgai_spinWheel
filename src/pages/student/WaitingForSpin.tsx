import React from 'react';
import { motion } from 'framer-motion';
import { SpinWheel } from '../../components/SpinWheel';
import { useAppContext } from '../../context/AppContext';
export const WaitingForSpin: React.FC = () => {
  const { currentStudent, segments } = useAppContext();
  return (
    <div className="min-h-screen w-full bg-cdgai-dark flex flex-col items-center justify-center relative overflow-hidden">
      {/* Student Badge */}
      {currentStudent &&
      <motion.div
        initial={{
          opacity: 0,
          y: -20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="absolute top-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full flex items-center space-x-3 shadow-xl">
        
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-white font-bold text-lg">
            {currentStudent.name}
          </span>
          <span className="text-white/50 text-sm font-mono border-l border-white/20 pl-3">
            {currentStudent.studentId}
          </span>
        </motion.div>
      }

      {/* Main Content */}
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
          duration: 0.8,
          ease: 'easeOut'
        }}
        className="flex flex-col items-center">
        
        <div className="mb-12">
          <SpinWheel segments={segments} isSpinning={false} />
        </div>

        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="text-2xl font-bold text-white tracking-wide text-center">
          
          Spin the wheel and see where luck takes you...
        </motion.div>
      </motion.div>
    </div>);

};