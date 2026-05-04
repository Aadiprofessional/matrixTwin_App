import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Dimensions, Linking
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import {
  getDiaryEntries, getDiaryEntryById, createDiaryEntry, deleteDiaryEntry,
  updateDiaryWorkflowAction, updateDiaryFormData, SiteDiaryFormData, SaveProcessNode,
  getDiaryHistory, restoreDiaryFromHistory, setDiaryExpiry, setDiaryExpiryStatus,
  renameDiary, sendNodeReminder
} from '../../api/diary';
import { useAuthStore } from '../../store/authStore';

import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getProjectMembers, ProjectMember, TeamMember } from '../../api/team';
import { generateReport } from '../../api/analytics';
import { API_BASE_URL } from '../../api/client';
import SiteDiaryFormTemplate from '../../components/forms/SiteDiaryFormTemplate';
import { FormEntryCard, CardContentBlock, CardGrid } from '../../components/ui/FormEntryCard';
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
  const navigation = useNavigation();
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
  const [workflowComment, setWorkflowComment] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameEntry, setRenameEntry] = useState<FullEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEntry, setReminderEntry] = useState<FullEntry | null>(null);
  const [reminderNode, setReminderNode] = useState<WorkflowNode | null>(null);
  const [reminderNodeOrder, setReminderNodeOrder] = useState(0);
  const [reminderMessage, setReminderMessage] = useState('');
  
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
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([]);
  const isSmallScreen = useMemo(() => Dimensions.get('window').width < 390, []);
  const [showFormView, setShowFormView] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const members = await getProjectMembers(projectId);
        const normalizedMembers = Array.isArray(members)
          ? members.map((member: ProjectMember) => member.user).filter(Boolean)
          : [];
        setProjectMembers(normalizedMembers);
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
    setActionLoading(true);
    try {
      await updateDiaryWorkflowAction(selectedEntry.id, { action, comment: workflowComment, userId: user.id });
      setWorkflowComment('');
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

  const handleRenameDiary = (entry: FullEntry) => {
    if (!user?.id || user.role !== 'admin') return;
    setRenameEntry(entry);
    setRenameValue(entry.name || entry.form_number || '');
    setShowRenameModal(true);
  };

  const saveRename = async () => {
    if (!renameEntry || !user?.id) return;
    try {
      setRenamingDiary(prev => ({ ...prev, [renameEntry.id]: true }));
      await renameDiary(renameEntry.id, user.id, renameValue);
      setShowRenameModal(false);
      fetchEntries();
      if (selectedEntry?.id === renameEntry.id) await openDetail(renameEntry);
    } catch (e) { Alert.alert('Error', 'Failed to rename diary'); }
    setRenamingDiary(prev => ({ ...prev, [renameEntry!.id]: false }));
  };

  const handleNodeReminder = (entry: FullEntry, node: WorkflowNode, nodeOrder: number) => {
    if (!user?.id || user.role !== 'admin') return;
    setReminderEntry(entry);
    setReminderNode(node);
    setReminderNodeOrder(nodeOrder);
    setReminderMessage(`Reminder: Please action "${node.node_name}" step.`);
    setShowReminderModal(true);
  };

  const sendReminder = async () => {
    if (!reminderEntry || !user?.id) return;
    const key = `${reminderEntry.id}-${reminderNodeOrder}`;
    try {
      setSendingNodeReminder(prev => ({ ...prev, [key]: true }));
      await sendNodeReminder(reminderEntry.id, reminderNodeOrder, user.id, reminderMessage);
      setShowReminderModal(false);
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

  const canUserEditEntry = (e: FullEntry) => {
    if (!user?.id) return false;
    if (e.status === 'permanently_rejected') return false;
    if (user.role === 'admin' && (e.status === 'pending' || e.status === 'rejected')) return true;
    const currentNode = e.diary_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    if (currentNode && currentNode.executor_id === user.id && e.status === 'rejected') return true;
    return false;
  };

  const canUserUpdateForm = (e: FullEntry) => {
    if (!user?.id) return false;
    if (e.status === 'permanently_rejected') return false;
    if (user.role === 'admin' && e.created_by === user.id) return true;
    const currentNode = e.diary_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    if (currentNode && currentNode.executor_id === user.id) {
      return (currentNode as any).can_re_edit !== false;
    }
    const isAssigned = (e as any).diary_assignments?.some(
      (a: any) => a.user_id === user.id && a.node_id === (currentNode as any)?.node_id
    );
    if (isAssigned && e.status === 'rejected') return true;
    return !!isAssigned;
  };

  const handleFormUpdate = async (formData: SiteDiaryFormData) => {
    if (!selectedEntry || !user?.id) return;
    try {
      await updateDiaryFormData(selectedEntry.id, { formData, action: 'update', userId: user.id });
      setShowFormView(false);
      await fetchEntries();
      Alert.alert('Success', 'Form updated successfully!');
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to update form';
      Alert.alert('Error', msg);
    }
  };

  const reportData = useMemo(() => {
    const contributorMap = filtered.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.author || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const weatherMap = filtered.reduce<Record<string, number>>((acc, entry) => {
      const key = (entry.weather || 'Other').trim() || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const contributorsList = Object.entries(contributorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    const weatherList = Object.entries(weatherMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count }));

    const topContributor = contributorsList[0] || { name: 'N/A', count: 0 };
    const topWeather = weatherList[0] || { label: 'N/A', count: 0 };
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const tempValues = filtered
      .map((entry) => {
        const match = (entry.temperature || '').match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : null;
      })
      .filter((value): value is number => value !== null);

    const avgTemp = tempValues.length
      ? (tempValues.reduce((sum, value) => sum + value, 0) / tempValues.length).toFixed(1)
      : null;

    const incidents = filtered
      .filter((entry) => {
        const incidentText = (entry.incidents_reported || '').trim().toLowerCase();
        return incidentText.length > 0 && incidentText !== 'none' && incidentText !== 'no';
      })
      .slice(0, 8);

    return {
      completionRate,
      topContributor,
      topWeather,
      avgTemp,
      incidents,
      contributorsList,
      weatherList,
    };
  }, [filtered, total, completed]);

  const openPdfReport = async () => {
    if (!user?.id) return;
    setDownloadingReport(true);
    try {
      const report = await generateReport({
        projectId,
        type: 'daily',
        modules: ['diary'],
        format: 'pdf',
      });

      const rawUrl = report?.fileUrl;
      if (!rawUrl) {
        Alert.alert('Unavailable', 'PDF file is not available for this report yet.');
        return;
      }

      const host = API_BASE_URL.replace(/\/api\/?$/, '');
      const resolvedUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${host}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

      const canOpen = await Linking.canOpenURL(resolvedUrl);
      if (!canOpen) {
        Alert.alert('Error', 'Unable to open PDF download link on this device.');
        return;
      }

      await Linking.openURL(resolvedUrl);
      setShowReport(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to generate PDF report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const renderHeader = () => (
    <View style={S.pageHeader}>
      <Text style={S.pageDesc}>
        Manage daily site logs with faster scanning, stronger status visibility, and cleaner project context.
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
          onPress={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
        >
          <Icon
            name={sortBy === 'newest' ? 'sort-calendar-descending' : 'sort-calendar-ascending'}
            size={20}
            color="#b0c985"
          />
        </TouchableOpacity>
      </View>

      <View style={S.tabsRow}>
        {([
          { key: 'all',       icon: 'view-list-outline',   count: total,     label: 'All'  },
          { key: 'pending',   icon: 'clock-outline',        count: pending,   label: 'Pending' },
          { key: 'completed', icon: 'check-circle-outline', count: completed, label: 'Done' },
          { key: 'rejected',  icon: 'close-circle-outline', count: rejected,  label: 'Rejected' },
          { key: 'permanent', icon: 'cancel',               count: permanent, label: 'Perm.' },
        ] as const).map(({ key, icon, count, label }) => {
          const active = filterStatus === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilterStatus(key)}
              style={[S.tab, active && S.tabActive]}
            >
              <Icon name={icon} size={15} color={active ? '#b0c985' : '#666'} />
              <Text style={[S.tabText, active && S.tabTextActive]}>{count}</Text>
              <Text style={[S.tabLabel, active && S.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Text style={S.shownText}>{filtered.length} shown</Text>
    </View>
  );

  const navActions = (
    <View style={S.navActions}>
      <TouchableOpacity style={S.navActionBtn} onPress={() => setShowCreate(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="plus" size={20} color="#b0c985" />
      </TouchableOpacity>
      <TouchableOpacity style={S.navActionBtnSecondary} onPress={() => setShowReport(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="file-chart-outline" size={20} color="#aaa" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Site Diary</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{projectName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => setShowReport(true)} style={{ backgroundColor: '#2a2a2a', borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><Icon name="file-chart-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreate(true)} style={{ backgroundColor: ACCENT, borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={20} color="#fff" /></TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const expired = isEntryExpired(item);
          const canEdit = canUserUpdateForm(item) || canUserEditEntry(item);
          return (
            <FormEntryCard
              date={dayjs(item.date).format('YYYY-MM-DD')}
              title={item.name || `Diary - ${projectName} - ${dayjs(item.date).format('DD MMM')}`}
              status={item.status}
              accentColor={ACCENT}
              isExpired={expired}
              expiresAt={item.expires_at || item.expiresAt}
              metaItems={[
                { icon: 'account-outline', text: item.author },
                { icon: 'file-document-outline', text: `Form No: ${item.form_number || item.id.substring(0, 8)}` },
                { icon: 'weather-partly-cloudy', text: [item.weather, item.temperature].filter(Boolean).join(', ') || 'Not specified' },
              ]}
              isAdmin={user?.role === 'admin'}
              expiryDraft={expiryDrafts[item.id] || ''}
              onExpiryDraftChange={(val) => setExpiryDrafts(prev => ({ ...prev, [item.id]: val }))}
              onSetExpiry={async () => {
                const draft = expiryDrafts[item.id];
                if (!draft || !user?.id) return;
                try {
                  setSavingExpiry(prev => ({ ...prev, [item.id]: true }));
                  await setDiaryExpiry(item.id, user.id, new Date(draft).toISOString());
                  fetchEntries();
                } catch { Alert.alert('Error', 'Failed to set expiry'); }
                setSavingExpiry(prev => ({ ...prev, [item.id]: false }));
              }}
              savingExpiry={!!savingExpiry[item.id]}
              onSetExpired={() => handleSetExpiryStatus(item, false)}
              updatingExpiry={!!updatingExpiryStatus[item.id]}
              onSetActive={() => handleSetExpiryStatus(item, true)}
              onViewDetails={() => openDetail(item)}
              onHistory={() => fetchHistory(item.id)}
              showEdit={canEdit}
              editLabel={canEdit ? 'Edit Form' : 'View Form'}
              onEdit={() => { setSelectedEntry(item); setShowFormView(true); }}
              onRename={() => handleRenameDiary(item)}
              onDelete={() => handleDelete(item)}
            >
              <CardContentBlock label="Work Completed" value={item.work_completed} />
              <CardGrid
                items={[
                  { label: 'Incidents', value: item.incidents_reported },
                  { label: 'Materials', value: item.materials_delivered },
                ]}
              />
              <CardContentBlock label="Additional Notes" value={item.notes} />
            </FormEntryCard>
          );
        }}
      />

      {/* View Details Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={[S.detailsSheet, isSmallScreen && S.detailsSheetMobile]}>
            <View style={S.sheetHeader}>
              <Text style={S.sheetTitle}>Diary Entry Details</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            
            {selectedEntry && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.detailScrollContent}>
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
                    <TextInput style={[S.input, { marginBottom: spacing.sm }]} value={workflowComment} onChangeText={setWorkflowComment} placeholder="Comment (optional)" placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
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
                <View style={S.exportRow}>
                  <TouchableOpacity style={S.exportBtn}><Icon name="download" size={16} color="#fff" /><Text style={S.exportBtnText}>Export</Text></TouchableOpacity>
                  <TouchableOpacity style={S.exportBtn}><Icon name="printer" size={16} color="#fff" /><Text style={S.exportBtnText}>Print</Text></TouchableOpacity>
                </View>

                <View style={{ height: 1, backgroundColor: '#333', marginVertical: 20 }} />
                
                <View style={S.bottomActionRow}>
                  <TouchableOpacity style={[S.bottomBtn, S.bottomBtnDanger]}><Text style={[S.bottomBtnText, { color: '#ff7373' }]}>Delete</Text></TouchableOpacity>
                  {selectedEntry && (canUserUpdateForm(selectedEntry) || canUserEditEntry(selectedEntry)) && (
                    <TouchableOpacity
                      style={[S.bottomBtn, S.primaryBottomBtn]}
                      onPress={() => { setShowDetail(false); setShowFormView(true); }}
                    >
                      <Text style={S.primaryBottomBtnText}>
                        {canUserUpdateForm(selectedEntry) || canUserEditEntry(selectedEntry) ? 'Edit Form' : 'View Form'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedEntry && !canUserUpdateForm(selectedEntry) && !canUserEditEntry(selectedEntry) && (
                    <TouchableOpacity
                      style={S.bottomBtn}
                      onPress={() => { setShowDetail(false); setShowFormView(true); }}
                    >
                      <Text style={S.bottomBtnText}>View Form</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={S.bottomBtn} onPress={() => setShowDetail(false)}><Text style={S.bottomBtnText}>Close</Text></TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit / View Form Modal */}
      <Modal visible={showFormView} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
          <View style={[S.sheetHeader, { paddingTop: 50, paddingHorizontal: 20 }]}>
            <Text style={S.sheetTitle}>
              {selectedEntry && (canUserUpdateForm(selectedEntry) || canUserEditEntry(selectedEntry)) ? 'Edit Diary Entry' : 'View Diary Entry'}
            </Text>
            <TouchableOpacity onPress={() => setShowFormView(false)}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
          </View>
          {selectedEntry && (
            <SiteDiaryFormTemplate
              onClose={() => setShowFormView(false)}
              onSave={handleFormUpdate}
              initialData={selectedEntry.form_data}
              readOnly={!canUserUpdateForm(selectedEntry) && !canUserEditEntry(selectedEntry)}
            />
          )}
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

             <View style={[S.processActions, isSmallScreen && S.processActionsMobile]}>
               <TouchableOpacity style={S.backBtn} onPress={() => setShowProcessFlow(false)}><Text style={S.backBtnText}>Back to Form</Text></TouchableOpacity>
               <View style={[S.processActionGroup, isSmallScreen && S.processActionGroupMobile]}>
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

      <Modal visible={showReport} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={[S.reportSheet, isSmallScreen && S.detailsSheetMobile]}>
            <View style={S.reportHeaderBar}>
              <View style={{ flex: 1 }}>
                <Text style={S.reportHeaderTitle}>Diary Full Report</Text>
                <Text style={S.reportHeaderSub}>Includes all currently listed diary entries with visuals, trends and details.</Text>
              </View>
              <TouchableOpacity style={S.reportHeaderAction} onPress={openPdfReport} disabled={downloadingReport}>
                {downloadingReport ? <ActivityIndicator color="#0a0a0a" size="small" /> : <Icon name="download" size={14} color="#0a0a0a" />}
                <Text style={S.reportHeaderActionText}>{downloadingReport ? 'Generating…' : 'Download PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowReport(false)}><Icon name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>

            <ScrollView style={S.reportBody} showsVerticalScrollIndicator={false}>
              <View style={S.reportStatsRow}>
                <View style={S.reportStatCard}><Text style={S.reportStatLabel}>Entries</Text><Text style={S.reportStatValue}>{filtered.length}</Text></View>
                <View style={S.reportStatCard}><Text style={S.reportStatLabel}>Completion</Text><Text style={S.reportStatValue}>{reportData.completionRate}%</Text></View>
                <View style={S.reportStatCard}><Text style={S.reportStatLabel}>Contributors</Text><Text style={S.reportStatValue}>{contributors}</Text></View>
              </View>

              <View style={S.reportChartsRow}>
                <View style={S.reportCard}>
                  <Text style={S.reportCardTitle}>Top Contributors</Text>
                  {reportData.contributorsList.length === 0 && <Text style={S.reportMuted}>No data available</Text>}
                  {reportData.contributorsList.map((item) => {
                    const width = reportData.topContributor.count > 0 ? Math.max(8, Math.round((item.count / reportData.topContributor.count) * 100)) : 0;
                    return (
                      <View key={item.name} style={S.reportBarItem}>
                        <View style={[S.reportBarFill, { width: `${width}%` }]} />
                        <Text style={S.reportBarLabel}>{item.name} ({item.count})</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={S.reportCard}>
                  <Text style={S.reportCardTitle}>Weather Distribution</Text>
                  {reportData.weatherList.length === 0 && <Text style={S.reportMuted}>No data available</Text>}
                  {reportData.weatherList.map((item) => {
                    const width = reportData.topWeather.count > 0 ? Math.max(8, Math.round((item.count / reportData.topWeather.count) * 100)) : 0;
                    return (
                      <View key={item.label} style={S.reportBarItem}>
                        <View style={[S.reportBarFillMuted, { width: `${width}%` }]} />
                        <Text style={S.reportBarLabel}>{item.label} ({item.count})</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={S.reportCard}>
                <Text style={S.reportCardTitle}>Report Highlights</Text>
                <View style={S.reportHighlightGrid}>
                  <View style={S.reportHighlightItem}><Text style={S.reportHighlightText}>Completion rate is {reportData.completionRate}% across {filtered.length} entries.</Text></View>
                  <View style={S.reportHighlightItem}><Text style={S.reportHighlightText}>{reportData.incidents.length} entries include incidents.</Text></View>
                  <View style={S.reportHighlightItem}><Text style={S.reportHighlightText}>{reportData.topContributor.name} logged the highest entries ({reportData.topContributor.count}).</Text></View>
                  <View style={S.reportHighlightItem}><Text style={S.reportHighlightText}>Most common weather is {reportData.topWeather.label} ({reportData.topWeather.count} entries).</Text></View>
                  <View style={S.reportHighlightItem}><Text style={S.reportHighlightText}>{reportData.avgTemp ? `Average temperature: ${reportData.avgTemp}°` : 'Not enough temperature data to calculate average.'}</Text></View>
                </View>
              </View>

              <View style={S.reportCard}>
                <Text style={S.reportCardTitle}>Incident Details</Text>
                <View style={S.reportTableHeader}>
                  <Text style={[S.reportTableHeadText, { flex: 1.1 }]}>Date</Text>
                  <Text style={[S.reportTableHeadText, { flex: 1.2 }]}>Author</Text>
                  <Text style={[S.reportTableHeadText, { flex: 2 }]}>Incident</Text>
                </View>
                {reportData.incidents.length === 0 ? (
                  <Text style={S.reportEmptyTable}>No incidents found in the currently listed entries.</Text>
                ) : reportData.incidents.map((entry) => (
                  <View key={entry.id} style={S.reportTableRow}>
                    <Text style={[S.reportTableCell, { flex: 1.1 }]}>{dayjs(entry.date).format('DD MMM')}</Text>
                    <Text style={[S.reportTableCell, { flex: 1.2 }]}>{entry.author}</Text>
                    <Text style={[S.reportTableCell, { flex: 2 }]} numberOfLines={2}>{entry.incidents_reported}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRenameModal} animationType="fade" transparent>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', alignItems:'center', padding: spacing.lg }}>
          <View style={{ backgroundColor:'#111', borderRadius: radius.lg, borderWidth:1, borderColor:'#222', padding: spacing.lg, width:'100%' }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight:'800', marginBottom: spacing.md }}>Rename Diary</Text>
            <TextInput style={{ backgroundColor:'#0d0d0d', color: colors.text, borderRadius: radius.md, borderWidth:1, borderColor:'#222', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize:14, marginBottom: spacing.md }} value={renameValue} onChangeText={setRenameValue} placeholder="New name..." placeholderTextColor={colors.textMuted} />
            <View style={{ flexDirection:'row', gap: spacing.sm }}>
              <TouchableOpacity style={{ flex:1, alignItems:'center', paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth:1, borderColor:'#222' }} onPress={() => setShowRenameModal(false)}><Text style={{ color: colors.textMuted, fontWeight:'700' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex:1, alignItems:'center', paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: ACCENT }} onPress={saveRename}><Text style={{ color:'#fff', fontWeight:'700' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reminder Modal */}
      <Modal visible={showReminderModal} animationType="fade" transparent>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', alignItems:'center', padding: spacing.lg }}>
          <View style={{ backgroundColor:'#111', borderRadius: radius.lg, borderWidth:1, borderColor:'#222', padding: spacing.lg, width:'100%' }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight:'800', marginBottom: spacing.md }}>Send Reminder</Text>
            <TextInput style={{ backgroundColor:'#0d0d0d', color: colors.text, borderRadius: radius.md, borderWidth:1, borderColor:'#222', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize:14, marginBottom: spacing.md, minHeight:80, textAlignVertical:'top' }} value={reminderMessage} onChangeText={setReminderMessage} placeholder="Reminder message..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
            <View style={{ flexDirection:'row', gap: spacing.sm }}>
              <TouchableOpacity style={{ flex:1, alignItems:'center', paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth:1, borderColor:'#222' }} onPress={() => setShowReminderModal(false)}><Text style={{ color: colors.textMuted, fontWeight:'700' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex:1, alignItems:'center', paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: ACCENT }} onPress={sendReminder}><Text style={{ color:'#fff', fontWeight:'700' }}>Send</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PeopleSelectorModal isOpen={showPeopleSelector} onClose={() => setShowPeopleSelector(false)} users={projectMembers} onSelect={handleUserSelection} title={peopleSelectorType === 'executor' ? 'Select Executor' : 'Add CC Recipient'} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} history={historyData} onRestore={handleRestoreHistory} onView={(h) => { setSelectedHistoryEntry(h); setShowHistory(false); setShowHistoryForm(true); }} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 80 },
  pageHeader: { marginBottom: 20 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navActionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1e2a10', alignItems: 'center', justifyContent: 'center' },
  navActionBtnSecondary: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  pageDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 19 },
  projectChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e2414', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334020', marginBottom: 20 },
  projectChipText: { color: '#e2ebcf', fontSize: 12, fontWeight: '600' },
  
  statsBox: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#222', paddingVertical: 12, marginBottom: 24 },
  statItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#222' },
  statLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 10, height: 42 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8 },
  sortBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },

  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', gap: 2 },
  tabActive: { backgroundColor: '#1a2a10', borderColor: '#b0c985' },
  tabText: { color: '#666', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#b0c985' },
  tabLabel: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 0.2 },
  tabLabelActive: { color: '#b0c985' },
  shownText: { color: '#555', fontSize: 12, marginBottom: 14 },

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

  activationWrap: { alignItems: 'flex-start', marginBottom: 16 },
  activationBtn: { borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 4 },
  activationBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  cardActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#222' },
  cardActionBtn: { minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: '#303030', backgroundColor: '#171717', paddingHorizontal: 12, justifyContent: 'center' },
  cardActionDelete: { borderColor: '#4b2a2a', backgroundColor: '#251616' },
  actionLink: { color: '#fff', fontSize: 13, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  detailsSheet: { width: '90%', maxHeight: '90%', backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  reportSheet: { width: '92%', maxHeight: '92%', backgroundColor: '#070b05', borderRadius: 12, borderWidth: 1, borderColor: '#2a3b19', overflow: 'hidden' },
  detailsSheetMobile: { width: '95%', maxHeight: '94%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  detailScrollContent: { padding: 20, paddingBottom: 28 },
  
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

  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 6 },
  exportBtnText: { color: '#fff', fontSize: 13 },
  
  bottomActionRow: { flexDirection: 'row', gap: 10 },
  bottomBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#333', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  bottomBtnDanger: { borderColor: '#4b2a2a', backgroundColor: '#251616' },
  primaryBottomBtn: { backgroundColor: '#b0c985', borderColor: '#b0c985' },
  bottomBtnText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  primaryBottomBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },

  reportHeaderBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#5f7f2b' },
  reportHeaderTitle: { color: '#fff', fontSize: 21, fontWeight: '700' },
  reportHeaderSub: { color: '#e3efcf', fontSize: 12, marginTop: 2 },
  reportHeaderAction: { minHeight: 34, borderRadius: 8, backgroundColor: '#b8d37a', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportHeaderActionText: { color: '#0a0a0a', fontSize: 12, fontWeight: '700' },

  reportBody: { paddingHorizontal: 12, paddingVertical: 12 },
  reportStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  reportStatCard: { flex: 1, backgroundColor: '#0b1108', borderWidth: 1, borderColor: '#1a2811', borderRadius: 8, padding: 10 },
  reportStatLabel: { color: '#8aaa63', fontSize: 11, marginBottom: 4 },
  reportStatValue: { color: '#e7f1d5', fontSize: 18, fontWeight: '700' },

  reportChartsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  reportCard: { flex: 1, backgroundColor: '#080c06', borderWidth: 1, borderColor: '#1a2811', borderRadius: 8, padding: 10, marginBottom: 10 },
  reportCardTitle: { color: '#dceabf', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  reportMuted: { color: '#6f8257', fontSize: 12 },
  reportBarItem: { height: 26, justifyContent: 'center', marginBottom: 8, position: 'relative', borderRadius: 4, overflow: 'hidden', backgroundColor: '#10180b' },
  reportBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6f8f38' },
  reportBarFillMuted: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#90a86f' },
  reportBarLabel: { color: '#deedbe', fontSize: 11, paddingHorizontal: 8, zIndex: 2 },

  reportHighlightGrid: { gap: 8 },
  reportHighlightItem: { borderWidth: 1, borderColor: '#172311', backgroundColor: '#0d1309', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  reportHighlightText: { color: '#d8e8bb', fontSize: 12 },

  reportTableHeader: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1a2811', paddingVertical: 7, marginBottom: 4 },
  reportTableHeadText: { color: '#9eb879', fontSize: 11, fontWeight: '700' },
  reportTableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#131c0d' },
  reportTableCell: { color: '#deebc5', fontSize: 11, paddingRight: 8 },
  reportEmptyTable: { color: '#7f9363', fontSize: 12, paddingVertical: 10, textAlign: 'center' },

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
  
  processActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 20, gap: 12 },
  processActionsMobile: { flexDirection: 'column', alignItems: 'stretch' },
  processActionGroup: { flexDirection: 'row', gap: 10 },
  processActionGroupMobile: { flexDirection: 'column' },
  backBtn: { padding: 12 },
  backBtnText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  cancelPBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelPBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  savePBtn: { backgroundColor: '#b0c985', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  savePBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
});
