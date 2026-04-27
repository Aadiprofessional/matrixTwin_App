import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Share, Dimensions
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import {
  getDiaryEntries, getDiaryEntryById, createDiaryEntry, deleteDiaryEntry,
  updateDiaryWorkflowAction, SiteDiaryFormData, SaveProcessNode,
  getDiaryHistory, restoreDiaryFromHistory, setDiaryExpiry, setDiaryExpiryStatus,
  renameDiary, sendNodeReminder
} from '../../api/diary';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getProjectMembers, TeamMember } from '../../api/team';
import SiteDiaryFormTemplate from '../../components/forms/SiteDiaryFormTemplate';
import ProcessFlowBuilder, { ProcessNode as PFNode } from '../../components/forms/ProcessFlowBuilder';
import PeopleSelectorModal from '../../components/ui/PeopleSelectorModal';
import HistoryModal from '../../components/ui/HistoryModal';

type RouteProps = RouteProp<AppStackParamList, 'Diary'>;
const ACCENT = '#b0c985'; // Using the greenish accent from the web reference snippet

interface WorkflowNode {
  id: string; node_order: number; node_name: string;
  executor_id?: string; executor_name?: string; status: string;
}

interface Comment {
  id: string; user_name: string; comment: string; action?: string; created_at: string;
}

interface FullEntry {
  id: string; form_number?: string; date: string; author: string; weather: string;
  temperature: string; work_completed: string; incidents_reported: string;
  materials_delivered: string; notes: string; status: string; created_at: string;
  diary_workflow_nodes?: WorkflowNode[]; diary_comments?: Comment[];
  current_node_index?: number; created_by?: string; name?: string;
  form_data?: Partial<SiteDiaryFormData>;
  expires_at?: string; expiresAt?: string; active?: boolean;
}

function statusColor(s: string) {
  if (s === 'completed') return colors.success;
  if (s === 'pending') return colors.warning;
  if (s === 'rejected' || s === 'permanently_rejected') return colors.error;
  return colors.textMuted;
}

function statusLabel(s: string) {
  if (s === 'permanently_rejected') return 'PERM.REJ';
  return s?.toUpperCase() ?? 'UNKNOWN';
}

function workflowStatusLabel(s: string) {
  if (s === 'pending') return 'Waiting';
  if (s === 'completed') return 'Complete';
  if (s === 'rejected') return 'Rejected';
  if (s === 'permanently_rejected') return 'Permanently Rejected';
  return s || 'Not specified';
}

