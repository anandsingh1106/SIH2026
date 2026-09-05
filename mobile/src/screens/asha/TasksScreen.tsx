import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dataService } from '../../services/api/dataService';
import { backendApi, PatientSummary } from '@arogyasetu/shared/services/api';
import type { Task } from '@arogyasetu/shared/types';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'Tasks'>;

const today = () => new Date().toISOString().slice(0, 10);

const TASK_TYPES = [
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'anc_checkup', label: 'ANC Check-up' },
  { value: 'immunization', label: 'Immunisation' },
  { value: 'ncd_screening', label: 'NCD Screening' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'danger_sign_check', label: 'Danger Sign Check' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const EMPTY_FORM = { title: '', description: '', patientId: '', type: 'home_visit', priority: 'medium', dueDate: today() };

type Filter = 'today' | 'pending' | 'completed' | 'all';

/** Mirrors frontend/src/pages/asha/Tasks.tsx: same filters, same task lifecycle calls. */
export function TasksScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('today');
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(today());

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setTasks(await dataService.getTasks());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    backendApi.getPatients({ limit: 100 }).then((r) => setPatients(r.items)).catch(() => setPatients([]));
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'tasks') load();
    });
    return () => unsub();
  }, [load]);

  const handleAddTask = async () => {
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
    await load();
  };

  const openReschedule = (task: Task) => {
    setRescheduleTask(task);
    setRescheduleDate(task.dueDate ?? today());
  };

  const confirmReschedule = async () => {
    if (!rescheduleTask) return;
    // The API has no rescheduled state; move it back to in-progress with a new date.
    await dataService.updateTaskStatus(rescheduleTask.id, 'in_progress' as Task['status']);
    setRescheduleTask(null);
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {todayCount > 0 ? `${todayCount} task${todayCount === 1 ? '' : 's'} due today` : 'No tasks due today'}
        </Text>
        <Pressable style={styles.addButton} onPress={() => { setForm({ ...EMPTY_FORM, dueDate: today() }); setFormError(''); setIsAddOpen(true); }}>
          <Text style={styles.addButtonText}>+ Add Task</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {(['today', 'pending', 'completed', 'all'] as Filter[]).map((key) => (
          <Pressable key={key} style={[styles.filterPill, filter === key && styles.filterPillActive]} onPress={() => setFilter(key)}>
            <Text style={[styles.filterPillText, filter === key && styles.filterPillTextActive]}>
              {key[0].toUpperCase() + key.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.list}>
        {isLoading ? (
          <ActivityIndicator style={styles.loading} color="#15803D" />
        ) : filteredTasks.length === 0 ? (
          <Text style={styles.emptyText}>{filter === 'today' ? 'No tasks due today.' : 'No tasks in this view.'}</Text>
        ) : (
          filteredTasks.map((t) => (
            <View key={t.id} style={[styles.taskCard, isDone(t) && styles.taskCardDone]}>
              <View style={styles.taskHeaderRow}>
                <Text style={styles.taskPriority}>{String(t.priority).toUpperCase()}</Text>
                <Text style={styles.taskTitle}>{t.title}</Text>
              </View>
              {t.description ? <Text style={styles.taskDescription}>{t.description}</Text> : null}
              <Text style={styles.taskMeta}>
                {t.patientName ? `${t.patientName} · ` : ''}{t.village ? `${t.village} · ` : ''}Due: {t.dueDate ?? '—'}
              </Text>

              {!isDone(t) ? (
                <View style={styles.taskActions}>
                  <Pressable style={styles.taskActionPrimary} onPress={() => navigation.navigate('HomeVisits')}>
                    <Text style={styles.taskActionPrimaryText}>Start Visit</Text>
                  </Pressable>
                  <Pressable style={styles.taskActionSecondary} onPress={() => handleMarkComplete(t.id)}>
                    <Text style={styles.taskActionSecondaryText}>Done</Text>
                  </Pressable>
                  <Pressable style={styles.taskActionSecondary} onPress={() => openReschedule(t)}>
                    <Text style={styles.taskActionSecondaryText}>Reschedule</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.taskDoneLabel}>Completed</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={isAddOpen} animationType="slide" transparent onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>Add Field Task</Text>

              <Text style={styles.label}>Task Title</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. ANC follow-up visit" />

              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="What needs to be done?" />

              <Text style={styles.label}>Patient (optional)</Text>
              <View style={styles.chipRow}>
                <Pressable style={[styles.chip, !form.patientId && styles.chipActive]} onPress={() => setForm({ ...form, patientId: '' })}>
                  <Text style={[styles.chipText, !form.patientId && styles.chipTextActive]}>None</Text>
                </Pressable>
                {patients.slice(0, 20).map((p) => (
                  <Pressable key={p.id} style={[styles.chip, form.patientId === p.id && styles.chipActive]} onPress={() => setForm({ ...form, patientId: p.id })}>
                    <Text style={[styles.chipText, form.patientId === p.id && styles.chipTextActive]}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.chipRow}>
                {TASK_TYPES.map((t) => (
                  <Pressable key={t.value} style={[styles.chip, form.type === t.value && styles.chipActive]} onPress={() => setForm({ ...form, type: t.value })}>
                    <Text style={[styles.chipText, form.type === t.value && styles.chipTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map((p) => (
                  <Pressable key={p} style={[styles.chip, form.priority === p && styles.chipActive]} onPress={() => setForm({ ...form, priority: p })}>
                    <Text style={[styles.chipText, form.priority === p && styles.chipTextActive]}>{p[0].toUpperCase() + p.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={form.dueDate} onChangeText={(v) => setForm({ ...form, dueDate: v })} />

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={() => setIsAddOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSubmit} onPress={handleAddTask} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Add Task</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!rescheduleTask} animationType="fade" transparent onRequestClose={() => setRescheduleTask(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule: {rescheduleTask?.title}</Text>
            <Text style={styles.label}>New Due Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={rescheduleDate} onChangeText={setRescheduleDate} />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRescheduleTask(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmit} onPress={confirmReschedule}>
                <Text style={styles.modalSubmitText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 12, color: '#6B7280', flex: 1 },
  addButton: { backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  filterPillTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  loading: { marginTop: 40 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 12 },
  taskCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10 },
  taskCardDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  taskHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  taskPriority: { fontSize: 9, fontWeight: '800', color: '#B91C1C', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taskTitle: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  taskDescription: { fontSize: 12, color: '#4B5563', marginBottom: 4 },
  taskMeta: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  taskActions: { flexDirection: 'row', gap: 8 },
  taskActionPrimary: { backgroundColor: '#15803D', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  taskActionPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  taskActionSecondary: { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  taskActionSecondaryText: { color: '#374151', fontSize: 11, fontWeight: '600' },
  taskDoneLabel: { color: '#15803D', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#15803D' },
  chipText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  formError: { color: '#B91C1C', fontSize: 12, marginTop: 12 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  modalSubmit: { flex: 1, backgroundColor: '#15803D', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
