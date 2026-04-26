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
  const [prizeState, setPrizeState] = useState<'idle' | 'checking' | 'new-award' | 'already-awarded' | 'no-awards'>('checking');
  const [prizeName, setPrizeName] = useState<string | null>(null);
  const claimAttempted = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Auto-claim prize on mount
  useEffect(() => {
    if (!currentStudent || claimAttempted.current) return;
    claimAttempted.current = true;

    if (currentStudent.awardedPrize) {
      setPrizeName(currentStudent.awardedPrize);
      setPrizeState('already-awarded');
      return;
    }

    const timeout = setTimeout(() => setPrizeState('no-awards'), 12000);
    claimAward(currentStudent.id).then((result) => {
      clearTimeout(timeout);
      if (result?.awardName) {
        setPrizeName(result.awardName);
        setPrizeState(result.alreadyAwarded ? 'already-awarded' : 'new-award');
      } else {
        setPrizeState('no-awards');
      }
    }).catch(() => {
      clearTimeout(timeout);
      setPrizeState('no-awards');
    });
    return () => clearTimeout(timeout);
  }, [currentStudent, claimAward]);

  // Auto-transition 5 seconds after a judge score arrives
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
                Go Home →
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

        {/* Prize Widget */}
        {prizeState === 'checking' && (
          <div className="mt-6 flex items-center space-x-2 text-white/50 text-sm">
            <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            <span>Checking your prize...</span>
          </div>
        )}
        {prizeState === 'new-award' && prizeName && (
          <div className="mt-6 flex items-center space-x-2 text-yellow-300 text-lg font-bold">
            <Gift size={20} />
            <span>You've won: {prizeName}!</span>
          </div>
        )}
        {prizeState === 'already-awarded' && prizeName && (
          <div className="mt-6 flex items-center space-x-2 text-white/60 text-sm">
            <Gift size={16} />
            <span>Your prize: {prizeName}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
