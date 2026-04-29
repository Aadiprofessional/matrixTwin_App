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
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getCleansingEntries, createCleansingEntry, CleansingEntry } from '../../api/cleansing';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Cleansing'>;
const ACCENT = '#10b981';
const CLEANING_TYPES = ['Daily', 'Weekly', 'Deep Clean', 'Post-Construction', 'Emergency'];

function statusColor(s: string) {
  if (s === 'completed') return colors.success;
  if (s === 'pending') return colors.warning;
  if (s === 'rejected') return colors.error;
  return colors.textMuted;
}

export default function CleansingScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<CleansingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [area, setArea] = useState('');
  const [cleaningType, setCleaningType] = useState('Daily');
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
    setArea(''); setCleaningType('Daily'); setPerformedBy('');
    setMaterialsUsed(''); setNotes('');
  };

  const handleCreate = async () => {
    if (!user || !area.trim()) {
      Alert.alert('Validation', 'Area is required');
      return;
    }
    setSubmitting(true);
    try {
      await createCleansingEntry({
        date, project_id: projectId,
        area, cleaning_type: cleaningType,
        performed_by: performedBy,
        materials_used: materialsUsed,
        notes,
      });
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = entries.filter(e => {
    if (filterStatus === 'all') return true;
    return e.status === filterStatus;
  });

  const total = entries.length;
  const pending = entries.filter(e => e.status === 'pending').length;
  const completed = entries.filter(e => e.status === 'completed').length;

  const renderItem = ({ item }: { item: CleansingEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.formNum}>{item.form_number || 'CLEAN'}</Text>
          <View style={[styles.typePill, { backgroundColor: ACCENT + '20' }]}>
            <Icon name="broom" size={10} color={ACCENT} />
            <Text style={[styles.typeText, { color: ACCENT }]}>{item.cleaning_type}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="map-marker-outline" size={13} color={colors.textMuted} />
          <Text style={styles.infoText} numberOfLines={1}>{item.area}</Text>
        </View>
        {item.performed_by ? (
          <View style={styles.infoItem}>
            <Icon name="account-outline" size={13} color={colors.textMuted} />
            <Text style={styles.infoText}>{item.performed_by}</Text>
          </View>
        ) : null}
      </View>

      {item.materials_used ? (
        <View style={styles.materialsRow}>
          <Icon name="package-variant-outline" size={13} color={colors.textMuted} />
          <Text style={styles.materialsText} numberOfLines={1}>{item.materials_used}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Icon name="calendar-outline" size={11} color={colors.textMuted} />
        <Text style={styles.footerText}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
      </View>
    </View>
  );

  return (
    <ModuleShell
      title="Cleansing Records"
      iconName="broom"
      accentColor={ACCENT}
      rightAction={
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: ACCENT }]} onPress={() => setShowModal(true)}>
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      }>

      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: total, color: ACCENT },
          { label: 'Pending', value: pending, color: colors.warning },
          { label: 'Completed', value: completed, color: colors.success },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'completed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filterStatus === f && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]}
            onPress={() => setFilterStatus(f)}>
            <Text style={[styles.filterText, filterStatus === f && { color: ACCENT }]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="broom" size={48} color={colors.border} />
              <Text style={styles.emptyText}>No cleansing records yet</Text>
              <Text style={styles.emptySubText}>Tap "New" to create one</Text>
            </View>
          }
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Cleansing Record</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Date *</Text>
                <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Area *</Text>
                <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. Floor 1, Entrance, Toilets" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Cleaning Type</Text>
                <View style={styles.chipRow}>
                  {CLEANING_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, cleaningType === t && { backgroundColor: ACCENT, borderColor: ACCENT }]}
                      onPress={() => setCleaningType(t)}>
                      <Text style={[styles.chipText, cleaningType === t && { color: '#fff' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Performed By</Text>
                <TextInput style={styles.input} value={performedBy} onChangeText={setPerformedBy} placeholder="Cleaner name / team" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Materials Used</Text>
                <TextInput style={[styles.input, styles.textarea]} value={materialsUsed} onChangeText={setMaterialsUsed} placeholder="Cleaning materials used..." placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: ACCENT }, submitting && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Icon name="send" size={16} color="#fff" />
                    <Text style={styles.submitText}>Submit Record</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ModuleShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.xs },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderTopWidth: 2, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2, textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  list: { padding: spacing.xl, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  formNum: { color: ACCENT, fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  typeText: { fontSize: 10, fontWeight: '600' },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  infoText: { color: colors.textMuted, fontSize: 12 },
  materialsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  materialsText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { color: colors.textMuted, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  emptySubText: { color: colors.textMuted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, marginBottom: spacing.xxs },
  input: { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
