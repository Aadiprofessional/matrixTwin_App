import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getCleansingEntries, createCleansingEntry, CleansingEntry } from '../../api/cleansing';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Cleansing'>;

export default function CleansingScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<CleansingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [area, setArea] = useState('');
  const [cleaningType, setCleaningType] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCleansingEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setArea(''); setCleaningType(''); setPerformedBy(''); setMaterialsUsed(''); setNotes('');
  };

  const handleCreate = async () => {
    if (!user || !date) return;
    setSubmitting(true);
    try {
      await createCleansingEntry({ date, project_id: projectId, area, cleaning_type: cleaningType, performed_by: performedBy, materials_used: materialsUsed, notes });
      setShowModal(false); resetForm(); fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create entry');
    } finally { setSubmitting(false); }
  };

  const renderItem = ({ item }: { item: CleansingEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.formNum}>{item.form_number || 'CLEAN'}</Text>
        <View style={[styles.badge, { borderColor: colors.info }]}>
          <Text style={[styles.badgeText, { color: colors.info }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.dateText}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
      <Text style={styles.fieldRow}>🧹 {item.cleaning_type} · {item.area}</Text>
      {item.performed_by ? <Text style={styles.desc}>By: {item.performed_by}</Text> : null}
    </View>
  );

  const fields = [
    { label: 'Date', value: date, set: setDate, placeholder: '2025-01-01' },
    { label: 'Area', value: area, set: setArea, placeholder: 'Zone A / Floor 3' },
    { label: 'Cleaning Type', value: cleaningType, set: setCleaningType, placeholder: 'Deep clean / Routine' },
    { label: 'Performed By', value: performedBy, set: setPerformedBy, placeholder: 'Team name' },
    { label: 'Materials Used', value: materialsUsed, set: setMaterialsUsed, placeholder: 'Bleach 2L, mops...' },
    { label: 'Notes', value: notes, set: setNotes, placeholder: 'Additional notes...' },
  ];

  return (
    <ModuleShell title="Cleansing Records" icon="🧹" projectName={projectName}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{entries.length} records</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} /> : (
        <FlatList data={entries} keyExtractor={i => i.id} contentContainerStyle={styles.list} renderItem={renderItem}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>🧹</Text><Text style={styles.emptyText}>No cleansing records yet.</Text></View>}
        />
      )}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Cleansing Record</Text>
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
