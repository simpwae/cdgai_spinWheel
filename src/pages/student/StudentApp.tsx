import React, { useEffect, useState, useCallback, useRef } from "react";
import { WaitingForSpin } from "./WaitingForSpin";
import { IdleRegistration } from "./IdleRegistration";
import { LockedScreen } from "./LockedScreen";
import { ResultBetterLuck } from "./ResultBetterLuck";
import { ResultFreebee } from "./ResultFreebee";
import { ResultQuestion } from "./ResultQuestion";
import { ResultPitch } from "./ResultPitch";
import { ResultResume } from "./ResultResume";
import { useAppContext } from "../../context/AppContext";
import { sendThankYouEmail } from "../../services/email";

type ScreenState =
  | "idle"
  | "waiting"
  | "locked"
  | "result-betterluck"
  | "result-freebee"
  | "result-question"
  | "result-pitch"
  | "result-resume";

export const StudentApp: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [activeSegmentName, setActiveSegmentName] =
    useState<string>("Question Bank");
  const { currentStudent, lastSpinResult, clearSpinResult, setCurrentStudent } =
    useAppContext();

  // Keep a stable ref so handleResultComplete never needs to be re-created
  const currentStudentRef = useRef(currentStudent);
  useEffect(() => {
    currentStudentRef.current = currentStudent;
  }, [currentStudent]);

  const isResultScreen =
    screen === "result-betterluck" ||
    screen === "result-freebee" ||
    screen === "result-question" ||
    screen === "result-pitch" ||
    screen === "result-resume";

  // React to admin spin results arriving via realtime
  useEffect(() => {
    if (!lastSpinResult) return;
    if (screen !== "waiting" && screen !== "idle") return;
    const { segmentId, segmentName } = lastSpinResult;
    clearSpinResult();
    switch (segmentId) {
      case "s1":
        setScreen("result-betterluck");
        break;
      case "s2":
        setScreen("result-freebee");
        break;
      case "s3":
      case "s4":
      case "s6":
        setActiveSegmentName(segmentName);
        setScreen("result-question");
        break;
      case "s5":
        setScreen("result-pitch");
        break;
      case "s7":
        setScreen("result-resume");
        break;
    }
  }, [lastSpinResult, screen, clearSpinResult]);

  // Keyboard shortcuts for demo/testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "2") setScreen("waiting");
      if (e.key === "3") setScreen("idle");
      if (e.key === "4") setScreen("locked");
      if (e.key === "5") setScreen("result-betterluck");
      if (e.key === "6") setScreen("result-freebee");
      if (e.key === "7") {
        setActiveSegmentName("Question Bank");
        setScreen("result-question");
      }
      if (e.key === "8") setScreen("result-pitch");
      if (e.key === "9") setScreen("result-resume");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Transition back to idle or locked after a result is dismissed
  const handleResultComplete = useCallback(() => {
    const student = currentStudentRef.current;
    const wasLocked = student
      ? student.spinsUsed >= student.maxSpins
      : false;

    // Fire-and-forget thank-you email — never blocks the UI transition
    if (student?.email) {
      sendThankYouEmail(student.name, student.email);
    }

    setCurrentStudent(null);
    if (wasLocked) {
      setScreen("locked");
    } else {
      setScreen("idle");
    }
  }, [setCurrentStudent]);

  return (
    <div className="relative w-full min-h-screen">
      {/* Registration — shown when idle */}
      {screen === "idle" && (
        <IdleRegistration
          onComplete={() => setScreen("waiting")}
          onLocked={() => setScreen("locked")}
        />
      )}

      {/* Full-screen replacement screens */}
      {screen === "waiting" && <WaitingForSpin />}
      {screen === "locked" && (
        <LockedScreen onComplete={() => setScreen("idle")} />
      )}

      {/* Result screens rendered on plain dark background */}
      {isResultScreen && (
        <div className="fixed inset-0 z-50 bg-cdgai-dark">
          {screen === "result-betterluck" && (
            <ResultBetterLuck
              triesLeft={
                currentStudent
                  ? currentStudent.maxSpins - currentStudent.spinsUsed
                  : 0
              }
              onComplete={handleResultComplete}
            />
          )}
          {screen === "result-freebee" && (
            <ResultFreebee onComplete={handleResultComplete} />
          )}
          {screen === "result-question" && (
            <ResultQuestion
              segmentName={activeSegmentName}
              onComplete={handleResultComplete}
            />
          )}
          {screen === "result-pitch" && (
            <ResultPitch onComplete={handleResultComplete} />
          )}
          {screen === "result-resume" && (
            <ResultResume onComplete={handleResultComplete} />
          )}
        </div>
      )}
    </div>
  );
};
