import React, { useState, useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import type { CustomDepartment, Category } from "../../context/AppContext";
import { useToast } from "../../components/Toast";
import {
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  AlertTriangle,
  Building2,
  Tag,
  Search,
  Archive,
} from "lucide-react";

// Status badge
function StatusBadge({ isActive, isDeleted }: { isActive: boolean; isDeleted: boolean }) {
  if (isDeleted) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
        Archived
      </span>
    );
  }
  return isActive ? (
    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
      Active
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
      Inactive
    </span>
  );
}

// Archive / Delete safety modal
interface SafetyModalProps {
  entityName: string;
  entityType: "department" | "category";
  studentCount?: number;
  questionCount: number;
  onDeactivate: () => void;
  onArchive: () => void;
  onCancel: () => void;
  loading: boolean;
}

function SafetyModal({
  entityName,
  entityType,
  studentCount = 0,
  questionCount,
  onDeactivate,
  onArchive,
  onCancel,
  loading,
}: SafetyModalProps) {
  const hasLinks = studentCount > 0 || questionCount > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              Remove {entityType === "department" ? "Department" : "Category"}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              <span className="font-semibold text-gray-900">"{entityName}"</span>
            </p>
          </div>
        </div>
        {hasLinks && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 space-y-1">
            {questionCount > 0 && (
              <p><span className="font-bold">{questionCount}</span> question{questionCount !== 1 ? "s" : ""} linked</p>
            )}
            {studentCount > 0 && (
              <p><span className="font-bold">{studentCount}</span> student record{studentCount !== 1 ? "s" : ""} linked</p>
            )}
            <p className="text-xs mt-2">Historical data will be preserved. This cannot be permanently deleted while records are linked.</p>
          </div>
        )}
        <p className="text-sm text-gray-600">
          {hasLinks
            ? "You can deactivate (hide from active use) or archive (soft-delete) this entry."
            : "No linked records found. You can safely archive or deactivate this entry."}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={onDeactivate} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-800 text-sm font-bold rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50">
            <ToggleLeft size={14} />Deactivate
          </button>
          <button onClick={onArchive} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-800 text-sm font-bold rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
            {loading ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Archive size={14} />}
            Archive
          </button>
          <button onClick={onCancel} disabled={loading} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">
            <X size={14} />Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Departments Section