export default function DiaryScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<FullEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'completed'|'rejected'|'permanent'>('all');
  const [sortBy, setSortBy] = useState<'newest'|'oldest'>('newest');

  const [selectedEntry, setSelectedEntry] = useState<FullEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showProcessFlow, setShowProcessFlow] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [savingExpiry, setSavingExpiry] = useState<Record<string, boolean>>({});
  const [updatingExpiryStatus, setUpdatingExpiryStatus] = useState<Record<string, boolean>>({});
  const [renamingDiary, setRenamingDiary] = useState<Record<string, boolean>>({});
  const [sendingNodeReminder, setSendingNodeReminder] = useState<Record<string, boolean>>({});
  
  const [pendingFormData, setPendingFormData] = useState<SiteDiaryFormData | null>(null);
  const [pendingDiaryName, setPendingDiaryName] = useState('');
  const [pendingDiaryExpiry, setPendingDiaryExpiry] = useState(dayjs().add(10, 'day').format('DD/MM/YYYY, hh:mm A'));
  
  const [processNodes, setProcessNodes] = useState<PFNode[]>([
    { id: 'start', type: 'start', name: 'Start', settings: {} },
    { id: 'review', type: 'node', name: 'Review & Approval', ccRecipients: [], settings: {}, editAccess: true },
    { id: 'end', type: 'end', name: 'Complete', settings: {} },
  ]);
  const [selectedNode, setSelectedNode] = useState<PFNode | null>(null);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [peopleSelectorType, setPeopleSelectorType] = useState<'executor' | 'cc'>('executor');
  
  const [showReport, setShowReport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const members = await getProjectMembers(projectId);
        setProjectMembers(Array.isArray(members) ? members : []);
      } catch (error) {
        console.error('Failed to load project members:', error);
      }
    };
    loadMembers();
  }, [projectId]);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDiaryEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? (data as FullEntry[]) : []);
    } catch {}
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const openDetail = async (entry: FullEntry) => {
    setSelectedEntry(entry);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await getDiaryEntryById(entry.id);
      setSelectedEntry(data as FullEntry);
    } catch {}
    setLoadingDetail(false);
  };

  const handleWorkflowAction = async (action: 'approve'|'reject'|'back') => {
    if (!selectedEntry || !user?.id) return;
    let comment = '';
    if (action === 'reject' || action === 'back') {
      await new Promise<void>((resolve) => {
        Alert.prompt(
          action === 'reject' ? 'Reason for Rejection' : 'Send Back Comment',
          'Please provide a reason:',
          [
            { text: 'Cancel', onPress: () => resolve(), style: 'cancel' },
            { text: 'Submit', onPress: (val?: string) => { comment = val || ''; resolve(); } },
          ],
          'plain-text',
        );
      });
      if (!comment.trim()) { Alert.alert('Required', 'A comment is required.'); return; }
    }
    setActionLoading(true);
    try {
      await updateDiaryWorkflowAction(selectedEntry.id, { action, comment, userId: user.id });
      Alert.alert('Success', `Entry ${action}d successfully.`);
      await fetchEntries();
      await openDetail(selectedEntry);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || `Failed to ${action}`);
    }
    setActionLoading(false);
  };

  const handleDelete = (entry: FullEntry) => {
    Alert.alert('Delete Entry', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDiaryEntry(entry.id);
          setShowDetail(false);
          fetchEntries();
        } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Failed to delete'); }
      }},
    ]);
  };

  const handleFormSaved = (data: SiteDiaryFormData) => {
    setPendingFormData(data);
    const defaultName = `Diary - ${projectName || 'Project'} - ${dayjs(data.date).format('DD MMM')}`;
    setPendingDiaryName(defaultName);
    setPendingDiaryExpiry(dayjs().add(10, 'day').format('DD/MM/YYYY, hh:mm A'));
    setShowCreate(false);
    setShowProcessFlow(true);
    setSelectedNode(processNodes.find(n => n.type === 'node') || null);
  };

  const addNewNode = () => {
    const newNode: PFNode = { id: `node_${Date.now()}`, type: 'node', name: 'New Process Step', settings: {} };
    const endIndex = processNodes.findIndex(n => n.type === 'end');
    const next = [...processNodes];
    next.splice(endIndex, 0, newNode);
    setProcessNodes(next);
    setSelectedNode(newNode);
  };

  const openPeopleSelector = (type: 'executor' | 'cc') => {
    setPeopleSelectorType(type);
    setShowPeopleSelector(true);
  };

  const handleUserSelection = (selectedUser: any) => {
    if (!selectedNode) return;
    if (peopleSelectorType === 'executor') {
      const updated = { ...selectedNode, executor: selectedUser.name, executorId: selectedUser.id } as PFNode;
      setProcessNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setSelectedNode(updated);
    } else {
      const current = selectedNode.ccRecipients || [];
      if (current.find((c:any) => c.id === selectedUser.id)) return;
      const updated = { ...selectedNode, ccRecipients: [...current, selectedUser] } as PFNode;
      setProcessNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setSelectedNode(updated);
    }
    setShowPeopleSelector(false);
  };

  const removeUserFromCc = (userId: string) => {
    if (!selectedNode) return;
    const updated = { ...selectedNode, ccRecipients: (selectedNode.ccRecipients || []).filter((c:any) => c.id !== userId) } as PFNode;
    setProcessNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setSelectedNode(updated);
  };

  const handleFinalSave = async () => {
    if (!pendingFormData || !user) return;
    if (!pendingDiaryName.trim()) { Alert.alert('Validation', 'Please provide a diary name.'); return; }
    setSubmitting(true);
    try {
      const nodesForBackend: SaveProcessNode[] = processNodes.map(n => ({
        id: n.id,
        type: n.type as 'start' | 'node' | 'end',
        name: n.name,
        executor: (n as any).executor || '',
        executorId: (n as any).executorId || '',
        ccRecipients: (n as any).ccRecipients || [],
        editAccess: n.editAccess !== false,
        settings: n.settings || {},
      }));

      // Parse the DD/MM/YYYY format or fallback
      let parsedExpiry = dayjs(pendingDiaryExpiry, 'DD/MM/YYYY, hh:mm A');
      if (!parsedExpiry.isValid()) parsedExpiry = dayjs().add(10, 'day');

      await createDiaryEntry({
        formData: pendingFormData,
        processNodes: nodesForBackend,
        createdBy: user.id,
        project_id: projectId,
        formId: pendingFormData.formNumber,
        name: pendingDiaryName.trim(),
        expiresAt: parsedExpiry.toISOString(),
      });
      setShowProcessFlow(false);
      setPendingFormData(null);
      fetchEntries();
      Alert.alert('Success', 'Diary entry created successfully!');
    } catch (e:any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to create entry'); }
    setSubmitting(false);
  };

  const fetchHistory = async (diaryId: string) => {
    try {
      setLoadingHistory(true);
      const data = await getDiaryHistory(diaryId);
      setHistoryData(Array.isArray(data) ? data : []);
      setShowHistory(true);
    } catch (e) {
      console.error('Failed to fetch history', e);
      setHistoryData([]);
    }
    setLoadingHistory(false);
  };

  const handleRestoreHistory = async (history: any) => {
    if (!selectedEntry) return;
    Alert.alert('Confirm', 'Restore this version? This will create a new history entry.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: async () => {
        try {
          await restoreDiaryFromHistory(selectedEntry.id, history.id);
          Alert.alert('Success', 'Diary restored.');
          setShowHistory(false);
          fetchEntries();
          setSelectedEntry(null);
          setShowDetail(false);
        } catch (e) { Alert.alert('Error', 'Failed to restore'); }
      } }
    ]);
  };

  const getDefaultExpiryDate = (entry: FullEntry) => {
    const baseDate = new Date(entry.created_at || entry.date);
    const resolvedBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const defaultExpiryDate = new Date(resolvedBaseDate);
    defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 10);
    return defaultExpiryDate;
  };

  const getEntryExpiryDate = (entry: FullEntry) => {
    const expirySource = entry.expires_at || entry.expiresAt;
    const parsed = expirySource ? new Date(expirySource) : getDefaultExpiryDate(entry);
    return Number.isNaN(parsed.getTime()) ? getDefaultExpiryDate(entry) : parsed;
  };

  const isEntryExpired = (entry: FullEntry) => {
    if (entry.active === false) return true;
    return getEntryExpiryDate(entry).getTime() <= Date.now();
  };

  const handleSetExpiryStatus = async (entry: FullEntry, nextActive: boolean) => {
    if (!user?.id || user.role !== 'admin') return;
    try {
      setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: true }));
      await setDiaryExpiryStatus(entry.id, user.id, nextActive);
      Alert.alert('Success', nextActive ? 'Diary entry reactivated.' : 'Diary entry marked as expired.');
      fetchEntries();
      if (selectedEntry?.id === entry.id) { await openDetail(entry); }
    } catch (e) { Alert.alert('Error', 'Failed to update expiry status'); }
    setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: false }));
  };

  const handleRenameDiary = async (entry: FullEntry) => {
    if (!user?.id || user.role !== 'admin') return;
    const currentName = entry.name || entry.form_number || entry.id;
    let nextName = '';
    await new Promise<void>((resolve) => {
      Alert.prompt(
        'Rename Diary',
        'Enter new diary name:',
        [
          { text: 'Cancel', onPress: () => resolve(), style: 'cancel' },
          { text: 'Rename', onPress: (val?: string) => { nextName = (val || '').trim(); resolve(); } },
        ],
        'plain-text',
        currentName
      );
    });
    if (!nextName) return;
    try {
      setRenamingDiary(prev => ({ ...prev, [entry.id]: true }));
      await renameDiary(entry.id, user.id, nextName);
      fetchEntries();
      if (selectedEntry?.id === entry.id) await openDetail(entry);
    } catch (e) { Alert.alert('Error', 'Failed to rename diary'); }
    setRenamingDiary(prev => ({ ...prev, [entry.id]: false }));
  };

  const handleNodeReminder = async (entry: FullEntry, node: WorkflowNode, nodeOrder: number) => {
    if (!user?.id || user.role !== 'admin') return;
    const defaultMessage = `Reminder: Please action "${node.node_name}" step.`;
    let message = '';
    await new Promise<void>((resolve) => {
      Alert.prompt(
        'Send Reminder',
        'Enter reminder message for this step:',
        [
          { text: 'Cancel', onPress: () => resolve(), style: 'cancel' },
          { text: 'Send', onPress: (val?: string) => { message = (val || '').trim() || defaultMessage; resolve(); } },
        ],
        'plain-text',
        defaultMessage,
      );
    });
    if (!message) return;
    const key = `${entry.id}-${nodeOrder}`;
    try {
      setSendingNodeReminder(prev => ({ ...prev, [key]: true }));
      await sendNodeReminder(entry.id, nodeOrder, user.id, message);
      Alert.alert('Success', 'Reminder sent successfully.');
    } catch (e) { Alert.alert('Error', 'Failed to send reminder'); }
    setSendingNodeReminder(prev => ({ ...prev, [key]: false }));
  };

  const filtered = entries
    .filter(e => {
      const q = searchQuery.toLowerCase();
      if (q && !e.work_completed?.toLowerCase().includes(q) && !e.author?.toLowerCase().includes(q) && !e.name?.toLowerCase().includes(q)) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'rejected') return e.status === 'rejected';
        if (filterStatus === 'permanent') return e.status === 'permanently_rejected';
        return e.status === filterStatus;
      }
      return true;
    })
    .sort((a, b) => {
      const at = new Date(a.date).getTime(); const bt = new Date(b.date).getTime();
      return sortBy === 'newest' ? bt - at : at - bt;
    });

  const total = entries.length;
  const pending = entries.filter(e => e.status === 'pending').length;
  const completed = entries.filter(e => e.status === 'completed').length;
  const rejected = entries.filter(e => e.status === 'rejected').length;
  const permanent = entries.filter(e => e.status === 'permanently_rejected').length;
  
  // Calculate unique contributors
  const contributors = new Set(entries.map(e => e.author)).size;
  // This Week calculation
  const thisWeek = entries.filter(e => dayjs(e.date).isAfter(dayjs().subtract(7, 'day'))).length;

  const canApprove = (e: FullEntry) => {
    if (!user) return false;
    if (e.status === 'completed' || e.status === 'permanently_rejected') return false;
    if (user.role === 'admin') return true;
    const node = e.diary_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    return node?.executor_id === user.id;
  };

  const renderHeader = () => (
    <View style={S.pageHeader}>
      <Text style={S.pageTitle}>Site Diary</Text>
      <Text style={S.pageDesc}>
        Manage daily site logs with faster scanning, stronger status visibility, and cleaner project context.
      </Text>
      <View style={{ alignSelf: 'flex-start' }}>
        <View style={S.projectChip}>
          <Icon name="office-building" size={14} color="#e2ebcf" style={{ marginRight: 6 }} />
          <Text style={S.projectChipText}>Project: {projectName}</Text>
        </View>
      </View>
      
      <View style={S.actionRowTop}>
        <TouchableOpacity style={S.primaryBtn} onPress={() => setShowCreate(true)}>
          <Icon name="plus" size={16} color="#000" />
          <Text style={S.primaryBtnText}>New Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.secondaryBtn} onPress={() => setShowReport(true)}>
          <Icon name="file-document-outline" size={16} color="#fff" />
          <Text style={S.secondaryBtnText}>Generate Report</Text>
        </TouchableOpacity>
      </View>

      <View style={S.statsBox}>
        <View style={S.statItem}><Text style={S.statLabel}>Total</Text><Text style={S.statValue}>{total}</Text></View>
        <View style={S.statItem}><Text style={S.statLabel}>This Week</Text><Text style={S.statValue}>{thisWeek}</Text></View>
        <View style={S.statItem}><Text style={S.statLabel}>Pending</Text><Text style={S.statValue}>{pending}</Text></View>
        <View style={S.statItem}><Text style={S.statLabel}>Completed</Text><Text style={S.statValue}>{completed}</Text></View>
        <View style={[S.statItem, { borderRightWidth: 0 }]}><Text style={S.statLabel}>Contributors</Text><Text style={S.statValue}>{contributors}</Text></View>
      </View>

      <Text style={S.sectionTitleMain}>Search & Filter</Text>
      <View style={S.searchArea}>
        <View style={S.searchInputWrap}>
          <Icon name="magnify" size={18} color="#666" />
          <TextInput style={S.searchInput} placeholder="Search by project, author, work" placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <View style={S.filterSelects}>
          <View style={S.fakeSelect}><Text style={S.fakeSelectText}>All statuses</Text><Icon name="chevron-down" size={16} color="#666" /></View>
          <View style={S.fakeSelect}><Text style={S.fakeSelectText}>Newest first</Text><Icon name="chevron-down" size={16} color="#666" /></View>
        </View>
      </View>

      <View style={S.tabsRow}>
        {(['all','pending','completed','rejected','permanent'] as const).map(tab => (
          <TouchableOpacity key={tab} onPress={() => setFilterStatus(tab)} style={[S.tab, filterStatus === tab && S.tabActive]}>
            <Text style={[S.tabText, filterStatus === tab && S.tabTextActive]}>
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
              {tab === 'all' ? total : tab === 'pending' ? pending : tab === 'completed' ? completed : tab === 'rejected' ? rejected : permanent}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={S.shownText}>{filtered.length} shown</Text>
    </View>
  );

  return (
    <ModuleShell title="Site Diary" iconName="book-open-outline" accentColor={ACCENT} projectName={projectName}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const expired = isEntryExpired(item);
          const daysExpired = expired ? Math.floor((Date.now() - getEntryExpiryDate(item).getTime()) / (1000*60*60*24)) : 0;
          return (
            <View style={S.diaryCard}>
              <View style={S.cardHeader}>
                <Text style={S.cardDate}>{dayjs(item.date).format('YYYY-MM-DD')}</Text>
                {expired && <View style={S.expiredBadge}><Text style={S.expiredText}>Expired</Text></View>}
              </View>
              <Text style={S.cardTitle}>{item.name || `Diary - ${projectName} - ${dayjs(item.date).format('DD MMM')}`}</Text>
              
              <View style={S.authorRow}>
                <View style={S.avatar}><Text style={S.avatarText}>{item.author.charAt(0)}</Text></View>
                <Text style={S.authorName}>{item.author}</Text>
              </View>

              <View style={S.infoBlock}>
                <Text style={S.infoLabel}>Form No:</Text>
                <Text style={S.infoValue}>{item.form_number || item.id.substring(0,8)}</Text>
              </View>
              <View style={S.infoBlock}>
                <Text style={S.infoValueMuted}>
                  {item.weather || 'Not specified'},
                </Text>
                {expired && <Text style={S.infoValueMuted}>Expired {daysExpired} days ago</Text>}
              </View>

              <View style={S.sectionsBlock}>
                <Text style={S.sectionLabel}>Work Completed</Text>
                <Text style={S.sectionContent}>{item.work_completed || 'None'}</Text>
                
                <Text style={S.sectionLabel}>Incidents</Text>
                <Text style={S.sectionContent}>{item.incidents_reported || 'None'}</Text>
                
                <Text style={S.sectionLabel}>Materials</Text>
                <Text style={S.sectionContent}>{item.materials_delivered || 'None'}</Text>
                
                <Text style={S.sectionLabel}>Additional Notes</Text>
                <Text style={S.sectionContent}>{item.notes || 'None'}</Text>
              </View>

              <Text style={S.sectionLabel}>Activation</Text>
              <View style={{ alignItems: 'flex-start', marginBottom: 16 }}>
                <TouchableOpacity style={S.activationBtn} onPress={() => handleSetExpiryStatus(item, true)}>
                  <Text style={S.activationBtnText}>Set Active</Text>
                </TouchableOpacity>
              </View>

              <View style={S.cardActions}>
                <TouchableOpacity onPress={() => openDetail(item)}><Text style={S.actionLink}>View Details</Text></TouchableOpacity>
                <Text style={S.actionDot}>•</Text>
                <TouchableOpacity onPress={() => fetchHistory(item.id)}><Text style={S.actionLink}>History</Text></TouchableOpacity>
                {user?.role === 'admin' && (
                  <>
                    <Text style={S.actionDot}>•</Text>
                    <TouchableOpacity onPress={() => handleRenameDiary(item)}><Text style={S.actionLink}>Rename</Text></TouchableOpacity>
                    <Text style={S.actionDot}>•</Text>
                    <TouchableOpacity onPress={() => handleDelete(item)}><Text style={[S.actionLink, { color: '#ff4444' }]}>Delete</Text></TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* View Details Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={S.detailsSheet}>
            <View style={S.sheetHeader}>
              <Text style={S.sheetTitle}>Diary Entry Details</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            
            {selectedEntry && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                <Text style={S.detailDate}>{dayjs(selectedEntry.date).format('YYYY-MM-DD')}</Text>
                
                <Text style={S.detailSectionTitle}>Author</Text>
                <View style={S.authorRowDetail}>
                  <View style={S.avatar}><Text style={S.avatarText}>{selectedEntry.author.charAt(0)}</Text></View>
                  <Text style={S.detailText}>{selectedEntry.author}</Text>
                </View>

                <Text style={S.detailSectionTitle}>Weather Conditions</Text>
                <Text style={S.detailText}>{selectedEntry.weather || 'Not specified'}, {selectedEntry.temperature}</Text>

                <Text style={S.detailSectionTitle}>Work Completed</Text>
                <Text style={S.detailText}>{selectedEntry.work_completed || 'None'}</Text>

                <Text style={S.detailSectionTitle}>Incidents Reported</Text>
                <Text style={S.detailText}>{selectedEntry.incidents_reported || 'None'}</Text>

                <Text style={S.detailSectionTitle}>Materials Delivered</Text>
                <Text style={S.detailText}>{selectedEntry.materials_delivered || 'None'}</Text>

                <Text style={S.detailSectionTitle}>Additional Notes</Text>
                <Text style={S.detailText}>{selectedEntry.notes || 'None'}</Text>

                <Text style={S.detailSectionTitle}>Workflow Status</Text>
                <View style={S.workflowBlock}>
                  {selectedEntry.diary_workflow_nodes?.sort((a,b)=>a.node_order-b.node_order).map((node, i) => (
                    <View key={node.id} style={S.workflowNode}>
                      <View style={S.workflowDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={S.workflowName}>{node.node_name}</Text>
                        <Text style={S.workflowStatusText}>{workflowStatusLabel(node.status)}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {canApprove(selectedEntry) && (
                  <View style={S.approveActions}>
                     <TouchableOpacity style={[S.approveBtn, { backgroundColor: '#4CAF50' }]} onPress={() => handleWorkflowAction('approve')}>
                       <Text style={S.approveBtnText}>Approve</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[S.approveBtn, { backgroundColor: '#FF9800' }]} onPress={() => handleWorkflowAction('back')}>
                       <Text style={S.approveBtnText}>Send Back</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[S.approveBtn, { backgroundColor: '#F44336' }]} onPress={() => handleWorkflowAction('reject')}>
                       <Text style={S.approveBtnText}>Reject</Text>
                     </TouchableOpacity>
                  </View>
                )}

                <Text style={S.detailSectionTitle}>Export</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity style={S.exportBtn}><Icon name="download" size={16} color="#fff" /><Text style={S.exportBtnText}>Export</Text></TouchableOpacity>
                  <TouchableOpacity style={S.exportBtn}><Icon name="printer" size={16} color="#fff" /><Text style={S.exportBtnText}>Print</Text></TouchableOpacity>
                </View>

                <View style={{ height: 1, backgroundColor: '#333', marginVertical: 20 }} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                  <TouchableOpacity style={S.bottomBtn}><Text style={[S.bottomBtnText, { color: '#ff4444' }]}>Delete</Text></TouchableOpacity>
                  <TouchableOpacity style={S.bottomBtn} onPress={() => setShowDetail(false)}><Text style={S.bottomBtnText}>Close</Text></TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Create form Modal */}
      <Modal visible={showCreate} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
          <View style={[S.sheetHeader, { paddingTop: 50, paddingHorizontal: 20 }]}>
            <Text style={S.sheetTitle}>New Diary Entry</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
          </View>
          <SiteDiaryFormTemplate onClose={() => setShowCreate(false)} onSave={handleFormSaved} />
        </View>
      </Modal>

      {/* Process Flow Modal */}
      <Modal visible={showProcessFlow} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', padding: 20, paddingTop: 50 }}>
           <View style={S.sheetHeader}>
             <Text style={S.sheetTitle}>Process Configuration</Text>
             <TouchableOpacity onPress={() => setShowProcessFlow(false)}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
           </View>
           <Text style={S.subTitle}>Configure the workflow process for this diary entry before saving.</Text>
           
           <ScrollView showsVerticalScrollIndicator={false}>
             <Text style={S.processSectionTitle}>Process Flow</Text>
             <TouchableOpacity style={S.addNodeBtn} onPress={addNewNode}>
               <Icon name="plus" size={16} color="#000" /><Text style={{ color: '#000', fontWeight: '600' }}>Add Node</Text>
             </TouchableOpacity>
             
             <View style={S.flowVisual}>
               {processNodes.map((n, idx) => (
                 <TouchableOpacity key={n.id} style={[S.flowNode, selectedNode?.id === n.id && S.flowNodeActive]} onPress={() => setSelectedNode(n)}>
                   <Text style={S.flowNodeText}>{n.name}</Text>
                   {n.type === 'node' && <Text style={S.flowNodeSub}>{(n as any).executor || 'No executor assigned'}</Text>}
                 </TouchableOpacity>
               ))}
             </View>

             <Text style={S.processSectionTitle}>Process Settings</Text>
             <Text style={S.processSectionTitle}>Diary Setup</Text>

             <Text style={S.label}>Project / Diary Name</Text>
             <TextInput style={S.input} value={pendingDiaryName} onChangeText={setPendingDiaryName} />

             <Text style={S.label}>Expiry Date & Time</Text>
             <TextInput style={S.input} value={pendingDiaryExpiry} onChangeText={setPendingDiaryExpiry} />

             {selectedNode && selectedNode.type === 'node' && (
               <View style={S.nodeSettingsBox}>
                 <Text style={S.label}>Node name</Text>
                 <TextInput style={S.input} value={selectedNode.name} onChangeText={(v) => { const updated = { ...selectedNode, name: v }; setSelectedNode(updated); setProcessNodes(prev => prev.map(p => p.id === updated.id ? updated : p)); }} />
                 
                 <Text style={S.label}>Executor</Text>
                 <TouchableOpacity style={S.selectorBtn} onPress={() => openPeopleSelector('executor')}>
                   <Text style={S.selectorBtnText}>{(selectedNode as any).executor || 'Select executor'}</Text>
                   <Text style={S.selectLink}>Select</Text>
                 </TouchableOpacity>

                 <Text style={S.label}>CC Recipients</Text>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                   {(selectedNode.ccRecipients || []).map((cc:any) => (
                     <View key={cc.id} style={S.ccBadge}><Text style={S.ccBadgeText}>{cc.name}</Text></View>
                   ))}
                 </View>
                 <TouchableOpacity style={S.addCcBtn} onPress={() => openPeopleSelector('cc')}>
                   <Text style={S.addCcBtnText}>Add CC</Text>
                 </TouchableOpacity>

                 <Text style={S.label}>Edit Access</Text>
                 <View style={S.toggleRow}>
                   <TouchableOpacity onPress={() => { const updated = { ...selectedNode, editAccess: !(selectedNode.editAccess !== false) }; setSelectedNode(updated); setProcessNodes(prev => prev.map(p => p.id === updated.id ? updated : p)); }}>
                     <Icon name={selectedNode.editAccess !== false ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color="#b0c985" />
                   </TouchableOpacity>
                   <View style={{ flex: 1, marginLeft: 10 }}>
                     <Text style={{ color: '#fff', fontSize: 14 }}>Allow editing when this node is active</Text>
                     <Text style={{ color: '#888', fontSize: 12 }}>When enabled, both executor and CC recipients can edit the form when this node is active</Text>
                   </View>
                 </View>

                 <Text style={S.label}>Task Expiration</Text>
                 <Text style={{ color: '#fff', fontSize: 16 }}>Unlimited</Text>
                 <Text style={{ color: '#888', fontSize: 12 }}>Select a custom expiration date and time above.</Text>
               </View>
             )}

             <View style={S.processActions}>
               <TouchableOpacity style={S.backBtn} onPress={() => setShowProcessFlow(false)}><Text style={S.backBtnText}>Back to Form</Text></TouchableOpacity>
               <View style={{ flexDirection: 'row', gap: 10 }}>
                 <TouchableOpacity style={S.cancelPBtn} onPress={() => setShowProcessFlow(false)}><Text style={S.cancelPBtnText}>Cancel</Text></TouchableOpacity>
                 <TouchableOpacity style={S.savePBtn} onPress={handleFinalSave}>
                   {submitting ? <ActivityIndicator color="#000" /> : <Text style={S.savePBtnText}>Save Diary Entry</Text>}
                 </TouchableOpacity>
               </View>
             </View>
             <View style={{ height: 40 }} />
           </ScrollView>
        </View>
      </Modal>

      <PeopleSelectorModal isOpen={showPeopleSelector} onClose={() => setShowPeopleSelector(false)} users={projectMembers} onSelect={handleUserSelection} title={peopleSelectorType === 'executor' ? 'Select Executor' : 'Add CC Recipient'} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} history={historyData} onRestore={handleRestoreHistory} onView={(h) => { setSelectedHistoryEntry(h); setShowHistory(false); setShowHistoryForm(true); }} />
    </ModuleShell>
  );
}

const S = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 80 },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  pageDesc: { fontSize: 14, color: '#aaa', marginBottom: 16, lineHeight: 20 },
  projectChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e2414', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334020', marginBottom: 20 },
  projectChipText: { color: '#e2ebcf', fontSize: 12, fontWeight: '600' },
  actionRowTop: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#b0c985', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 6 },
  primaryBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 6 },
  secondaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  statsBox: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#222', paddingVertical: 12, marginBottom: 24 },
  statItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#222' },
  statLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  sectionTitleMain: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  searchArea: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInputWrap: { flex: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 10 },
  searchInput: { flex: 1, color: '#fff', height: 40, marginLeft: 8 },
  filterSelects: { flex: 1.5, flexDirection: 'row', gap: 10 },
  fakeSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  fakeSelectText: { color: '#fff', fontSize: 12 },

  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 12 },
  tab: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#b0c985' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#b0c985' },
  shownText: { color: '#666', fontSize: 12, marginBottom: 16 },

  diaryCard: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { color: '#888', fontSize: 12 },
  expiredBadge: { backgroundColor: '#3a1a1a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  expiredText: { color: '#ff6b6b', fontSize: 10, fontWeight: 'bold' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  authorName: { color: '#ccc', fontSize: 13 },

  infoBlock: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  infoLabel: { color: '#888', fontSize: 13 },
  infoValue: { color: '#fff', fontSize: 13 },
  infoValueMuted: { color: '#666', fontSize: 13 },

  sectionsBlock: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 16 },
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  sectionContent: { color: '#fff', fontSize: 14 },

  activationBtn: { borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 4 },
  activationBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  cardActions: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#222' },
  actionLink: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionDot: { color: '#444', marginHorizontal: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  detailsSheet: { width: '90%', maxHeight: '90%', backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  detailDate: { color: '#888', fontSize: 14, marginBottom: 16 },
  detailSectionTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 20, marginBottom: 8, letterSpacing: 1 },
  detailText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  authorRowDetail: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  workflowBlock: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#333' },
  workflowNode: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  workflowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#b0c985', marginTop: 6, marginRight: 12 },
  workflowName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  workflowStatusText: { color: '#888', fontSize: 12 },

  approveActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  approveBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: 'bold' },

  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 6 },
  exportBtnText: { color: '#fff', fontSize: 13 },
  
  bottomBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  bottomBtnText: { color: '#888', fontSize: 14, fontWeight: 'bold' },

  subTitle: { color: '#aaa', fontSize: 14, marginBottom: 24 },
  processSectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 16 },
  addNodeBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#b0c985', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 6, marginBottom: 16 },
  flowVisual: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 16, gap: 12 },
  flowNode: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12 },
  flowNodeActive: { borderColor: '#b0c985' },
  flowNodeText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  flowNodeSub: { color: '#888', fontSize: 12, marginTop: 4 },

  label: { color: '#888', fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, color: '#fff', paddingHorizontal: 12, height: 44 },
  
  nodeSettingsBox: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 16, marginTop: 16 },
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  selectorBtnText: { color: '#fff' },
  selectLink: { color: '#b0c985', fontWeight: 'bold' },

  addCcBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#333', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addCcBtnText: { color: '#fff', fontSize: 12 },
  ccBadge: { backgroundColor: '#222', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  ccBadgeText: { color: '#fff', fontSize: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  
  processActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 20 },
  backBtn: { padding: 12 },
  backBtnText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  cancelPBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  cancelPBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  savePBtn: { backgroundColor: '#b0c985', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  savePBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
});
