import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Gift } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
interface ResultResumeProps {
  onComplete: () => void;
}
export const ResultResume: React.FC<ResultResumeProps> = ({ onComplete }) => {
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

  // Auto-transition after score is received
  useEffect(() => {
    const timeout = setTimeout(() => {
      setReviewing(false);
    }, 30000);
    return () => clearTimeout(timeout);
  }, []);

  // When reviewing ends, claim prize
  useEffect(() => {
    if (reviewing) return;
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
  }, [reviewing, currentStudent, claimAward]);

  // Auto-proceed after done: 7s if prize, 4s otherwise
  useEffect(() => {
    if (reviewing) return;
    if (awardState === 'idle' || awardState === 'claiming') return;
    const delay = awardState === 'claimed' ? 7000 : 4000;
    const timer = setTimeout(() => onCompleteRef.current(), delay);
    return () => clearTimeout(timer);
  }, [reviewing, awardState]);

  return (
    <div className="min-h-screen w-full bg-[#16A34A] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%]"
          style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.2) 90deg, transparent 180deg, rgba(255,255,255,0.2) 270deg, transparent 360deg)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center z-10 max-w-3xl w-full px-2 sm:px-4"
      >
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 sm:mb-6 drop-shadow-lg">
          Résumé Review!
        </h1>

        <AnimatePresence mode="wait">
          {reviewing ? (
            <motion.div key="waiting" exit={{ opacity: 0, scale: 0.8 }} className="flex flex-col items-center">
              <p className="text-lg sm:text-2xl font-medium opacity-90 mb-8 sm:mb-12">
                Hand your résumé to our career expert for a quick review.
              </p>
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="bg-white/10 p-8 sm:p-12 rounded-3xl backdrop-blur-sm border border-white/20 mb-8 sm:mb-12 shadow-2xl"
              >
                <FileText size={80} strokeWidth={1} className="sm:hidden" />
                <FileText size={120} strokeWidth={1} className="hidden sm:block" />
              </motion.div>
              <div className="flex items-center space-x-4 bg-white/20 px-8 py-4 rounded-full">
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-4 h-4 rounded-full bg-white"
                />
                <span className="text-lg sm:text-2xl font-bold">Expert is reviewing your résumé…</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center space-y-6"
            >
              <h2 className="text-3xl sm:text-5xl font-black text-yellow-300">Review Complete! 🎉</h2>
              <p className="text-lg sm:text-2xl font-medium opacity-90">
                Great initiative bringing your résumé!
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
                  className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border border-white/30"
                >
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