function DepartmentsSection() {
  const {
    customDepartments,
    addCustomDepartment,
    updateCustomDepartment,
    removeCustomDepartment,
    toggleDepartmentActiveItem,
    checkDepartmentDeletion,
    refreshCustomDepartments,
    questions,
    students,
  } = useAppContext();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newFaculty, setNewFaculty] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFaculty, setEditFaculty] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [safetyDept, setSafetyDept] = useState<CustomDepartment | null>(null);
  const [safetyInfo, setSafetyInfo] = useState<{ studentCount: number; questionCount: number } | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);

  const uniqueFaculties = useMemo(
    () => [...new Set(customDepartments.map((d) => d.faculty).filter(Boolean))].sort(),
    [customDepartments],
  );

  const questionCounts = useMemo(
    () => questions.reduce<Record<string, number>>((acc, q) => {
      if (q.department) acc[q.department] = (acc[q.department] ?? 0) + 1;
      return acc;
    }, {}),
    [questions],
  );
  const studentCounts = useMemo(
    () => students.reduce<Record<string, number>>((acc, s) => {
      if (s.department) acc[s.department] = (acc[s.department] ?? 0) + 1;
      return acc;
    }, {}),
    [students],
  );

  const filtered = useMemo(() => {
    return customDepartments.filter((d) => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.faculty.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && d.isActive && !d.deletedAt) ||
        (statusFilter === "inactive" && !d.isActive && !d.deletedAt) ||
        (statusFilter === "archived" && !!d.deletedAt);
      return matchSearch && matchStatus;
    });
  }, [customDepartments, search, statusFilter]);

  const isDuplicate = (name: string, excludeId?: string) => {
    const lower = name.trim().toLowerCase();
    return customDepartments.some((d) => !d.deletedAt && d.id !== excludeId && d.name.toLowerCase() === lower);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const trimmed = newName.trim();
    if (!trimmed) { setFormError("Department name is required."); return; }
    if (isDuplicate(trimmed)) { setFormError(`"${trimmed}" already exists.`); return; }
    setSaving(true);
    try {
      await addCustomDepartment(trimmed, newFaculty || "Custom");
      setNewName("");
      setNewFaculty("");
      toast(`Department "${trimmed}" created.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create department.");
    }
    setSaving(false);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) { setEditError("Name cannot be empty."); return; }
    if (isDuplicate(trimmed, editId)) { setEditError(`"${trimmed}" already exists.`); return; }
    setEditSaving(true);
    try {
      await updateCustomDepartment(editId, { name: trimmed, faculty: editFaculty });
      setEditId(null);
      toast("Department updated.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update.");
    }
    setEditSaving(false);
  };

  const handleToggle = async (d: CustomDepartment) => {
    setTogglingId(d.id);
    try {
      await toggleDepartmentActiveItem(d.id, !d.isActive);
      await refreshCustomDepartments();
      toast(d.isActive ? `"${d.name}" deactivated.` : `"${d.name}" activated.`, d.isActive ? "warning" : "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Toggle failed.", "error");
    }
    setTogglingId(null);
  };

  const openSafetyModal = async (d: CustomDepartment) => {
    setSafetyDept(d);
    setSafetyInfo(null);
    setSafetyLoading(true);
    try {
      const info = await checkDepartmentDeletion(d.name);
      setSafetyInfo({ studentCount: info.studentCount, questionCount: info.questionCount });
    } catch {
      setSafetyInfo({ studentCount: studentCounts[d.name] ?? 0, questionCount: questionCounts[d.name] ?? 0 });
    }
    setSafetyLoading(false);
  };

  const handleDeactivate = async () => {
    if (!safetyDept) return;
    setSafetyLoading(true);
    try {
      await toggleDepartmentActiveItem(safetyDept.id, false);
      toast(`"${safetyDept.name}" deactivated.`, "warning");
      setSafetyDept(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed.", "error");
    }
    setSafetyLoading(false);
  };

  const handleArchive = async () => {
    if (!safetyDept) return;
    setSafetyLoading(true);
    try {
      await removeCustomDepartment(safetyDept.id);
      toast(`"${safetyDept.name}" archived.`, "warning");
      setSafetyDept(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to archive.", "error");
    }
    setSafetyLoading(false);
  };

  const activeCt = customDepartments.filter((d) => d.isActive && !d.deletedAt).length;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {safetyDept && (
        <SafetyModal
          entityName={safetyDept.name}
          entityType="department"
          studentCount={safetyInfo?.studentCount}
          questionCount={safetyInfo?.questionCount ?? questionCounts[safetyDept.name] ?? 0}
          onDeactivate={handleDeactivate}
          onArchive={handleArchive}
          onCancel={() => setSafetyDept(null)}
          loading={safetyLoading}
        />
      )}

      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Building2 size={18} className="text-blue-700" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Departments</h2>
            <p className="text-xs text-gray-500">{activeCt} active · {customDepartments.filter(d => !d.deletedAt).length} total</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-6 border-b border-gray-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dept-name" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Department Name *</label>
            <input id="dept-name" type="text" value={newName} onChange={(e) => { setNewName(e.target.value); setFormError(""); }} placeholder="e.g. Robotics, Data Science…" className={`w-full px-3.5 py-2.5 rounded-lg border bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${formError ? "border-red-400" : "border-gray-200 focus:border-blue-400"}`} />
          </div>
          <div>
            <label htmlFor="dept-faculty" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Faculty</label>
            <input id="dept-faculty" type="text" value={newFaculty} onChange={(e) => setNewFaculty(e.target.value)} placeholder="e.g. Faculty of Engineering" list="faculty-suggestions" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
            <datalist id="faculty-suggestions">{uniqueFaculties.map((f) => <option key={f} value={f} />)}</datalist>
          </div>
        </div>
        {formError && <p className="text-sm text-red-600 font-medium flex items-center gap-1.5"><AlertTriangle size={13} /> {formError}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={15} />}
          {saving ? "Adding…" : "Add Department"}
        </button>
      </form>

      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center bg-gray-50/60">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments…" className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-400 font-medium text-sm">
          {search || statusFilter !== "all" ? "No departments match your filters." : "No departments yet. Use the form above to create one."}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {filtered.map((dept) => (
            <li key={dept.id} className="p-4 sm:p-5">
              {editId === dept.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Name</label>
                      <input autoFocus type="text" value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(""); }} className={`w-full px-3 py-2 rounded-lg border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${editError ? "border-red-400" : "border-gray-300 focus:border-blue-400"}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Faculty</label>
                      <input type="text" value={editFaculty} onChange={(e) => setEditFaculty(e.target.value)} list="faculty-suggestions-edit" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
                      <datalist id="faculty-suggestions-edit">{uniqueFaculties.map((f) => <option key={f} value={f} />)}</datalist>
                    </div>
                  </div>
                  {editName.trim() !== dept.name && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />Renaming will not update already-imported questions. Re-import questions after renaming.
                    </p>
                  )}
                  {editError && <p className="text-sm text-red-600 font-medium flex items-center gap-1.5"><AlertTriangle size={13} />{editError}</p>}
                  <div className="flex items-center gap-2">
                    <button onClick={handleEditSave} disabled={editSaving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                      {editSaving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditId(null)} disabled={editSaving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"><X size={12} />Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-gray-900 ${dept.deletedAt ? "line-through text-gray-400" : ""}`}>{dept.name}</p>
                      <StatusBadge isActive={dept.isActive} isDeleted={!!dept.deletedAt} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{dept.faculty || "—"}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>{questionCounts[dept.name] ?? 0} questions</span>
                      <span>{studentCounts[dept.name] ?? 0} students</span>
                      <span className="font-mono">{dept.slug}</span>
                    </div>
                  </div>
                  {!dept.deletedAt && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      <button onClick={() => handleToggle(dept)} disabled={togglingId === dept.id} title={dept.isActive ? "Deactivate" : "Activate"} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${dept.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {togglingId === dept.id ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : dept.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {dept.isActive ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => { setEditId(dept.id); setEditName(dept.name); setEditFaculty(dept.faculty); setEditError(""); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => openSafetyModal(dept)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Archive"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Categories Section
function CategoriesSection() {
  const {
    categories,
    addCategory,
    updateCategoryItem,
    removeCategoryItem,
    toggleCategoryActiveItem,
    checkCategoryDeletion,
    questions,
  } = useAppContext();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [safetyCat, setSafetyCat] = useState<Category | null>(null);
  const [safetyInfo, setSafetyInfo] = useState<{ questionCount: number } | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);

  const questionCounts = useMemo(
    () => questions.reduce<Record<string, number>>((acc, q) => {
      if (q.category) acc[q.category] = (acc[q.category] ?? 0) + 1;
      return acc;
    }, {}),
    [questions],
  );

  const filtered = useMemo(
    () => categories.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search],
  );

  const isDuplicate = (name: string, excludeId?: string) => {
    const lower = name.trim().toLowerCase();
    return categories.some((c) => !c.deletedAt && c.id !== excludeId && c.name.toLowerCase() === lower);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const trimmed = newName.trim();
    if (!trimmed) { setFormError("Category name is required."); return; }
    if (isDuplicate(trimmed)) { setFormError(`"${trimmed}" already exists.`); return; }
    setSaving(true);
    try {
      await addCategory(trimmed);
      setNewName("");
      toast(`Category "${trimmed}" created.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create category.");
    }
    setSaving(false);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) { setEditError("Name cannot be empty."); return; }
    if (isDuplicate(trimmed, editId)) { setEditError(`"${trimmed}" already exists.`); return; }
    setEditSaving(true);
    try {
      await updateCategoryItem(editId, { name: trimmed });
      setEditId(null);
      toast("Category updated.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update.");
    }
    setEditSaving(false);
  };

  const handleToggle = async (c: Category) => {
    setTogglingId(c.id);
    try {
      await toggleCategoryActiveItem(c.id, !c.isActive);
      toast(c.isActive ? `"${c.name}" deactivated.` : `"${c.name}" activated.`, c.isActive ? "warning" : "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Toggle failed.", "error");
    }
    setTogglingId(null);
  };

  const openSafetyModal = async (c: Category) => {
    setSafetyCat(c);
    setSafetyInfo(null);
    setSafetyLoading(true);
    try {
      const info = await checkCategoryDeletion(c.name);
      setSafetyInfo({ questionCount: info.questionCount });
    } catch {
      setSafetyInfo({ questionCount: questionCounts[c.name] ?? 0 });
    }
    setSafetyLoading(false);
  };

  const handleDeactivate = async () => {
    if (!safetyCat) return;
    setSafetyLoading(true);
    try {
      await toggleCategoryActiveItem(safetyCat.id, false);
      toast(`"${safetyCat.name}" deactivated.`, "warning");
      setSafetyCat(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed.", "error");
    }
    setSafetyLoading(false);
  };

  const handleArchive = async () => {
    if (!safetyCat) return;
    setSafetyLoading(true);
    try {
      await removeCategoryItem(safetyCat.id);
      toast(`"${safetyCat.name}" archived.`, "warning");
      setSafetyCat(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to archive.", "error");
    }
    setSafetyLoading(false);
  };

  const activeCt = categories.filter((c) => c.isActive && !c.deletedAt).length;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {safetyCat && (
        <SafetyModal
          entityName={safetyCat.name}
          entityType="category"
          questionCount={safetyInfo?.questionCount ?? questionCounts[safetyCat.name] ?? 0}
          onDeactivate={handleDeactivate}
          onArchive={handleArchive}
          onCancel={() => setSafetyCat(null)}
          loading={safetyLoading}
        />
      )}

      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg"><Tag size={18} className="text-purple-700" /></div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Categories</h2>
          <p className="text-xs text-gray-500">{activeCt} active · {categories.filter(c => !c.deletedAt).length} total</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="p-6 border-b border-gray-100 space-y-4">
        <div>
          <label htmlFor="cat-name" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Category Name *</label>
          <div className="flex gap-2">
            <input id="cat-name" type="text" value={newName} onChange={(e) => { setNewName(e.target.value); setFormError(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(e); } }} placeholder="e.g. Technical Interview…" className={`flex-1 px-3.5 py-2.5 rounded-lg border bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all ${formError ? "border-red-400" : "border-gray-200 focus:border-purple-400"}`} />
            <button type="submit" disabled={saving || !newName.trim()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 whitespace-nowrap">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={15} />}
              {saving ? "Adding…" : "Add Category"}
            </button>
          </div>
          {formError && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center gap-1.5"><AlertTriangle size={13} /> {formError}</p>}
        </div>
      </form>

      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories…" className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-400 font-medium text-sm">
          {search ? "No categories match your search." : "No categories yet."}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {filtered.map((cat) => (
            <li key={cat.id} className="p-4 sm:p-5">
              {editId === cat.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input autoFocus type="text" value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEditSave(); } if (e.key === "Escape") setEditId(null); }} className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all ${editError ? "border-red-400" : "border-gray-300 focus:border-purple-400"}`} />
                  <button onClick={handleEditSave} disabled={editSaving} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50" title="Save">
                    {editSaving ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin block" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setEditId(null)} disabled={editSaving} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Cancel"><X size={14} /></button>
                  {editError && <p className="w-full text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle size={11} />{editError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-gray-900 ${cat.deletedAt ? "line-through text-gray-400" : ""}`}>{cat.name}</p>
                      <StatusBadge isActive={cat.isActive} isDeleted={!!cat.deletedAt} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{questionCounts[cat.name] ?? 0} questions</span>
                      <span className="font-mono">{cat.slug}</span>
                    </div>
                  </div>
                  {!cat.deletedAt && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleToggle(cat)} disabled={togglingId === cat.id} title={cat.isActive ? "Deactivate" : "Activate"} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${cat.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {togglingId === cat.id ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : cat.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {cat.isActive ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditError(""); }} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => openSafetyModal(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Archive"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Main CategoriesTab
export const CategoriesTab: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <DepartmentsSection />
      <CategoriesSection />
    </div>
  );
};
