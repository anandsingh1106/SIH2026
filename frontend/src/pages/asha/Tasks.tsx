import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Task } from '../../types';
import { CheckSquare, CheckCircle2, Clock, MapPin, Navigation, Calendar, Plus, RotateCw } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const AshaTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('2026-08-25');

  useEffect(() => {
    dataService.getTasks().then(setTasks);
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'tasks') dataService.getTasks().then(setTasks);
    });
    return () => unsub();
  }, []);

  const handleMarkComplete = async (taskId: string) => {
    await dataService.updateTaskStatus(taskId, 'completed');
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    await dataService.updateTaskStatus(selectedTask.id, 'rescheduled');
    setIsRescheduleModalOpen(false);
    setSelectedTask(null);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

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
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-gov-700" />
            Field Tasks & Patient Visits Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized daily itinerary with GPS household coordinates and offline completion checkmarks
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                filter === f
                  ? 'bg-gov-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f} Tasks
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
            No tasks found in this view.
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                t.status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/20 opacity-75'
                  : t.priority === 'critical'
                  ? 'border-red-300 border-l-4 border-l-red-600'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      t.priority === 'critical'
                        ? 'critical'
                        : t.priority === 'high'
                        ? 'danger'
                        : 'primary'
                    }
                    size="sm"
                  >
                    {t.priority.toUpperCase()}
                  </Badge>
                  <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                  {t.titleMr && <span className="text-xs text-slate-500 font-medium">({t.titleMr})</span>}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-1 font-medium">
                  <span>👤 <strong>Patient:</strong> {t.patientName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {t.village} ({t.householdNumber})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Due: {t.dueTime}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {t.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate('/asha/home-visits')}
                    >
                      Start Visit Flow
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
                        setIsRescheduleModalOpen(true);
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

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && selectedTask && (
        <Modal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          title={`Reschedule Task: ${selectedTask.title}`}
          description={`Patient: ${selectedTask.patientName} (${selectedTask.householdNumber})`}
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
              <Button variant="secondary" size="sm" onClick={() => setIsRescheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Confirm Reschedule
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
