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
  getCleansingEntries, getCleansingEntryById, createCleansingEntry,
  updateCleansingWorkflowAction, deleteCleansingEntry,
  getCleansingHistory, restoreCleansingFromHistory,
  CleansingEntry,
} from '../../api/cleansing';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getProjectMembers, ProjectMember, TeamMember } from '../../api/team';
import ProcessFlowBuilder from '../../components/forms/ProcessFlowBuilder';
import PeopleSelectorModal from '../../components/ui/PeopleSelectorModal';
import { FormEntryCard, CardMetrics } from '../../components/ui/FormEntryCard';
import ModuleDetailModal from '../../components/ui/ModuleDetailModal';
import HistoryModal from '../../components/ui/HistoryModal';
import DailyCleaningInspectionRN, { CleaningFormData } from '../../components/forms/DailyCleaningInspectionRN';

dayjs.extend(relativeTime);

type RouteProps = RouteProp<AppStackParamList, 'Cleansing'>;
const ACCENT = '#10b981';
const CLEANING_TYPES = ['Daily', 'Weekly', 'Deep Clean', 'Post-Construction', 'Emergency'];

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  completed: '#22c55e',
  rejected: '#ef4444',
  permanently_rejected: '#dc2626',
  in_progress: '#3b82f6',
};

interface WorkflowNode {
  id: string; node_order: number; node_name: string;
  executor_id?: string; executor_name?: string; status: string;
}

interface Comment {
  id: string; user_name: string; comment: string; action?: string; created_at: string;
}

interface FullEntry extends CleansingEntry {
  cleansing_workflow_nodes?: WorkflowNode[];
  cleansing_comments?: Comment[];
  current_node_index?: number;
  name?: string;
  form_data?: any;
}

function ExpiryPill({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null;
  const diff = dayjs(expiresAt).diff(dayjs(), 'day');
  const expired = diff < 0;
  const color = expired ? '#ef4444' : diff < 3 ? '#f59e0b' : '#22c55e';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '22', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: color }}>
      <Icon name={expired ? 'clock-alert-outline' : 'clock-outline'} size={10} color={color} />
      <Text style={{ color, fontSize: 9, fontWeight: '800' }}>{expired ? `${Math.abs(diff)}d ago` : `${diff}d`}</Text>
    </View>
  );
}

