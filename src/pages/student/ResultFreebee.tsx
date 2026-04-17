import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Linkedin, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
interface ResultFreebeeProps {
  onComplete: () => void;
}
export const ResultFreebee: React.FC<ResultFreebeeProps> = ({ onComplete }) => {
  const { currentStudent } = useAppContext();
  const isClaimed = currentStudent?.rewardClaimed;
  useEffect(() => {
    // Auto-transition after 8 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return (
    <div className="min-h-screen w-full bg-[#D97706] flex flex-col items-center justify-center p-8 relative overflow-hidden text-white">
      {/* CSS Confetti effect - simplified for React */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) =>
        <motion.div
          key={i}
          initial={{
            y: -50,
            x: Math.random() * window.innerWidth,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            y: window.innerHeight + 50,
            x: Math.random() * window.innerWidth,
            rotate: 360,
            opacity: 0
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
          className="absolute w-4 h-4 bg-white/40 rounded-sm"
          style={{
            backgroundColor: ['#FFFFFF', '#FDE68A', '#FEF3C7'][
            Math.floor(Math.random() * 3)]

          }} />

        )}
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 40
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          duration: 0.6,
          type: 'spring'
        }}
        className="flex flex-col items-center text-center max-w-3xl z-10">
        
        <h1 className="text-7xl font-black tracking-tight mb-6 drop-shadow-lg">
          You won a Freebee!
        </h1>

        <p className="text-2xl font-medium opacity-90 mb-12">
          Follow our 3 social accounts and claim your reward at the booth.
        </p>

        <div className="flex space-x-6 mb-16">
          <SocialPill icon={<Instagram size={24} />} label="@cdgai_hub" />
          <SocialPill icon={<Linkedin size={24} />} label="CDGAI Innovation" />
          <SocialPill
            icon={<span className="font-bold text-xl">TikTok</span>}
            label="@cdgai" />
          
        </div>

        <motion.div
          animate={
          isClaimed ?
          {
            scale: [1, 1.1, 1]
          } :
          {}
          }
          className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-500 ${isClaimed ? 'bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'bg-white/20 text-white/60 border-2 border-white/20 border-dashed'}`}>
          
          {isClaimed ?
          <>
              <CheckCircle2 size={28} />
              <span>Reward Claimed ✓</span>
            </> :

          <>
              <motion.div
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity
              }}
              className="w-3 h-3 rounded-full bg-white/60" />
            
              <span>Awaiting admin confirmation...</span>
            </>
          }
        </motion.div>
      </motion.div>
    </div>);

};
const SocialPill = ({
  icon,
  label



}: {icon: React.ReactNode;label: string;}) =>
<motion.div
  whileHover={{
    scale: 1.05
  }}
  className="flex items-center space-x-3 bg-white text-[#D97706] px-6 py-4 rounded-full shadow-xl font-bold text-lg">
  
    {icon}
    <span>{label}</span>
  </motion.div>;