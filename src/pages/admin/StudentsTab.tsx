import React, { useState } from 'react';
import { useAppContext, Student } from '../../context/AppContext';
import {
  Search,
  Filter,
  Edit2,
  Ban,
  CheckCircle } from
'lucide-react';

type StatusFilter = 'All' | 'Active' | 'Locked' | 'Banned';
type TypeFilter = 'All Types' | 'Students' | 'Faculty' | 'Others';

const deriveParticipantType = (s: Student): string => {
  if (s.participantType === 'faculty' || s.studentId.startsWith('FAC-')) return 'Faculty';
  if (s.participantType === 'student') return 'CECOS Student';
  if (s.participantType === 'others' && s.guestType === 'student') return 'Guest Student';
  return 'Guest';
};

const formatFollowStatus = (phone: string): string => {
  if (phone === 'already_followed') return 'Already Followed';
  if (phone === 'just_followed') return 'Just Followed';
  return '—';
};

export const StudentsTab: React.FC = () => {
  const { students, banStudent, unbanStudent, editTries } =
  useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All Types');
  // Modal states
  const [editingTries, setEditingTries] = useState<Student | null>(null);
  const [newTries, setNewTries] = useState(3);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filteredParticipants = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ? true :
      statusFilter === 'Active' ? s.status === 'active' :
      statusFilter === 'Locked' ? s.status === 'locked' :
      s.status === 'banned';

    const matchesType =
      typeFilter === 'All Types' ? true :
      typeFilter === 'Students' ? s.participantType === 'student' :
      typeFilter === 'Faculty' ? s.participantType === 'faculty' :
      s.participantType === 'others';

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSaveTries = () => {
    if (editingTries) {
      editTries(editingTries.id, newTries);
      setEditingTries(null);
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
      {/* Controls */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18} />
          <label htmlFor="participant-search" className="sr-only">Search participants</label>
          <input
            id="participant-search"
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cdgai-accent/20 focus:border-cdgai-accent transition-all" />
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={16} className="text-gray-400 mr-1 flex-shrink-0" />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-1 whitespace-nowrap">Status:</span>
          {(['All', 'Active', 'Locked', 'Banned'] as StatusFilter[]).map((f) =>
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === f ? 'bg-cdgai-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
          )}
        </div>

        {/* Type Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={16} className="text-gray-400 mr-1 flex-shrink-0" />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-1 whitespace-nowrap">Type:</span>
          {(['All Types', 'Students', 'Faculty', 'Others'] as TypeFilter[]).map((f) =>
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${typeFilter === f ? 'bg-cdgai-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
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
                <th className="p-4">Type</th>
                <th className="p-4">Email</th>
                <th className="p-4">Follow Status</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-center">Spins</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParticipants.length === 0 ?
              <tr>
                  <td
                  colSpan={9}
                  className="p-8 text-center text-gray-400 font-medium">
                    No participants found matching your criteria.
                  </td>
                </tr> :

              filteredParticipants.map((participant) => {
                const pType = deriveParticipantType(participant);
                return (
                <tr
                  key={participant.id}
                  className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">
                    {participant.name}
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-600">
                    {participant.studentId}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                      pType === 'Faculty' ? 'bg-purple-100 text-purple-700' :
                      pType === 'CECOS Student' ? 'bg-blue-100 text-blue-700' :
                      pType === 'Guest Student' ? 'bg-teal-100 text-teal-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {pType}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {participant.email || '—'}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {formatFollowStatus(participant.phone)}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {participant.department || '—'}
                  </td>
                  <td className="p-4 text-center text-sm text-gray-600">
                    {participant.spinsUsed} / {participant.maxSpins}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${participant.status === 'active' ? 'bg-green-100 text-green-700' : participant.status === 'locked' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                      {participant.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingTries(participant);
                        setNewTries(participant.maxSpins);
                      }}
                      className="p-1.5 text-gray-400 hover:text-cdgai-accent hover:bg-blue-50 rounded transition-colors"
                      aria-label={`Edit tries for ${participant.name}`}
                      title="Edit Tries">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleBanToggle(participant)}
                      disabled={actionLoadingId === participant.id}
                      className={`p-1.5 rounded transition-colors disabled:opacity-50 ${participant.status === 'banned' ? 'text-red-500 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                      aria-label={participant.status === 'banned' ? `Unban ${participant.name}` : `Ban ${participant.name}`}
                      title={participant.status === 'banned' ? 'Unban' : 'Ban'}>
                      {actionLoadingId === participant.id
                        ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : participant.status === 'banned' ? <CheckCircle size={16} /> : <Ban size={16} />}
                    </button>
                  </td>
                </tr>
                );
              })
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
    </div>);
};