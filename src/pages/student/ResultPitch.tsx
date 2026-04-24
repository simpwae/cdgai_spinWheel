import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Gift } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { CountdownTimer } from "../../components/CountdownTimer";
interface ResultPitchProps {
  onComplete: () => void;
}
export const ResultPitch: React.FC<ResultPitchProps> = ({ onComplete }) => {
  const { currentStudent, claimAward } = useAppContext();
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [awardState, setAwardState] = useState<'idle' | 'claiming' | 'claimed' | 'none'>('idle');
  const [awardName, setAwardName] = useState<string | null>(null);
  const claimAttempted = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // When time is up (or Done Pitching clicked), attempt prize claim then auto-proceed
  useEffect(() => {
    if (!isTimeUp) return;
    // Claim prize if not already done
    if (!claimAttempted.current && currentStudent && !currentStudent.awardedPrize) {
      claimAttempted.current = true;
      setAwardState('claiming');
      claimAward(currentStudent.id).then((prize) => {
        if (prize) {
          setAwardState('claimed');
          setAwardName(prize);
        } else {
          setAwardState('none');
        }
      }).catch(() => setAwardState('none'));
    } else if (!claimAttempted.current) {
      claimAttempted.current = true;
      setAwardState('none');
    }
  }, [isTimeUp, currentStudent, claimAward]);

  // Auto-proceed after time up: 7s if prize claimed, 3s otherwise
  useEffect(() => {
    if (!isTimeUp) return;
    if (awardState === 'idle' || awardState === 'claiming') return; // wait for claim to settle
    const delay = awardState === 'claimed' ? 7000 : 3000;
    const timer = setTimeout(() => onCompleteRef.current(), delay);
    return () => clearTimeout(timer);
  }, [isTimeUp, awardState]);

  return (
    <div className="min-h-screen w-full bg-[#EA580C] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden text-white">
      <div aria-hidden="true" className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center z-10 max-w-3xl w-full px-2 sm:px-4">

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 sm:mb-6 drop-shadow-lg">
          Pitch Time!
        </h1>

        {!isTimeUp && (
          <p className="text-lg sm:text-2xl font-medium opacity-90 mb-8 sm:mb-16">
            You have 60 seconds. Introduce yourself and your biggest career goal.
          </p>
        )}

        <AnimatePresence mode="wait">
          {!isTimeUp ? (
            <motion.div key="timer" exit={{ opacity: 0, scale: 0.8 }} className="flex flex-col items-center">
              <div className="bg-white/10 p-5 sm:p-8 rounded-full backdrop-blur-sm border border-white/20 mb-6 sm:mb-8">
                <CountdownTimer totalSeconds={60} onComplete={() => setIsTimeUp(true)} size={140} color="#FFFFFF" />
              </div>
              <p className="text-base sm:text-xl font-bold bg-white/20 px-5 sm:px-6 py-2 sm:py-3 rounded-full mb-6 sm:mb-8">
                The judge is watching. Give it your best shot!
              </p>
              <button
                onClick={() => setIsTimeUp(true)}
                className="flex items-center space-x-2 px-5 sm:px-8 py-2 sm:py-3 rounded-full border-2 border-white/40 bg-white/10 hover:bg-white/20 text-white font-bold text-base sm:text-lg transition-all active:scale-95">
                <SkipForward size={20} />
                <span>Done Pitching</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center space-y-6">
              <h2 className="text-3xl sm:text-5xl font-black text-yellow-300">Well Done! 🎉</h2>
              <p className="text-lg sm:text-2xl font-medium opacity-90">
                Great pitch! You gave it your best.
              </p>
              {awardState === 'claiming' && (
                <div className="flex items-center space-x-3 bg-white/20 px-6 py-3 rounded-full">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="font-bold">Checking for prize…</span>
                </div>
              )}
              {awardState === 'claimed' && awardName && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border border-white/30">
                  <Gift size={28} className="text-yellow-300 shrink-0" />
                  <span className="text-xl sm:text-3xl font-black text-yellow-300">
                    You won: {awardName}! 🎁
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
