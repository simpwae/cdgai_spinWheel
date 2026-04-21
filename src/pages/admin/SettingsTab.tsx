import React, { useState, useRef, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Upload, AlertCircle, Save, Trash2, Plus, Download, CheckCircle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { deleteAllQuestions, deleteQuestionsByDepartment, insertQuestions } from '../../services/questions';

interface ParsedQuestion {
  category: string;
  department: string | null;
  text: string;
  options: string[];
  correct_answer_index: number;
}

export const SettingsTab: React.FC = () => {
  const { maxTriesDefault, resetLeaderboard, awards, addAward, removeAward, refreshQuestions, questions } = useAppContext();
  const [maxTries, setMaxTries] = useState(maxTriesDefault);
  const [rewardPoints, setRewardPoints] = useState(5);
  const [eventName, setEventName] = useState('CDGAI Career Fair 2025');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const [importedRowCount, setImportedRowCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Question delete state
  const [deletingDept, setDeletingDept] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const handleClearAllQuestions = async () => {
    if (!window.confirm('Delete ALL questions from the database? This cannot be undone.')) return;
    setClearingAll(true);
    try {
      await deleteAllQuestions();
      await refreshQuestions();
      setImportStatus('idle');
      setImportMessage('');
    } catch (err) {
      alert('Failed to clear questions: ' + getErrMsg(err));
    }
    setClearingAll(false);
  };

  const handleDeleteDeptQuestions = async (dept: string) => {
    if (!window.confirm(`Delete all questions for "${dept}"?`)) return;
    setDeletingDept(dept);
    try {
      await deleteQuestionsByDepartment(dept);
      await refreshQuestions();
    } catch (err) {
      alert('Failed to delete: ' + getErrMsg(err));
    }
    setDeletingDept(null);
  };

  // Awards state
  const [newAwardName, setNewAwardName] = useState('');
  const [newAwardQty, setNewAwardQty] = useState(1);
  const [awardLoading, setAwardLoading] = useState(false);

  const handleReset = () => {
    if (resetText === 'RESET') {
      resetLeaderboard();
      setShowResetConfirm(false);
      setResetText('');
    }
  };

  // --- Question Import Logic ---

  const getErrMsg = (err: unknown, fallback = 'Unknown error') =>
    err instanceof Error ? err.message
    : (err as any)?.message ? String((err as any).message)
    : (err as any)?.details ? String((err as any).details)
    : fallback;

  const parseSingleFile = async (file: File): Promise<{ parsed: ParsedQuestion[]; errors: string[] }> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error(`${file.name}: No sheets found in the file.`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) throw new Error(`${file.name}: The file contains no data rows.`);

    const firstRow = rows[0];
    const requiredCols = ['category', 'text', 'option1', 'option2', 'option3', 'option4', 'correct_answer_index'];
    const missingCols = requiredCols.filter((c) => !(c in firstRow));
    if (missingCols.length > 0) {
      throw new Error(`${file.name}: Missing required columns: ${missingCols.join(', ')}`);
    }

    const errors: string[] = [];
    const parsed: ParsedQuestion[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const category = String(row.category || '').trim();
      const department = String(row.department || '').trim() || null;
      const text = String(row.text || '').trim();
      const option1 = String(row.option1 || '').trim();
      const option2 = String(row.option2 || '').trim();
      const option3 = String(row.option3 || '').trim();
      const option4 = String(row.option4 || '').trim();
      const answerIdx = Number(row.correct_answer_index);

      if (!category) { errors.push(`${file.name} row ${rowNum}: missing category`); continue; }
      if (!text) { errors.push(`${file.name} row ${rowNum}: missing question text`); continue; }
      if (!option1 || !option2 || !option3 || !option4) { errors.push(`${file.name} row ${rowNum}: all 4 options are required`); continue; }
      if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) { errors.push(`${file.name} row ${rowNum}: correct_answer_index must be 0–3`); continue; }

      parsed.push({
        category,
        department,
        text,
        options: [option1, option2, option3, option4],
        correct_answer_index: answerIdx,
      });
    }

    return { parsed, errors };
  };

  const parseFiles = useCallback(async (files: File[]) => {
    setImportStatus('parsing');
    setImportMessage(`Parsing ${files.length} file${files.length > 1 ? 's' : ''}...`);
    setImportedFileName(files.map((f) => f.name).join(', '));

    try {
      const allParsed: ParsedQuestion[] = [];
      const allErrors: string[] = [];
      const fileResults: string[] = [];

      for (const file of files) {
        try {
          const { parsed, errors } = await parseSingleFile(file);
          allParsed.push(...parsed);
          allErrors.push(...errors);
          fileResults.push(`${file.name}: ${parsed.length} questions`);
        } catch (err) {
          allErrors.push(getErrMsg(err, `${file.name}: unknown error`));
          fileResults.push(`${file.name}: failed`);
        }
      }

      if (allParsed.length === 0) {
        setImportStatus('error');
        setImportMessage(`No valid questions found.\n${allErrors.slice(0, 20).join('\n')}`);
        return;
      }

      setImportStatus('importing');
      setImportMessage(`Importing ${allParsed.length} questions from ${files.length} file${files.length > 1 ? 's' : ''}...`);

      await deleteAllQuestions();
      await insertQuestions(allParsed);
      await refreshQuestions();

      setImportedRowCount(allParsed.length);
      setImportStatus('success');
      setImportMessage(
        `Successfully imported ${allParsed.length} questions from ${files.length} file${files.length > 1 ? 's' : ''}.` +
        (allErrors.length > 0 ? `\n${allErrors.length} row${allErrors.length > 1 ? 's' : ''} skipped due to errors.` : '') +
        `\n\n${fileResults.join('\n')}`
      );
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus('error');
      setImportMessage(`Import failed: ${getErrMsg(err)}`);
    }
  }, [refreshQuestions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) parseFiles(files);
    // Reset the input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(csv|xlsx|xls)$/i.test(f.name)
    );
    if (files.length > 0) parseFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // --- Award handlers ---

  const handleAddAward = async () => {
    if (!newAwardName.trim() || newAwardQty < 1) return;
    setAwardLoading(true);
    try {
      await addAward(newAwardName.trim(), newAwardQty);
      setNewAwardName('');
      setNewAwardQty(1);
    } catch (err) {
      console.error('Failed to add award:', err);
    }
    setAwardLoading(false);
  };

  const handleDeleteAward = async (id: string) => {
    try {
      await removeAward(id);
    } catch (err) {
      console.error('Failed to delete award:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Participation Rules */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">
            Participation Rules
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between max-w-md">
            <div>
              <label htmlFor="max-tries" className="block text-sm font-bold text-gray-700">
                Max tries per student
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Default number of spins allowed.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="max-tries"
                type="number"
                min={1}
                max={20}
                value={maxTries}
                onChange={(e) => setMaxTries(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-center font-bold text-gray-900" />
              
              <button aria-label="Save max tries" title="Save" className="p-2 text-cdgai-accent hover:bg-blue-50 rounded-lg transition-colors">
                <Save size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <label htmlFor="reward-points" className="block text-sm font-bold text-gray-700">
                Segment 2 Reward Points
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Points awarded for "3 Followers + Freebee".
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="reward-points"
                type="number"
                min={0}
                value={rewardPoints}
                onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-center font-bold text-gray-900" />
              
              <button aria-label="Save reward points" title="Save" className="p-2 text-cdgai-accent hover:bg-blue-50 rounded-lg transition-colors">
                <Save size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Question Bank */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900">Question Bank</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-cdgai-accent/10 text-cdgai-accent text-xs font-bold rounded-full uppercase tracking-wider">
                {questions.length} total questions
              </span>
              {questions.length > 0 && (
                <button
                  onClick={handleClearAllQuestions}
                  disabled={clearingAll}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 uppercase tracking-wider">
                  <Trash2 size={12} />
                  <span>{clearingAll ? 'Clearing…' : 'Clear All'}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-500 self-center mr-1">Sample CSVs:</span>
            {['Civil','Mechanical','Electrical','Architecture','Pharmacy','Bioscience','Allied Health Sciences','Nursing','Management of Science','BSH','Computer Sciences','Software Engineering'].map(dept => (
              <a
                key={dept}
                href={`/sample-questions/${dept}.csv`}
                download
                className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-cdgai-accent/10 text-xs font-bold text-cdgai-accent hover:bg-cdgai-accent/20 transition-colors">
                <Download size={12} />
                <span>{dept}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Per-department breakdown */}
          {questions.length > 0 && (() => {
            const ALL_DEPTS = ['Civil','Mechanical','Electrical','Architecture','Pharmacy','Bioscience','Allied Health Sciences','Nursing','Management of Science','BSH','Computer Sciences','Software Engineering'];
            const countByDept: Record<string, number> = {};
            questions.forEach(q => {
              const d = q.department || 'General';
              countByDept[d] = (countByDept[d] || 0) + 1;
            });
            return (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Questions per Department</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ALL_DEPTS.map(dept => {
                    const count = countByDept[dept] || 0;
                    return (
                      <div key={dept} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${count > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={`font-medium truncate mr-1 ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{dept}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`font-bold ${count > 0 ? 'text-green-700' : 'text-gray-400'}`}>{count}</span>
                          {count > 0 && (
                            <button
                              onClick={() => handleDeleteDeptQuestions(dept)}
                              disabled={deletingDept === dept}
                              className="p-0.5 text-red-400 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                              title={`Delete all ${dept} questions`}>
                              {deletingDept === dept
                                ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                : <Trash2 size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={handleFileSelect}
            className="hidden" />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer group ${isDragging ? 'border-cdgai-accent bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}>
            <div className="w-12 h-12 bg-blue-50 text-cdgai-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">.csv or .xlsx files &mdash; select multiple files at once</p>
          </div>

          {/* Import Status */}
          {importStatus !== 'idle' && (
            <div className={`mt-4 p-4 rounded-lg border flex items-start space-x-3 ${
              importStatus === 'success' ? 'bg-green-50 border-green-200' :
              importStatus === 'error' ? 'bg-red-50 border-red-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              {importStatus === 'success' && <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />}
              {importStatus === 'error' && <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />}
              {(importStatus === 'parsing' || importStatus === 'importing') && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${
                  importStatus === 'success' ? 'text-green-800' :
                  importStatus === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {importedFileName}
                </p>
                <p className={`text-xs mt-1 whitespace-pre-line ${
                  importStatus === 'success' ? 'text-green-700' :
                  importStatus === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {importMessage}
                </p>
              </div>
              {importStatus === 'success' && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase tracking-wider flex-shrink-0">
                  {importedRowCount} rows
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Awards / Prizes */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Awards / Prizes</h2>
          <p className="text-xs text-gray-500 mt-1">
            Each contestant can win at most one award. Awards are assigned randomly when landing on the Freebee segment.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Add new award */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3 sm:space-x-0">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Award Name</label>
              <input
                type="text"
                value={newAwardName}
                onChange={(e) => setNewAwardName(e.target.value)}
                placeholder="e.g. T-Shirt, Mug, Notebook"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-sm text-gray-900" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Qty</label>
              <input
                type="number"
                min={1}
                value={newAwardQty}
                onChange={(e) => setNewAwardQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-sm text-center font-bold text-gray-900" />
            </div>
            <button
              onClick={handleAddAward}
              disabled={!newAwardName.trim() || awardLoading}
              className="flex items-center space-x-1 px-4 py-2 bg-cdgai-accent text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Awards list */}
          {awards.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm font-medium">
              No awards configured. Add awards above to enable prize distribution.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-3">Award</th>
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center">Remaining</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {awards.map((award) => (
                    <tr key={award.id} className={`${award.remainingQuantity === 0 ? 'opacity-60' : ''}`}>
                      <td className="p-3 font-bold text-gray-900">{award.name}</td>
                      <td className="p-3 text-center text-gray-600">{award.totalQuantity}</td>
                      <td className="p-3 text-center font-bold text-gray-900">{award.remainingQuantity}</td>
                      <td className="p-3 text-center">
                        {award.remainingQuantity === 0 ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded uppercase">Exhausted</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">Available</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteAward(award.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Award">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Event Settings */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Event Details</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent" />
            
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
            Save Event Details
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-100/50 flex items-center space-x-2 text-red-800">
          <AlertCircle size={20} aria-hidden="true" />
          <h2 className="text-lg font-bold">Danger Zone</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-red-800 mb-4 font-medium">
            This will permanently delete all student records, scores, and spin
            history. This action cannot be undone.
          </p>

          {!showResetConfirm ?
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
            
              Reset Leaderboard
            </button> :

          <div className="bg-white p-4 rounded-lg border border-red-200 inline-block">
              <p className="text-sm font-bold text-gray-900 mb-2">
                Type RESET to confirm
              </p>
              <div className="flex space-x-2">
                <input
                type="text"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder="RESET"
                className="w-32 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-red-500 text-center font-bold" />
              
                <button
                onClick={handleReset}
                disabled={resetText !== 'RESET'}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                
                  Confirm
                </button>
                <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetText('');
                }}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">
                
                  Cancel
                </button>
              </div>
            </div>
          }
        </div>
      </section>
    </div>);

};