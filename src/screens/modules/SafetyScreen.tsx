import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import {
  getSafetyEntries, getSafetyEntryById, createSafetyEntry, deleteSafetyEntry,
  getSafetyHistory, restoreSafetyFromHistory, updateSafetyEntry,
  updateSafetyWorkflowAction, SafetyEntry,
} from '../../api/safety';
import { getProjectMembers } from '../../api/team';
import SafetyInspectionFormRN, { SafetyFormData } from '../../components/forms/SafetyInspectionFormRN';
import ProcessFlowBuilder, { ProcessNode } from '../../components/forms/ProcessFlowBuilder';
import PeopleSelectorModal from '../../components/ui/PeopleSelectorModal';
import { FormEntryCard, CardMetrics } from '../../components/ui/FormEntryCard';
import ModuleDetailModal from '../../components/ui/ModuleDetailModal';
import HistoryModal from '../../components/ui/HistoryModal';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import client from '../../api/client';

dayjs.extend(relativeTime);

type RouteProps = RouteProp<AppStackParamList, 'Safety'>;

const ACCENT = '#f59e0b';
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444',
  completed: '#22c55e', active: '#3b82f6', expired: '#6b7280', 'in-review': '#8b5cf6',
};
const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};

/* ── Expiry pill ── */
function ExpiryPill({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null;
  const diff = dayjs(expiresAt).diff(dayjs(), 'day');
  const expired = diff < 0;
  const color = expired ? '#ef4444' : diff <= 7 ? '#f97316' : '#22c55e';
  return (
    <View style={{ borderRadius: 99, borderWidth: 1, borderColor: color, backgroundColor: color + '22', paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700' }}>
        {expired ? `Expired ${Math.abs(diff)}d ago` : `Expires in ${diff}d`}
      </Text>
    </View>
  );
}

/* ── Mini metric box ── */
function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#1a1a1a', padding: 8, alignItems: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: color || colors.text, marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: '#555', letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

/* ── Safety Card ── */
function SafetyCard({ entry, isAdmin, onViewDetails, onHistory, onDelete, onRename, onSetExpiry, onSetStatus }: {
  entry: SafetyEntry; isAdmin: boolean;
  onViewDetails: () => void; onHistory: () => void;
  onDelete: () => void; onRename: () => void;
  onSetExpiry: () => void; onSetStatus: () => void;
}) {
  const statusColor = STATUS_COLORS[entry.status] || '#64748b';
  const riskColor = RISK_COLORS[entry.risk_level] || '#64748b';
  const score = entry.safety_score != null ? `${entry.safety_score}%` : 'N/A';
  return (
    <View style={[C.card, { borderLeftColor: statusColor }]}>
      <View style={C.cardHeader}>
        <Text style={C.cardDate}>{dayjs(entry.created_at).format('DD MMM YYYY')}</Text>
        <View style={[C.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[C.badgeText, { color: statusColor }]}>{(entry.status || 'pending').toUpperCase()}</Text>
        </View>
      </View>
      <Text style={C.cardTitle} numberOfLines={1}>{(entry as any).name || entry.form_number || `Safety-${entry.id.slice(-4)}`}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="account" size={12} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>{entry.inspector}</Text>
        </View>
        <ExpiryPill expiresAt={entry.expires_at} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
        <MetricBox label="Score" value={score} color={Number(entry.safety_score) >= 80 ? '#22c55e' : Number(entry.safety_score) >= 60 ? ACCENT : '#ef4444'} />
        <MetricBox label="Type" value={entry.inspection_type || '—'} />
        <MetricBox label="Risk" value={(entry.risk_level || '—').toUpperCase()} color={riskColor} />
      </View>
      {isAdmin && (
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
          <TouchableOpacity style={C.adminBtn} onPress={onSetExpiry}>
            <Icon name="clock-edit-outline" size={12} color={colors.textMuted} />
            <Text style={C.adminBtnText}>Set Expiry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={C.adminBtn} onPress={onSetStatus}>
            <Icon name="toggle-switch-outline" size={12} color={colors.textMuted} />
            <Text style={C.adminBtnText}>Set Status</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={C.actions}>
        <TouchableOpacity style={C.actionBtn} onPress={onViewDetails}>
          <Icon name="eye-outline" size={12} color={ACCENT} />
          <Text style={[C.actionBtnText, { color: ACCENT }]}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={C.actionBtn} onPress={onHistory}>
          <Icon name="history" size={12} color={colors.textMuted} />
          <Text style={C.actionBtnText}>History</Text>
        </TouchableOpacity>
        {isAdmin && (
          <>
            <TouchableOpacity style={C.actionBtn} onPress={onRename}>
              <Icon name="pencil-outline" size={12} color={colors.textMuted} />
              <Text style={C.actionBtnText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity style={C.actionBtn} onPress={onDelete}>
              <Icon name="trash-can-outline" size={12} color="#ef4444" />
              <Text style={[C.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
const C = StyleSheet.create({
  card: { backgroundColor: '#0d0d0d', borderRadius: radius.lg, borderWidth: 1, borderColor: '#1a1a1a', borderLeftWidth: 3, marginBottom: spacing.sm, padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDate: { color: colors.textMuted, fontSize: 11 },
  badge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  adminBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111', borderRadius: radius.sm, borderWidth: 1, borderColor: '#222', paddingVertical: 6, paddingHorizontal: 8, justifyContent: 'center' },
  adminBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111', borderRadius: radius.sm, borderWidth: 1, borderColor: '#222', paddingVertical: 6, paddingHorizontal: 8 },
  actionBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
});

/* ═══════════════════════ SCREEN ═══════════════════════ */
export default function SafetyScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager';

  const [entries, setEntries] = useState<SafetyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'completed'|'rejected'>('all');

  // Expiry per-card state
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [savingExpiry, setSavingExpiry] = useState<Record<string, boolean>>({});
  const [updatingExpiryStatus, setUpdatingExpiryStatus] = useState<Record<string, boolean>>({});

  // Creation flow
  const [showForm, setShowForm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<SafetyFormData | null>(null);
  const [showProcessFlow, setShowProcessFlow] = useState(false);
  const [processNodes, setProcessNodes] = useState<ProcessNode[]>([
    { id: '1', type: 'start', name: 'Submit', executor: user?.name || '', executorId: user?.id || '', editAccess: true, settings: {} },
    { id: '2', type: 'end', name: 'Approval', executor: '', executorId: '', editAccess: false, settings: {} },
  ]);
  const [entryName, setEntryName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<SafetyEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [workflowComment, setWorkflowComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showFormView, setShowFormView] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<SafetyEntry | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Rename
  const [showRename, setShowRename] = useState(false);
  const [renameEntry, setRenameEntry] = useState<SafetyEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Expiry
  const [showExpiry, setShowExpiry] = useState(false);
  const [expiryEntry, setExpiryEntry] = useState<SafetyEntry | null>(null);
  const [expiryValue, setExpiryValue] = useState('');

  // Status
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusEntry, setStatusEntry] = useState<SafetyEntry | null>(null);

  const openDetail = async (entry: SafetyEntry) => {
    setSelectedEntry(entry);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await getSafetyEntryById(entry.id);
      setSelectedEntry(data);
    } catch {}
    setLoadingDetail(false);
  };

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getSafetyEntries(user.id, projectId);
      setEntries(data || []);
    } catch { Alert.alert('Error', 'Failed to load safety inspections'); }
    finally { setLoading(false); }
  }, [user, projectId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const loadMembers = async () => {
    setMembersLoading(true);
    try { setProjectMembers((await getProjectMembers(projectId)) || []); } catch { /* silent */ }
    finally { setMembersLoading(false); }
  };

  const handleFormSaved = (data: SafetyFormData) => {
    setPendingFormData(data);
    setEntryName(`Safety Inspection ${dayjs().format('DD/MM/YYYY')}`);
    setShowForm(false);
    setShowProcessFlow(true);
    loadMembers();
  };

  const addNewNode = () => {
    const mid = processNodes.slice(0, -1);
    const last = processNodes[processNodes.length - 1];
    setProcessNodes([...mid, { id: `node-${Date.now()}`, type: 'node', name: 'New Step', executor: '', executorId: '', editAccess: false, settings: {} }, last]);
  };

  const openPeopleSelector = (node: ProcessNode) => {
    setSelectedNode(node);
    setShowPeopleSelector(true);
  };

  const handleAssignPerson = (member: any) => {
    if (!selectedNode) return;
    const p = member?.user || member;
    setProcessNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, executor: p.name || p.email, executorId: p.id } : n));
    setShowPeopleSelector(false);
  };

  const handleFinalSave = async () => {
    if (!pendingFormData || !user) return;
    try {
      await createSafetyEntry({
        date: pendingFormData.date || dayjs().format('YYYY-MM-DD'),
        project_id: projectId,
        inspector: pendingFormData.inspector,
        inspector_id: user.id,
        location: pendingFormData.location,
        inspection_type: pendingFormData.inspectionType,
        findings: pendingFormData.findings,
        corrective_actions: pendingFormData.correctiveActions,
        risk_level: pendingFormData.riskLevel,
        safety_score: pendingFormData.score,
        checklist_items: pendingFormData.checklist.map(r => ({
          id: r.key, category: r.key.split('::')[0],
          description: r.key.split('::')[1] || r.key, status: r.status, remarks: r.remarks,
        })),
        processNodes,
        createdBy: user.id,
        name: entryName,
        ...(expiresAt ? { expiresAt } : {}),
      } as any);
      setShowProcessFlow(false);
      setPendingFormData(null);
      setExpiresAt('');
      setProcessNodes([
        { id: '1', type: 'start', name: 'Submit', executor: user?.name || '', executorId: user?.id || '', editAccess: true, settings: {} },
        { id: '2', type: 'end', name: 'Approval', executor: '', executorId: '', editAccess: false, settings: {} },
      ]);
      loadEntries();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed to create entry'); }
  };

  const handleWorkflowAction = async (action: 'approve' | 'reject' | 'back') => {
    if (!selectedEntry || !user) return;
    setActionLoading(true);
    try {
      await updateSafetyWorkflowAction(selectedEntry.id, { action, comment: workflowComment, userId: user.id });
      setWorkflowComment('');
      setShowDetail(false);
      loadEntries();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const openHistory = async (entry: SafetyEntry) => {
    setHistoryEntry(entry);
    setShowHistory(true);
    setHistoryLoading(true);
    try { setHistoryList((await getSafetyHistory(entry.id)) || []); }
    catch { Alert.alert('Error', 'Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const restoreHistory = (historyId: string) => {
    Alert.alert('Restore Version', 'Restore this version?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: async () => {
        try { await restoreSafetyFromHistory(historyEntry!.id, historyId); setShowHistory(false); loadEntries(); }
        catch { Alert.alert('Error', 'Failed to restore'); }
      }},
    ]);
  };

  const openRename = (entry: SafetyEntry) => {
    setRenameEntry(entry); setRenameValue((entry as any).name || ''); setShowRename(true);
  };
  const saveRename = async () => {
    if (!renameEntry) return;
    try { await client.patch(`/safety/${renameEntry.id}/name`, { name: renameValue }); setShowRename(false); loadEntries(); }
    catch { Alert.alert('Error', 'Failed to rename'); }
  };

  const openExpiry = (entry: SafetyEntry) => {
    setExpiryEntry(entry); setExpiryValue(entry.expires_at || ''); setShowExpiry(true);
  };
  const saveExpiry = async () => {
    if (!expiryEntry) return;
    try { await client.patch(`/safety/${expiryEntry.id}/expiry`, { expiresAt: expiryValue }); setShowExpiry(false); loadEntries(); }
    catch { Alert.alert('Error', 'Failed to update expiry'); }
  };

  const saveStatus = async (status: 'active' | 'expired') => {
    if (!statusEntry) return;
    try { await client.patch(`/safety/${statusEntry.id}/expiry-status`, { status }); setShowStatusModal(false); loadEntries(); }
    catch { Alert.alert('Error', 'Failed to update status'); }
  };

  const handleDelete = (entry: SafetyEntry) => {
    Alert.alert('Delete Inspection', 'This will permanently delete this record.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteSafetyEntry(entry.id); loadEntries(); } catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const handleCardSetExpiry = async (entry: SafetyEntry, draft: string) => {
    if (!user?.id || !isAdmin || !draft) return;
    try {
      setSavingExpiry(prev => ({ ...prev, [entry.id]: true }));
      await client.patch(`/safety/${entry.id}/expiry`, { expiresAt: new Date(draft).toISOString() });
      loadEntries();
    } catch { Alert.alert('Error', 'Failed to set expiry'); }
    setSavingExpiry(prev => ({ ...prev, [entry.id]: false }));
  };

  const handleCardSetExpiryStatus = async (entry: SafetyEntry, status: 'active' | 'expired') => {
    if (!user?.id || !isAdmin) return;
    try {
      setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: true }));
      await client.patch(`/safety/${entry.id}/expiry-status`, { status });
      loadEntries();
    } catch { Alert.alert('Error', 'Failed to update status'); }
    setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: false }));
  };

  const canApprove = () => {
    if (!selectedEntry || !user) return false;
    const nodes = selectedEntry.safety_workflow_nodes || [];
    const node = nodes[selectedEntry.current_node_index ?? 0];
    return node && (node.executor_id === user.id || isAdmin);
  };

  const filtered = entries.filter(e => {
    if (filterStatus === 'pending' && e.status !== 'pending') return false;
    if (filterStatus === 'completed' && e.status !== 'approved' && e.status !== 'completed') return false;
    if (filterStatus === 'rejected' && e.status !== 'rejected') return false;
    if (search && !((e as any).name || e.form_number || e.inspector || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SafeAreaView edges={['top']} style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={S.headerTitle}>Safety Inspections</Text>
            <Text style={S.headerSub}>{projectName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity style={{ backgroundColor: '#2a2a2a', borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} onPress={() => {}}><Icon name="file-chart-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: ACCENT, borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowForm(true)}>
            <Icon name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={S.pageHeader}>
        <Text style={S.pageDesc}>
          Track safety inspections and compliance with detailed reporting and status monitoring.
        </Text>

        <View style={S.searchRow}>
          <View style={S.searchInputWrap}>
            <Icon name="magnify" size={18} color="#666" />
            <TextInput style={S.searchInput} placeholder="Search entries…" placeholderTextColor="#555" value={search} onChangeText={setSearch} />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close-circle" size={16} color="#555" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={S.sortBtn}
            onPress={() => {}}
          >
            <Icon
              name="sort-calendar-descending"
              size={20}
              color={ACCENT}
            />
          </TouchableOpacity>
        </View>

      <View style={S.tabsRow}>
        {([
          { key: 'all',       icon: 'view-list-outline',   count: entries.length, label: 'All'  },
          { key: 'pending',   icon: 'clock-outline',        count: entries.filter(e => e.status === 'pending').length, label: 'Pending' },
          { key: 'completed', icon: 'check-circle-outline', count: entries.filter(e => e.status === 'approved' || e.status === 'completed').length, label: 'Done' },
          { key: 'rejected',  icon: 'close-circle-outline', count: entries.filter(e => e.status === 'rejected').length, label: 'Rejected' },
        ] as const).map(({ key, icon, count, label }) => {
          const active = filterStatus === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilterStatus(key)}
              style={[S.tab, active && S.tabActive]}
            >
              <Icon name={icon} size={15} color={active ? ACCENT : '#666'} />
              <Text style={[S.tabText, active && S.tabTextActive]}>{count}</Text>
              <Text style={[S.tabLabel, active && S.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Text style={S.shownText}>{filtered.length} shown</Text>
      </View>


      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={S.listContent}
          renderItem={({ item }) => {
            const score = item.safety_score != null ? `${item.safety_score}%` : 'N/A';
            const scoreColor = item.safety_score != null
              ? (Number(item.safety_score) >= 80 ? '#22c55e' : Number(item.safety_score) >= 60 ? ACCENT : '#ef4444')
              : undefined;
            return (
              <FormEntryCard
                date={dayjs(item.created_at).format('YYYY-MM-DD')}
                title={(item as any).name || item.form_number || `Safety-${item.id.slice(-4)}`}
                status={item.status}
                accentColor={ACCENT}
                expiresAt={item.expires_at}
                metaItems={[
                  { icon: 'account-outline', text: item.inspector || '—' },
                  { icon: 'file-document-outline', text: `Form No: ${item.form_number || item.id.slice(0, 8)}` },
                ]}
                isAdmin={isAdmin}
                expiryDraft={expiryDrafts[item.id] || ''}
                onExpiryDraftChange={(val) => setExpiryDrafts(prev => ({ ...prev, [item.id]: val }))}
                onSetExpiry={() => handleCardSetExpiry(item, expiryDrafts[item.id] || '')}
                savingExpiry={!!savingExpiry[item.id]}
                onSetExpired={() => handleCardSetExpiryStatus(item, 'expired')}
                updatingExpiry={!!updatingExpiryStatus[item.id]}
                onSetActive={() => handleCardSetExpiryStatus(item, 'active')}
                onViewDetails={() => openDetail(item)}
                onHistory={() => openHistory(item)}
                showEdit={isAdmin || item.status === 'rejected'}
                onEdit={() => { setSelectedEntry(item); setShowFormView(true); }}
                onRename={() => openRename(item)}
                onDelete={() => handleDelete(item)}>
                <CardMetrics
                  items={[
                    { label: 'Score', value: score, color: scoreColor },
                    { label: 'Type', value: item.inspection_type || '—' },
                    { label: 'Risk', value: (item.risk_level || '—').toUpperCase(), color: RISK_COLORS[item.risk_level] },
                  ]}
                />
              </FormEntryCard>
            );
          }}
          ListEmptyComponent={
            <View style={S.empty}>
              <Icon name="shield-search" size={48} color="#333" />
              <Text style={S.emptyText}>No safety inspections yet</Text>
              <Text style={S.emptySub}>Tap "New Inspection" to create one</Text>
            </View>
          }
        />
      )}

      {/* Safety Form */}
      <SafetyInspectionFormRN visible={showForm} onClose={() => setShowForm(false)} onSave={handleFormSaved} />

      {/* Process Flow Modal */}
      <Modal visible={showProcessFlow} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>Configure Workflow</Text>
              <TouchableOpacity onPress={() => setShowProcessFlow(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: spacing.md }}>
              <TRow label="Entry Name *">
                <TextInput style={M.input} value={entryName} onChangeText={setEntryName} placeholder="Name this inspection" placeholderTextColor={colors.textMuted} />
              </TRow>
              <TRow label="Expires At (YYYY-MM-DDTHH:MM)">
                <TextInput style={M.input} value={expiresAt} onChangeText={setExpiresAt} placeholder="e.g. 2025-12-31T17:00" placeholderTextColor={colors.textMuted} />
              </TRow>
              <Text style={M.sectionLabel}>PROCESS FLOW</Text>
              <ProcessFlowBuilder nodes={processNodes} selectedNodeId={selectedNode?.id || null} onSelectNode={openPeopleSelector} onAdd={addNewNode} />
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={M.mFooter}>
              <TouchableOpacity style={M.cancelBtn} onPress={() => setShowProcessFlow(false)}>
                <Text style={M.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { backgroundColor: ACCENT }]} onPress={handleFinalSave}>
                <Icon name="check" size={16} color="#fff" />
                <Text style={M.saveBtnText}>Create Inspection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* People Selector */}
      <PeopleSelectorModal isOpen={showPeopleSelector} onClose={() => setShowPeopleSelector(false)} users={projectMembers} onSelect={handleAssignPerson} loading={membersLoading} title="Assign to Node" />

      {/* Detail Modal */}
      <ModuleDetailModal
        visible={showDetail && !!selectedEntry}
        onClose={() => setShowDetail(false)}
        title={(selectedEntry as any)?.name || selectedEntry?.form_number || 'Inspection Details'}
        accentColor={ACCENT}
        loading={loadingDetail}
        status={selectedEntry?.status}
        metrics={selectedEntry ? [
          { label: 'Score', value: selectedEntry.safety_score != null ? `${selectedEntry.safety_score}%` : 'N/A', color: selectedEntry.safety_score != null ? (Number(selectedEntry.safety_score) >= 80 ? '#22c55e' : ACCENT) : undefined },
          { label: 'Risk', value: (selectedEntry.risk_level || '—').toUpperCase(), color: RISK_COLORS[selectedEntry.risk_level] },
          { label: 'Type', value: selectedEntry.inspection_type || '—' },
        ] : []}
        fields={selectedEntry ? [
          { label: 'Inspector', value: selectedEntry.inspector },
          { label: 'Location', value: selectedEntry.location },
          { label: 'Date', value: dayjs(selectedEntry.date || selectedEntry.created_at).format('DD MMM YYYY') },
          { label: 'Findings', value: selectedEntry.findings },
          { label: 'Corrective Actions', value: selectedEntry.corrective_actions },
          { label: 'Expires At', value: selectedEntry.expires_at ? dayjs(selectedEntry.expires_at).format('DD MMM YYYY HH:mm') : undefined },
        ] : []}
        workflowNodes={(selectedEntry?.safety_workflow_nodes || []) as any}
        currentNodeIndex={selectedEntry?.current_node_index || 0}
        comments={(selectedEntry?.safety_comments || []) as any}
        canApprove={canApprove()}
        actionLoading={actionLoading}
        workflowComment={workflowComment}
        onWorkflowCommentChange={setWorkflowComment}
        onApprove={() => handleWorkflowAction('approve')}
        onSendBack={() => handleWorkflowAction('back')}
        onReject={() => handleWorkflowAction('reject')}
        canEditForm={isAdmin || (selectedEntry?.status === 'rejected')}
        onEditForm={() => { setShowDetail(false); setShowFormView(true); }}
        onDelete={() => { setShowDetail(false); selectedEntry && handleDelete(selectedEntry); }}
        onHistory={() => { setShowDetail(false); selectedEntry && openHistory(selectedEntry); }}
      />

      {/* Edit / View Form Modal */}
      <SafetyInspectionFormRN
        key={selectedEntry?.id || ''}
        visible={showFormView}
        onClose={() => setShowFormView(false)}
        initialData={selectedEntry?.form_data}
        onSave={async (data: SafetyFormData) => {
          if (!selectedEntry || !user) return;
          try {
            await updateSafetyEntry(selectedEntry.id, { ...data, userId: user.id } as any);
            setShowFormView(false);
            loadEntries();
            Alert.alert('Success', 'Inspection updated successfully.');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to update');
          }
        }}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={historyList}
        onRestore={(h) => restoreHistory(h.id)}
      />

      {/* Rename Modal */}
      <Modal visible={showRename} animationType="fade" transparent>
        <View style={M.centeredOverlay}>
          <View style={M.dialog}>
            <Text style={M.mTitle}>Rename Inspection</Text>
            <TextInput style={[M.input, { marginTop: spacing.sm }]} value={renameValue} onChangeText={setRenameValue} placeholder="New name..." placeholderTextColor={colors.textMuted} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[M.cancelBtn, { flex: 1 }]} onPress={() => setShowRename(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: ACCENT }]} onPress={saveRename}><Text style={M.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expiry Modal */}
      <Modal visible={showExpiry} animationType="fade" transparent>
        <View style={M.centeredOverlay}>
          <View style={M.dialog}>
            <Text style={M.mTitle}>Set Expiry Date</Text>
            <TextInput style={[M.input, { marginTop: spacing.sm }]} value={expiryValue} onChangeText={setExpiryValue} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor={colors.textMuted} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[M.cancelBtn, { flex: 1 }]} onPress={() => setShowExpiry(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: ACCENT }]} onPress={saveExpiry}><Text style={M.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="fade" transparent>
        <View style={M.centeredOverlay}>
          <View style={M.dialog}>
            <Text style={M.mTitle}>Set Status</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: '#22c55e' }]} onPress={() => saveStatus('active')}><Text style={M.saveBtnText}>Active</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: '#6b7280' }]} onPress={() => saveStatus('expired')}><Text style={M.saveBtnText}>Expired</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[M.cancelBtn, { marginTop: spacing.xs }]} onPress={() => setShowStatusModal(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 }}>{label}</Text>
      {children}
    </View>
  );
}
function DField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: colors.text, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  headerSub: { color: colors.textMuted, fontSize: 12 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  listContent: { padding: 20, paddingBottom: 80 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 10, height: 42 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8 },
  sortBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  pageHeader: { marginBottom: 20, paddingHorizontal: 20 },
  pageDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 19 },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', gap: 2 },
  tabActive: { backgroundColor: '#2a1a0d', borderColor: ACCENT },
  tabText: { color: '#666', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: ACCENT },
  tabLabel: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 0.2 },
  tabLabelActive: { color: ACCENT },
  shownText: { color: '#555', fontSize: 12, marginBottom: 14 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { color: '#333', fontSize: 12, marginTop: 6 },
});

