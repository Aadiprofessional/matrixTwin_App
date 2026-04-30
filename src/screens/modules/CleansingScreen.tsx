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
import { client } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getProjectMembers, ProjectMember, TeamMember } from '../../api/team';
import ProcessFlowBuilder from '../../components/forms/ProcessFlowBuilder';
import PeopleSelectorModal from '../../components/ui/PeopleSelectorModal';

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

  const handleFormSaved = () => {
    if (!area.trim()) { Alert.alert('Validation', 'Area is required'); return; }
    setPendingFormData({ date, project_id: projectId, area, cleaning_type: cleaningType, performed_by: performedBy, materials_used: materialsUsed, notes: formNotes });
    setEntryName(`${cleaningType} Cleansing - ${dayjs(date).format('DD/MM/YYYY')}`);
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
      await createCleansingEntry({
        ...pendingFormData,
        createdBy: user.id,
        name: entryName || `Cleansing-${Date.now()}`,
        processNodes,
      });
      setShowProcessFlow(false);
      setPendingFormData(null);
      setArea(''); setCleaningType('Daily'); setPerformedBy(''); setMaterialsUsed(''); setFormNotes('');
      fetchEntries();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to create'); }
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
        ] as const).map(({ key, icon, count }) => {
          const active = filterStatus === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilterStatus(key)}
              style={[S.tab, active && S.tabActive]}
            >
              <Icon name={icon} size={15} color={active ? ACCENT : '#666'} />
              <Text style={[S.tabText, active && S.tabTextActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Text style={S.shownText}>{filtered.length} shown</Text>
      </View>

      {loading ? <ActivityIndicator color={ACCENT} style={{ flex:1, marginTop:40 }} /> : (
        <FlatList data={filtered} keyExtractor={i => i.id}
          ListHeaderComponent={() => <View style={{ height: 0 }} />}
          contentContainerStyle={S.listContent}
          renderItem={({ item }) => (
            <CleansingCard
              item={item}
              onViewDetails={() => openDetail(item)}
              onHistory={() => openHistory(item)}
              onDelete={() => handleDelete(item)}
              onRename={() => openRename(item)}
            />
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
      <Modal visible={showDetail && !!selectedEntry} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>Cleansing Details</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {loadingDetail ? <ActivityIndicator color={ACCENT} style={{ margin: 40 }} /> : selectedEntry ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
                  <MetricBox label="Type" value={selectedEntry.cleaning_type || 'N/A'} color={ACCENT} />
                  <MetricBox label="Area" value={selectedEntry.area || 'N/A'} />
                  <MetricBox label="By" value={selectedEntry.performed_by?.split(' ')[0] || 'N/A'} />
                </View>
                <DField label="Date" value={dayjs(selectedEntry.date).format('DD MMM YYYY')} />
                <DField label="Performed By" value={selectedEntry.performed_by} />
                <DField label="Materials Used" value={selectedEntry.materials_used} />
                <DField label="Notes" value={selectedEntry.notes} />

                {(selectedEntry.cleansing_workflow_nodes || []).length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={D.sectionTitle}>WORKFLOW</Text>
                    {[...(selectedEntry.cleansing_workflow_nodes || [])].sort((a,b)=>a.node_order-b.node_order).map((node, idx) => (
                      <View key={node.id} style={D.nodeRow}>
                        <View style={[D.nodeDot, { backgroundColor: idx < (selectedEntry.current_node_index ?? 0) ? '#22c55e' : idx === (selectedEntry.current_node_index ?? 0) ? ACCENT : '#333' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={D.nodeLabel}>{node.node_name}</Text>
                          <Text style={D.nodeSub}>{node.executor_name || 'Unassigned'}</Text>
                        </View>
                        <View style={{ borderRadius: 99, backgroundColor: (STATUS_COLORS[node.status] || '#555') + '22', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: STATUS_COLORS[node.status] || '#555' }}>
                          <Text style={{ color: STATUS_COLORS[node.status] || '#888', fontSize: 9, fontWeight: '800' }}>{(node.status || 'pending').toUpperCase()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {(selectedEntry.cleansing_comments || []).length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={D.sectionTitle}>COMMENTS</Text>
                    {(selectedEntry.cleansing_comments || []).map((c, idx) => (
                      <View key={idx} style={D.commentRow}>
                        <Text style={D.commentUser}>{c.user_name}</Text>
                        <Text style={D.commentText}>{c.comment}</Text>
                        <Text style={D.commentTime}>{dayjs(c.created_at).fromNow()}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {canApprove(selectedEntry) && (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text style={D.sectionTitle}>WORKFLOW ACTION</Text>
                    <TextInput style={[M.input, { marginBottom: spacing.sm }]} value={workflowComment} onChangeText={setWorkflowComment} placeholder="Comment (optional)" placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <TouchableOpacity style={[D.wBtn, { backgroundColor: '#22c55e22', borderColor: '#22c55e', flex: 1 }]} onPress={() => handleWorkflowAction('approve')} disabled={actionLoading}><Text style={[D.wBtnText, { color: '#22c55e' }]}>Approve</Text></TouchableOpacity>
                      <TouchableOpacity style={[D.wBtn, { backgroundColor: '#f9731622', borderColor: '#f97316', flex: 1 }]} onPress={() => handleWorkflowAction('back')} disabled={actionLoading}><Text style={[D.wBtnText, { color: '#f97316' }]}>Send Back</Text></TouchableOpacity>
                      <TouchableOpacity style={[D.wBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444', flex: 1 }]} onPress={() => handleWorkflowAction('reject')} disabled={actionLoading}><Text style={[D.wBtnText, { color: '#ef4444' }]}>Reject</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            ) : null}
            <View style={M.mFooter}>
              <TouchableOpacity style={[M.cancelBtn]} onPress={() => setShowDetail(false)}><Text style={M.cancelBtnText}>Close</Text></TouchableOpacity>
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
            {historyLoading ? <ActivityIndicator color={ACCENT} style={{ margin: 40 }} /> : (
              <FlatList data={historyList} keyExtractor={(_, i) => String(i)} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}
                renderItem={({ item }) => (
                  <View style={H.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={H.time}>{dayjs(item.created_at || item.savedAt).format('DD MMM YYYY HH:mm')}</Text>
                      <Text style={H.sub}>{item.status || ''}</Text>
                    </View>
                    <TouchableOpacity style={H.restoreBtn} onPress={() => restoreHistory(item.id)}>
                      <Icon name="restore" size={14} color={ACCENT} />
                      <Text style={[H.restoreTxt, { color: ACCENT }]}>Restore</Text>
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
              <TouchableOpacity style={[M.saveBtn, { flex: 1, backgroundColor: ACCENT }]} onPress={saveRename}><Text style={M.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Form Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={M.overlay}>
          <View style={M.sheet}>
            <View style={M.mHeader}>
              <Text style={M.mTitle}>New Cleansing Entry</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: spacing.md }}>
              <Text style={M.label}>Date</Text>
              <TextInput style={M.input} value={date} onChangeText={setDate} placeholderTextColor={colors.textMuted} />
              <Text style={M.label}>Area *</Text>
              <TextInput style={M.input} value={area} onChangeText={setArea} placeholder="e.g. Level 3 Corridor" placeholderTextColor={colors.textMuted} />
              <Text style={M.label}>Cleaning Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
                {CLEANING_TYPES.map(t => (
                  <TouchableOpacity key={t} style={{ borderRadius: 99, borderWidth: 1, borderColor: cleaningType === t ? ACCENT : '#333', backgroundColor: cleaningType === t ? ACCENT + '22' : 'transparent', paddingHorizontal: spacing.md, paddingVertical: 6 }} onPress={() => setCleaningType(t)}>
                    <Text style={{ color: cleaningType === t ? ACCENT : '#555', fontSize: 12, fontWeight: '700' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={M.label}>Performed By</Text>
              <TextInput style={M.input} value={performedBy} onChangeText={setPerformedBy} placeholder="Name" placeholderTextColor={colors.textMuted} />
              <Text style={M.label}>Materials Used</Text>
              <TextInput style={[M.input, { minHeight: 60, textAlignVertical: 'top' }]} value={materialsUsed} onChangeText={setMaterialsUsed} placeholder="List materials..." placeholderTextColor={colors.textMuted} multiline />
              <Text style={M.label}>Notes</Text>
              <TextInput style={[M.input, { minHeight: 60, textAlignVertical: 'top' }]} value={formNotes} onChangeText={setFormNotes} placeholder="Additional notes..." placeholderTextColor={colors.textMuted} multiline />
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={M.mFooter}>
              <TouchableOpacity style={M.cancelBtn} onPress={() => setShowCreate(false)}><Text style={M.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[M.saveBtn, { backgroundColor: ACCENT }]} onPress={handleFormSaved}><Icon name="arrow-right" size={16} color="#fff" /><Text style={M.saveBtnText}>Next: Workflow</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  listContent: { padding: 20, paddingBottom: 80 },
  pageHeader: { marginBottom: 20 },
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
