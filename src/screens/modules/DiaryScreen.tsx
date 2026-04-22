import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getDiaryEntries, createDiaryEntry, DiaryEntry } from '../../api/diary';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Diary'>;

function statusColor(status: string) {
  if (status === 'completed') return colors.success;
  if (status === 'pending') return colors.warning;
  return colors.textMuted;
}

export default function DiaryScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [incidents, setIncidents] = useState('');
  const [materials, setMaterials] = useState('');
  const [notes, setNotes] = useState('');

  const fetch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDiaryEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!user || !date) return;
    setSubmitting(true);
    try {
      await createDiaryEntry({
        date, project_id: projectId,
        weather, temperature, work_completed: workCompleted,
        incidents_reported: incidents, materials_delivered: materials, notes,
      });
      setShowModal(false);
      resetForm();
      fetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setWeather(''); setTemperature(''); setWorkCompleted('');
    setIncidents(''); setMaterials(''); setNotes('');
  };

  const renderItem = ({ item }: { item: DiaryEntry }) => {
    const sc = statusColor(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.formNum}>{item.form_number || 'DIARY'}</Text>
          <View style={[styles.badge, { borderColor: sc }]}>
            <Text style={[styles.badgeText, { color: sc }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
        <Text style={styles.fieldRow}>🌤️ {item.weather} · {item.temperature}</Text>
        {item.work_completed ? <Text style={styles.desc} numberOfLines={2}>{item.work_completed}</Text> : null}
      </View>
    );
  };

  return (
    <ModuleShell title="Site Diary" icon="📔" projectName={projectName}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{entries.length} entries</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New Entry</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState label="No diary entries yet." />}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Site Diary Entry</Text>
            <FlatList
              data={[
                { label: 'Date (YYYY-MM-DD)', value: date, set: setDate, placeholder: '2025-01-01' },
                { label: 'Weather', value: weather, set: setWeather, placeholder: 'Sunny / Cloudy' },
                { label: 'Temperature', value: temperature, set: setTemperature, placeholder: '22°C' },
                { label: 'Work Completed', value: workCompleted, set: setWorkCompleted, placeholder: 'Describe work done...' },
                { label: 'Incidents Reported', value: incidents, set: setIncidents, placeholder: 'None / details...' },
                { label: 'Materials Delivered', value: materials, set: setMaterials, placeholder: 'Cement 50 bags...' },
                { label: 'Notes', value: notes, set: setNotes, placeholder: 'Additional notes...' },
              ]}
              keyExtractor={f => f.label}
              renderItem={({ item: f }) => (
                <View key={f.label}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={f.value}
                    onChangeText={f.set}
                  />
                </View>
              )}
              ListFooterComponent={
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
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

function EmptyState({ label }: { label: string }) {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxxl }}>
      <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>📝</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  count: { color: colors.textMuted, fontSize: 12 },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  list: { padding: spacing.md, paddingBottom: spacing.huge },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxs },
  formNum: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, textTransform: 'uppercase', fontWeight: '600' },
  dateText: { color: colors.text, fontWeight: '700', marginBottom: spacing.xxs },
  fieldRow: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xxs },
  desc: { color: colors.textMuted, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.huge, maxHeight: '90%',
  },
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
