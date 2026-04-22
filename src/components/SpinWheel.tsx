import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Segment } from '../context/AppContext';
interface SpinWheelProps {
  segments: Segment[];
  isSpinning?: boolean;
  targetSegmentId?: string;
  onSpinComplete?: () => void;
}
export const SpinWheel: React.FC<SpinWheelProps> = ({
  segments,
  isSpinning = false,
  targetSegmentId,
  onSpinComplete
}) => {
  const controls = useAnimation();
  const [rotation, setRotation] = useState(0);
  const numSegments = segments.length;
  const anglePerSegment = 360 / numSegments;
  const radius = 200;
  const center = 250; // 500x500 viewBox
  useEffect(() => {
    if (isSpinning && targetSegmentId) {
      const targetIndex = segments.findIndex((s) => s.id === targetSegmentId);
      if (targetIndex === -1) return;
      // Calculate the angle to rotate to.
      // We want the target segment to end up at the top (270 degrees in SVG space, or 0 degrees if we consider top as 0).
      // The pointer is at the top (0 degrees).
      const segmentAngle = targetIndex * anglePerSegment;
      // Add extra spins for effect
      const extraSpins = 360 * 5;
      // Offset by half a segment to center it on the pointer
      const targetRotation =
      extraSpins + (360 - segmentAngle) - anglePerSegment / 2;
      controls.
      start({
        rotate: targetRotation,
        transition: {
          duration: 5,
          ease: [0.2, 0.8, 0.2, 1] // Custom ease-out for realistic spin
        }
      }).
      then(() => {
        setRotation(targetRotation % 360);
        if (onSpinComplete) onSpinComplete();
      });
    } else if (!isSpinning) {
      // Idle animation
      controls.start({
        rotate: rotation + 360,
        transition: {
          duration: 40,
          ease: 'linear',
          repeat: Infinity
        }
      });
    }
  }, [
  isSpinning,
  targetSegmentId,
  controls,
  segments,
  anglePerSegment,
  onSpinComplete,
  rotation]
  );
  // Helper to create pie slice path
  const createPieSlice = (index: number) => {
    const startAngle = index * anglePerSegment * Math.PI / 180;
    const endAngle = (index + 1) * anglePerSegment * Math.PI / 180;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };
  return (
    <div role="img" aria-label="Spin wheel" className="relative w-[500px] h-[500px] flex items-center justify-center">
      {/* Pointer */}
      <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 z-10 drop-shadow-lg">
        <svg
          width="40"
          height="60"
          viewBox="0 0 40 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          
          <path
            d="M20 60L0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20L20 60Z"
            fill="#FFFFFF" />
          
          <path
            d="M20 55L4 20C4 11.1634 11.1634 4 20 4C28.8366 4 36 11.1634 36 20L20 55Z"
            fill="#810B0B" />
          
        </svg>
      </div>

      {/* Wheel */}
      <motion.div
        className="w-full h-full rounded-full shadow-2xl border-8 border-white/10 relative overflow-hidden bg-cdgai-dark"
        animate={controls}
        initial={{
          rotate: 0
        }}
        style={{
          originX: 0.5,
          originY: 0.5
        }}>
        
        <svg width="500" height="500" viewBox="0 0 500 500">
          <g transform="rotate(-90 250 250)">
            {' '}
            {/* Rotate -90 to start first segment at top */}
            {segments.map((segment, i) => {
              const textAngle = i * anglePerSegment + anglePerSegment / 2;
              return (
                <g key={segment.id}>
                  <path
                    d={createPieSlice(i)}
                    fill={segment.color}
                    stroke="#0A1628"
                    strokeWidth="4" />
                  
                  <g
                    transform={`translate(${center}, ${center}) rotate(${textAngle}) translate(${radius * 0.65}, 0)`}>
                    
                    <text
                      x="0"
                      y="0"
                      fill="white"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform="rotate(90)"
                      className="drop-shadow-md"
                      style={{
                        maxWidth: '120px'
                      }}>
                      
                      {segment.name.split(' ').map((word, idx, arr) =>
                      <tspan
                        x="0"
                        dy={
                        idx === 0 ? `-${(arr.length - 1) * 0.6}em` : '1.2em'
                        }
                        key={idx}>
                        
                          {word}
                        </tspan>
                      )}
                    </text>
                  </g>
                </g>);

            })}
          </g>
          {/* Center Hub */}
          <circle
            cx={center}
            cy={center}
            r="40"
            fill="#0A1628"
            stroke="#FFFFFF"
            strokeWidth="6" />
          
          <circle cx={center} cy={center} r="15" fill="#810B0B" />
        </svg>
      </motion.div>
    </div>);

};