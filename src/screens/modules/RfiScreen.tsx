import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getRfiEntries, createRfiEntry, RfiEntry } from '../../api/rfi';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Rfi'>;

export default function RfiScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<RfiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getRfiEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { setSubject(''); setDescription(''); setPriority('medium'); setDueDate(''); };

  const handleCreate = async () => {
    if (!user || !subject) return;
    setSubmitting(true);
    try {
      await createRfiEntry({ subject, description, project_id: projectId, priority, due_date: dueDate || undefined });
      setShowModal(false); resetForm(); fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create RFI');
    } finally { setSubmitting(false); }
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return colors.error;
    if (p === 'medium') return colors.warning;
    return colors.success;
  };

  const renderItem = ({ item }: { item: RfiEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.formNum}>{item.form_number || 'RFI'}</Text>
        <View style={[styles.badge, { borderColor: priorityColor(item.priority) }]}>
          <Text style={[styles.badgeText, { color: priorityColor(item.priority) }]}>{item.priority?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{item.subject}</Text>
      <Text style={styles.dateText}>{dayjs(item.created_at).format('DD MMM YYYY')}</Text>
      <View style={[styles.statusPill, { backgroundColor: item.status === 'open' ? colors.warning + '22' : colors.success + '22' }]}>
        <Text style={[styles.statusText, { color: item.status === 'open' ? colors.warning : colors.success }]}>{item.status?.toUpperCase()}</Text>
      </View>
    </View>
  );

  const fields = [
    { label: 'Subject *', value: subject, set: setSubject, placeholder: 'RFI subject' },
    { label: 'Description', value: description, set: setDescription, placeholder: 'Describe the request...' },
    { label: 'Priority (low/medium/high)', value: priority, set: setPriority, placeholder: 'medium' },
    { label: 'Due Date (YYYY-MM-DD)', value: dueDate, set: setDueDate, placeholder: '2025-01-01' },
  ];

  return (
    <ModuleShell title="RFI / RICS" icon="📋" projectName={projectName}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{entries.length} RFIs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New RFI</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} /> : (
        <FlatList data={entries} keyExtractor={i => i.id} contentContainerStyle={styles.list} renderItem={renderItem}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>No RFIs yet.</Text></View>}
        />
      )}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New RFI</Text>
            <FlatList data={fields} keyExtractor={f => f.label}
              renderItem={({ item: f }) => (
                <View>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor={colors.textMuted} value={f.value} onChangeText={f.set} />
                </View>
              )}
              ListFooterComponent={
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, (!subject || submitting) && styles.submitBtnDisabled]} onPress={handleCreate} disabled={!subject || submitting}>
                    {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Submit</Text>}
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
  badgeText: { fontSize: 10, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.xxs },
  dateText: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xxs },
  statusPill: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.huge, maxHeight: '80%' },
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
