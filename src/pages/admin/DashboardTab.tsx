import React, { useState } from "react";
import { useAppContext, Student } from "../../context/AppContext";
import {
  Users,
  Activity,
  HelpCircle,
  Trophy,
  Mic,
  CheckCircle,
} from "lucide-react";
export const DashboardTab: React.FC = () => {
  const { students, currentStudent, segments, recordSpin, submitAdminScore } =
    useAppContext();
  const [isSpinning, setIsSpinning] = useState(false);

  // Pitch scoring state — set when the admin registers a "Pitch & Communicate" spin
  const [pitchStudent, setPitchStudent] = useState<Student | null>(null);
  const [pitchScore, setPitchScore] = useState(5);
  const [pitchFeedback, setPitchFeedback] = useState("");
  const [pitchSubmitted, setPitchSubmitted] = useState(false);

  const activeStudents = students.filter((s) => s.status === "active").length;
  const totalQuestionsAnswered = students.reduce(
    (acc, s) => acc + s.spinHistory.filter((h) => h.includes("q")).length,
    0,
  );
  const topScore =
    students.length > 0 ? Math.max(...students.map((s) => s.score)) : 0;

  const handleSegmentClick = (segmentId: string) => {
    if (
      !currentStudent ||
      currentStudent.spinsUsed >= currentStudent.maxSpins ||
      isSpinning
    )
      return;
    setIsSpinning(true);
    const points = segmentId === "s2" ? 5 : 0;
    recordSpin(currentStudent.id, segmentId, points);
    setIsSpinning(false);
    // If pitch segment, capture the student so admin can score below
    if (segmentId === "s5") {
      setPitchStudent(currentStudent);
      setPitchScore(5);
      setPitchFeedback("");
      setPitchSubmitted(false);
    }
  };

  const handlePitchSubmit = () => {
    if (!pitchStudent) return;
    submitAdminScore(pitchStudent.id, pitchScore, pitchFeedback || undefined);
    setPitchSubmitted(true);
  };
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Total Students
            </div>
            <div className="text-2xl font-black text-gray-900">
              {students.length}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Active Now
            </div>
            <div className="text-2xl font-black text-gray-900">
              {activeStudents}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Questions Answered
            </div>
            <div className="text-2xl font-black text-gray-900">
              {totalQuestionsAnswered}
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
            <Trophy size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Top Score
            </div>
            <div className="text-2xl font-black text-gray-900">{topScore}</div>
          </div>
        </div>
      </div>

      {/* Current Student Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Current Student</h2>
          {currentStudent && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentStudent.spinsUsed >= currentStudent.maxSpins ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {currentStudent.spinsUsed >= currentStudent.maxSpins
                ? "Locked"
                : "Active"}
            </span>
          )}
        </div>

        <div className="p-8">
          {currentStudent ? (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Name
                  </div>
                  <div className="text-3xl font-black text-gray-900">
                    {currentStudent.name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Student ID
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.studentId}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Department
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.department || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Tries Used
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.spinsUsed} / {currentStudent.maxSpins}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Score
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.score} pts
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 p-6 rounded-xl border border-gray-200 w-full">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                  Register Spin Result
                </h3>

                <div className="flex flex-wrap gap-2">
                  {segments.map((segment) => (
                    <button
                      key={segment.id}
                      onClick={() => handleSegmentClick(segment.id)}
                      disabled={
                        currentStudent.spinsUsed >= currentStudent.maxSpins ||
                        isSpinning
                      }
                      aria-label={`Register spin: ${segment.name}`}
                      className="px-4 py-3 rounded-lg font-bold text-white text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: segment.color,
                      }}
                    >
                      {segment.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-medium">
              No active student. Waiting for registration on the student
              monitor...
            </div>
          )}
        </div>
      </div>

      {/* Pitch Score Panel — shown when a pitch spin has been registered */}
      {pitchStudent && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="p-6 border-b border-orange-100 bg-orange-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Mic size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pitch Score</h2>
                <p className="text-sm text-gray-500">
                  Scoring for{" "}
                  <span className="font-bold text-gray-700">
                    {pitchStudent.name}
                  </span>
                </p>
              </div>
            </div>
            {pitchSubmitted && (
              <span className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                <CheckCircle size={14} />
                <span>Score Sent</span>
              </span>
            )}
          </div>

          <div className="p-6">
            {pitchSubmitted ? (
              <div className="text-center py-4">
                <p className="text-gray-500 font-medium">
                  Score of{" "}
                  <span className="text-2xl font-black text-orange-600">
                    {pitchScore}
                  </span>
                  /10 sent to the student screen.
                </p>
                {pitchFeedback && (
                  <p className="mt-2 text-sm text-gray-400 italic">
                    "{pitchFeedback}"
                  </p>
                )}
                <button
                  onClick={() => {
                    setPitchStudent(null);
                    setPitchSubmitted(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score slider */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                    Score (0 – 10)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={pitchScore}
                      onChange={(e) => setPitchScore(Number(e.target.value))}
                      className="flex-1 accent-orange-500"
                    />
                    <span className="text-3xl font-black text-orange-600 w-10 text-center">
                      {pitchScore}
                    </span>
                  </div>
                  {/* Visual tick marks */}
                  <div className="flex justify-between px-1 mt-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <span
                        key={n}
                        className={`text-xs font-medium ${n === pitchScore ? "text-orange-600 font-black" : "text-gray-300"}`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label
                    htmlFor="pitch-feedback"
                    className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider"
                  >
                    Feedback{" "}
                    <span className="text-gray-400 font-normal normal-case">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="pitch-feedback"
                    value={pitchFeedback}
                    onChange={(e) => setPitchFeedback(e.target.value)}
                    placeholder="Great energy! Work on structuring your ideas..."
                    maxLength={300}
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-orange-400 resize-none text-sm text-gray-900"
                  />
                </div>

                <button
                  onClick={handlePitchSubmit}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-lg transition-colors active:scale-95 shadow-sm"
                >
                  Submit Score → {pitchScore}/10
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-0">
          <div className="divide-y divide-gray-100">
            {/* Mock Activity Log */}
            <div className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="text-sm text-gray-600 flex-1">
                <span className="font-bold text-gray-900">Alex Johnson</span>{" "}
                registered for the event.
              </div>
              <div className="text-xs text-gray-400 font-medium">2 min ago</div>
            </div>
            <div className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="text-sm text-gray-600 flex-1">
                <span className="font-bold text-gray-900">Sarah Smith</span>{" "}
                spun{" "}
                <span className="font-bold text-blue-600">
                  Career Questions
                </span>
                .
              </div>
              <div className="text-xs text-gray-400 font-medium">5 min ago</div>
            </div>
            <div className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <div className="text-sm text-gray-600 flex-1">
                <span className="font-bold text-gray-900">Michael Chen</span>{" "}
                answered a question correctly (+10 pts).
              </div>
              <div className="text-xs text-gray-400 font-medium">
                12 min ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
