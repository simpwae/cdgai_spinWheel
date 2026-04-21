import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaderboard } from '../../components/Leaderboard';
import { Logo } from '../../components/Logo';
import { useAppContext, Department, Faculty, FACULTY_DEPARTMENTS } from '../../context/AppContext';

const STUDENT_ID_REGEX = /^[A-Za-z]{2,4}-\d{3,4}-\d{4}$/;
const TAGLINES = ['Spin. Learn. Win.', 'Your career starts here.', 'Innovation meets opportunity.'];

interface IdleLeaderboardProps {
  onComplete: () => void;
  onLocked: () => void;
}
export const IdleLeaderboard: React.FC<IdleLeaderboardProps> = ({ onComplete, onLocked }) => {
  const { leaderboard, registerStudent } = useAppContext();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [participantType, setParticipantType] = useState<'student' | 'guest'>('student');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [faculty, setFaculty] = useState<Faculty | ''>('');
  const [department, setDepartment] = useState<Department>('');
  const availableDepartments = faculty ? FACULTY_DEPARTMENTS[faculty] : [];
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: boolean;
    studentId?: boolean;
    studentIdFormat?: boolean;
    faculty?: boolean;
    department?: boolean;
    email?: boolean;
    phone?: boolean;
  }>({});
  const [warning, setWarning] = useState('');

  const handleTypeChange = (type: 'student' | 'guest') => {
    setParticipantType(type);
    setErrors({});
    setWarning('');
    setEmail('');
    setPhone('');
    setIsSubmitting(false);
  };

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setWarning('');

    if (participantType === 'student') {
      const idTrimmed = studentId.trim();
      const formatOk = STUDENT_ID_REGEX.test(idTrimmed);
      const newErrors = {
        name: !name.trim(),
        studentId: !idTrimmed,
        studentIdFormat: !!idTrimmed && !formatOk,
        faculty: !faculty,
        department: !department,
      };
      setErrors(newErrors);
      if (newErrors.name || newErrors.studentId || newErrors.studentIdFormat || newErrors.faculty || newErrors.department) return;
      setIsSubmitting(true);
      const result = await registerStudent(name, idTrimmed, '', '', faculty, department);
      setIsSubmitting(false);
      if (!result.success) {
        if (result.error === 'name_mismatch') {
          setWarning('This ID is registered under a different name. Please check with the admin.');
        } else if (result.error === 'max_spins') {
          onLocked();
        } else {
          setWarning('Something went wrong. Please try again or contact admin.');
        }
        return;
      }
      onComplete();
    } else {
      const emailTrimmed = email.trim();
      const phoneTrimmed = phone.trim();
      const newErrors = {
        name: !name.trim(),
        email: !emailTrimmed || !isValidEmail(emailTrimmed),
        phone: !phoneTrimmed,
      };
      setErrors(newErrors);
      if (newErrors.name || newErrors.email || newErrors.phone) return;
      setIsSubmitting(true);
      const result = await registerStudent(name, emailTrimmed, emailTrimmed, phoneTrimmed, '', '');
      setIsSubmitting(false);
      if (!result.success) {
        if (result.error === 'name_mismatch') {
          setWarning('This email is already registered under a different name.');
        } else if (result.error === 'max_spins') {
          onLocked();
        } else {
          setWarning('Something went wrong. Please try again or contact admin.');
        }
        return;
      }
      onComplete();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-cdgai-dark flex flex-col lg:flex-row p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 lg:gap-8">
      {/* Left: Leaderboard — hidden on mobile, visible on lg+ */}
      <div className="hidden lg:block lg:w-[60%] h-[calc(100vh-4rem)]">
        <Leaderboard students={leaderboard} />
      </div>

      {/* Right: Branding + Registration Panel */}
      <div className="w-full lg:w-[40%] lg:h-[calc(100vh-4rem)] bg-gradient-to-br from-cdgai-maroon to-red-950 rounded-2xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center w-full h-full overflow-y-auto scrollbar-hide p-4 sm:p-6">
          <Logo size="lg" className="mb-3" />

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            CDGAI Career Fair 2025
          </h1>

          <div className="h-8 flex items-center justify-center mb-4 w-full">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-lg font-medium text-white/80">
                {TAGLINES[taglineIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Inline Registration Form */}
          <div className="w-full bg-white rounded-2xl shadow-2xl p-5 text-left">
            <h2 className="text-xl font-black text-cdgai-dark mb-1 text-center">
              Ready to Spin?
            </h2>
            <p className="text-gray-500 text-sm text-center mb-3">
              Enter your details to take your turn.
            </p>

            {/* Participant Type Toggle */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
              <button
                type="button"
                onClick={() => handleTypeChange('student')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${participantType === 'student' ? 'bg-cdgai-maroon text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                🎓 University Student
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('guest')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${participantType === 'guest' ? 'bg-cdgai-maroon text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                👤 Guest
              </button>
            </div>

            {warning &&
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-3 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-xs font-medium flex items-start">
              <svg className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {warning}
            </motion.div>
            }

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name — always shown */}
              <div>
                <label htmlFor="reg-name" className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`} />
                {errors.name && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">This field is required</p>}
              </div>

              {participantType === 'student' ? (
                <>
                  {/* University ID */}
                  <div>
                    <label htmlFor="reg-student-id" className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      University ID
                    </label>
                    <input
                      id="reg-student-id"
                      type="text"
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        setErrors((p) => ({ ...p, studentId: false, studentIdFormat: false }));
                      }}
                      placeholder="AB-1234-2020"
                      autoComplete="off"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all font-mono ${errors.studentId || errors.studentIdFormat ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`} />
                    {errors.studentId && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">This field is required</p>}
                    {errors.studentIdFormat && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">Format: XX-XXX-YYYY (e.g. CU-1234-2020, AU-567-2021)</p>}
                  </div>

                  {/* Faculty */}
                  <div>
                    <label htmlFor="reg-faculty" className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Faculty
                    </label>
                    <select
                      id="reg-faculty"
                      value={faculty}
                      onChange={(e) => {
                        const val = e.target.value as Faculty | '';
                        setFaculty(val);
                        setDepartment('');
                        setErrors((p) => ({ ...p, faculty: false, department: false }));
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all appearance-none ${errors.faculty ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`}>
                      <option value="">Select Faculty</option>
                      {(Object.keys(FACULTY_DEPARTMENTS) as Faculty[]).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {errors.faculty && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">This field is required</p>}
                  </div>

                  {/* Department */}
                  <div>
                    <label htmlFor="reg-department" className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Department
                    </label>
                    <select
                      id="reg-department"
                      value={department}
                      disabled={!faculty}
                      onChange={(e) => { setDepartment(e.target.value as Department); setErrors((p) => ({ ...p, department: false })); }}
                      className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${errors.department ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`}>
                      <option value="">{faculty ? 'Select Department' : 'Select a faculty first'}</option>
                      {availableDepartments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {errors.department && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">This field is required</p>}
                  </div>
                </>
              ) : (
                /* Guest: Email + Phone */
                <>
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: false })); }}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`} />
                    {errors.email && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">Please enter a valid email address</p>}
                  </div>
                  <div>
                    <label htmlFor="reg-phone" className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: false })); }}
                      placeholder="+92 300 0000000"
                      autoComplete="tel"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`} />
                    {errors.phone && <p className="mt-1 text-xs text-red-500 font-medium" role="alert">This field is required</p>}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-label="Submit registration and proceed to spin"
                className="w-full bg-cdgai-maroon hover:bg-red-900 text-white font-bold text-lg py-3 rounded-xl shadow-lg hover:shadow-xl transform transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Registering…</span></>
                ) : (
                  <span>Ready to Spin 🎡</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>);

};