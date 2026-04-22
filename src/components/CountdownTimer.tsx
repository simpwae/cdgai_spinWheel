import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
interface CountdownTimerProps {
  totalSeconds: number;
  onComplete?: () => void;
  size?: number;
  color?: string;
}
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  totalSeconds,
  onComplete,
  size = 120,
  color = '#2563EB'
}) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset =
  circumference - timeLeft / totalSeconds * circumference;
  useEffect(() => {
    if (timeLeft <= 0) {
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size
      }}>
      
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none" />
        
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{
            strokeDashoffset: 0
          }}
          animate={{
            strokeDashoffset
          }}
          transition={{
            duration: 1,
            ease: 'linear'
          }}
          style={{
            strokeDasharray: circumference
          }} />
        
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          aria-live="polite"
          aria-label={`${timeLeft} seconds remaining`}
          className="text-4xl font-black tracking-tighter"
          style={{
            color: '#FFFFFF'
          }}>
          
          {timeLeft}
        </span>
      </div>
    </div>);

};