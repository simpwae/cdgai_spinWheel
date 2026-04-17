import React, { useEffect, useState } from 'react';
import { WaitingForSpin } from './WaitingForSpin';
import { IdleLeaderboard } from './IdleLeaderboard';
import { LockedScreen } from './LockedScreen';
import { ResultBetterLuck } from './ResultBetterLuck';
import { ResultFreebee } from './ResultFreebee';
import { ResultQuestion } from './ResultQuestion';
import { ResultPitch } from './ResultPitch';
import { ResultResume } from './ResultResume';
import { useAppContext } from '../../context/AppContext';
type ScreenState =
'idle' |
'waiting' |
'locked' |
'result-betterluck' |
'result-freebee' |
'result-question' |
'result-pitch' |
'result-resume';
export const StudentApp: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('idle');
  const [activeSegmentName, setActiveSegmentName] =
  useState<string>('Question Bank');
  const { currentStudent, lastSpinResult, clearSpinResult } = useAppContext();

  // React to admin spin results arriving via cross-tab sync
  useEffect(() => {
    if (!lastSpinResult) return;
    if (screen !== 'waiting') return;
    const { segmentId, segmentName } = lastSpinResult;
    clearSpinResult();
    switch (segmentId) {
      case 's1': setScreen('result-betterluck'); break;
      case 's2': setScreen('result-freebee'); break;
      case 's3':
      case 's4':
      case 's6':
        setActiveSegmentName(segmentName);
        setScreen('result-question');
        break;
      case 's5': setScreen('result-pitch'); break;
      case 's7': setScreen('result-resume'); break;
    }
  }, [lastSpinResult, screen, clearSpinResult]);
  // Simple keyboard shortcut to simulate flow for demo purposes
  // In a real app, the admin panel would trigger these state changes via WebSockets/DB
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === '2') setScreen('waiting');
      if (e.key === '3') setScreen('idle');
      if (e.key === '4') setScreen('locked');
      if (e.key === '5') setScreen('result-betterluck');
      if (e.key === '6') setScreen('result-freebee');
      if (e.key === '7') {
        setActiveSegmentName('Question Bank');
        setScreen('result-question');
      }
      if (e.key === '8') setScreen('result-pitch');
      if (e.key === '9') setScreen('result-resume');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  // Helper to transition back to idle or locked
  const handleResultComplete = () => {
    if (currentStudent && currentStudent.spinsUsed >= currentStudent.maxSpins) {
      setScreen('locked');
    } else {
      setScreen('idle');
    }
  };
  // Render the active screen
  switch (screen) {
    case 'waiting':
      return <WaitingForSpin />;
    case 'locked':
      return <LockedScreen onSeeLeaderboard={() => setScreen('idle')} />;
    // Result Screens
    case 'result-betterluck':
      return (
        <ResultBetterLuck
          triesLeft={
          currentStudent ?
          currentStudent.maxSpins - currentStudent.spinsUsed :
          0
          }
          onComplete={handleResultComplete} />);


    case 'result-freebee':
      return <ResultFreebee onComplete={handleResultComplete} />;
    case 'result-question':
      return (
        <ResultQuestion
          segmentName={activeSegmentName}
          onComplete={handleResultComplete} />);


    case 'result-pitch':
      return <ResultPitch onComplete={handleResultComplete} />;
    case 'result-resume':
      return <ResultResume onComplete={handleResultComplete} />;
    case 'idle':
    default:
      return (
        <div className="relative w-full h-full">
          <IdleLeaderboard onComplete={() => setScreen('waiting')} onLocked={() => setScreen('locked')} />

          {/* Demo overlay to help user navigate the prototype */}
          <div className="absolute bottom-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg border border-white/20 z-50 flex space-x-6">
            <div>
              <div className="font-bold mb-1 text-gray-400 uppercase tracking-wider">
                Core Flow
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">1</kbd> Registration
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">2</kbd> Waiting
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">3</kbd> Leaderboard
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">4</kbd> Locked
              </div>
            </div>
            <div>
              <div className="font-bold mb-1 text-gray-400 uppercase tracking-wider">
                Results
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">5</kbd> Better Luck
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">6</kbd> Freebee
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">7</kbd> Question
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">8</kbd> Pitch
              </div>
              <div>
                <kbd className="bg-white/20 px-1 rounded">9</kbd> Resume
              </div>
            </div>
          </div>
        </div>);

  }
};