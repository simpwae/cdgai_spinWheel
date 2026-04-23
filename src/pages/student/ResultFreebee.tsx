import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Linkedin,
  CheckCircle2,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
interface ResultFreebeeProps {
  onComplete: () => void;
}
export const ResultFreebee: React.FC<ResultFreebeeProps> = ({ onComplete }) => {
  const { currentStudent, claimAward } = useAppContext();
  const isClaimed = currentStudent?.rewardClaimed;
  const [awardState, setAwardState] = useState<
    "checking" | "new-award" | "already-awarded" | "no-awards"
  >("checking");
  const [awardName, setAwardName] = useState<string | null>(null);
  const claimAttempted = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Attempt to claim an award on mount
  useEffect(() => {
    if (!currentStudent || claimAttempted.current) return;
    claimAttempted.current = true;

    // If already has an award from a previous spin
    if (currentStudent.awardedPrize) {
      setAwardState("already-awarded");
      setAwardName(currentStudent.awardedPrize);
      return;
    }

    // Try to claim a new award (with 12s timeout fallback)
    const timeout = setTimeout(() => {
      setAwardState("no-awards");
    }, 12000);

    claimAward(currentStudent.id)
      .then((prize) => {
        clearTimeout(timeout);
        if (prize) {
          setAwardState("new-award");
          setAwardName(prize);
        } else {
          setAwardState("no-awards");
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error("Failed to claim award:", err);
        setAwardState("no-awards");
      });
  }, [currentStudent, claimAward]);

  useEffect(() => {
    // Auto-transition after 18 seconds (gives time to read the prize / social handles)
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 18000);
    return () => clearTimeout(timer);
  }, []);

  const showConfetti = awardState === "new-award";

  return (
    <div className="min-h-screen w-full bg-[#D97706] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden text-white">
      {/* CSS Confetti effect - only for new awards */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -50,
                x:
                  Math.random() *
                  (typeof window !== "undefined" ? window.innerWidth : 1200),
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y:
                  (typeof window !== "undefined" ? window.innerHeight : 800) +
                  50,
                x:
                  Math.random() *
                  (typeof window !== "undefined" ? window.innerWidth : 1200),
                rotate: 360,
                opacity: 0,
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute w-4 h-4 rounded-sm"
              style={{
                backgroundColor: ["#FFFFFF", "#FDE68A", "#FEF3C7"][
                  Math.floor(Math.random() * 3)
                ],
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{
          opacity: 0,
          y: 40,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
          type: "spring",
        }}
        className="flex flex-col items-center text-center max-w-3xl z-10 w-full px-4"
      >
        {/* Title based on award state */}
        {awardState === "checking" && (
          <>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 sm:mb-6 drop-shadow-lg">
              You won a Freebee!
            </h1>
            <p className="text-lg sm:text-2xl font-medium opacity-90 mb-8 sm:mb-12">
              Checking for available prizes...
            </p>
          </>
        )}

        {awardState === "new-award" && (
          <>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 drop-shadow-lg">
              You Won a Prize!
            </h1>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
              className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm px-5 sm:px-8 py-3 sm:py-4 rounded-2xl mb-4 sm:mb-6"
            >
              <Gift size={28} />
              <span className="text-xl sm:text-3xl font-black">
                {awardName}
              </span>
            </motion.div>
            <p className="text-lg sm:text-2xl font-medium opacity-90 mb-8 sm:mb-12">
              Follow our 3 social accounts and claim your reward at the booth.
            </p>
          </>
        )}

        {awardState === "already-awarded" && (
          <>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 drop-shadow-lg">
              Freebee!
            </h1>
            <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm px-5 sm:px-8 py-3 sm:py-4 rounded-2xl mb-4">
              <CheckCircle2 size={24} />
              <span className="text-base sm:text-xl font-bold">
                You already won: {awardName}
              </span>
            </div>
            <p className="text-base sm:text-xl font-medium opacity-80 mb-8 sm:mb-12">
              One award per person — but you still earn points! Follow our
              socials below.
            </p>
          </>
        )}

        {awardState === "no-awards" && (
          <>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 drop-shadow-lg">
              Freebee!
            </h1>
            <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm px-5 sm:px-6 py-2 sm:py-3 rounded-2xl mb-4">
              <AlertTriangle size={22} />
              <span className="text-base sm:text-lg font-bold">
                No prizes available right now
              </span>
            </div>
            <p className="text-base sm:text-xl font-medium opacity-80 mb-8 sm:mb-12">
              You still earn points! Follow our socials below.
            </p>
          </>
        )}

        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-10 sm:mb-16">
          <SocialPill icon={<Instagram size={24} />} label="@cdgai_hub" />
          <SocialPill icon={<Linkedin size={24} />} label="CDGAI Innovation" />
          <SocialPill
            icon={<span className="font-bold text-xl">TikTok</span>}
            label="@cdgai"
          />
        </div>

        <motion.div
          animate={
            isClaimed
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          className={`flex items-center space-x-3 px-5 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-xl transition-all duration-500 ${isClaimed ? "bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)]" : "bg-white/20 text-white/60 border-2 border-white/20 border-dashed"}`}
        >
          {isClaimed ? (
            <>
              <CheckCircle2 size={28} />
              <span>Reward Claimed ✓</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className="w-3 h-3 rounded-full bg-white/60"
              />

              <span>Awaiting admin confirmation...</span>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
const SocialPill = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <motion.div
    whileHover={{
      scale: 1.05,
    }}
    className="flex items-center space-x-2 sm:space-x-3 bg-white text-[#D97706] px-4 sm:px-6 py-3 sm:py-4 rounded-full shadow-xl font-bold text-base sm:text-lg"
  >
    {icon}
    <span>{label}</span>
  </motion.div>
);
