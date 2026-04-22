import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getLabourEntries, createLabourEntry, LabourEntry } from '../../api/labour';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Labour'>;

export default function LabourScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<LabourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [supervisor, setSupervisor] = useState('');
  const [trade, setTrade] = useState('');
  const [workersCount, setWorkersCount] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getLabourEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setSupervisor(''); setTrade(''); setWorkersCount('');
    setHoursWorked(''); setTasksCompleted(''); setNotes('');
  };

  const handleCreate = async () => {
    if (!user || !date) return;
    setSubmitting(true);
    try {
      await createLabourEntry({
        date, project_id: projectId, supervisor, trade,
        workers_count: parseInt(workersCount) || 0,
        hours_worked: parseFloat(hoursWorked) || 0,
        tasks_completed: tasksCompleted, notes,
      });
      setShowModal(false); resetForm(); fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create entry');
    } finally { setSubmitting(false); }
  };

  const renderItem = ({ item }: { item: LabourEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.formNum}>{item.form_number || 'LABOUR'}</Text>
        <View style={[styles.badge, { borderColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.dateText}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
      <Text style={styles.fieldRow}>👷 {item.trade} · {item.workers_count} workers · {item.hours_worked}h</Text>
      {item.tasks_completed ? <Text style={styles.desc} numberOfLines={2}>{item.tasks_completed}</Text> : null}
    </View>
  );

  const fields = [
    { label: 'Date', value: date, set: setDate, placeholder: '2025-01-01' },
    { label: 'Supervisor', value: supervisor, set: setSupervisor, placeholder: 'Name' },
    { label: 'Trade', value: trade, set: setTrade, placeholder: 'Carpenter / Mason...' },
    { label: 'Workers Count', value: workersCount, set: setWorkersCount, placeholder: '10', keyboardType: 'numeric' as any },
    { label: 'Hours Worked', value: hoursWorked, set: setHoursWorked, placeholder: '8', keyboardType: 'decimal-pad' as any },
    { label: 'Tasks Completed', value: tasksCompleted, set: setTasksCompleted, placeholder: 'Describe tasks...' },
    { label: 'Notes', value: notes, set: setNotes, placeholder: 'Additional notes...' },
  ];

  return (
    <ModuleShell title="Labour Return" icon="👷" projectName={projectName}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{entries.length} returns</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} /> : (
        <FlatList data={entries} keyExtractor={i => i.id} contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>👷</Text><Text style={styles.emptyText}>No labour returns yet.</Text></View>}
        />
      )}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Labour Return</Text>
            <FlatList data={fields} keyExtractor={f => f.label}
              renderItem={({ item: f }) => (
                <View>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor={colors.textMuted} value={f.value} onChangeText={f.set} keyboardType={f.keyboardType} />
                </View>
              )}
              ListFooterComponent={
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleCreate} disabled={submitting}>
                    {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Create</Text>}
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </ModuleShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  count: { color: colors.textMuted, fontSize: 12 },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  list: { padding: spacing.md, paddingBottom: spacing.huge },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxs },
  formNum: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  dateText: { color: colors.text, fontWeight: '700', marginBottom: spacing.xxs },
  fieldRow: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xxs },
  desc: { color: colors.textMuted, fontSize: 12 },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.huge, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: spacing.xxs },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  submitBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontWeight: '700' },
});