function MetricBox({ label, value, color = colors.textMuted }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#1a1a1a', padding: spacing.sm, alignItems: 'center', gap: 3 }}>
      <Text style={{ color, fontSize: 15, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#444', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function CleansingCard({ item, onViewDetails, onHistory, onDelete, onRename }: {
  item: FullEntry; onViewDetails: () => void; onHistory: () => void; onDelete: () => void; onRename: () => void;
}) {
  const sc = STATUS_COLORS[item.status] || '#555';
  return (
    <View style={[LC.card, { borderLeftColor: ACCENT }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 2 }}>
            {(item as any).name || item.area || item.form_number || item.id?.slice(0, 8)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <ExpiryPill expiresAt={item.expires_at} />
          <View style={{ backgroundColor: sc + '22', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: sc }}>
            <Text style={{ color: sc, fontSize: 9, fontWeight: '800' }}>{(item.status || 'PENDING').toUpperCase().replace('_', ' ')}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
        <MetricBox label="Type" value={item.cleaning_type || 'N/A'} color={ACCENT} />
        <MetricBox label="Area" value={item.area || 'N/A'} />
        <MetricBox label="By" value={item.performed_by ? item.performed_by.split(' ')[0] : 'N/A'} />
      </View>
      <View style={LC.actionRow}>
        <TouchableOpacity style={LC.actionBtn} onPress={onViewDetails}><Text style={[LC.actionTxt, { color: ACCENT }]}>View Details</Text></TouchableOpacity>
        <View style={LC.divider} />
        <TouchableOpacity style={LC.actionBtn} onPress={onHistory}><Text style={LC.actionTxt}>History</Text></TouchableOpacity>
        <View style={LC.divider} />
        <TouchableOpacity style={LC.actionBtn} onPress={onRename}><Text style={LC.actionTxt}>Rename</Text></TouchableOpacity>
        <View style={LC.divider} />
        <TouchableOpacity style={LC.actionBtn} onPress={onDelete}><Text style={[LC.actionTxt, { color: '#ef4444' }]}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const LC = StyleSheet.create({
  card: { backgroundColor: '#0d0d0d', borderRadius: radius.lg, borderWidth: 1, borderColor: '#1a1a1a', borderLeftWidth: 3, padding: spacing.md, marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: spacing.xs, marginTop: spacing.xs },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  actionTxt: { color: '#555', fontSize: 11, fontWeight: '700' },
  divider: { width: 1, height: 16, backgroundColor: '#1a1a1a' },
});

export default function CleansingScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [entries, setEntries] = useState<FullEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'completed'|'rejected'>('all');

  const [selectedEntry, setSelectedEntry] = useState<FullEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [workflowComment, setWorkflowComment] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<FullEntry | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showRename, setShowRename] = useState(false);
  const [renameEntry, setRenameEntry] = useState<FullEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showFormView, setShowFormView] = useState(false);
  // Expiry per-card state
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [savingExpiry, setSavingExpiry] = useState<Record<string, boolean>>({});
  const [updatingExpiryStatus, setUpdatingExpiryStatus] = useState<Record<string, boolean>>({});
  // Edit form draft state
  const [editArea, setEditArea] = useState('');
  const [editCleaningType, setEditCleaningType] = useState('Daily');
  const [editPerformedBy, setEditPerformedBy] = useState('');
  const [editMaterialsUsed, setEditMaterialsUsed] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [area, setArea] = useState('');
  const [cleaningType, setCleaningType] = useState('Daily');
  const [performedBy, setPerformedBy] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [entryName, setEntryName] = useState('');

  const [showProcessFlow, setShowProcessFlow] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any | null>(null);
  const [processNodes, setProcessNodes] = useState<any[]>([
    { id: '1', type: 'start', name: 'Start', settings: {} },
    { id: '2', type: 'end', name: 'Approval', executor: '', executorId: '', editAccess: false, settings: {} },
  ]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCleansingEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? (data as FullEntry[]) : []);
    } catch {}
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Deep-link: auto-open detail when navigated from a notification
  const deepLinkedRef = React.useRef(false);
  useEffect(() => {
    const initialFormId = (route.params as any)?.initialFormId;
    if (!initialFormId || deepLinkedRef.current || entries.length === 0) return;
    const entry = entries.find(e => e.id === initialFormId);
    if (entry) { deepLinkedRef.current = true; openDetail(entry); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const members = await getProjectMembers(projectId);
      setProjectMembers(Array.isArray(members) ? members.map((m: ProjectMember) => m.user).filter(Boolean) : []);
    } catch {}
    setMembersLoading(false);
  };

  useEffect(() => { loadMembers(); }, [projectId]);

  const openDetail = async (entry: FullEntry) => {
    setSelectedEntry(entry);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await getCleansingEntryById(entry.id);
      setSelectedEntry(data as FullEntry);
    } catch {}
    setLoadingDetail(false);
  };

  const handleFormSaved = (formData: CleaningFormData) => {
    const entryDate = formData.inspectionDate || dayjs().format('YYYY-MM-DD');
    setPendingFormData({
      date: entryDate,
      project_id: projectId,
      area: formData.location || formData.contractTitle || 'Cleaning Inspection',
      cleaning_type: 'Inspection',
      performed_by: formData.inspectorName || '',
      materials_used: '',
      notes: formData.contractNo || '',
      form_data: formData,
    });
    setEntryName(`Daily Cleaning - ${dayjs(entryDate).format('DD/MM/YYYY')}`);
    setShowCreate(false);
    setShowProcessFlow(true);
  };

  const addNewNode = () => {
    const last = processNodes[processNodes.length - 1];
    setProcessNodes([...processNodes.slice(0, -1), { id: 'node-' + Date.now(), type: 'node', name: 'New Step', executor: '', executorId: '', editAccess: false, settings: {} }, last]);
  };

  const handleAssignPerson = (member: any) => {
    if (!selectedNode) return;
    const p = member?.user || member;
    setProcessNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, executor: p.name || p.email, executorId: p.id } : n));
    setShowPeopleSelector(false);
  };

  const handleFinalSave = async () => {
    if (!user || !pendingFormData) return;
    setActionLoading(true);
    try {
      const rawFormData = (pendingFormData as any).form_data || pendingFormData;
      await client.post('/cleansing/create', {
        formData: rawFormData,
        processNodes,
        createdBy: user.id,
        projectId,
        formId: rawFormData?.formNumber || rawFormData?.form_number,
        name: entryName || `Cleansing-${Date.now()}`,
      });
      setShowProcessFlow(false);
      setPendingFormData(null);
      setArea(''); setCleaningType('Daily'); setPerformedBy(''); setMaterialsUsed(''); setFormNotes('');
      fetchEntries();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || e?.response?.data?.message || 'Failed to create'); }
    setActionLoading(false);
  };

  const handleWorkflowAction = async (action: 'approve'|'reject'|'back') => {
    if (!selectedEntry || !user?.id) return;
    setActionLoading(true);
    try {
      await updateCleansingWorkflowAction(selectedEntry.id, { action, comment: workflowComment, userId: user.id });
      setWorkflowComment('');
      setShowDetail(false);
      fetchEntries();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || `Failed to ${action}`); }
    setActionLoading(false);
  };

  const openHistory = async (entry: FullEntry) => {
    setHistoryEntry(entry);
    setShowHistory(true);
    setHistoryLoading(true);
    try { const data = await getCleansingHistory(entry.id); setHistoryList(Array.isArray(data) ? data : []); }
    catch { Alert.alert('Error', 'Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const restoreHistory = (historyId: string) => {
    Alert.alert('Restore Version', 'Restore this version?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: async () => {
        try { await restoreCleansingFromHistory(historyEntry!.id, historyId); setShowHistory(false); fetchEntries(); }
        catch { Alert.alert('Error', 'Failed to restore'); }
      }},
    ]);
  };

  const openRename = (entry: FullEntry) => { setRenameEntry(entry); setRenameValue((entry as any).name || entry.form_number || ''); setShowRename(true); };
  const saveRename = async () => {
    if (!renameEntry) return;
    try { await client.patch(`/cleansing/${renameEntry.id}/name`, { name: renameValue }); setShowRename(false); fetchEntries(); }
    catch { Alert.alert('Error', 'Failed to rename'); }
  };

  const handleDelete = (entry: FullEntry) => {
    Alert.alert('Delete Entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCleansingEntry(entry.id); setShowDetail(false); fetchEntries(); }
        catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Failed to delete'); }
      }},
    ]);
  };

  const handleCardSetExpiry = async (entry: FullEntry, draft: string) => {
    if (!user?.id || !isAdmin || !draft) return;
    try {
      setSavingExpiry(prev => ({ ...prev, [entry.id]: true }));
      await client.patch(`/cleansing/${entry.id}/expiry`, { expiresAt: new Date(draft).toISOString() });
      fetchEntries();
    } catch { Alert.alert('Error', 'Failed to set expiry'); }
    setSavingExpiry(prev => ({ ...prev, [entry.id]: false }));
  };

  const handleCardSetExpiryStatus = async (entry: FullEntry, status: 'active' | 'expired') => {
    if (!user?.id || !isAdmin) return;
    try {
      setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: true }));
      await client.patch(`/cleansing/${entry.id}/expiry-status`, { status });
      fetchEntries();
    } catch { Alert.alert('Error', 'Failed to update status'); }
    setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: false }));
  };

  const canApprove = (e: FullEntry) => {
    if (!user) return false;
    if (e.status === 'completed' || e.status === 'permanently_rejected') return false;
    if (isAdmin) return true;
    const node = e.cleansing_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    return node?.executor_id === user.id;
  };

  const filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    if (q && !e.area?.toLowerCase().includes(q) && !e.cleaning_type?.toLowerCase().includes(q) && !(e as any).name?.toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'rejected') return e.status === 'rejected' || e.status === 'permanently_rejected';
      return e.status === filterStatus;
    }
    return true;
  });

  const total = entries.length;
  const pending = entries.filter(e => e.status === 'pending').length;
  const completed = entries.filter(e => e.status === 'completed').length;

  return (
    <SafeAreaView edges={['top']} style={S.container}>
      <View style={S.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={S.headerTitle}>Cleansing</Text>
            <Text style={S.headerSub}>{projectName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity style={{ backgroundColor: '#2a2a2a', borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} onPress={() => {}}><Icon name="file-chart-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: ACCENT, borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowCreate(true)}>
            <Icon name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? <ActivityIndicator color={ACCENT} style={{ flex:1, marginTop:40 }} /> : (
        <FlatList data={filtered} keyExtractor={i => i.id}
          contentContainerStyle={S.listContent}
          ListHeaderComponent={() => (
            <View style={S.pageHeader}>
              <Text style={S.pageDesc}>
                Track and manage cleansing operations with real-time status updates and comprehensive oversight.
              </Text>

              <View style={S.searchRow}>
                <View style={S.searchInputWrap}>
                  <Icon name="magnify" size={18} color="#666" />
                  <TextInput style={S.searchInput} placeholder="Search entries…" placeholderTextColor="#555" value={searchQuery} onChangeText={setSearchQuery} />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
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
                  { key: 'all',       icon: 'view-list-outline',   count: total,     label: 'All'  },
                  { key: 'pending',   icon: 'clock-outline',        count: pending,   label: 'Pending' },
                  { key: 'completed', icon: 'check-circle-outline', count: completed, label: 'Done' },
                  { key: 'rejected',  icon: 'close-circle-outline', count: entries.filter(e => e.status === 'rejected' || e.status === 'permanently_rejected').length,  label: 'Rejected' },
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
          )}
          renderItem={({ item }) => (
            <View style={S.listItem}>
              <FormEntryCard
              date={dayjs(item.date).format('YYYY-MM-DD')}
              title={(item as any).name || item.area || item.form_number || `Cleansing-${item.id.slice(0, 8)}`}
              status={item.status}
              accentColor={ACCENT}
              expiresAt={item.expires_at}
              metaItems={[
                { icon: 'account-outline', text: item.performed_by || '—' },
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
              onEdit={() => {
                setSelectedEntry(item);
                setEditArea(item.area || '');
                setEditCleaningType(item.cleaning_type || 'Daily');
                setEditPerformedBy(item.performed_by || '');
                setEditMaterialsUsed(item.materials_used || '');
                setEditNotes(item.notes || '');
                setShowFormView(true);
              }}
              onRename={() => openRename(item)}
              onDelete={() => handleDelete(item)}
            >
              <CardMetrics
                items={[
                  { label: 'Type', value: item.cleaning_type || 'N/A', color: ACCENT },
                  { label: 'Area', value: item.area || 'N/A' },
                  { label: 'By', value: item.performed_by ? item.performed_by.split(' ')[0] : 'N/A' },
                ]}
              />
            </FormEntryCard>
            </View>
          )}
          ListEmptyComponent={
            <View style={S.empty}>
              <Icon name="broom" size={48} color="#333" />
              <Text style={S.emptyText}>No cleansing entries yet</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <ModuleDetailModal
        visible={showDetail && !!selectedEntry}
        onClose={() => setShowDetail(false)}
        title={`Cleansing - ${selectedEntry?.area || selectedEntry?.form_number || 'Details'}`}
        accentColor={ACCENT}
        loading={loadingDetail}
        status={selectedEntry?.status}
        completionText={selectedEntry ? (() => {
          const nodes = selectedEntry.cleansing_workflow_nodes || [];
          const currentNode = (nodes as any[]).find((n: any) => n.node_order === (selectedEntry.current_node_index || 0));
          if (currentNode && selectedEntry.status === 'pending') {
            const count = currentNode.completion_count || 0;
            const max = currentNode.max_completions || 2;
            return `Completions (${count}/${max})`;
          }
          return undefined;
        })() : undefined}
        metrics={selectedEntry ? [
          { label: 'Type', value: selectedEntry.cleaning_type || 'N/A', color: ACCENT },
          { label: 'Area', value: selectedEntry.area || 'N/A' },
          { label: 'By', value: selectedEntry.performed_by?.split(' ')[0] || 'N/A' },
        ] : []}
        fields={selectedEntry ? [
          { label: 'Date', value: dayjs(selectedEntry.date).format('DD MMM YYYY'), icon: 'calendar-outline', half: true },
          { label: 'Performed By', value: selectedEntry.performed_by, icon: 'account-outline', half: true },
          { label: 'Cleaning Type', value: selectedEntry.cleaning_type, icon: 'broom', half: true },
          { label: 'Area', value: selectedEntry.area, icon: 'floor-plan', half: true },
          { label: 'Materials Used', value: selectedEntry.materials_used, icon: 'package-variant-closed' },
          { label: 'Notes', value: selectedEntry.notes, icon: 'file-document-outline' },
        ] : []}
        workflowNodes={(selectedEntry?.cleansing_workflow_nodes || []) as any}
        currentNodeIndex={selectedEntry?.current_node_index || 0}
        comments={(selectedEntry?.cleansing_comments || []) as any}
        canApprove={selectedEntry ? canApprove(selectedEntry) : false}
        actionLoading={actionLoading}
        workflowComment={workflowComment}
        onWorkflowCommentChange={setWorkflowComment}
        onApprove={() => handleWorkflowAction('approve')}
        onSendBack={() => handleWorkflowAction('back')}
        onReject={() => handleWorkflowAction('reject')}
        approveLabel={(selectedEntry?.current_node_index === 1) ? 'Complete' : 'Approve'}
        canEditForm={isAdmin || selectedEntry?.status === 'rejected'}
        onEditForm={() => {
          if (selectedEntry) {
            setEditArea(selectedEntry.area || '');
            setEditCleaningType(selectedEntry.cleaning_type || 'Daily');
            setEditPerformedBy(selectedEntry.performed_by || '');
            setEditMaterialsUsed(selectedEntry.materials_used || '');
            setEditNotes(selectedEntry.notes || '');
          }
          setShowDetail(false);
          setShowFormView(true);
        }}
        onDelete={() => { setShowDetail(false); selectedEntry && handleDelete(selectedEntry); }}
        onHistory={() => { setShowDetail(false); selectedEntry && openHistory(selectedEntry); }}
        onExport={() => {}}
        onPrint={() => {}}
      />

      {/* Edit Form Modal */}
      <DailyCleaningInspectionRN
        key={selectedEntry?.id || 'edit'}
        visible={showFormView}
        onClose={() => setShowFormView(false)}
        initialData={selectedEntry?.form_data}
        onSave={async (formData: CleaningFormData) => {
          if (!selectedEntry || !user) return;
          setEditSaving(true);
          try {
            await client.put(`/cleansing/${selectedEntry.id}/update`, {
              formData: formData,
              action: 'update',
              userId: user.id,
            });
            setShowFormView(false);
            fetchEntries();
            Alert.alert('Success', 'Cleansing entry updated.');
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Failed to update');
          }
          setEditSaving(false);
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
            <Text style={M.mTitle}>Rename Entry</Text>
            <TextInput style={[M.input, { marginTop: spacing.sm }]} value={renameValue} onChangeText={setRenameValue} placeholder="New name..." placeholderTextColor={colors.textMuted} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[M.cancelBtn, { flex: 1 }]} onPress={() => setShowRename(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: ACCENT }]} onPress={saveRename}><Text style={M.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Form Modal */}
      <DailyCleaningInspectionRN
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleFormSaved}
      />

      {/* Process Flow Modal */}
      <Modal visible={showProcessFlow} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>Configure Workflow</Text>
              <TouchableOpacity onPress={() => { setShowProcessFlow(false); setPendingFormData(null); }}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: spacing.md }}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>Entry Name *</Text>
                <TextInput style={M.input} value={entryName} onChangeText={setEntryName} placeholder="Name this entry" placeholderTextColor={colors.textMuted} />
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.sm }}>PROCESS FLOW</Text>
              <ProcessFlowBuilder nodes={processNodes} selectedNodeId={selectedNode?.id || null} onSelectNode={n => { setSelectedNode(n); setShowPeopleSelector(true); }} onAdd={addNewNode} />
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={M.mFooter}>
              <TouchableOpacity style={M.cancelBtn} onPress={() => setShowProcessFlow(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { backgroundColor: ACCENT }]} onPress={handleFinalSave} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Icon name="check" size={16} color="#fff" /><Text style={M.saveBtnText}>Create Entry</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PeopleSelectorModal isOpen={showPeopleSelector} onClose={() => setShowPeopleSelector(false)} users={projectMembers} onSelect={handleAssignPerson} loading={membersLoading} title="Assign to Node" />
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
  listContent: { paddingBottom: 80 },
  listItem: { marginVertical: 8, marginHorizontal: 20 },
  pageHeader: { paddingHorizontal: 20 },
  pageDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 19 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 10, height: 42 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8 },
  sortBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', gap: 2 },
  tabActive: { backgroundColor: '#0d2a15', borderColor: ACCENT },
  tabText: { color: '#666', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: ACCENT },
  tabLabel: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 0.2 },
  tabLabelActive: { color: ACCENT },
  shownText: { color: '#555', fontSize: 12, marginBottom: 14 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '700', marginTop: 12 },
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
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 5, marginTop: spacing.sm },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: '#222' },
  cancelBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const D = StyleSheet.create({
  sectionTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.sm },
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
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT + '22', borderRadius: radius.sm, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6 },
  restoreTxt: { fontSize: 11, fontWeight: '700' },
});
