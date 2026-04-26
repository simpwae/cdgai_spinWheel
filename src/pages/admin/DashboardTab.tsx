import React, { useState, useRef } from "react";
import { useAppContext, Student } from "../../context/AppContext";
import {
  Users,
  Activity,
  HelpCircle,
} from "lucide-react";
export const DashboardTab: React.FC = () => {
  const {
    students,
    currentStudent,
    segments,
    recordSpin,
    submitAdminScore,
    rewardPoints,
  } = useAppContext();
  const [isSpinning, setIsSpinning] = useState(false);
  const spinningRef = useRef(false);

  const activeStudents = students.filter((s) => s.status === "active").length;
  const totalQuestionsAnswered = students.reduce(
    (acc, s) =>
      acc + s.spinHistory.filter((h) => ["s3", "s4", "s6"].includes(h)).length,
    0,
  );

  const handleSegmentClick = (segmentId: string) => {
    if (
      !currentStudent ||
      currentStudent.spinsUsed >= currentStudent.maxSpins ||
      spinningRef.current
    )
      return;
    spinningRef.current = true;
    setIsSpinning(true);
    const points = segmentId === "s2" ? rewardPoints : 0;
    recordSpin(currentStudent.id, segmentId, points);
    // Reset after 3 s — the realtime event will clear currentStudent before this
    setTimeout(() => {
      spinningRef.current = false;
      setIsSpinning(false);
    }, 3000);
    // If pitch segment, capture the student so admin can score below
    if (segmentId === "s5") {
      setPitchStudent(currentStudent);
      setPitchScore(5);
      setPitchFeedback("");
      setPitchSubmitted(false);
    }
    // If resume segment, capture the student so admin can score below
    if (segmentId === "s7") {
      setResumeStudent(currentStudent);
      setResumeScore(5);
      setResumeFeedback("");
      setResumeSubmitted(false);
    }
  };

  const handlePitchSubmit = () => {
    if (!pitchStudent) return;
    submitAdminScore(pitchStudent.id, pitchScore, pitchFeedback || undefined);
    setPitchSubmitted(true);
  };

  const handleResumeSubmit = () => {
    if (!resumeStudent) return;
    submitAdminScore(
      resumeStudent.id,
      resumeScore,
      resumeFeedback || undefined,
    );
    setResumeSubmitted(true);
  };
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
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
                </div>

                {currentStudent.spinHistory.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Spin History
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentStudent.spinHistory.map((segId, i) => {
                        const seg = segments.find((s) => s.id === segId);
                        return (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: seg?.color ?? "#6B7280" }}
                          >
                            {seg?.name ?? segId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
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

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-0">
          <div className="divide-y divide-gray-100">
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
                answered a question correctly.
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
