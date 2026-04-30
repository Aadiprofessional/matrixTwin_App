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
import InspectionCheckFormRN, { InspectionFormData } from '../../components/forms/InspectionCheckFormRN';
import SurveyCheckFormRN, { SurveyFormData } from '../../components/forms/SurveyCheckFormRN';
import ProcessFlowBuilder, { ProcessNode } from '../../components/forms/ProcessFlowBuilder';
import PeopleSelectorModal from '../../components/ui/PeopleSelectorModal';
import { getProjectMembers } from '../../api/team';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import client from '../../api/client';

dayjs.extend(relativeTime);

type RouteProps = RouteProp<AppStackParamList, 'Rfi'>;
type FormType = 'inspection' | 'survey';
type FilterType = 'all' | 'inspection' | 'survey';

const INSPECTION_COLOR = '#4f46e5';
const SURVEY_COLOR = '#7c3aed';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444',
  completed: '#22c55e', active: '#3b82f6', expired: '#6b7280', 'in-review': '#8b5cf6',
};

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

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#1a1a1a', padding: 8, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: color || colors.text, marginBottom: 2 }} numberOfLines={1}>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: '#555', letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function RfiCard({ entry, isAdmin, onViewDetails, onHistory, onDelete, onRename, onSetExpiry, onSetStatus }: {
  entry: any; isAdmin: boolean;
  onViewDetails: () => void; onHistory: () => void;
  onDelete: () => void; onRename: () => void;
  onSetExpiry: () => void; onSetStatus: () => void;
}) {
  const isInspection = entry.form_type === 'inspection';
  const accentColor = isInspection ? INSPECTION_COLOR : SURVEY_COLOR;
  const statusColor = STATUS_COLORS[entry.status] || '#64748b';
  return (
    <View style={[C.card, { borderLeftColor: accentColor }]}>
      <View style={C.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={C.cardDate}>{dayjs(entry.created_at).format('DD MMM YYYY')}</Text>
          <View style={[C.typeBadge, { backgroundColor: accentColor + '22', borderColor: accentColor }]}>
            <Text style={[C.typeBadgeText, { color: accentColor }]}>{isInspection ? 'INSP' : 'SURV'}</Text>
          </View>
        </View>
        <View style={[C.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[C.badgeText, { color: statusColor }]}>{(entry.status || 'pending').toUpperCase()}</Text>
        </View>
      </View>
      <Text style={C.cardTitle} numberOfLines={1}>{entry.name || entry.risc_no || ('RISC-' + (entry.id || '').slice(-6))}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="account" size={12} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
            {entry.supervisor || entry.issued_by || '—'}
          </Text>
        </View>
        <ExpiryPill expiresAt={entry.expires_at} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
        <MetricBox label="RISC No" value={entry.risc_no || '—'} color={accentColor} />
        <MetricBox label="Category" value={entry.works_category || '—'} />
        <MetricBox label="Location" value={entry.location || '—'} />
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
          <Icon name="eye-outline" size={12} color={accentColor} />
          <Text style={[C.actionBtnText, { color: accentColor }]}>View Details</Text>
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
  typeBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  badge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  adminBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111', borderRadius: radius.sm, borderWidth: 1, borderColor: '#222', paddingVertical: 6, paddingHorizontal: 8, justifyContent: 'center' },
  adminBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111', borderRadius: radius.sm, borderWidth: 1, borderColor: '#222', paddingVertical: 6, paddingHorizontal: 8 },
  actionBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
});

export default function RfiScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager';

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const [showFormSelector, setShowFormSelector] = useState(false);
  const [pendingType, setPendingType] = useState<FormType>('inspection');
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<InspectionFormData | SurveyFormData | null>(null);

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

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [workflowComment, setWorkflowComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<any | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showRename, setShowRename] = useState(false);
  const [renameEntry, setRenameEntry] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [showExpiry, setShowExpiry] = useState(false);
  const [expiryEntry, setExpiryEntry] = useState<any | null>(null);
  const [expiryValue, setExpiryValue] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusEntry, setStatusEntry] = useState<any | null>(null);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [inspRes, survRes] = await Promise.allSettled([
        client.get(`/inspection/list/${user.id}?projectId=${projectId}`),
        client.get(`/survey/list/${user.id}?projectId=${projectId}`),
      ]);
      const inspections = (inspRes.status === 'fulfilled' ? (inspRes.value.data || []) : []).map((e: any) => ({ ...e, form_type: 'inspection' }));
      const surveys = (survRes.status === 'fulfilled' ? (survRes.value.data || []) : []).map((e: any) => ({ ...e, form_type: 'survey' }));
      const merged = [...inspections, ...surveys].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEntries(merged);
    } catch { Alert.alert('Error', 'Failed to load entries'); }
    finally { setLoading(false); }
  }, [user, projectId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const loadMembers = async () => {
    setMembersLoading(true);
    try { setProjectMembers((await getProjectMembers(projectId)) || []); } catch { }
    finally { setMembersLoading(false); }
  };

  const handleFormSaved = (data: InspectionFormData | SurveyFormData) => {
    setPendingFormData(data);
    setEntryName((pendingType === 'inspection' ? 'Inspection' : 'Survey') + ' ' + dayjs().format('DD/MM/YYYY'));
    setShowInspectionForm(false);
    setShowSurveyForm(false);
    setShowProcessFlow(true);
    loadMembers();
  };

  const addNewNode = () => {
    const last = processNodes[processNodes.length - 1];
    setProcessNodes([...processNodes.slice(0, -1), { id: 'node-' + Date.now(), type: 'node', name: 'New Step', executor: '', executorId: '', editAccess: false, settings: {} }, last]);
  };

  const openPeopleSelector = (node: ProcessNode) => { setSelectedNode(node); setShowPeopleSelector(true); };

  const handleAssignPerson = (member: any) => {
    if (!selectedNode) return;
    const p = member?.user || member;
    setProcessNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, executor: p.name || p.email, executorId: p.id } : n));
    setShowPeopleSelector(false);
  };

  const handleFinalSave = async () => {
    if (!pendingFormData || !user) return;
    try {
      await client.post(pendingType === 'inspection' ? '/inspection/create' : '/survey/create', {
        formData: pendingFormData, processNodes, createdBy: user.id, projectId, name: entryName, ...(expiresAt ? { expiresAt } : {}),
      });
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
      await client.put(`/${selectedEntry.form_type}/${selectedEntry.id}/update`, { action, comment: workflowComment, userId: user.id });
      setWorkflowComment('');
      setShowDetail(false);
      loadEntries();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const openHistory = async (entry: any) => {
    setHistoryEntry(entry);
    setShowHistory(true);
    setHistoryLoading(true);
    try { const res = await client.get(`/${entry.form_type}/${entry.id}/history`); setHistoryList(res.data || []); }
    catch { Alert.alert('Error', 'Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const restoreHistory = (historyId: string) => {
    Alert.alert('Restore Version', 'Restore this version?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: async () => {
        try { await client.post(`/${historyEntry?.form_type}/${historyEntry?.id}/restore`, { historyId }); setShowHistory(false); loadEntries(); }
        catch { Alert.alert('Error', 'Failed to restore'); }
      }},
    ]);
  };

  const openRename = (entry: any) => { setRenameEntry(entry); setRenameValue(entry.name || ''); setShowRename(true); };
  const saveRename = async () => {
    if (!renameEntry) return;
    try { await client.patch(`/${renameEntry.form_type}/${renameEntry.id}/name`, { name: renameValue }); setShowRename(false); loadEntries(); }
    catch { Alert.alert('Error', 'Failed to rename'); }
  };

  const openExpiry = (entry: any) => { setExpiryEntry(entry); setExpiryValue(entry.expires_at || ''); setShowExpiry(true); };
  const saveExpiry = async () => {
    if (!expiryEntry) return;
    try { await client.patch(`/${expiryEntry.form_type}/${expiryEntry.id}/expiry`, { expiresAt: expiryValue }); setShowExpiry(false); loadEntries(); }
    catch { Alert.alert('Error', 'Failed to update expiry'); }
  };

  const saveStatus = async (status: 'active' | 'expired') => {
    if (!statusEntry) return;
    try { await client.patch(`/${statusEntry.form_type}/${statusEntry.id}/expiry-status`, { status }); setShowStatusModal(false); loadEntries(); }
    catch { Alert.alert('Error', 'Failed to update status'); }
  };

  const handleDelete = (entry: any) => {
    Alert.alert('Delete Entry', 'This will permanently delete this record.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await client.delete(`/${entry.form_type}/${entry.id}`); loadEntries(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const canApprove = () => {
    if (!selectedEntry || !user) return false;
    const nodes = selectedEntry.workflow_nodes || selectedEntry.inspection_workflow_nodes || selectedEntry.survey_workflow_nodes || [];
    const node = nodes[selectedEntry.current_node_index ?? 0];
    return node && (node.executor_id === user.id || isAdmin);
  };

  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.form_type !== filter) return false;
    if (!search) return true;
    return (e.name || e.risc_no || e.supervisor || '').toLowerCase().includes(search.toLowerCase());
  });

  const accentFor = (e: any) => e?.form_type === 'inspection' ? INSPECTION_COLOR : SURVEY_COLOR;

  return (
    <SafeAreaView edges={['top']} style={S.container}>
      <View style={S.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={S.headerTitle}>RFI / RISC</Text>
            <Text style={S.headerSub}>{projectName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity style={{ backgroundColor: '#2a2a2a', borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} onPress={() => {}}><Icon name="file-chart-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: INSPECTION_COLOR, borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowFormSelector(true)}>
            <Icon name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={S.pageHeader}>
        <Text style={S.pageDesc}>
          Manage Requests for Information (RFI) and Site Inspection Reports with comprehensive tracking.
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
              color={INSPECTION_COLOR}
            />
          </TouchableOpacity>
        </View>

      <View style={S.tabsRow}>
        {([
          { key: 'all',         icon: 'view-list-outline',   count: entries.length, label: 'All' },
          { key: 'inspection',  icon: 'clipboard-check-outline', count: entries.filter(e => e.form_type === 'inspection').length, label: 'Insp' },
          { key: 'survey',      icon: 'ruler-square-compass', count: entries.filter(e => e.form_type === 'survey').length, label: 'Surv' },
          { key: 'approved',    icon: 'check-circle-outline', count: entries.filter(e => e.status === 'approved' || e.status === 'completed').length, label: 'Done' },
          { key: 'rejected',    icon: 'close-circle-outline', count: entries.filter(e => e.status === 'rejected').length, label: 'Rej' },
        ] as const).map(({ key, icon, count }) => {
          const active = filter === key;
          const accent = key === 'inspection' ? INSPECTION_COLOR : key === 'survey' ? SURVEY_COLOR : key === 'approved' ? '#22c55e' : key === 'rejected' ? '#ef4444' : '#555';
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key as FilterType)}
              style={[S.tab, active && S.tabActive]}
            >
              <Icon name={icon} size={15} color={active ? accent : '#666'} />
              <Text style={[S.tabText, active && S.tabTextActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Text style={S.shownText}>{filtered.length} shown</Text>
      </View>


      {loading ? (
        <ActivityIndicator color={INSPECTION_COLOR} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.form_type + '-' + i.id}
          contentContainerStyle={S.listContent}
          renderItem={({ item }) => (
            <RfiCard
              entry={item}
              isAdmin={isAdmin}
              onViewDetails={() => { setSelectedEntry(item); setShowDetail(true); }}
              onHistory={() => openHistory(item)}
              onDelete={() => handleDelete(item)}
              onRename={() => openRename(item)}
              onSetExpiry={() => openExpiry(item)}
              onSetStatus={() => { setStatusEntry(item); setShowStatusModal(true); }}
            />
          )}
          ListEmptyComponent={
            <View style={S.empty}>
              <Icon name="file-search-outline" size={48} color="#333" />
              <Text style={S.emptyText}>No entries yet</Text>
              <Text style={S.emptySub}>Tap "New Entry" to create one</Text>
            </View>
          }
        />
      )}

      {/* Form Selector */}
      <Modal visible={showFormSelector} animationType="fade" transparent>
        <View style={M.centeredOverlay}>
          <View style={M.dialog}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={M.mTitle}>Select Form Type</Text>
              <TouchableOpacity onPress={() => setShowFormSelector(false)}><Icon name="close" size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={[FS.tile, { borderColor: INSPECTION_COLOR }]} onPress={() => { setShowFormSelector(false); setPendingType('inspection'); setShowInspectionForm(true); }}>
              <View style={[FS.tileIcon, { backgroundColor: INSPECTION_COLOR + '22' }]}>
                <Icon name="clipboard-check-outline" size={24} color={INSPECTION_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[FS.tileTitle, { color: INSPECTION_COLOR }]}>Inspection Check</Text>
                <Text style={FS.tileSub}>RISC inspection check form for works inspection</Text>
              </View>
              <Icon name="chevron-right" size={18} color={INSPECTION_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity style={[FS.tile, { borderColor: SURVEY_COLOR, marginTop: spacing.sm }]} onPress={() => { setShowFormSelector(false); setPendingType('survey'); setShowSurveyForm(true); }}>
              <View style={[FS.tileIcon, { backgroundColor: SURVEY_COLOR + '22' }]}>
                <Icon name="ruler-square-compass" size={24} color={SURVEY_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[FS.tileTitle, { color: SURVEY_COLOR }]}>Survey Check</Text>
                <Text style={FS.tileSub}>RISC survey check form for measurement and setting out</Text>
              </View>
              <Icon name="chevron-right" size={18} color={SURVEY_COLOR} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InspectionCheckFormRN visible={showInspectionForm} onClose={() => setShowInspectionForm(false)} onSave={handleFormSaved} />
      <SurveyCheckFormRN visible={showSurveyForm} onClose={() => setShowSurveyForm(false)} onSave={handleFormSaved} />

      {/* Process Flow */}
      <Modal visible={showProcessFlow} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>Configure Workflow</Text>
              <TouchableOpacity onPress={() => setShowProcessFlow(false)}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: spacing.md }}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>Entry Name *</Text>
                <TextInput style={M.input} value={entryName} onChangeText={setEntryName} placeholder="Name this entry" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>Expires At (YYYY-MM-DDTHH:MM)</Text>
                <TextInput style={M.input} value={expiresAt} onChangeText={setExpiresAt} placeholder="e.g. 2025-12-31T17:00" placeholderTextColor={colors.textMuted} />
              </View>
              <Text style={M.sectionLabel}>PROCESS FLOW</Text>
              <ProcessFlowBuilder nodes={processNodes} selectedNodeId={selectedNode?.id || null} onSelectNode={openPeopleSelector} onAdd={addNewNode} />
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={M.mFooter}>
              <TouchableOpacity style={M.cancelBtn} onPress={() => setShowProcessFlow(false)}>
                <Text style={M.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { backgroundColor: pendingType === 'inspection' ? INSPECTION_COLOR : SURVEY_COLOR }]} onPress={handleFinalSave}>
                <Icon name="check" size={16} color="#fff" />
                <Text style={M.saveBtnText}>Create Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PeopleSelectorModal isOpen={showPeopleSelector} onClose={() => setShowPeopleSelector(false)} users={projectMembers} onSelect={handleAssignPerson} loading={membersLoading} title="Assign to Node" />

      {/* Detail Modal */}
      <Modal visible={showDetail && !!selectedEntry} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>{selectedEntry?.form_type === 'inspection' ? 'Inspection Details' : 'Survey Details'}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {selectedEntry && (
              <ScrollView style={{ flex: 1, padding: spacing.md }}>
                <View style={[D.statusBar, { backgroundColor: (STATUS_COLORS[selectedEntry.status] || '#64748b') + '22', borderColor: STATUS_COLORS[selectedEntry.status] || '#64748b' }]}>
                  <Text style={[D.statusText, { color: STATUS_COLORS[selectedEntry.status] || '#64748b' }]}>{(selectedEntry.status || 'pending').toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
                  <MetricBox label="RISC No" value={selectedEntry.risc_no || '—'} color={accentFor(selectedEntry)} />
                  <MetricBox label="Category" value={selectedEntry.works_category || '—'} />
                  <MetricBox label="Location" value={selectedEntry.location || '—'} />
                </View>
                <DField label="Supervisor" value={selectedEntry.supervisor} />
                <DField label="Contract No" value={selectedEntry.contract_no} />
                <DField label="Attention" value={selectedEntry.attention} />
                <DField label="Location" value={selectedEntry.location} />
                {selectedEntry.form_type === 'inspection' ? (
                  <>
                    <DField label="Works to be Inspected" value={selectedEntry.works_to_be_inspected} />
                    <DField label="Next Operation" value={selectedEntry.next_operation} />
                    <DField label="Inspected By" value={selectedEntry.inspected_by} />
                  </>
                ) : (
                  <>
                    <DField label="Survey Description" value={selectedEntry.survey} />
                    <DField label="Survey Field" value={selectedEntry.survey_field} />
                    <DField label="Surveyed By" value={selectedEntry.surveyed_by} />
                  </>
                )}
                <DField label="Issued By" value={selectedEntry.issued_by} />
                {selectedEntry.expires_at ? <DField label="Expires At" value={dayjs(selectedEntry.expires_at).format('DD MMM YYYY HH:mm')} /> : null}

                {((selectedEntry.workflow_nodes || selectedEntry.inspection_workflow_nodes || selectedEntry.survey_workflow_nodes) || []).length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={D.sectionTitle}>WORKFLOW</Text>
                    {((selectedEntry.workflow_nodes || selectedEntry.inspection_workflow_nodes || selectedEntry.survey_workflow_nodes) || [])
                      .sort((a: any, b: any) => a.node_order - b.node_order)
                      .map((node: any, idx: number) => (
                      <View key={node.id || idx} style={D.nodeRow}>
                        <View style={[D.nodeDot, { backgroundColor: idx < (selectedEntry.current_node_index || 0) ? '#22c55e' : idx === (selectedEntry.current_node_index || 0) ? accentFor(selectedEntry) : '#333' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={D.nodeLabel}>{node.name || node.node_name}</Text>
                          <Text style={D.nodeSub}>{node.executor || node.executor_name || 'Unassigned'}</Text>
                        </View>
                        <View style={{ borderRadius: 99, backgroundColor: (STATUS_COLORS[node.status] || '#64748b') + '22', paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: STATUS_COLORS[node.status] || '#64748b', fontSize: 9, fontWeight: '800' }}>{(node.status || 'pending').toUpperCase()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {((selectedEntry.comments || selectedEntry.inspection_comments || selectedEntry.survey_comments) || []).length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={D.sectionTitle}>COMMENTS</Text>
                    {((selectedEntry.comments || selectedEntry.inspection_comments || selectedEntry.survey_comments) || []).map((c: any, idx: number) => (
                      <View key={idx} style={D.commentRow}>
                        <Text style={D.commentUser}>{c.user_name || c.userName || 'User'}</Text>
                        <Text style={D.commentText}>{c.comment}</Text>
                        <Text style={D.commentTime}>{dayjs(c.created_at).fromNow()}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {canApprove() && (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text style={D.sectionTitle}>WORKFLOW ACTION</Text>
                    <TextInput style={[M.input, { marginBottom: spacing.sm }]} value={workflowComment} onChangeText={setWorkflowComment} placeholder="Comment (optional)" placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <TouchableOpacity style={[D.wBtn, { backgroundColor: '#22c55e22', borderColor: '#22c55e', flex: 1 }]} onPress={() => handleWorkflowAction('approve')} disabled={actionLoading}>
                        <Text style={[D.wBtnText, { color: '#22c55e' }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[D.wBtn, { backgroundColor: '#f9731622', borderColor: '#f97316', flex: 1 }]} onPress={() => handleWorkflowAction('back')} disabled={actionLoading}>
                        <Text style={[D.wBtnText, { color: '#f97316' }]}>Send Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[D.wBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444', flex: 1 }]} onPress={() => handleWorkflowAction('reject')} disabled={actionLoading}>
                        <Text style={[D.wBtnText, { color: '#ef4444' }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
            <View style={M.mFooter}>
              <TouchableOpacity style={[M.saveBtn, { backgroundColor: '#111', borderWidth: 1, borderColor: '#222' }]} onPress={() => setShowDetail(false)}>
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>Version History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {historyLoading ? <ActivityIndicator color={INSPECTION_COLOR} style={{ margin: 40 }} /> : (
              <FlatList data={historyList} keyExtractor={(_, i) => String(i)} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}
                renderItem={({ item }) => (
                  <View style={H.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={H.time}>{dayjs(item.created_at || item.savedAt).format('DD MMM YYYY HH:mm')}</Text>
                      <Text style={H.sub}>{item.status || ''}</Text>
                    </View>
                    <TouchableOpacity style={H.restoreBtn} onPress={() => restoreHistory(item.id)}>
                      <Icon name="restore" size={14} color={accentFor(historyEntry)} />
                      <Text style={[H.restoreTxt, { color: accentFor(historyEntry) }]}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No history available</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRename} animationType="fade" transparent>
        <View style={M.centeredOverlay}>
          <View style={M.dialog}>
            <Text style={M.mTitle}>Rename Entry</Text>
            <TextInput style={[M.input, { marginTop: spacing.sm }]} value={renameValue} onChangeText={setRenameValue} placeholder="New name..." placeholderTextColor={colors.textMuted} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[M.cancelBtn, { flex: 1 }]} onPress={() => setShowRename(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: accentFor(renameEntry) }]} onPress={saveRename}><Text style={M.saveBtnText}>Save</Text></TouchableOpacity>
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
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: accentFor(expiryEntry) }]} onPress={saveExpiry}><Text style={M.saveBtnText}>Save</Text></TouchableOpacity>
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
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  listContent: { padding: 20, paddingBottom: 80 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 10, height: 42 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8 },
  sortBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  pageHeader: { marginBottom: 20 },
  pageDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 19 },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', gap: 2 },
  tabActive: { backgroundColor: '#1a1a2a', borderColor: INSPECTION_COLOR },
  tabText: { color: '#666', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: INSPECTION_COLOR },
  shownText: { color: '#555', fontSize: 12, marginBottom: 14 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { color: '#333', fontSize: 12, marginTop: 6 },
});

const FS = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#111', borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  tileIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  tileSub: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
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
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#4f46e522', borderRadius: radius.sm, borderWidth: 1, borderColor: INSPECTION_COLOR, paddingHorizontal: 10, paddingVertical: 6 },
  restoreTxt: { fontSize: 11, fontWeight: '700' },
});
