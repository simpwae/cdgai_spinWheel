import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
interface ResultResumeProps {
  onComplete: () => void;
}
export const ResultResume: React.FC<ResultResumeProps> = ({ onComplete }) => {
  const { currentStudent } = useAppContext();
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const pendingScore = currentStudent?.pendingScore;
  const hasScore = pendingScore !== undefined;

  // Auto-transition after score is received
  useEffect(() => {
    if (hasScore) {
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [hasScore]);

  // Fallback: auto-proceed after 120 seconds if no score arrives
  useEffect(() => {
    if (hasScore) return;
    const fallback = setTimeout(() => {
      onCompleteRef.current();
    }, 120000);
    return () => clearTimeout(fallback);
  }, [hasScore]);
  return (
    <div className="min-h-screen w-full bg-[#16A34A] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 100,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.2) 90deg, transparent 180deg, rgba(255,255,255,0.2) 270deg, transparent 360deg)",
          }}
        />
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
          Résumé Review!
        </h1>

        {!hasScore && (
          <p className="text-lg sm:text-2xl font-medium opacity-90 mb-8 sm:mb-16">
            Hand your résumé to our career expert for a quick review.
          </p>
        )}

        <AnimatePresence mode="wait">
          {!hasScore ? (
            <motion.div
              key="waiting"
              exit={{
                opacity: 0,
                scale: 0.8,
              }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="bg-white/10 p-8 sm:p-12 rounded-3xl backdrop-blur-sm border border-white/20 mb-8 sm:mb-12 shadow-2xl"
              >
                <FileText size={80} strokeWidth={1} className="sm:hidden" />
                <FileText
                  size={120}
                  strokeWidth={1}
                  className="hidden sm:block"
                />
              </motion.div>

              <div className="flex items-center space-x-4 bg-white/20 px-8 py-4 rounded-full">
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
                  Awaiting expert feedback...
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="score"
              initial={{
                opacity: 0,
                scale: 0.5,
                y: 50,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                type: "spring",
                bounce: 0.5,
              }}
              className="flex flex-col items-center w-full"
            >
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-8 sm:mb-12">
                <div className="bg-white text-[#16A34A] w-36 h-36 sm:w-48 sm:h-48 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 rotate-[-5deg]">
                  <span className="text-sm sm:text-xl font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Score
                  </span>
                  <span className="text-5xl sm:text-7xl font-black leading-none">
                    {pendingScore}
                    <span className="text-xl sm:text-3xl text-gray-300">
                      /10
                    </span>
                  </span>
                </div>

                <div className="bg-white text-[#16A34A] w-36 h-36 sm:w-48 sm:h-48 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 rotate-[5deg]">
                  <span className="text-sm sm:text-xl font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Points
                  </span>
                  <span className="text-5xl sm:text-7xl font-black leading-none text-cdgai-accent">
                    +{pendingScore}
                  </span>
                </div>
              </div>

              {currentStudent?.pendingFeedback && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.3,
                  }}
                  className="bg-white text-cdgai-dark p-5 sm:p-8 rounded-3xl w-full text-left shadow-2xl relative"
                >
                  <div className="absolute -top-4 left-8 bg-[#16A34A] text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                    Expert Feedback
                  </div>
                  <p className="text-lg sm:text-2xl font-medium leading-relaxed mt-2">
                    "{currentStudent.pendingFeedback}"
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
