import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { CountdownTimer } from "../../components/CountdownTimer";
interface ResultPitchProps {
  onComplete: () => void;
}
export const ResultPitch: React.FC<ResultPitchProps> = ({ onComplete }) => {
  const { currentStudent } = useAppContext();
  const [isTimeUp, setIsTimeUp] = useState(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const pendingScore = currentStudent?.pendingScore;
  const hasScore = pendingScore !== undefined;

  // Auto-transition 5 seconds after a judge score arrives
  useEffect(() => {
    if (hasScore) {
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasScore]);

  // Fallback: if time is up but no judge score arrives within 60 seconds, auto-proceed
  useEffect(() => {
    if (!isTimeUp || hasScore) return;
    const fallback = setTimeout(() => {
      onCompleteRef.current();
    }, 60000);
    return () => clearTimeout(fallback);
  }, [isTimeUp, hasScore]);
  return (
    <div className="min-h-screen w-full bg-[#EA580C] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden text-white">
      {/* Background decoration */}
      <div aria-hidden="true" className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 30,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="flex flex-col items-center text-center z-10 max-w-3xl w-full px-2 sm:px-4"
      >
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 sm:mb-6 drop-shadow-lg">
          Pitch Time!
        </h1>

        {!hasScore && (
          <p className="text-lg sm:text-2xl font-medium opacity-90 mb-8 sm:mb-16">
            You have 60 seconds. Introduce yourself and your biggest career
            goal.
          </p>
        )}

        <AnimatePresence mode="wait">
          {!isTimeUp && !hasScore ? (
            <motion.div
              key="timer"
              exit={{
                opacity: 0,
                scale: 0.8,
              }}
              className="flex flex-col items-center"
            >
              <div className="bg-white/10 p-5 sm:p-8 rounded-full backdrop-blur-sm border border-white/20 mb-6 sm:mb-8">
                <CountdownTimer
                  totalSeconds={60}
                  onComplete={() => setIsTimeUp(true)}
                  size={140}
                  color="#FFFFFF"
                />
              </div>
              <p className="text-base sm:text-xl font-bold bg-white/20 px-5 sm:px-6 py-2 sm:py-3 rounded-full mb-6 sm:mb-8">
                The judge is watching. Give it your best shot!
              </p>
              {/* Skip / Done Pitching button */}
              <button
                onClick={() => setIsTimeUp(true)}
                className="flex items-center space-x-2 px-5 sm:px-8 py-2 sm:py-3 rounded-full border-2 border-white/40 bg-white/10 hover:bg-white/20 text-white font-bold text-base sm:text-lg transition-all active:scale-95"
              >
                <SkipForward size={20} />
                <span>Done Pitching</span>
              </button>
            </motion.div>
          ) : !hasScore ? (
            <motion.div
              key="waiting"
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="flex flex-col items-center"
            >
              <h2 className="text-3xl sm:text-5xl font-black text-yellow-300 mb-6 sm:mb-8">
                Time's up!
              </h2>
              <div className="flex items-center space-x-4 bg-white/20 px-6 sm:px-8 py-3 sm:py-4 rounded-full mb-8">
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                  className="w-4 h-4 rounded-full bg-white"
                />

                <span className="text-lg sm:text-2xl font-bold">
                  Awaiting judge score...
                </span>
              </div>
              {/* Escape hatch — auto-proceeds after 60 s via useEffect, this is immediate */}
              <button
                onClick={() => onCompleteRef.current()}
                className="px-6 sm:px-8 py-2 sm:py-3 rounded-full border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-bold text-sm sm:text-base transition-all active:scale-95"
              >
                Go to Leaderboard →
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="score"
              initial={{
                opacity: 0,
                scale: 0.5,
                rotate: -10,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: 0,
              }}
              transition={{
                type: "spring",
                bounce: 0.6,
              }}
              className="flex flex-col items-center"
            >
              <div className="bg-white text-[#EA580C] w-44 h-44 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center shadow-2xl border-8 border-white/20 mb-6 sm:mb-8">
                <span className="text-base sm:text-2xl font-bold text-gray-400 uppercase tracking-widest mb-1 sm:mb-2">
                  Score
                </span>
                <motion.span
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  className="text-6xl sm:text-8xl font-black leading-none"
                >
                  {pendingScore}
                  <span className="text-2xl sm:text-4xl text-gray-300">
                    /10
                  </span>
                </motion.span>
              </div>

              {currentStudent?.pendingFeedback && (
                <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 rounded-2xl max-w-xl text-left border border-white/30">
                  <span className="block text-sm font-bold uppercase tracking-wider text-white/60 mb-2">
                    Judge Feedback
                  </span>
                  <p className="text-base sm:text-xl italic">
                    "{currentStudent.pendingFeedback}"
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
