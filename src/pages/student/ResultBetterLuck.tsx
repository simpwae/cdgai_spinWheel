import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Frown } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

interface ResultBetterLuckProps {
  triesLeft: number;
  onComplete: () => void;
}
export const ResultBetterLuck: React.FC<ResultBetterLuckProps> = ({
  triesLeft,
  onComplete,
}) => {
  const { currentStudent, claimAward } = useAppContext();
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

  // Auto-transition after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), 6000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-screen w-full bg-cdgai-dark flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.9,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
        }}
        className="flex flex-col items-center text-center max-w-lg w-full"
      >
        {/* Icon */}
        <motion.div
          initial={{
            scale: 0,
          }}
          animate={{
            scale: 1,
          }}
          transition={{
            type: "spring",
            delay: 0.2,
          }}
          className="w-20 h-20 sm:w-28 sm:h-28 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 sm:mb-8 border-2 border-yellow-500/30"
        >
          <Frown size={48} className="text-yellow-400 sm:hidden" />
          <Frown size={64} className="text-yellow-400 hidden sm:block" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tight">
          Better Luck Next Time!
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-base sm:text-xl mb-8 sm:mb-10 px-4">
          Don't worry — the wheel is waiting for you.{" "}
          {triesLeft > 0 ? (
            <span className="text-yellow-400 font-bold">
              {triesLeft} {triesLeft === 1 ? "try" : "tries"} left!
            </span>
          ) : (
            "Thanks for playing!"
          )}
        </p>

        {/* Prize Widget */}
        {prizeState === 'checking' && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm mb-6">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span>Checking your prize...</span>
          </div>
        )}
        {prizeState === 'new-award' && prizeName && (
          <div className="flex items-center space-x-2 text-yellow-400 text-lg font-bold mb-6">
            <Gift size={20} />
            <span>You've won: {prizeName}!</span>
          </div>
        )}
        {prizeState === 'already-awarded' && prizeName && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm mb-6">
            <Gift size={16} />
            <span>Your prize: {prizeName}</span>
          </div>
        )}

        {/* Continue */}
        <motion.button
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 1,
          }}
          onClick={() => onCompleteRef.current()}
          className="px-6 sm:px-8 py-2 sm:py-3 rounded-full border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-bold text-sm sm:text-base transition-all active:scale-95"
        >
          Continue →
        </motion.button>
      </motion.div>
    </div>
  );
};