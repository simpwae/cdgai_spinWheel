import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { CountdownTimer } from '../../components/CountdownTimer';
interface ResultQuestionProps {
  segmentName: string;
  onComplete: () => void;
}
export const ResultQuestion: React.FC<ResultQuestionProps> = ({
  segmentName,
  onComplete
}) => {
  const { questions, currentStudent, claimAward } = useAppContext();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [awardState, setAwardState] = useState<'idle' | 'claiming' | 'claimed' | 'none'>('idle');
  const [awardName, setAwardName] = useState<string | null>(null);
  const claimAttempted = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  // Find a relevant question — deterministic selection based on category + student type
  const question = useMemo(() => {
    // Filter by category (segment name)
    let available = questions.filter((q) => q.category === segmentName);
    if (currentStudent?.isGuest) {
      // Guests always get generic (department-null) questions only
      const generic = available.filter((q) => !q.department);
      if (generic.length > 0) available = generic;
      // else keep full category pool as last resort
    } else if (currentStudent?.department) {
      // CECOS students: prefer dept-specific questions
      const deptQuestions = available.filter(
        (q) => q.department === currentStudent.department
      );
      if (deptQuestions.length > 0) {
        available = deptQuestions;
      } else {
        // Fall back to generic questions for this category
        const generic = available.filter((q) => !q.department);
        if (generic.length > 0) available = generic;
      }
    }
    // Deterministically pick first (non-random) so each student in a queue
    // gets the same question for their dept — shuffled on import
    return available.length > 0 ? available[0] : null;
  }, [questions, segmentName, currentStudent]);
  // Handle auto-transition after result is shown
  useEffect(() => {
    if (showResult) {
      // When prize is claimed give the user 7s to read the popup; otherwise 4s
      const delay = awardState === 'claimed' ? 7000 : 4000;
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [showResult, awardState]);
  const handleSelect = (index: number) => {
    if (selectedOption !== null || isTimeUp || showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (question && index === question.correctAnswerIndex) {
      if (currentStudent) {
        // Claim a random award for correct answer (one prize per student)
        if (!claimAttempted.current && !currentStudent.awardedPrize) {
          claimAttempted.current = true;
          setAwardState('claiming');
          claimAward(currentStudent.id).then((prize) => {
            if (prize) {
              setAwardState('claimed');
              setAwardName(prize);
            } else {
              setAwardState('none');
            }
          }).catch(() => {
            setAwardState('none');
          });
        }
      }
    }
  };
  const handleTimeUp = () => {
    if (!showResult) {
      setIsTimeUp(true);
      setShowResult(true);
    }
  };
  if (!question) {
    return (
      <div className="min-h-screen w-full bg-[#0A1628] flex flex-col items-center justify-center p-8 text-white">
        <div className="bg-white/10 p-8 rounded-2xl text-center max-w-lg border border-white/20">
          <h2 className="text-2xl font-bold mb-4">No questions available</h2>
          <p className="text-gray-400">
            No questions loaded for your department yet. Admin has been
            notified.
          </p>
          <button
            onClick={onComplete}
            className="mt-8 px-6 py-3 bg-cdgai-accent rounded-lg font-bold">
            
            Continue
          </button>
        </div>
      </div>);

  }
  const isCorrect = selectedOption === question.correctAnswerIndex;
  const showCorrectFlash = showResult && isCorrect && !isTimeUp;
  const showIncorrectFlash =
  showResult && !isCorrect && !isTimeUp && selectedOption !== null;
  return (
    <div className="min-h-screen w-full bg-[#0A1628] flex flex-col relative overflow-hidden text-white">
      {/* Result Flashes */}
      <AnimatePresence>
        {showCorrectFlash &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 1
          }}
          className="absolute inset-0 bg-green-500 z-0 pointer-events-none" />

        }
        {showIncorrectFlash &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 1
          }}
          className="absolute inset-0 bg-red-500 z-0 pointer-events-none" />

        }
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 sm:p-8 z-10">
        <div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">{segmentName}</h1>
          {question.department &&
          <span className="inline-block mt-2 px-3 py-1 bg-white/10 rounded-full text-sm font-bold text-gray-300">
              {question.department}
            </span>
          }
        </div>

        {!showResult &&
        <CountdownTimer
          totalSeconds={90}
          onComplete={handleTimeUp}
          size={60}
          color="#2563EB" />

        }
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full z-10">
        {/* Result Overlay Text */}
        <AnimatePresence>
          {showResult &&
          <motion.div
            initial={{
              opacity: 0,
              y: -20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="absolute top-32 text-center w-full left-0 px-4">
            
              {isTimeUp ?
            <h2 className="text-2xl sm:text-4xl font-black text-yellow-500">
                  Time's up!
                </h2> :
            isCorrect ?
            <div className="flex flex-col items-center space-y-3">
                  <h2 className="text-2xl sm:text-4xl font-black text-green-400">
                    Correct! 🎉
                  </h2>
                  {awardState === 'claimed' && awardName && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-white/30">
                      <Gift size={20} className="text-yellow-300 shrink-0" />
                      <span className="text-base sm:text-2xl font-black text-yellow-300">
                        You won: {awardName}!
                      </span>
                    </motion.div>
                  )}
                  {awardState === 'claiming' && (
                    <p className="text-sm sm:text-base text-white/70 animate-pulse">
                      Checking for prizes...
                    </p>
                  )}
                </div> :

            <h2 className="text-2xl sm:text-4xl font-black text-red-400">Incorrect</h2>
            }
            </motion.div>
          }
        </AnimatePresence>

        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className="w-full">
          
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-8 sm:mb-16 text-center">
            {question.text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
            {question.options.map((option, index) => {
              const labels = ['A', 'B', 'C', 'D'];
              // Determine card styling based on state
              let cardStyle =
              'bg-white text-cdgai-dark border-2 border-transparent hover:border-cdgai-accent hover:shadow-lg cursor-pointer';
              let labelStyle = 'bg-gray-100 text-gray-500';
              if (showResult) {
                if (index === question.correctAnswerIndex) {
                  // The correct answer always turns green
                  cardStyle =
                  'bg-green-500 text-white border-2 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]';
                  labelStyle = 'bg-green-600 text-white';
                } else if (index === selectedOption) {
                  // The wrong selected answer turns red
                  cardStyle = 'bg-red-500 text-white border-2 border-red-400';
                  labelStyle = 'bg-red-600 text-white';
                } else {
                  // Unselected wrong answers fade out
                  cardStyle =
                  'bg-white/50 text-gray-500 border-2 border-transparent opacity-50 cursor-not-allowed';
                  labelStyle = 'bg-gray-200 text-gray-400';
                }
              } else if (selectedOption === index) {
                // Selected state before result (though we show result immediately, this is for safety)
                cardStyle =
                'bg-cdgai-accent text-white border-2 border-blue-400';
                labelStyle = 'bg-blue-600 text-white';
              }
              return (
                <motion.button
                  key={index}
                  whileHover={
                  !showResult ?
                  {
                    scale: 1.02
                  } :
                  {}
                  }
                  whileTap={
                  !showResult ?
                  {
                    scale: 0.98
                  } :
                  {}
                  }
                  onClick={() => handleSelect(index)}
                  disabled={showResult}
                  aria-label={`Option ${labels[index]}: ${option}${showResult ? (index === question.correctAnswerIndex ? ' — correct answer' : index === selectedOption ? ' — your incorrect answer' : '') : ''}`}
                  aria-pressed={selectedOption === index}
                  className={`w-full flex items-center p-4 sm:p-6 rounded-2xl text-left transition-all duration-300 min-h-[64px] sm:min-h-[80px] ${cardStyle}`}>
                  
                  <div
                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-base sm:text-xl mr-4 sm:mr-6 shrink-0 transition-colors ${labelStyle}`}>
                    
                    {labels[index]}
                  </div>
                  <span className="text-lg sm:text-2xl font-bold leading-tight">
                    {option}
                  </span>
                </motion.button>);

            })}
          </div>
        </motion.div>
      </div>
    </div>);

};