import React, { useState, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  Users,
  Activity,
  HelpCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  type PieLabelRenderProps,
} from "recharts";
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

  // Pitch scoring state
  const [pitchStudent, setPitchStudent] = useState<typeof currentStudent>(null);
  const [pitchScore, setPitchScore] = useState(5);
  const [pitchFeedback, setPitchFeedback] = useState("");
  const [pitchSubmitted, setPitchSubmitted] = useState(false);

  // Resume scoring state
  const [resumeStudent, setResumeStudent] = useState<typeof currentStudent>(null);
  const [resumeScore, setResumeScore] = useState(5);
  const [resumeFeedback, setResumeFeedback] = useState("");
  const [resumeSubmitted, setResumeSubmitted] = useState(false);

  // suppress unused-var warnings for submit handlers (used by future UI)
  void pitchSubmitted; void resumeSubmitted;

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
  void handlePitchSubmit;

  const handleResumeSubmit = () => {
    if (!resumeStudent) return;
    submitAdminScore(
      resumeStudent.id,
      resumeScore,
      resumeFeedback || undefined,
    );
    setResumeSubmitted(true);
  };
  void handleResumeSubmit;
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Total Participants
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
            <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
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
            <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
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
          <h2 className="text-xl font-bold text-gray-900">Current Participant</h2>
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
                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Participant ID
                    </div>
                    <div className="text-lg font-medium text-gray-700 flex items-center gap-2">
                      {currentStudent.studentId}
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
                        {currentStudent.participantType === 'faculty' ? 'Faculty' : currentStudent.participantType === 'student' ? 'CECOS Student' : currentStudent.guestType === 'student' ? 'Guest Student' : 'Guest'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Department
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.department || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Tries Used
                    </div>
                    <div className="text-lg font-medium text-gray-700">
                      {currentStudent.spinsUsed} / {currentStudent.maxSpins}
                    </div>
                  </div>
                </div>

                {currentStudent.spinHistory.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
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
              No active participant. Waiting for registration on the participant
              monitor...
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity — removed; replaced by Session Analytics below */}

      {/* ── Session Analytics ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Session Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Live snapshot of all participants in this session</p>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">
            No participants yet. Analytics will appear once someone registers.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Chart 1 — Participants by Faculty */}
            <AnalyticsPanel title="Participants by Faculty">
              {(() => {
                const data = Object.entries(
                  students.reduce<Record<string, number>>((acc, s) => {
                    const key = s.faculty || "Unknown";
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([name, count]) => ({ name, count }));
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Participants" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </AnalyticsPanel>

            {/* Chart 2 — Participant Types */}
            <AnalyticsPanel title="Participant Types">
              {(() => {
                const counts = students.reduce<Record<string, number>>((acc, s) => {
                  let label = "Other";
                  if (s.participantType === "student") label = "CECOS Student";
                  else if (s.participantType === "faculty") label = "Faculty";
                  else if (s.participantType === "others") {
                    if (s.guestType === "student") label = "Guest Student";
                    else if (s.guestType === "faculty") label = "Guest Faculty";
                    else label = "Guest";
                  }
                  acc[label] = (acc[label] ?? 0) + 1;
                  return acc;
                }, {});
                const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
                const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#f97316"];
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={80}
                        label={(props: PieLabelRenderProps) => {
                          const name = props.name ?? "";
                          const pct = ((props.percent ?? 0) * 100).toFixed(0);
                          return `${name} (${pct}%)`;
                        }}
                        labelLine={false}
                      >
                        {data.map((_entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </AnalyticsPanel>

            {/* Chart 3 — Spin Outcomes */}
            <AnalyticsPanel title="Spin Outcomes">
              {(() => {
                const countMap: Record<string, number> = {};
                for (const s of students) {
                  for (const segId of s.spinHistory) {
                    countMap[segId] = (countMap[segId] ?? 0) + 1;
                  }
                }
                const data = Object.entries(countMap)
                  .map(([segId, count]) => {
                    const seg = segments.find((sg) => sg.id === segId);
                    return { name: seg?.name ?? segId, count, color: seg?.color ?? "#6B7280" };
                  })
                  .sort((a, b) => b.count - a.count);
                if (data.length === 0) {
                  return <EmptyChart message="No spins recorded yet" />;
                }
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Times spun" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </AnalyticsPanel>

            {/* Chart 6 — Prizes Won (paired with Spin Outcomes) */}
            <AnalyticsPanel title="Prizes Won">
              {(() => {
                const prizeCounts = students.reduce<Record<string, number>>((acc, s) => {
                  if (s.awardedPrize) {
                    acc[s.awardedPrize] = (acc[s.awardedPrize] ?? 0) + 1;
                  }
                  return acc;
                }, {});
                const data = Object.entries(prizeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => ({ name, count }));
                if (data.length === 0) {
                  return <EmptyChart message="No prizes claimed yet" />;
                }
                const PRIZE_COLORS = [
                  "#ec4899", "#f97316", "#eab308", "#22c55e",
                  "#14b8a6", "#6366f1", "#a855f7", "#f43f5e",
                ];
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Times claimed" radius={[0, 4, 4, 0]}>
                        {data.map((_entry, index) => (
                          <Cell key={index} fill={PRIZE_COLORS[index % PRIZE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </AnalyticsPanel>

            {/* Chart 5 — Participants by Department (top 8) — full width */}
            <AnalyticsPanel title="Participants by Department (top 8)" wide>
              {(() => {
                const data = Object.entries(
                  students.reduce<Record<string, number>>((acc, s) => {
                    const key = s.department || "Unknown";
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([name, count]) => ({ name, count }));
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 70 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Participants" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </AnalyticsPanel>

          </div>
        )}
      </div>
    </div>
  );
};

// ── Small helper components ───────────────────────────────────────────────────

function AnalyticsPanel({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-gray-50 rounded-xl border border-gray-200 p-4 ${wide ? "xl:col-span-2" : ""}`}>
      <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">{title}</div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm font-medium">
      {message}
    </div>
  );
}
