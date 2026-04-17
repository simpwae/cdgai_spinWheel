import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '../../components/Logo';
import { useAppContext, Department } from '../../context/AppContext';
interface RegistrationProps {
  onComplete: () => void;
  onLocked: () => void;
}
export const Registration: React.FC<RegistrationProps> = ({
  onComplete,
  onLocked
}) => {
  const { registerStudent } = useAppContext();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState<Department>('');
  const [errors, setErrors] = useState<{
    name?: boolean;
    studentId?: boolean;
    department?: boolean;
  }>({});
  const [warning, setWarning] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarning('');
    const newErrors = {
      name: !name.trim(),
      studentId: !studentId.trim(),
      department: !department
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.studentId || newErrors.department) return;
    const result = await registerStudent(name, studentId, department);
    if (!result.success) {
      if (result.error === 'name_mismatch') {
        setWarning(
          'This ID is registered under a different name. Please check with the admin.'
        );
      } else if (result.error === 'max_spins') {
        onLocked();
      }
      return;
    }
    onComplete();
  };
  return (
    <div className="min-h-screen w-full bg-cdgai-maroon flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-black/20 rounded-full blur-3xl"></div>

      <motion.div
        initial={{
          opacity: 0,
          y: 40
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          duration: 0.6,
          ease: 'easeOut'
        }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-12 relative z-10">
        
        <div className="text-center mb-10">
          <Logo size="lg" className="mb-6" />
          <h1 className="text-4xl font-black text-cdgai-dark tracking-tight mb-2">
            Ready to Spin?
          </h1>
          <p className="text-gray-500 text-lg font-medium">
            Enter your details to take your turn.
          </p>
        </div>

        {warning &&
        <motion.div
          initial={{
            opacity: 0,
            height: 0
          }}
          animate={{
            opacity: 1,
            height: 'auto'
          }}
          className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm font-medium flex items-start">
          
            <svg
            className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20">
            
              <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
            
            </svg>
            {warning}
          </motion.div>
        }

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({
                  ...p,
                  name: false
                }));
              }}
              placeholder="Your full name"
              className={`w-full px-5 py-4 rounded-xl border-2 bg-gray-50 text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`} />
            
            {errors.name &&
            <p className="mt-2 text-sm text-red-500 font-medium">
                This field is required
              </p>
            }
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Student ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setErrors((p) => ({
                  ...p,
                  studentId: false
                }));
              }}
              placeholder="e.g. 2021-CS-001"
              className={`w-full px-5 py-4 rounded-xl border-2 bg-gray-50 text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all ${errors.studentId ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`} />
            
            {errors.studentId &&
            <p className="mt-2 text-sm text-red-500 font-medium">
                This field is required
              </p>
            }
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value as Department);
                setErrors((p) => ({ ...p, department: false }));
              }}
              className={`w-full px-5 py-4 rounded-xl border-2 bg-gray-50 text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-cdgai-accent/20 transition-all appearance-none ${errors.department ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-cdgai-accent'}`}>
              
              <option value="">Select Department</option>
              <option value="Architecture">Architecture</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Life Sciences">Life Sciences</option>
              <option value="Allied Health Sciences">
                Allied Health Sciences
              </option>
            </select>
            {errors.department &&
            <p className="mt-2 text-sm text-red-500 font-medium">
                This field is required
              </p>
            }
          </div>

          <button
            type="submit"
            className="w-full bg-cdgai-maroon hover:bg-red-900 text-white font-bold text-xl py-5 rounded-xl shadow-lg hover:shadow-xl transform transition-all active:scale-[0.98] mt-4">
            
            Ready to Spin 🎡
          </button>
        </form>
      </motion.div>

      <div className="absolute bottom-6 text-white/60 text-sm font-medium tracking-wide">
        Powered by CDGAI Innovation Hub
      </div>
    </div>);

};