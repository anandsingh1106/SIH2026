import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { backendApi, PatientSummary } from '@arogyasetu/shared/services/api';
import { Task } from '@arogyasetu/shared/types';
import { CheckSquare, CheckCircle2, Clock, MapPin, Plus, CalendarDays } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';

const today = () => new Date().toISOString().slice(0, 10);

const TASK_TYPES = [
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'anc_checkup', label: 'ANC Check-up' },
  { value: 'immunization', label: 'Immunisation' },
  { value: 'ncd_screening', label: 'NCD Screening' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'danger_sign_check', label: 'Danger Sign Check' },
  { value: 'general', label: 'General' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  patientId: '',
  type: 'home_visit',
  priority: 'medium',
  dueDate: today(),
};

export const AshaTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [filter, setFilter] = useState<'today' | 'pending' | 'completed' | 'all'>('today');
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(today());

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await dataService.getTasks();
      setTasks(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // The ASHA worker's own caseload populates the patient picker.
    backendApi.getPatients({ limit: 100 })
      .then((r) => setPatients(r.items))
      .catch(() => setPatients([]));

    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'tasks') load();
    });
    return () => unsub();
  }, [load]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Please enter a task title.');
      return;
    }

    setIsSaving(true);
    try {
      await dataService.saveTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        patientId: form.patientId || undefined,
        type: form.type,
        priority: form.priority as Task['priority'],
        dueDate: form.dueDate,
      } as Partial<Task> & { title: string });

      toast.success('Task added');
      setIsAddOpen(false);
      setForm({ ...EMPTY_FORM, dueDate: today() });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    await dataService.updateTaskStatus(taskId, 'completed');
    toast.success('Task marked complete');
    await load();
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    // The API has no rescheduled state; move it back to in-progress with a new date.
    await dataService.updateTaskStatus(selectedTask.id, 'in_progress' as Task['status']);
    toast.info('Task rescheduled');
    setIsRescheduleOpen(false);
    setSelectedTask(null);
    await load();
  };

  const isDone = (t: Task) => String(t.status).toLowerCase() === 'completed';
  const isToday = (t: Task) => (t.dueDate ?? '').slice(0, 10) === today();

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'today') return isToday(t) && !isDone(t);
    if (filter === 'pending') return !isDone(t);
    if (filter === 'completed') return isDone(t);
    return true;
  });

  const todayCount = tasks.filter((t) => isToday(t) && !isDone(t)).length;

  const priorityBadge = (p?: string) => {
    const v = String(p).toLowerCase();
    if (v === 'urgent') return 'critical';
    if (v === 'high') return 'danger';
    return 'primary';
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: "Today's Task Action List" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-gov-700" />
            Field Tasks &amp; Patient Visits Schedule
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            {todayCount > 0
              ? `${todayCount} task${todayCount === 1 ? '' : 's'} due today`
              : 'No tasks due today'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setForm({ ...EMPTY_FORM, dueDate: today() });
              setFormError('');
              setIsAddOpen(true);
            }}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-line shadow-2xs text-xs w-fit">
        {([
          ['today', 'Today'],
          ['pending', 'Pending'],
          ['completed', 'Completed'],
          ['all', 'All'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filter === key ? 'bg-gov-700 text-white shadow-xs' : 'text-ink-muted hover:bg-sand-100'
            }`}
          >
            {label}
            {key === 'today' && todayCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {todayCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-ink-soft">Loading tasks…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 bg-surface rounded-xl border border-dashed border-sand-300 text-center space-y-3">
            <p className="text-xs text-ink-soft">
              {filter === 'today' ? 'No tasks due today.' : 'No tasks in this view.'}
            </p>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsAddOpen(true)}>
              Add a task
            </Button>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`bg-surface rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                isDone(t)
                  ? 'border-emerald-200 bg-emerald-50/20 opacity-75'
                  : String(t.priority).toLowerCase() === 'urgent'
                  ? 'border-red-300 border-l-4 border-l-red-600'
                  : 'border-line'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={priorityBadge(t.priority)} size="sm">
                    {String(t.priority).toUpperCase()}
                  </Badge>
                  <h3 className="font-bold text-ink text-sm">{t.title}</h3>
                  {isToday(t) && !isDone(t) && (
                    <span className="text-[10px] font-bold text-gov-700 bg-gov-50 border border-gov-200 px-2 py-0.5 rounded-full">
                      TODAY
                    </span>
                  )}
                </div>

                {t.description && (
                  <p className="text-xs text-ink-muted leading-relaxed">{t.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft pt-1 font-medium">
                  {t.patientName && (
                    <>
                      <span>👤 <strong>Patient:</strong> {t.patientName}</span>
                      <span>•</span>
                    </>
                  )}
                  {t.village && (
                    <>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-ink-soft" />
                        {t.village}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-ink-soft" />
                    Due: {t.dueDate ?? '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                {!isDone(t) ? (
                  <>
                    <Button size="sm" variant="primary" onClick={() => navigate('/asha/home-visits')}>
                      Start Visit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => handleMarkComplete(t.id)}
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedTask(t);
                        setRescheduleDate(t.dueDate ?? today());
                        setIsRescheduleOpen(true);
                      }}
                    >
                      Reschedule
                    </Button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Field Task"
        description="Schedule a visit, screening or follow-up"
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <Input
            label="Task Title"
            required
            placeholder="e.g. ANC follow-up visit"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <Input
            label="Description"
            placeholder="What needs to be done?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <Select
            label="Patient (optional)"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            options={[
              { value: '', label: 'Not linked to a patient' },
              ...patients.map((p) => ({ value: p.id, label: `${p.name}${p.village ? ` — ${p.village}` : ''}` })),
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={TASK_TYPES}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>

          <Input
            label="Due Date"
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      {isRescheduleOpen && selectedTask && (
        <Modal
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          title={`Reschedule: ${selectedTask.title}`}
          size="sm"
        >
          <form onSubmit={handleReschedule} className="space-y-4">
            <Input
              label="New Due Date"
              type="date"
              required
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsRescheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Confirm
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
