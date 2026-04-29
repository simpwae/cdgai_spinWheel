import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Users,
  Activity,
  Download,
  CheckCircle,
} from "lucide-react";
import { useAppContext, Student } from "../../context/AppContext";

export const ExportTab: React.FC = () => {
  const { students, segments } = useAppContext();
  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastExportTime, setLastExportTime] = useState<Record<string, string>>({});

  // ── Type detection ──────────────────────────────────────────────────────────
  const deriveType = (s: Student): string => {
    if (s.participantType === "faculty" || s.studentId.startsWith("FAC-"))
      return "Faculty";
    if (s.participantType === "student")
      return "CECOS Student";
    if (s.participantType === "others" && s.guestType === "student")
      return "Student";
    if (s.participantType === "others")
      return "Guest";
    return "Guest";
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const clean = (val: string | null | undefined): string =>
    val && val.trim() ? val.trim() : "";

  const formatFollowStatus = (phone: string): string => {
    if (phone === "already_followed") return "Already Followed";
    if (phone === "just_followed") return "Just Followed";
    return "";
  };

  const resolveSpinNames = (s: Student): string[] =>
    s.spinHistory
      .filter((entry) => !entry.includes(":correct") && !entry.includes(":wrong"))
      .map((segId) => {
        const seg = segments.find((sg) => sg.id === segId);
        return seg ? seg.name : segId;
      });

  /** Returns "Yes" or "No" for each question attempt in spin history */
  const extractQuestionResult = (spinHistory: string[]): string => {
    const results = spinHistory
      .filter((e) => e.includes(":correct") || e.includes(":wrong"))
      .map((e) => (e.endsWith(":correct") ? "Yes" : "No"));
    return results.join(", ");
  };

  // ── Sheet builders ───────────────────────────────────────────────────────────

  /** Combined sheet — fixed columns, no dynamic label keys, no nulls */
  const buildAllParticipantsSheet = () =>
    students.map((s, i) => {
      const type = deriveType(s);
      const spinNames = resolveSpinNames(s);
      return {
        "#": i + 1,
        Type: type,
        Name: clean(s.name),
        ID: clean(s.studentId),
        Email: clean(s.email),
        "Follow Status": formatFollowStatus(s.phone),
        "Faculty / Program / Org": clean(s.faculty),
        "Dept / Position / Semester": clean(s.department),
        "Spins Used": s.spinsUsed,
        "Max Spins": s.maxSpins,
        Status: s.status,
        "Answered Correctly": extractQuestionResult(s.spinHistory),
        "Last Wheel Segment": spinNames.length ? spinNames[spinNames.length - 1] : "",
        "Prize Won": clean(s.awardedPrize),
      };
    });

  /** Students sheet (CECOS + external students who selected "Student" on the kiosk) */
  const buildCECOSSheet = () =>
    students
      .filter(
        (s) =>
          s.participantType === "student" ||
          (s.participantType === "others" && s.guestType === "student"),
      )
      .map((s, i) => {
        const spinNames = resolveSpinNames(s);
        return {
          "#": i + 1,
          Name: clean(s.name),
          "Student ID": clean(s.studentId),
          Faculty: clean(s.faculty),
          Department: clean(s.department),
          Email: clean(s.email),
          "Follow Status": formatFollowStatus(s.phone),
          "Spins Used": s.spinsUsed,
          "Max Spins": s.maxSpins,
          Status: s.status,
          "Answered Correctly": extractQuestionResult(s.spinHistory),
          "Last Segment": spinNames.length ? spinNames[spinNames.length - 1] : "",
          "Prize Won": clean(s.awardedPrize),
        };
      });

  /** Faculty sheet */
  const buildFacultySheet = () =>
    students
      .filter((s) => s.participantType === "faculty")
      .map((s, i) => {
        const spinNames = resolveSpinNames(s);
        return {
          "#": i + 1,
          Name: clean(s.name),
          "Faculty ID": clean(s.studentId),
          Department: clean(s.faculty),
          Position: clean(s.department),
          Email: clean(s.email),
          "Follow Status": formatFollowStatus(s.phone),
          "Spins Used": s.spinsUsed,
          "Max Spins": s.maxSpins,
          Status: s.status,
          "Answered Correctly": extractQuestionResult(s.spinHistory),
          "Last Segment": spinNames.length ? spinNames[spinNames.length - 1] : "",
          "Prize Won": clean(s.awardedPrize),
        };
      });

  /** Guests / Others sheet — excludes students (they appear in the Students sheet) */
  const buildGuestsSheet = () =>
    students
      .filter((s) => s.participantType === "others" && s.guestType !== "student")
      .map((s, i) => {
        const type = deriveType(s);
        const spinNames = resolveSpinNames(s);
        return {
          "#": i + 1,
          Type: type,
          Name: clean(s.name),
          ID: clean(s.studentId),
          Email: clean(s.email),
          "Program / Organization": clean(s.faculty),
          "Semester / Field of Interest": clean(s.department),
          "Follow Status": formatFollowStatus(s.phone),
          "Spins Used": s.spinsUsed,
          "Max Spins": s.maxSpins,
          Status: s.status,
          "Answered Correctly": extractQuestionResult(s.spinHistory),
          "Last Segment": spinNames.length ? spinNames[spinNames.length - 1] : "",
          "Prize Won": clean(s.awardedPrize),
        };
      });

  /** Spin log sheet — segment spins only; question results are paired into the spin row */
  const buildSpinLogSheet = () => {
    const rows: Record<string, unknown>[] = [];
    let rowNum = 1;
    for (const s of students) {
      const type = deriveType(s);
      const history = s.spinHistory;
      if (history.length === 0) {
        rows.push({
          "#": rowNum++,
          Type: type,
          "Participant Name": clean(s.name),
          ID: clean(s.studentId),
          "Spin #": "",
          "Segment / Prize": "",
          "Answered Correctly": "",
          "Is Final Prize": "",
        });
        continue;
      }
      let spinCount = 0;
      let i = 0;
      while (i < history.length) {
        const entry = history[i];
        const isQuestionResult =
          entry.endsWith(":correct") || entry.endsWith(":wrong");
        if (isQuestionResult) {
          // Orphaned result with no preceding segment row — skip
          i++;
          continue;
        }
        spinCount++;
        const seg = segments.find((sg) => sg.id === entry);
        const segName = seg ? seg.name : entry;
        // Look ahead for a question result attached to this spin
        let questionAnswer = "";
        if (
          i + 1 < history.length &&
          (history[i + 1].endsWith(":correct") ||
            history[i + 1].endsWith(":wrong"))
        ) {
          questionAnswer = history[i + 1].endsWith(":correct")
            ? "Yes"
            : "No";
          i++; // consume the result entry
        }
        const isLastEntry = i === history.length - 1;
        const isFinal = isLastEntry && !!s.awardedPrize;
        rows.push({
          "#": rowNum++,
          Type: type,
          "Participant Name": clean(s.name),
          ID: clean(s.studentId),
          "Spin #": spinCount,
          "Segment / Prize": segName,
          "Answered Correctly": questionAnswer,
          "Is Final Prize": isFinal ? "Yes" : "No",
        });
        i++;
      }
    }
    return rows;
  };

  // ── Download helpers ─────────────────────────────────────────────────────────
  const downloadSheet = (
    data: Record<string, unknown>[],
    filename: string,
    sheetName = "Sheet1",
  ) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const handleExport = (type: string) => {
    setExporting(type);
    try {
      if (type === "full") {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildAllParticipantsSheet()), "All Participants");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildCECOSSheet()), "Students");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildFacultySheet()), "Faculty");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildGuestsSheet()), "Guests & Others");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSpinLogSheet()), "Spin Log");
        XLSX.writeFile(wb, "session-full-export.xlsx");
      } else if (type === "students") {
        downloadSheet(buildCECOSSheet(), "students.xlsx", "Students");
      } else if (type === "faculty") {
        downloadSheet(buildFacultySheet(), "faculty.xlsx", "Faculty");
      } else if (type === "others") {
        downloadSheet(buildGuestsSheet(), "guests-others.xlsx", "Guests & Others");
      } else if (type === "spins") {
        downloadSheet(buildSpinLogSheet(), "spin-log.xlsx", "Spin Log");
      }
      setExporting(null);
      setSuccess(type);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Export failed:", err);
      setExporting(null);
    }
  };

  const handleExportWithTime = (type: string) => {
    handleExport(type);
    setLastExportTime((prev) => ({
      ...prev,
      [type]: new Date().toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }),
    }));
  };

  const exportOptions = [
    {
      id: "full",
      title: "Full Session Export",
      description:
        "All participants + full spin log in one workbook — two sheets, clean data.",
      icon: <FileSpreadsheet size={32} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      id: "students",
      title: "Export Students",
      description:
        "CECOS university students: ID, faculty, department, email, prize, spin history.",
      icon: <Users size={32} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      id: "faculty",
      title: "Export Faculty",
      description:
        "Faculty members: ID, department, position, email, follow status, prize, spin history.",
      icon: <Users size={32} className="text-purple-600" />,
      bg: "bg-purple-50",
    },
    {
      id: "others",
      title: "Export Guests & Others",
      description:
        "Guest students and other visitors: type, email, program/org, follow status, prize.",
      icon: <Users size={32} className="text-green-600" />,
      bg: "bg-green-50",
    },
    {
      id: "spins",
      title: "Spin Log",
      description: "Detailed log of every spin and segment result per participant.",
      icon: <Activity size={32} className="text-purple-600" />,
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Data</h2>
        <p className="text-gray-500">
          Download session data as Excel spreadsheets for reporting and analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <div
            key={option.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow"
          >
            <div className="flex items-start space-x-4 mb-6">
              <div className={`p-4 rounded-xl ${option.bg}`}>{option.icon}</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {option.description}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-400">
                Last exported: {lastExportTime[option.id] ?? "Never"}
              </div>

              <button
                onClick={() => handleExportWithTime(option.id)}
                disabled={exporting !== null}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  success === option.id
                    ? "bg-green-100 text-green-700"
                    : exporting === option.id
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800 active:scale-95"
                }`}
              >
                {success === option.id ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Exported</span>
                  </>
                ) : exporting === option.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Export Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
