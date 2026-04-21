import React, { useState } from 'react';
import { useAppContext, Student } from '../../context/AppContext';
import {
  Search,
  Filter,
  Edit2,
  Ban,
  CheckCircle,
  AlertTriangle } from
'lucide-react';
export const StudentsTab: React.FC = () => {
  const { students, banStudent, unbanStudent, editTries, submitAdminScore } =
  useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Locked' | 'Banned'>(
    'All'
  );
  // Modal states
  const [editingTries, setEditingTries] = useState<Student | null>(null);
  const [newTries, setNewTries] = useState(3);
  const [scoringStudent, setScoringStudent] = useState<Student | null>(null);
  const [manualScore, setManualScore] = useState(5);
  const [manualFeedback, setManualFeedback] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
    filter === 'All' ?
    true :
    filter === 'Active' ?
    s.status === 'active' :
    filter === 'Locked' ?
    s.status === 'locked' :
    s.status === 'banned';
    return matchesSearch && matchesFilter;
  });
  // Check for ID conflicts (mock logic for demo)
  const hasConflicts = false;
  const handleSaveTries = () => {
    if (editingTries) {
      editTries(editingTries.id, newTries);
      setEditingTries(null);
    }
  };
  const handleSaveScore = () => {
    if (scoringStudent) {
      submitAdminScore(scoringStudent.id, manualScore, manualFeedback);
      setScoringStudent(null);
      setManualFeedback('');
      setManualScore(5);
    }
  };
  const handleBanToggle = async (student: Student) => {
    if (actionLoadingId) return;
    setActionLoadingId(student.id);
    if (student.status === 'banned') {
      await unbanStudent(student.id);
    } else {
      await banStudent(student.id);
    }
    setActionLoadingId(null);
  };
  return (
    <div className="space-y-6">
      {hasConflicts &&
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-yellow-800">
            <AlertTriangle size={20} />
            <span className="font-bold">2 ID conflicts need resolution</span>
          </div>
          <button className="text-sm font-bold text-yellow-800 hover:underline">
            View Conflicts →
          </button>
        </div>
      }

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18} />
          <label htmlFor="student-search" className="sr-only">Search students</label>
          <input
            id="student-search"
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cdgai-accent/20 focus:border-cdgai-accent transition-all" />
          
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Filter size={18} className="text-gray-400 mr-2" />
          {['All', 'Active', 'Locked', 'Banned'].map((f) =>
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-cdgai-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            
              {f}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4">Name</th>
                <th className="p-4">ID</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-center">Spins</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ?
              <tr>
                  <td
                  colSpan={9}
                  className="p-8 text-center text-gray-400 font-medium">
                  
                    No students found matching your criteria.
                  </td>
                </tr> :

              filteredStudents.map((student) =>
              <tr
                key={student.id}
                className="hover:bg-gray-50 transition-colors">
                
                    <td className="p-4 font-bold text-gray-900">
                      {student.name}
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-600">
                      {student.studentId}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {student.email || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {student.phone || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {student.department || '-'}
                    </td>
                    <td className="p-4 text-center font-bold text-gray-900">
                      {student.score}
                    </td>
                    <td className="p-4 text-center text-sm text-gray-600">
                      {student.spinsUsed} / {student.maxSpins}
                    </td>
                    <td className="p-4">
                      <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${student.status === 'active' ? 'bg-green-100 text-green-700' : student.status === 'locked' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                    
                        {student.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                    onClick={() => {
                      setEditingTries(student);
                      setNewTries(student.maxSpins);
                    }}
                    className="p-1.5 text-gray-400 hover:text-cdgai-accent hover:bg-blue-50 rounded transition-colors"
                    aria-label={`Edit tries for ${student.name}`}
                    title="Edit Tries">
                    
                        <Edit2 size={16} />
                      </button>
                      <button
                    onClick={() => setScoringStudent(student)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    aria-label={`Add manual score for ${student.name}`}
                    title="Add Manual Score">
                    
                        <CheckCircle size={16} />
                      </button>
                      <button
                    onClick={() => handleBanToggle(student)}
                    disabled={actionLoadingId === student.id}
                    className={`p-1.5 rounded transition-colors disabled:opacity-50 ${student.status === 'banned' ? 'text-red-500 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                    aria-label={student.status === 'banned' ? `Unban ${student.name}` : `Ban ${student.name}`}
                    title={student.status === 'banned' ? 'Unban' : 'Ban'}>
                    {actionLoadingId === student.id
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : student.status === 'banned' ? <CheckCircle size={16} /> : <Ban size={16} />}
                      </button>
                    </td>
                  </tr>
              )
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tries Modal */}
      {editingTries &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Edit Max Tries
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Update max tries for{' '}
              <span className="font-bold text-gray-900">
                {editingTries.name}
              </span>
              .
            </p>
            <input
            id="edit-tries-input"
            type="number"
            min="1"
            max="10"
            value={newTries}
            onChange={(e) => setNewTries(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent mb-6"
            aria-label="Maximum tries" />
          
            <div className="flex justify-end space-x-3">
              <button
              onClick={() => setEditingTries(null)}
              className="px-4 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors">
              
                Cancel
              </button>
              <button
              onClick={handleSaveTries}
              className="px-4 py-2 rounded-lg font-bold bg-cdgai-accent text-white hover:bg-blue-700 transition-colors">
              
                Save
              </button>
            </div>
          </div>
        </div>
      }

      {/* Manual Score Modal */}
      {scoringStudent &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Add Manual Score
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              For{' '}
              <span className="font-bold text-gray-900">
                {scoringStudent.name}
              </span>{' '}
              (Pitch / Resume)
            </p>

            <div className="mb-6">
              <label htmlFor="manual-score" className="block text-sm font-bold text-gray-700 mb-2">
                Score (0-10)
              </label>
              <div className="flex items-center space-x-4">
                <input
                id="manual-score"
                type="range"
                min="0"
                max="10"
                value={manualScore}
                onChange={(e) => setManualScore(parseInt(e.target.value))}
                className="flex-1 accent-cdgai-accent" />
              
                <span className="text-2xl font-black text-cdgai-accent w-8 text-center">
                  {manualScore}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="manual-feedback" className="block text-sm font-bold text-gray-700 mb-2">
                Feedback (Optional)
              </label>
              <textarea
              id="manual-feedback"
              value={manualFeedback}
              onChange={(e) => setManualFeedback(e.target.value)}
              placeholder="Great presentation skills..."
              maxLength={500}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent resize-none h-24">
            </textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
              onClick={() => setScoringStudent(null)}
              className="px-4 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors">
              
                Cancel
              </button>
              <button
              onClick={handleSaveScore}
              className="px-4 py-2 rounded-lg font-bold bg-cdgai-accent text-white hover:bg-blue-700 transition-colors">
              
                Submit Score
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

};