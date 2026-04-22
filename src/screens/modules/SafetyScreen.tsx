import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getSafetyEntries, createSafetyEntry, SafetyEntry } from '../../api/safety';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Safety'>;

export default function SafetyScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<SafetyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [inspector, setInspector] = useState('');
  const [location, setLocation] = useState('');
  const [inspectionType, setInspectionType] = useState('');
  const [findings, setFindings] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [riskLevel, setRiskLevel] = useState('low');

  const fetch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getSafetyEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? data : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setInspector(''); setLocation(''); setInspectionType('');
    setFindings(''); setCorrectiveActions(''); setRiskLevel('low');
  };

  const handleCreate = async () => {
    if (!user || !date) return;
    setSubmitting(true);
    try {
      await createSafetyEntry({
        date, project_id: projectId, inspector, location,
        inspection_type: inspectionType, findings,
        corrective_actions: correctiveActions, risk_level: riskLevel,
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

  const riskColor = (r: string) => {
    if (r === 'high') return colors.error;
    if (r === 'medium') return colors.warning;
    return colors.success;
  };

  const renderItem = ({ item }: { item: SafetyEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.formNum}>{item.form_number || 'SAFETY'}</Text>
        <View style={[styles.badge, { borderColor: riskColor(item.risk_level) }]}>
          <Text style={[styles.badgeText, { color: riskColor(item.risk_level) }]}>
            {item.risk_level?.toUpperCase() ?? 'LOW'} RISK
          </Text>
        </View>
      </View>
      <Text style={styles.dateText}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
      <Text style={styles.fieldRow}>🔍 {item.inspection_type} · {item.location}</Text>
      {item.findings ? <Text style={styles.desc} numberOfLines={2}>{item.findings}</Text> : null}
    </View>
  );

  const fields = [
    { label: 'Date (YYYY-MM-DD)', value: date, set: setDate, placeholder: '2025-01-01' },
    { label: 'Inspector', value: inspector, set: setInspector, placeholder: 'Name' },
    { label: 'Location', value: location, set: setLocation, placeholder: 'Zone A' },
    { label: 'Inspection Type', value: inspectionType, set: setInspectionType, placeholder: 'Fire Safety' },
    { label: 'Risk Level (low/medium/high)', value: riskLevel, set: setRiskLevel, placeholder: 'low' },
    { label: 'Findings', value: findings, set: setFindings, placeholder: 'Describe findings...' },
    { label: 'Corrective Actions', value: correctiveActions, set: setCorrectiveActions, placeholder: 'Actions taken...' },
  ];

  return (
    <ModuleShell title="Safety Inspections" icon="🛡️" projectName={projectName}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{entries.length} inspections</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={entries} keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState label="No safety inspections yet." />}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Safety Inspection</Text>
            <FlatList
              data={fields}
              keyExtractor={f => f.label}
              renderItem={({ item: f }) => (
                <View>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor={colors.textMuted} value={f.value} onChangeText={f.set} />
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
      <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>🛡️</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
    </View>
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
  dateText: { color: colors.text, fontWeight: '700', marginBottom: spacing.xxs },
  fieldRow: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.xxs },
  desc: { color: colors.textMuted, fontSize: 12 },
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
