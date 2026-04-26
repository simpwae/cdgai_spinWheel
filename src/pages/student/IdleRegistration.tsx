import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "../../components/Logo";
import {
  useAppContext,
  Department,
  FACULTY_DEPARTMENTS,
} from "../../context/AppContext";

// Exact department names from the questions table — dropdowns ensure the value
// saved to DB always matches a real department in the questions data.
const ALL_DEPARTMENTS: string[] = [
  ...new Set(Object.values(FACULTY_DEPARTMENTS).flatMap((arr) => [...arr])),
].sort();

const SEMESTERS = [
  "1st Semester",
  "2nd Semester",
  "3rd Semester",
  "4th Semester",
  "5th Semester",
  "6th Semester",
  "7th Semester",
  "8th Semester",
];

const TAGLINES = [
  "Spin. Learn. Win.",
  "Your career starts here.",
  "Innovation meets opportunity.",
];

type GuestType = "student" | "faculty" | "other";

interface IdleRegistrationProps {
  onComplete: () => void;
  onLocked: () => void;
}

export const IdleRegistration: React.FC<IdleRegistrationProps> = ({
  onComplete,
  onLocked,
}) => {
  const { registerStudent } = useAppContext();
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Who is registering
  // Shared
  const [guestType, setGuestType] = useState<GuestType>("student");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [followStatus, setFollowStatus] = useState<
    "already_followed" | "just_followed" | ""
  >("");

  // Guest: other-university student
  const [semester, setSemester] = useState("");
  const [guestProgram, setGuestProgram] = useState("");

  // Guest: faculty
  const [guestDept, setGuestDept] = useState("");
  const [position, setPosition] = useState("");

  // Guest: other
  const [organization, setOrganization] = useState("");
  const [fieldOfInterest, setFieldOfInterest] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [warning, setWarning] = useState("");

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleGuestTypeChange = (type: GuestType) => {
    setGuestType(type);
    setErrors({});
    setWarning("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setWarning("");

    const emailTrimmed = guestEmail.trim();
    const newErrors: Record<string, boolean> = {
      guestName: !guestName.trim(),
      guestEmail: !emailTrimmed || !isValidEmail(emailTrimmed),
      followStatus: !followStatus,
    };

    if (guestType === "student") {
      newErrors.semester = !semester;
      newErrors.guestProgram = !guestProgram;
    } else if (guestType === "faculty") {
      newErrors.guestDept = !guestDept;
      newErrors.position = !position.trim();
    } else {
      newErrors.fieldOfInterest = !fieldOfInterest;
    }

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    // ── DB column mapping ───────────────────────────────────────────────────
    // `faculty`    → DEPARTMENT used for question matching (must match questions table exactly)
    // `department` → extra context (semester / position / org)
    // `phone`      → follow status
    // ───────────────────────────────────────────────────────────────────────
    let mappedFaculty = "";
    let mappedDepartment = "";
    if (guestType === "student") {
      mappedFaculty = guestProgram; // e.g. "Computer Sciences" — from dropdown, exact match
      mappedDepartment = semester; // e.g. "3rd Semester"
    } else if (guestType === "faculty") {
      mappedFaculty = guestDept; // e.g. "Electrical" — from dropdown, exact match
      mappedDepartment = position.trim(); // e.g. "Lecturer"
    } else {
      mappedFaculty = fieldOfInterest; // e.g. "Pharmacy" — from dropdown, exact match
      mappedDepartment = organization.trim() || "N/A";
    }

    setIsSubmitting(true);
    const result = await registerStudent(
      guestName.trim(),
      emailTrimmed, // used as studentId for guests (unique key)
      emailTrimmed, // email
      followStatus, // stored in `phone` column
      mappedFaculty, // stored in `faculty` column → source for questionDept
      mappedDepartment as Department,
      guestType === "faculty" ? "faculty" : "others",
    );
    setIsSubmitting(false);
    if (!result.success) {
      if (result.error === "name_mismatch") {
        setWarning("This email is already registered under a different name.");
      } else if (result.error === "max_spins") {
        onLocked();
      } else {
        setWarning("Something went wrong. Please try again or contact admin.");
      }
      return;
    }
    onComplete();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fieldCls = (errKey: string) =>
    `w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all ${errors[errKey] ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-cdgai-accent"}`;

  const labelCls =
    "block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider";
  const errMsg = (msg = "This field is required") => (
    <p className="mt-1 text-xs text-red-500 font-medium" role="alert">
      {msg}
    </p>
  );

  return (
    <div className="min-h-screen w-full bg-cdgai-dark flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-gradient-to-br from-cdgai-maroon to-red-950 rounded-2xl border border-white/10 shadow-2xl flex flex-col relative mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center w-full p-4 sm:p-6">
          <Logo size="lg" className="mb-3" />

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            CDGAI Career Fair 2026
          </h1>

          <div className="h-8 flex items-center justify-center mb-4 w-full">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-lg font-medium text-white/80"
              >
                {TAGLINES[taglineIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="w-full bg-white rounded-2xl shadow-2xl p-5 text-left">
            <h2 className="text-xl font-black text-cdgai-dark mb-1 text-center">
              Ready to Spin?
            </h2>
            <p className="text-gray-500 text-sm text-center mb-3">
              Enter your details to take your turn.
            </p>

            {warning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-3 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-xs font-medium flex items-start"
              >
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {warning}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Who are you? */}
              <>
                <div>
                  <p className={labelCls}>I am a…</p>
                  <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
                    {(
                      [
                        { value: "student", label: "🎓 Student" },
                        { value: "faculty", label: "👨‍🏫 Faculty" },
                        { value: "other", label: "👤 Other" },
                      ] as { value: GuestType; label: string }[]
                    ).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleGuestTypeChange(value)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${guestType === value ? "bg-cdgai-maroon text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="guest-name" className={labelCls}>
                    Full Name
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setErrors((p) => ({ ...p, guestName: false }));
                    }}
                    placeholder="Your full name"
                    autoComplete="name"
                    className={fieldCls("guestName")}
                  />
                  {errors.guestName && errMsg()}
                </div>

                {guestType === "student" && (
                  <>
                    <div>
                      <label htmlFor="guest-semester" className={labelCls}>
                        Semester
                      </label>
                      <select
                        id="guest-semester"
                        value={semester}
                        onChange={(e) => {
                          setSemester(e.target.value);
                          setErrors((p) => ({ ...p, semester: false }));
                        }}
                        className={`${fieldCls("semester")} appearance-none`}
                      >
                        <option value="">Select Semester</option>
                        {SEMESTERS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {errors.semester && errMsg()}
                    </div>
                    <div>
                      <label htmlFor="guest-program" className={labelCls}>
                        Department / Program
                      </label>
                      <select
                        id="guest-program"
                        value={guestProgram}
                        onChange={(e) => {
                          setGuestProgram(e.target.value);
                          setErrors((p) => ({ ...p, guestProgram: false }));
                        }}
                        className={`${fieldCls("guestProgram")} appearance-none`}
                      >
                        <option value="">Select your Department</option>
                        {ALL_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.guestProgram && errMsg()}
                    </div>
                  </>
                )}

                {guestType === "faculty" && (
                  <>
                    <div>
                      <label htmlFor="guest-dept" className={labelCls}>
                        Department
                      </label>
                      <select
                        id="guest-dept"
                        value={guestDept}
                        onChange={(e) => {
                          setGuestDept(e.target.value);
                          setErrors((p) => ({ ...p, guestDept: false }));
                        }}
                        className={`${fieldCls("guestDept")} appearance-none`}
                      >
                        <option value="">Select your Department</option>
                        {ALL_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.guestDept && errMsg()}
                    </div>
                    <div>
                      <label htmlFor="guest-position" className={labelCls}>
                        Position
                      </label>
                      <input
                        id="guest-position"
                        type="text"
                        value={position}
                        onChange={(e) => {
                          setPosition(e.target.value);
                          setErrors((p) => ({ ...p, position: false }));
                        }}
                        placeholder="e.g. Lecturer, Assistant Professor"
                        className={fieldCls("position")}
                      />
                      {errors.position && errMsg()}
                    </div>
                  </>
                )}

                {guestType === "other" && (
                  <>
                    <div>
                      <label htmlFor="guest-field" className={labelCls}>
                        Field of Interest
                      </label>
                      <select
                        id="guest-field"
                        value={fieldOfInterest}
                        onChange={(e) => {
                          setFieldOfInterest(e.target.value);
                          setErrors((p) => ({
                            ...p,
                            fieldOfInterest: false,
                          }));
                        }}
                        className={`${fieldCls("fieldOfInterest")} appearance-none`}
                      >
                        <option value="">Select your Field</option>
                        {ALL_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.fieldOfInterest && errMsg()}
                    </div>
                    <div>
                      <label htmlFor="guest-org" className={labelCls}>
                        Organization{" "}
                        <span className="text-gray-400 font-normal normal-case">
                          (if any)
                        </span>
                      </label>
                      <input
                        id="guest-org"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g. XYZ Company (optional)"
                        className={fieldCls("organization")}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="guest-email" className={labelCls}>
                    Email Address
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setErrors((p) => ({ ...p, guestEmail: false }));
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={fieldCls("guestEmail")}
                  />
                  {errors.guestEmail &&
                    errMsg("Please enter a valid email address")}
                </div>

                <div>
                  <label className={labelCls}>Follow Status</label>
                  <div className="flex gap-3">
                    {(["already_followed", "just_followed"] as const).map(
                      (val) => (
                        <label
                          key={val}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-bold transition-all select-none ${followStatus === val ? "border-cdgai-maroon bg-cdgai-maroon/10 text-cdgai-maroon" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                        >
                          <input
                            type="radio"
                            name="followStatus"
                            value={val}
                            checked={followStatus === val}
                            onChange={() => {
                              setFollowStatus(val);
                              setErrors((p) => ({
                                ...p,
                                followStatus: false,
                              }));
                            }}
                            className="sr-only"
                          />
                          {val === "already_followed"
                            ? "✅ Already Followed"
                            : "➕ Just Followed"}
                        </label>
                      ),
                    )}
                  </div>
                  {errors.followStatus &&
                    errMsg("Please select a follow status")}
                </div>
              </>

              <button
                type="submit"
                disabled={isSubmitting}
                aria-label="Submit registration and proceed to spin"
                className="w-full bg-cdgai-maroon hover:bg-red-900 text-white font-bold text-lg py-3 rounded-xl shadow-lg hover:shadow-xl transform transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registering…</span>
                  </>
                ) : (
                  <span>Ready to Spin 🎡</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
