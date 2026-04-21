import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Frown } from 'lucide-react';
interface ResultBetterLuckProps {
  triesLeft: number;
  onComplete: () => void;
}
export const ResultBetterLuck: React.FC<ResultBetterLuckProps> = ({
  triesLeft,
  onComplete
}) => {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    // Auto-transition after 5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 5000);
    // Dot animation
    const dotInterval = setInterval(() => {
      setDots((prev) => prev < 5 ? prev + 1 : prev);
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(dotInterval);
    };
  }, [onComplete]);
  return (
    <div className="min-h-screen w-full bg-[#6B7280] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden text-white">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.8
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        transition={{
          duration: 0.6,
          type: 'spring',
          bounce: 0.5
        }}
        className="flex flex-col items-center text-center max-w-2xl px-4">
        
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, -5, 5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="mb-6 sm:mb-8 bg-white/10 p-6 sm:p-8 rounded-full">
          
          <Frown size={80} strokeWidth={1.5} className="sm:hidden" />
          <Frown size={120} strokeWidth={1.5} className="hidden sm:block" />
        </motion.div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 sm:mb-6">
          Oops! Better luck next time.
        </h1>

        <p className="text-lg sm:text-2xl font-medium opacity-90">
          Every spin is a new chance. You've got{' '}
          <span className="font-bold text-white bg-white/20 px-3 py-1 rounded-lg mx-1">
            {triesLeft}
          </span>{' '}
          tries left.
        </p>
      </motion.div>

      {/* Countdown dots */}
      <div className="absolute bottom-12 flex space-x-3">
        {[0, 1, 2, 3, 4].map((i) =>
        <motion.div
          key={i}
          initial={{
            opacity: 0.2
          }}
          animate={{
            opacity: i < dots ? 1 : 0.2
          }}
          className="w-3 h-3 rounded-full bg-white" />

        )}
      </div>
    </div>);

};