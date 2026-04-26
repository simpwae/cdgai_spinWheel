import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { CountdownTimer } from "../../components/CountdownTimer";
import { QUESTIONS_BY_DEPT, StaticQuestion } from "../../data/questions";
interface ResultQuestionProps {
  segmentName: string;
  onComplete: () => void;
}
export const ResultQuestion: React.FC<ResultQuestionProps> = ({
  segmentName,
  onComplete,
}) => {
  const { currentStudent, updateScore, claimAward, recordQuestionResult } =
    useAppContext();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // Prize is only claimed when the answer is correct — NOT on mount
  const [prizeState, setPrizeState] = useState<
    "idle" | "checking" | "new-award" | "already-awarded" | "no-awards"
  >("idle");
  const [prizeName, setPrizeName] = useState<string | null>(null);
  const claimAttempted = useRef(false);

  const tryClaimAward = () => {
    if (!currentStudent || claimAttempted.current) return;
    claimAttempted.current = true;
    if (currentStudent.awardedPrize) {
      setPrizeName(currentStudent.awardedPrize);
      setPrizeState("already-awarded");
      return;
    }
    setPrizeState("checking");
    const timeout = setTimeout(() => setPrizeState("no-awards"), 12000);
    claimAward(currentStudent.id)
      .then((result) => {
        clearTimeout(timeout);
        if (result?.awardName) {
          setPrizeName(result.awardName);
          setPrizeState(
            result.alreadyAwarded ? "already-awarded" : "new-award",
          );
        } else {
          setPrizeState("no-awards");
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        setPrizeState("no-awards");
      });
  };
  // Normalise abbreviated / legacy dept names stored in the DB (e.g. 'CS' → 'Computer Sciences')
  // Defined outside render so it's stable — only used inside effects/handlers
  const VALID_CATEGORIES = ["Question Bank", "IQ Games", "Career Questions"];

  // ── Question selection ──────────────────────────────────────────────────────
  // We lock the question in ONCE (in state) the first time currentStudent arrives.
  // Using useMemo with Math.random() caused flicker: memo re-ran when currentStudent
  // updated (score/spins_used change from DB), picking a fresh random question each
  // time. Worse, if currentStudent was null on mount (async fetch), the fallback
  // picked a random dept (often Electrical) and that wrong question stuck.
  const [question, setQuestion] = useState<StaticQuestion | null>(null);
  const [questionDept, setQuestionDept] = useState<string | null>(null);
  const questionPickedRef = useRef(false);

  useEffect(() => {
    if (questionPickedRef.current) return; // already locked in
    if (!currentStudent) return; // wait for student data

    questionPickedRef.current = true; // lock — never re-pick

    const rand = <T,>(arr: T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    const DEPT_ALIASES: Record<string, string> = {
      cs: "Computer Sciences",
      "computer science": "Computer Sciences",
      ce: "Civil",
      "civil engineering": "Civil",
      bsh: "Basic Science & Humanities",
      "basic sciences": "Basic Science & Humanities",
      se: "Software Engineering",
      "software eng": "Software Engineering",
      ee: "Electrical",
      "electrical engineering": "Electrical",
      mech: "Mechanical",
      "mechanical engineering": "Mechanical",
      arch: "Architecture",
      architecuture: "Architecture",
      "allied health": "Allied Health Sciences",
      "allied heath sciences": "Allied Health Sciences",
      biosciences: "Bioscience",
      "bio science": "Bioscience",
      "management sciences": "Management of Science",
      "management science": "Management of Science",
      nursing: "Nursing",
      pharmacy: "Pharmacy",
    };

    // Resolve the student's department
    const isStudent = currentStudent.participantType === "student";
    const rawDept =
      (isStudent ? currentStudent.department : currentStudent.faculty) || "";
    const deptKey = rawDept.trim().toLowerCase();
    const dept = rawDept.trim()
      ? (DEPT_ALIASES[deptKey] ?? rawDept.trim())
      : null;

    setQuestionDept(dept);

    // Resolve the category from the wheel segment
    const category = VALID_CATEGORIES.includes(segmentName)
      ? segmentName
      : "Question Bank";

    let picked: StaticQuestion | null = null;

    if (dept && QUESTIONS_BY_DEPT[dept]) {
      const deptData = QUESTIONS_BY_DEPT[dept];
      if (deptData[category]?.length > 0) {
        picked = rand(deptData[category]);
      } else if (deptData["Question Bank"]?.length > 0) {
        picked = rand(deptData["Question Bank"]);
      }
    }

    if (!picked) {
      // Guest or unrecognised dept — pick from a random dept's category pool
      const allDepts = Object.keys(QUESTIONS_BY_DEPT).sort(
        () => Math.random() - 0.5,
      );
      for (const d of allDepts) {
        const pool =
          QUESTIONS_BY_DEPT[d][category] ??
          QUESTIONS_BY_DEPT[d]["Question Bank"];
        if (pool?.length > 0) {
          picked = rand(pool);
          break;
        }
      }
    }

    setQuestion(picked);
  }, [currentStudent, segmentName]);

  // Safety net: if student data NEVER arrives (page-reload edge case),
  // pick a generic question after 2 s so the timer doesn't just hang.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (questionPickedRef.current) return;
      questionPickedRef.current = true;
      const rand = <T,>(arr: T[]): T =>
        arr[Math.floor(Math.random() * arr.length)];
      const allDepts = Object.keys(QUESTIONS_BY_DEPT);
      for (const d of allDepts) {
        const pool = QUESTIONS_BY_DEPT[d]["Question Bank"];
        if (pool?.length > 0) {
          setQuestion(rand(pool));
          return;
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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
  }, [showResult]);

  const handleSelect = (index: number) => {
    if (selectedOption !== null || isTimeUp || showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    const correct = question !== null && index === question.correctAnswerIndex;
    if (currentStudent) {
      // Always record category + correct/wrong to DB
      recordQuestionResult(currentStudent.id, segmentName, correct);
      if (correct) {
        updateScore(currentStudent.id, 10); // 10 points for correct answer
        tryClaimAward(); // only claim prize on correct answer
      }
    }
  };

  const handleTimeUp = () => {
    if (!showResult) {
      setIsTimeUp(true);
      setShowResult(true);
      // Time up = wrong; record to DB
      if (currentStudent) {
        recordQuestionResult(currentStudent.id, segmentName, false);
      }
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
            className="mt-8 px-6 py-3 bg-cdgai-accent rounded-lg font-bold"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }
  const isCorrect = selectedOption === question.correctAnswerIndex;
  const showCorrectFlash = showResult && isCorrect && !isTimeUp;
  const showIncorrectFlash =
    showResult && !isCorrect && !isTimeUp && selectedOption !== null;
  return (
    <div className="min-h-screen w-full bg-[#0A1628] flex flex-col relative overflow-hidden text-white">
      {/* Result Flashes */}
      <AnimatePresence>
        {showCorrectFlash && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1,
            }}
            className="absolute inset-0 bg-green-500 z-0 pointer-events-none"
          />
        )}
        {showIncorrectFlash && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1,
            }}
            className="absolute inset-0 bg-red-500 z-0 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 sm:p-8 z-10">
        <div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">
            {segmentName}
          </h1>
          {questionDept && (
            <span className="inline-block mt-2 px-3 py-1 bg-white/10 rounded-full text-sm font-bold text-gray-300">
              {questionDept}
            </span>
          )}
        </div>

        {!showResult && (
          <CountdownTimer
            totalSeconds={90}
            onComplete={handleTimeUp}
            size={60}
            color="#2563EB"
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full z-10">
        {/* Result Overlay Text */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{
                opacity: 0,
                y: -20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="absolute top-32 text-center w-full left-0 px-4"
            >
              {isTimeUp ? (
                <h2 className="text-2xl sm:text-4xl font-black text-yellow-500">
                  Time's up!
                </h2>
              ) : isCorrect ? (
                <h2 className="text-2xl sm:text-4xl font-black text-green-400">
                  Correct! +10 pts
                </h2>
              ) : (
                <h2 className="text-2xl sm:text-4xl font-black text-red-400">
                  Incorrect
                </h2>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="w-full"
        >
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-8 sm:mb-16 text-center">
            {question.text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
            {question.options.map((option, index) => {
              const labels = ["A", "B", "C", "D"];
              // Determine card styling based on state
              let cardStyle =
                "bg-white text-cdgai-dark border-2 border-transparent hover:border-cdgai-accent hover:shadow-lg cursor-pointer";
              let labelStyle = "bg-gray-100 text-gray-500";
              if (showResult) {
                if (index === question.correctAnswerIndex) {
                  // The correct answer always turns green
                  cardStyle =
                    "bg-green-500 text-white border-2 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]";
                  labelStyle = "bg-green-600 text-white";
                } else if (index === selectedOption) {
                  // The wrong selected answer turns red
                  cardStyle = "bg-red-500 text-white border-2 border-red-400";
                  labelStyle = "bg-red-600 text-white";
                } else {
                  // Unselected wrong answers fade out
                  cardStyle =
                    "bg-white/50 text-gray-500 border-2 border-transparent opacity-50 cursor-not-allowed";
                  labelStyle = "bg-gray-200 text-gray-400";
                }
              } else if (selectedOption === index) {
                // Selected state before result (though we show result immediately, this is for safety)
                cardStyle =
                  "bg-cdgai-accent text-white border-2 border-blue-400";
                labelStyle = "bg-blue-600 text-white";
              }
              return (
                <motion.button
                  key={index}
                  whileHover={
                    !showResult
                      ? {
                          scale: 1.02,
                        }
                      : {}
                  }
                  whileTap={
                    !showResult
                      ? {
                          scale: 0.98,
                        }
                      : {}
                  }
                  onClick={() => handleSelect(index)}
                  disabled={showResult}
                  aria-label={`Option ${labels[index]}: ${option}${showResult ? (index === question.correctAnswerIndex ? " — correct answer" : index === selectedOption ? " — your incorrect answer" : "") : ""}`}
                  aria-pressed={selectedOption === index}
                  className={`w-full flex items-center p-4 sm:p-6 rounded-2xl text-left transition-all duration-300 min-h-[64px] sm:min-h-[80px] ${cardStyle}`}
                >
                  <div
                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-base sm:text-xl mr-4 sm:mr-6 shrink-0 transition-colors ${labelStyle}`}
                  >
                    {labels[index]}
                  </div>
                  <span className="text-lg sm:text-2xl font-bold leading-tight">
                    {option}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Prize Widget */}
        {prizeState === "checking" && (
          <div className="mt-6 flex items-center space-x-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span>Checking your prize...</span>
          </div>
        )}
        {prizeState === "new-award" && prizeName && (
          <div className="mt-6 flex items-center space-x-2 text-yellow-400 text-lg font-bold">
            <Gift size={20} />
            <span>You've won: {prizeName}!</span>
          </div>
        )}
        {prizeState === "already-awarded" && prizeName && (
          <div className="mt-6 flex items-center space-x-2 text-gray-400 text-sm">
            <Gift size={16} />
            <span>Your prize: {prizeName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