const M = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  dialog: { backgroundColor: '#111', borderRadius: radius.lg, borderWidth: 1, borderColor: '#222', padding: spacing.lg, width: '100%' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  mTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  mFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  input: { backgroundColor: '#0d0d0d', color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: '#222', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  sectionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.sm },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: '#222' },
  cancelBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const D = StyleSheet.create({
  statusBar: { borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, marginBottom: spacing.md, alignItems: 'center' },
  statusText: { fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  sectionTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm },
  nodeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#1a1a1a', padding: spacing.sm, marginBottom: spacing.xs, gap: spacing.sm },
  nodeDot: { width: 10, height: 10, borderRadius: 5 },
  nodeLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  nodeSub: { color: colors.textMuted, fontSize: 11 },
  commentRow: { backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#1a1a1a', padding: spacing.sm, marginBottom: spacing.xs },
  commentUser: { color: colors.text, fontSize: 12, fontWeight: '700' },
  commentText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  commentTime: { color: '#444', fontSize: 10, marginTop: 4 },
  wBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm },
  wBtnText: { fontSize: 12, fontWeight: '800' },
});

const H = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#1a1a1a', padding: spacing.sm, marginBottom: spacing.xs },
  time: { color: colors.text, fontSize: 13, fontWeight: '700' },
  sub: { color: '#444', fontSize: 10 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b22', borderRadius: radius.sm, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6 },
  restoreTxt: { fontSize: 11, fontWeight: '700' },
});