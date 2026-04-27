import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import {
  getDiaryEntries,
  getDiaryEntryById,
  createDiaryEntry,
  deleteDiaryEntry,
  updateDiaryWorkflowAction,
  SiteDiaryFormData,
  StaffRow,
  LabourRow,
  EquipmentRow,
  AssistanceRow,
  SaveProcessNode,
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
import {
  getDiaryHistory,
  restoreDiaryFromHistory,
  setDiaryExpiry,
  setDiaryExpiryStatus,
  renameDiary,
  sendNodeReminder,
} from '../../api/diary';

type RouteProps = RouteProp<AppStackParamList, 'Diary'>;
const ACCENT = '#0ea5e9';

interface WorkflowNode {
  id: string; node_order: number; node_name: string;
  executor_id?: string; executor_name?: string; status: string;
}
function RowSection({
  title,
  addLabel,
  removeLabel,
  onAdd,
  onRemove,
  canRemove,
  children,
}: {
  title: string;
  addLabel: string;
  removeLabel: string;
  onAdd: () => void;
  onRemove: () => void;
  canRemove: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={S.rowSection}>
      <Text style={S.rowSectionTitle}>{title}</Text>
      {children}
      <View style={S.rowSectionActions}>
        <TouchableOpacity onPress={onAdd}><Text style={S.addRowText}>{addLabel}</Text></TouchableOpacity>
        {canRemove ? <TouchableOpacity onPress={onRemove}><Text style={S.removeRowText}>{removeLabel}</Text></TouchableOpacity> : null}
      </View>
    </View>
  );
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
}

function generateDiaryFormNumber() {
  return `DY-${dayjs().format('YYYYMMDD-HHmmss')}`;
}

function createDefaultFormData(): SiteDiaryFormData {
  return {
    formNumber: generateDiaryFormNumber(),
    date: dayjs().format('YYYY-MM-DD'),
    contractNo: '',
    day: dayjs().format('dddd'),
    contractDate: '',
    toBeInsert: '(To be insert)',
    clientDepartment: '',
    contractor: '',
    weatherAM: '',
    weatherPM: '',
    rainfall: '',
    signal: '',
    instructions: '',
    comments: '',
    utilities: '',
    visitor: '',
    remarks: '',
    weather: 'Sunny',
    temperature: '',
    work_completed: '',
    incidents_reported: '',
    materials_delivered: '',
    notes: '',
    staffData: [{ staffTitle: '', staffCount: '' }],
    staffData2: [{ staffTitle: '', staffCount: '' }],
    labourData: [{ labourType: '', labourCode: '', labourCount: '' }],
    equipmentData: [{ equipmentType: '', totalOnSite: '', working: '', idling: '' }],
    assistanceData: [{ description: '', workNo: '' }],
    signatures: {
      projectManagerName: '',
      projectManagerDate: '',
      contractorRepName: '',
      contractorRepDate: '',
      supervisorName: '',
      supervisorDate: '',
    },
  };
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
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'completed'|'rejected'>('all');
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
  const [pendingDiaryExpiry, setPendingDiaryExpiry] = useState(dayjs().add(10, 'day').format('YYYY-MM-DDTHH:mm'));
  const [processNodes, setProcessNodes] = useState<PFNode[]>([
    { id: 'start', type: 'start', name: 'Start', settings: {} },
    { id: 'review', type: 'node', name: 'Review & Approval', ccRecipients: [], settings: {}, editAccess: true },
    { id: 'end', type: 'end', name: 'Complete', settings: {} },
  ]);
  const [selectedNode, setSelectedNode] = useState<PFNode | null>(null);
  const [showPeopleSelector, setShowPeopleSelector] = useState(false);
  const [peopleSelectorType, setPeopleSelectorType] = useState<'executor' | 'cc'>('executor');
  const [showReport, setShowReport] = useState(false);
  const [formPage, setFormPage] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SiteDiaryFormData>(createDefaultFormData);
  const [diaryName, setDiaryName] = useState('');
  const [expiryAt, setExpiryAt] = useState(dayjs().add(10, 'day').format('YYYY-MM-DDTHH:mm'));
  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([]);
  const [reviewerId, setReviewerId] = useState<string>('');

  const updateFormField = (field: keyof SiteDiaryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateSignField = (field: keyof SiteDiaryFormData['signatures'], value: string) => {
    setFormData(prev => ({ ...prev, signatures: { ...prev.signatures, [field]: value } }));
  };

  const addRow = (key: 'staffData' | 'staffData2' | 'labourData' | 'equipmentData' | 'assistanceData') => {
    setFormData(prev => {
      if (key === 'staffData' || key === 'staffData2') {
        return { ...prev, [key]: [...prev[key], { staffTitle: '', staffCount: '' }] };
      }
      if (key === 'labourData') {
        return { ...prev, labourData: [...prev.labourData, { labourType: '', labourCode: '', labourCount: '' }] };
      }
      if (key === 'equipmentData') {
        return {
          ...prev,
          equipmentData: [...prev.equipmentData, { equipmentType: '', totalOnSite: '', working: '', idling: '' }],
        };
      }
      return { ...prev, assistanceData: [...prev.assistanceData, { description: '', workNo: '' }] };
    });
  };

  const removeLastRow = (key: 'staffData' | 'staffData2' | 'labourData' | 'equipmentData' | 'assistanceData') => {
    setFormData(prev => {
      const list = prev[key];
      if (list.length <= 1) return prev;
      return { ...prev, [key]: list.slice(0, -1) };
    });
  };

  const updateStaffRow = (
    key: 'staffData' | 'staffData2',
    index: number,
    field: keyof StaffRow,
    value: string,
  ) => {
    setFormData(prev => {
      const rows = [...prev[key]];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, [key]: rows };
    });
  };

  const updateLabourRow = (index: number, field: keyof LabourRow, value: string) => {
    setFormData(prev => {
      const rows = [...prev.labourData];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, labourData: rows };
    });
  };

  const updateEquipmentRow = (index: number, field: keyof EquipmentRow, value: string) => {
    setFormData(prev => {
      const rows = [...prev.equipmentData];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, equipmentData: rows };
    });
  };

  const updateAssistanceRow = (index: number, field: keyof AssistanceRow, value: string) => {
    setFormData(prev => {
      const rows = [...prev.assistanceData];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, assistanceData: rows };
    });
  };

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const members = await getProjectMembers(projectId);
        setProjectMembers(Array.isArray(members) ? members : []);
      } catch (error) {
        console.error('Failed to load project members for diary workflow:', error);
        setProjectMembers([]);
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

  const handleCreate = async () => {
    // Deprecated - creation now happens via process flow modal
    Alert.alert('Info', 'Use the form save button to continue to process flow configuration.');
  };

  const handleFormSaved = (data: SiteDiaryFormData) => {
    // Called when SiteDiaryFormTemplate is saved
    setPendingFormData(data);
    const defaultName = `Diary - ${projectName || 'Project'} - ${dayjs(data.date).format('DD MMM')}`;
    setPendingDiaryName(defaultName);
    setPendingDiaryExpiry(dayjs().add(10, 'day').format('YYYY-MM-DDTHH:mm'));
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
      const updated = { ...selectedNode, ccRecipients: [...(selectedNode.ccRecipients || []), selectedUser] } as PFNode;
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
    if (!pendingDiaryExpiry || !dayjs(pendingDiaryExpiry).isValid()) { Alert.alert('Validation', 'Provide a valid expiry date.'); return; }
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

      await createDiaryEntry({
        formData: pendingFormData,
        processNodes: nodesForBackend,
        createdBy: user.id,
        project_id: projectId,
        formId: pendingFormData.formNumber,
        name: pendingDiaryName.trim(),
        expiresAt: dayjs(pendingDiaryExpiry).toISOString(),
      });
      setShowProcessFlow(false);
      setPendingFormData(null);
      resetForm();
      fetchEntries();
      Alert.alert('Success', 'Diary entry created successfully!');
    } catch (e:any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to create entry'); }
    setSubmitting(false);
  };

  const handleCancelProcessFlow = () => {
    setShowProcessFlow(false);
    setShowCreate(true);
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

  const formatDateTimeLocal = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const getDefaultExpiryDate = (entry: FullEntry) => {
    const baseDate = new Date(entry.created_at || entry.date);
    const resolvedBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const defaultExpiryDate = new Date(resolvedBaseDate);
    defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 10);
    return defaultExpiryDate;
  };

  const getEntryExpiryDate = (entry: FullEntry) => {
    const expirySource = (entry as any).expires_at || (entry as any).expiresAt;
    const parsed = expirySource ? new Date(expirySource) : getDefaultExpiryDate(entry);
    return Number.isNaN(parsed.getTime()) ? getDefaultExpiryDate(entry) : parsed;
  };

  const isEntryExpired = (entry: FullEntry) => {
    return (entry as any).active === false || getEntryExpiryDate(entry).getTime() <= Date.now();
  };

  useEffect(() => {
    if (entries.length === 0) return;
    setExpiryDrafts((prev) => {
      const next = { ...prev };
      entries.forEach((entry) => {
        if (!next[entry.id]) {
          const expirySource = (entry as any).expires_at || (entry as any).expiresAt;
          const expiryDate = expirySource ? new Date(expirySource) : getDefaultExpiryDate(entry);
          next[entry.id] = formatDateTimeLocal(expiryDate);
        }
      });
      return next;
    });
  }, [entries]);

  const handleSetExpiry = async (entry: FullEntry) => {
    if (!user?.id || user.role !== 'admin') return;
    const selectedExpiry = expiryDrafts[entry.id];
    if (!selectedExpiry) { Alert.alert('Validation', 'Please choose an expiry date first.'); return; }
    const expiryDate = new Date(selectedExpiry);
    if (Number.isNaN(expiryDate.getTime())) { Alert.alert('Validation', 'Please provide a valid expiry date.'); return; }
    try {
      setSavingExpiry(prev => ({ ...prev, [entry.id]: true }));
      await setDiaryExpiry(entry.id, user.id, expiryDate.toISOString());
      Alert.alert('Success', 'Expiry date updated successfully.');
      fetchEntries();
      if (selectedEntry?.id === entry.id) { await openDetail(entry); }
    } catch (e) { Alert.alert('Error', 'Failed to set expiry date'); }
    setSavingExpiry(prev => ({ ...prev, [entry.id]: false }));
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
    // Alert.prompt exists on iOS; fall back to simple prompt replacement on Android
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
      Alert.alert('Success', 'Diary renamed successfully.');
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
      Alert.alert('Success', 'Reminder sent successfully for this node.');
    } catch (e) { Alert.alert('Error', 'Failed to send reminder'); }
    setSendingNodeReminder(prev => ({ ...prev, [key]: false }));
  };

  const resetForm = () => {
    setFormData(createDefaultFormData());
    setDiaryName('');
    setExpiryAt(dayjs().add(10, 'day').format('YYYY-MM-DDTHH:mm'));
    setReviewerId('');
    setFormPage(1);
  };

  const filtered = entries
    .filter(e => {
      const q = searchQuery.toLowerCase();
      if (q && !e.work_completed?.toLowerCase().includes(q) && !e.author?.toLowerCase().includes(q) && !e.date?.includes(q)) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'rejected') return e.status === 'rejected' || e.status === 'permanently_rejected';
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
  const rejected = entries.filter(e => e.status === 'rejected' || e.status === 'permanently_rejected').length;

  const reportSummaryText = useMemo(() => {
    const lines = filtered.map((entry, idx) => {
      const name = entry.name || entry.form_number || entry.id.slice(0, 8);
      return `${idx + 1}. ${entry.date} | ${name}\nAuthor: ${entry.author}\nStatus: ${workflowStatusLabel(entry.status)}\nWork: ${entry.work_completed || 'None'}`;
    });
    return [
      `Site Diary Report (${dayjs().format('YYYY-MM-DD HH:mm')})`,
      `Project: ${projectName}`,
      `Total: ${filtered.length} | Pending: ${pending} | Completed: ${completed} | Rejected: ${rejected}`,
      '',
      ...lines,
    ].join('\n\n');
  }, [filtered, pending, completed, rejected, projectName]);

  const handleExportReport = async () => {
    try {
      await Share.share({ message: reportSummaryText, title: `${projectName} Diary Report` });
    } catch {}
  };

  const handleDownloadFormPdf = () => {
    Alert.alert('Download PDF', 'PDF download is not available on mobile yet, but all form data is saved with this diary entry.');
  };

  const handleExportEntry = async () => {
    if (!selectedEntry) return;
    const msg = [
      `Diary Entry Details (${selectedEntry.date})`,
      `Author: ${selectedEntry.author || 'Unknown'}`,
      `Weather: ${selectedEntry.weather || 'Not specified'}, ${selectedEntry.temperature || ''}`,
      `Work Completed: ${selectedEntry.work_completed || 'None'}`,
      `Incidents Reported: ${selectedEntry.incidents_reported || 'None'}`,
      `Materials Delivered: ${selectedEntry.materials_delivered || 'None'}`,
      `Additional Notes: ${selectedEntry.notes || 'None'}`,
      `Workflow Status: ${workflowStatusLabel(selectedEntry.status)}`,
    ].join('\n');
    try {
      await Share.share({ message: msg, title: 'Diary Entry Details' });
    } catch {}
  };

  const handlePrintEntry = () => {
    Alert.alert('Print', 'Print is not available in-app yet. Use Export to share and print from another app.');
  };

  const canApprove = (e: FullEntry) => {
    if (!user) return false;
    if (e.status === 'completed' || e.status === 'permanently_rejected') return false;
    if (user.role === 'admin') return true;
    const node = e.diary_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    return node?.executor_id === user.id;
  };

  return (
    <ModuleShell title="Site Diary" iconName="book-open-outline" accentColor={ACCENT} projectName={projectName}
      rightAction={
        <View style={S.actionHeaderRow}>
          <TouchableOpacity style={[S.addBtn, { backgroundColor: ACCENT }]} onPress={() => setShowCreate(true)}>
            <Icon name="plus" size={15} color="#fff" />
            <Text style={S.addBtnText}>New Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.reportBtn} onPress={() => setShowReport(true)}>
            <Icon name="file-chart-outline" size={15} color={colors.textMuted} />
            <Text style={S.reportBtnText}>Generate</Text>
          </TouchableOpacity>
        </View>
      }>

      <Modal visible={showReport} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={S.detailSheet}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Diary Full Report</Text>
              <TouchableOpacity onPress={() => setShowReport(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={S.reportActionRow}>
              <TouchableOpacity style={S.reportActionBtn} onPress={handleExportReport}>
                <Icon name="download" size={15} color={ACCENT} />
                <Text style={[S.reportActionText, { color: ACCENT }]}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.reportActionBtn} onPress={() => setShowReport(false)}>
                <Icon name="close" size={15} color={colors.textMuted} />
                <Text style={S.reportActionText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <DRow icon="format-list-bulleted" label="Total Listed" value={String(filtered.length)} />
              <DRow icon="progress-clock" label="Pending" value={String(pending)} />
              <DRow icon="check-circle-outline" label="Completed" value={String(completed)} />
              <DRow icon="close-circle-outline" label="Rejected" value={String(rejected)} />
              {filtered.map((entry, index) => (
                <View key={entry.id} style={S.reportCard}>
                  <Text style={S.reportCardTitle}>{index + 1}. {entry.name || entry.form_number || entry.id.slice(0, 8)}</Text>
                  <Text style={S.reportCardLine}>{dayjs(entry.date).format('YYYY-MM-DD')} • {entry.author}</Text>
                  <Text style={S.reportCardLine}>Status: {workflowStatusLabel(entry.status)}</Text>
                  <Text style={S.reportCardLine} numberOfLines={2}>Work: {entry.work_completed || 'None'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={S.searchRow}>
        <View style={S.searchBox}>
          <Icon name="magnify" size={16} color={colors.textMuted} />
          <TextInput style={S.searchInput} placeholder="Search..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity style={S.sortBtn} onPress={() => setSortBy(s => s === 'newest' ? 'oldest' : 'newest')}>
          <Icon name={sortBy === 'newest' ? 'sort-descending' : 'sort-ascending'} size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={S.statsRow}>
        {[{l:'Total',v:total,c:ACCENT},{l:'Pending',v:pending,c:colors.warning},{l:'Done',v:completed,c:colors.success},{l:'Rejected',v:rejected,c:colors.error}].map(s => (
          <View key={s.l} style={[S.statCard, { borderTopColor: s.c }]}>
            <Text style={[S.statValue, { color: s.c }]}>{s.v}</Text>
            <Text style={S.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={S.filterRow}>
        {(['all','pending','completed','rejected'] as const).map(f => (
          <TouchableOpacity key={f} style={[S.filterTab, filterStatus === f && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]} onPress={() => setFilterStatus(f)}>
            <Text style={[S.filterText, filterStatus === f && { color: ACCENT }]}>{f === 'all' ? 'ALL' : f.toUpperCase().slice(0,4)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={ACCENT} style={{ flex:1, marginTop: 40 }} /> : (
        <FlatList data={filtered} keyExtractor={i => i.id} renderItem={({ item }) => (
          <TouchableOpacity style={S.card} onPress={() => openDetail(item)} activeOpacity={0.7}>
            <View style={S.cardTop}>
              <View style={S.cardLeft}>
                <View style={{ flex:1 }}>
                  <Text style={S.formNum}>{item.form_number || item.id?.slice(0,8)}</Text>
                  <Text style={{ color:colors.textSecondary, fontSize:11, marginTop:2 }} numberOfLines={1}>{item.work_completed?.substring(0, 50)}...</Text>
                </View>
              </View>
              <View style={[S.statusBadge, { backgroundColor: statusColor(item.status)+'22', borderColor: statusColor(item.status)+'44' }]}>
                <Text style={[S.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={S.workText} numberOfLines={2}>{item.work_completed}</Text>
            <View style={S.cardMeta}>
              <View style={S.metaItem}><Icon name="account-outline" size={13} color={colors.textMuted} /><Text style={S.metaText}>{item.author}</Text></View>
              {item.weather && <View style={[S.pill, { backgroundColor: ACCENT+'11', borderColor: ACCENT+'44' }]}><Icon name="weather-partly-cloudy" size={11} color={ACCENT} /><Text style={[S.pillText, { color: ACCENT }]}>{item.weather}</Text></View>}
              {item.temperature && <View style={S.metaItem}><Icon name="thermometer" size={13} color={colors.textMuted} /><Text style={S.metaText}>{item.temperature}</Text></View>}
              <View style={S.metaItem}><Icon name="calendar-outline" size={13} color={colors.textMuted} /><Text style={S.metaText}>{dayjs(item.date).format('DD MMM')}</Text></View>
            </View>
          </TouchableOpacity>
        )} contentContainerStyle={S.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={S.empty}><Icon name="book-open-outline" size={48} color={colors.border} /><Text style={S.emptyText}>No diary entries found</Text><Text style={S.emptySubText}>Tap "New" to create one</Text></View>}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={S.overlay}>
          <View style={S.detailSheet}>
            <View style={S.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="arrow-left" size={20} color={colors.textMuted} /></TouchableOpacity>
              <Text style={S.modalTitle}>Site Diary Entry</Text>
              {user?.role === 'admin' && selectedEntry && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => handleRenameDiary(selectedEntry)}>
                    <Icon name="pencil-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(selectedEntry)}>
                    <Icon name="delete-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {loadingDetail ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={ACCENT} size="large" />
              </View>
            ) : selectedEntry ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.lg }}>
                <View style={[S.statusBanner, { backgroundColor: statusColor(selectedEntry.status)+'22', borderColor: statusColor(selectedEntry.status)+'44' }]}>
                  <Icon name="information-outline" size={14} color={statusColor(selectedEntry.status)} />
                  <Text style={[S.statusBannerText, { color: statusColor(selectedEntry.status) }]}>{statusLabel(selectedEntry.status)}</Text>
                </View>
                <Text style={[S.sectionTitle, { marginTop: spacing.md, marginBottom: spacing.sm }]}>ENTRY DETAILS</Text>
                <DRow icon="calendar-outline" label="Date" value={dayjs(selectedEntry.date).format('DD MMM YYYY')} />
                <DRow icon="account-outline" label="Author" value={selectedEntry.author} />
                <DRow icon="weather-partly-cloudy" label="Weather" value={selectedEntry.weather} />
                <DRow icon="thermometer" label="Temperature" value={selectedEntry.temperature} />
                <DRow icon="hammer-wrench" label="Work Completed" value={selectedEntry.work_completed} multi />
                <DRow icon="alert-circle-outline" label="Incidents Reported" value={selectedEntry.incidents_reported} multi />
                <DRow icon="package-variant-outline" label="Materials Delivered" value={selectedEntry.materials_delivered} multi />
                <DRow icon="note-outline" label="Notes" value={selectedEntry.notes} multi />
                {!!selectedEntry.form_data?.contractNo && (
                  <DRow icon="file-document-outline" label="Contract No." value={selectedEntry.form_data.contractNo} />
                )}
                {!!selectedEntry.form_data?.clientDepartment && (
                  <DRow icon="office-building-outline" label="Client Department" value={selectedEntry.form_data.clientDepartment} />
                )}

                {user?.role === 'admin' && (
                  <View style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
                    <Text style={S.sectionTitle}>{isEntryExpired(selectedEntry) ? 'Activation' : 'Expiry Controls'}</Text>
                    {isEntryExpired(selectedEntry) ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <TouchableOpacity style={S.cancelBtn} onPress={() => handleSetExpiryStatus(selectedEntry, true)} disabled={!!updatingExpiryStatus[selectedEntry.id]}>
                          <Text style={S.cancelBtnText}>Set Active</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <TextInput value={expiryDrafts[selectedEntry.id] || formatDateTimeLocal(getEntryExpiryDate(selectedEntry))} onChangeText={(v) => setExpiryDrafts(prev => ({ ...prev, [selectedEntry.id]: v }))} style={[S.input, { marginBottom: spacing.sm }]} placeholder="YYYY-MM-DDTHH:mm" />
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <TouchableOpacity style={S.cancelBtn} onPress={() => handleSetExpiry(selectedEntry)} disabled={!!savingExpiry[selectedEntry.id]}>
                            <Text style={S.cancelBtnText}>Set Expiry</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={S.cancelBtn} onPress={() => handleSetExpiryStatus(selectedEntry, false)} disabled={!!updatingExpiryStatus[selectedEntry.id]}>
                            <Text style={S.cancelBtnText}>Set Expired</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {selectedEntry.diary_workflow_nodes && selectedEntry.diary_workflow_nodes.length > 0 && (
                  <View style={S.section}>
                    <Text style={S.sectionTitle}>WORKFLOW STATUS</Text>
                    {selectedEntry.diary_workflow_nodes.sort((a,b)=>a.node_order-b.node_order).map((node, idx, arr) => {
                      const min = arr[0]?.node_order; const max = arr[arr.length-1]?.node_order;
                      const isBoundary = node.node_order === min || node.node_order === max;
                      return (
                      <View key={node.id} style={S.nodeRow}>
                        <View style={[S.nodeIcon, { backgroundColor: statusColor(node.status)+'22' }]}>
                          <Icon name={node.status==='completed'?'check':node.status==='pending'?'clock-outline':node.status==='rejected'?'close':'dots-horizontal'} size={12} color={statusColor(node.status)} />
                        </View>
                        <View style={{ flex:1 }}>
                          <Text style={S.nodeName}>{node.node_name}</Text>
                          {node.executor_name ? <Text style={S.nodeExecutor}>Assigned: {node.executor_name}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                          {user?.role === 'admin' && !isBoundary && (
                            <TouchableOpacity style={[S.nodeBadge, { marginRight: 6 }]} onPress={() => handleNodeReminder(selectedEntry, node, typeof node.node_order === 'number' ? node.node_order : idx + 1)}>
                              <Text style={[S.nodeBadgeText, { color: colors.textMuted }]}>Reminder</Text>
                            </TouchableOpacity>
                          )}
                          <View style={[S.nodeBadge, { backgroundColor: statusColor(node.status)+'22' }]}>
                            <Text style={[S.nodeBadgeText, { color: statusColor(node.status) }]}>{workflowStatusLabel(node.status).toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                    )})}
                  </View>
                )}

                {selectedEntry.diary_comments && selectedEntry.diary_comments.length > 0 && (
                  <View style={S.section}>
                    <Text style={S.sectionTitle}>COMMENTS & ACTIONS</Text>
                    {[...selectedEntry.diary_comments].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(c => (
                      <View key={c.id} style={S.commentCard}>
                        <View style={S.commentTop}>
                          <Text style={S.commentUser}>{c.user_name}</Text>
                          <View style={{ flexDirection:'row', gap: spacing.xs, alignItems:'center' }}>
                            {c.action ? <View style={[S.actionPill, { backgroundColor: c.action==='approve'?colors.success+'22':c.action==='reject'?colors.error+'22':colors.textMuted+'22' }]}><Text style={[S.actionPillText, { color: c.action==='approve'?colors.success:c.action==='reject'?colors.error:colors.textMuted }]}>{c.action.toUpperCase()}</Text></View> : null}
                            <Text style={S.commentDate}>{dayjs(c.created_at).format('DD MMM')}</Text>
                          </View>
                        </View>
                        <Text style={S.commentText}>{c.comment}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {canApprove(selectedEntry) && (
                  <View style={S.actionRow}>
                    {(['reject','back','approve'] as const).map(act => (
                      <TouchableOpacity key={act} style={[S.actionBtn, { backgroundColor: act==='approve'?colors.success+'22':act==='reject'?colors.error+'22':colors.warning+'22', borderColor: act==='approve'?colors.success+'44':act==='reject'?colors.error+'44':colors.warning+'44' }]} onPress={() => handleWorkflowAction(act)} disabled={actionLoading}>
                        {actionLoading && act === 'approve' ? <ActivityIndicator size="small" color={colors.success} /> : (
                          <>
                            <Icon name={act==='approve'?'check-circle-outline':act==='reject'?'close-circle-outline':'undo-variant'} size={16} color={act==='approve'?colors.success:act==='reject'?colors.error:colors.warning} />
                            <Text style={[S.actionBtnText, { color: act==='approve'?colors.success:act==='reject'?colors.error:colors.warning }]}>{act==='approve'?'Approve':act==='reject'?'Reject':'Send Back'}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={S.utilityRow}>
                  <TouchableOpacity style={S.utilityBtn} onPress={handleExportEntry}>
                    <Icon name="download" size={14} color={colors.textMuted} />
                    <Text style={S.utilityBtnText}>Export</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.utilityBtn} onPress={handlePrintEntry}>
                    <Icon name="printer-outline" size={14} color={colors.textMuted} />
                    <Text style={S.utilityBtnText}>Print</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.utilityBtn} onPress={() => selectedEntry && fetchHistory(selectedEntry.id)}>
                    <Icon name="history" size={14} color={colors.textMuted} />
                    <Text style={S.utilityBtnText}>History</Text>
                  </TouchableOpacity>
                  {user?.role === 'admin' && selectedEntry && (
                    <TouchableOpacity style={S.utilityBtn} onPress={() => handleDelete(selectedEntry)}>
                      <Icon name="delete-outline" size={14} color={colors.error} />
                      <Text style={[S.utilityBtnText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={S.utilityBtn} onPress={() => setShowDetail(false)}>
                    <Icon name="close" size={14} color={colors.textMuted} />
                    <Text style={S.utilityBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Create Modal: render SiteDiaryFormTemplate and proceed to process flow on save */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => { setShowCreate(false); resetForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
          <View style={S.overlay}>
            <View style={S.createSheet}>
              <View style={S.modalHeader}>
                <Text style={S.modalTitle}>New Site Diary Entry</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <SiteDiaryFormTemplate onClose={() => { setShowCreate(false); resetForm(); }} onSave={handleFormSaved} initialData={formData} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Process Flow Configuration Modal */}
      <Modal visible={showProcessFlow} animationType="slide" transparent onRequestClose={handleCancelProcessFlow}>
        <View style={S.overlay}>
          <View style={{ ...S.createSheet, maxHeight: '94%' }}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Process Configuration</Text>
              <TouchableOpacity onPress={handleCancelProcessFlow}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={S.fieldLabel}>Process Flow</Text>
                  <ProcessFlowBuilder nodes={processNodes} onSelectNode={(n) => setSelectedNode(n as PFNode)} selectedNodeId={selectedNode?.id || null} onAdd={addNewNode} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.fieldLabel}>Diary Name</Text>
                  <TextInput style={S.input} value={pendingDiaryName} onChangeText={setPendingDiaryName} placeholderTextColor={colors.textMuted} />
                  <Text style={[S.fieldLabel, { marginTop: spacing.sm }]}>Expiry Date & Time</Text>
                  <TextInput style={S.input} value={pendingDiaryExpiry} onChangeText={setPendingDiaryExpiry} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.textMuted} />

                  {selectedNode ? (
                    <>
                      <Text style={[S.fieldLabel, { marginTop: spacing.sm }]}>Selected Node</Text>
                      <TextInput style={S.input} value={selectedNode.name} onChangeText={(v) => { const updated = { ...selectedNode, name: v }; setSelectedNode(updated); setProcessNodes(prev => prev.map(p => p.id === updated.id ? updated : p)); }} />
                      <Text style={[S.fieldLabel, { marginTop: spacing.sm }]}>Executor</Text>
                      <TouchableOpacity style={[S.chip, { marginTop: 6 }]} onPress={() => openPeopleSelector('executor')}>
                        <Text style={S.chipText}>{(selectedNode as any).executor || 'Select executor'}</Text>
                      </TouchableOpacity>

                      <Text style={[S.fieldLabel, { marginTop: spacing.sm }]}>CC Recipients</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                        {(selectedNode.ccRecipients || []).map((cc:any) => (
                          <TouchableOpacity key={cc.id} style={S.chip} onPress={() => removeUserFromCc(cc.id)}>
                            <Text style={S.chipText}>{cc.name} ✕</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={S.chip} onPress={() => openPeopleSelector('cc')}><Text style={S.chipText}>+ Add CC</Text></TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                        <TouchableOpacity onPress={() => { const updated = { ...selectedNode, editAccess: !(selectedNode.editAccess !== false) }; setSelectedNode(updated); setProcessNodes(prev => prev.map(p => p.id === updated.id ? updated : p)); }} style={{ marginRight: spacing.sm }}>
                          <Icon name={selectedNode.editAccess !== false ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        <Text style={{ color: colors.textMuted }}>Allow editing when this node is active</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>Select a node to configure</Text>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                    <TouchableOpacity style={S.cancelBtn} onPress={handleCancelProcessFlow}><Text style={S.cancelBtnText}>Back to Form</Text></TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TouchableOpacity style={S.cancelBtn} onPress={handleCancelProcessFlow}><Text style={S.cancelBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[S.submitBtn, { backgroundColor: ACCENT }]} onPress={handleFinalSave}><Text style={S.submitText}>Save Diary Entry</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* People Selector Modal */}
      <PeopleSelectorModal isOpen={showPeopleSelector} onClose={() => setShowPeopleSelector(false)} users={projectMembers} onSelect={handleUserSelection} title={peopleSelectorType === 'executor' ? 'Select Executor' : 'Add CC Recipient'} />
      {/* History Modal */}
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} history={historyData} onRestore={handleRestoreHistory} onView={(h) => { setSelectedHistoryEntry(h); setShowHistory(false); setShowHistoryForm(true); }} />
      {/* History Form Snapshot */}
      <Modal visible={showHistoryForm && !!selectedHistoryEntry} transparent animationType="slide" onRequestClose={() => { setShowHistoryForm(false); setShowHistory(true); }}>
        <View style={S.overlay}>
          <View style={S.createSheet}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>History Snapshot</Text>
              <TouchableOpacity onPress={() => { setShowHistoryForm(false); setShowHistory(true); }}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedHistoryEntry && (
                <SiteDiaryFormTemplate onClose={() => { setShowHistoryForm(false); setShowHistory(true); }} onSave={() => {}} initialData={selectedHistoryEntry.form_data} readOnly />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ModuleShell>
  );
}

function DRow({ icon, label, value, multi }: { icon: string; label: string; value?: string; multi?: boolean }) {
  if (!value) return null;
  return (
    <View style={S.detailRow}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:4 }}>
        <Icon name={icon} size={13} color={colors.textMuted} />
        <Text style={S.detailLabel}>{label}</Text>
      </View>
      <Text style={[S.detailValue, multi && { lineHeight:20 }]}>{value}</Text>
    </View>
  );
}
function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={S.field}><Text style={S.fieldLabel}>{label}</Text>{children}</View>;
}

const S = StyleSheet.create({
  actionHeaderRow: { flexDirection: 'row', gap: spacing.xs },
  addBtn: { flexDirection:'row', alignItems:'center', gap:4, borderRadius:radius.md, paddingHorizontal:spacing.sm, paddingVertical:6 },
  addBtnText: { color:'#fff', fontSize:12, fontWeight:'700' },
  reportBtn: { flexDirection:'row', alignItems:'center', gap:4, borderRadius:radius.md, paddingHorizontal:spacing.sm, paddingVertical:6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  reportBtnText: { color:colors.textMuted, fontSize:11, fontWeight:'700' },
  searchRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing.xl, paddingVertical:spacing.sm, gap:spacing.xs },
  searchBox: { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:colors.surface, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, paddingHorizontal:spacing.sm, gap:spacing.xs },
  searchInput: { flex:1, color:colors.text, fontSize:13, paddingVertical:spacing.xs },
  sortBtn: { width:36, height:36, borderRadius:radius.md, backgroundColor:colors.surface, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  statsRow: { flexDirection:'row', paddingHorizontal:spacing.xl, paddingBottom:spacing.sm, gap:spacing.xs },
  statCard: { flex:1, backgroundColor:colors.surface, borderRadius:radius.md, borderTopWidth:2, borderWidth:1, borderColor:colors.border, padding:spacing.xs, alignItems:'center' },
  statValue: { fontSize:18, fontWeight:'800' },
  statLabel: { color:colors.textMuted, fontSize:9, marginTop:2, textAlign:'center' },
  filterRow: { flexDirection:'row', paddingHorizontal:spacing.xl, borderBottomWidth:1, borderBottomColor:colors.border },
  filterTab: { flex:1, alignItems:'center', paddingVertical:spacing.sm, borderBottomWidth:2, borderBottomColor:'transparent' },
  filterText: { color:colors.textMuted, fontSize:10, fontWeight:'700', letterSpacing:0.5 },
  list: { padding:spacing.xl, gap:spacing.sm },
  card: { backgroundColor:colors.surface, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, padding:spacing.md, gap:spacing.sm, overflow:'hidden' },
  cardTop: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', gap:spacing.sm },
  cardLeft: { flex:1, flexDirection:'row', alignItems:'center', gap:spacing.sm },
  formNum: { color:ACCENT, fontSize:12, fontFamily:'monospace', fontWeight:'800', letterSpacing:0.5 },
  pill: { flexDirection:'row', alignItems:'center', gap:3, borderRadius:radius.full, paddingHorizontal:8, paddingVertical:3, borderWidth:1 },
  pillText: { fontSize:11, fontWeight:'600' },
  statusBadge: { borderRadius:radius.md, paddingHorizontal:10, paddingVertical:4, borderWidth:1 },
  statusText: { fontSize:10, fontWeight:'700', fontFamily:'monospace', letterSpacing:0.3 },
  workText: { color:colors.text, fontSize:14, lineHeight:19, fontWeight:'500', marginVertical:spacing.xs },
  cardMeta: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm, marginTop:spacing.xs, paddingTop:spacing.sm, borderTopWidth:1, borderTopColor:colors.border },
  metaItem: { flexDirection:'row', alignItems:'center', gap:spacing.xs },
  metaText: { color:colors.textMuted, fontSize:12, fontWeight:'500' },
  empty: { alignItems:'center', paddingVertical:80, gap:spacing.sm },
  emptyText: { color:colors.textSecondary, fontSize:15, fontWeight:'600' },
  emptySubText: { color:colors.textMuted, fontSize:13 },
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  detailSheet: { backgroundColor:colors.background, borderTopLeftRadius:24, borderTopRightRadius:24, paddingTop:spacing.lg, paddingHorizontal:spacing.md, maxHeight:'92%' },
  createSheet: { backgroundColor:'#0d0d0d', borderTopLeftRadius:24, borderTopRightRadius:24, padding:spacing.xl, maxHeight:'94%' },
  reportActionRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  reportActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  reportActionText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  reportCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
  reportCardTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  reportCardLine: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing.lg },
  modalTitle: { color:colors.text, fontSize:17, fontWeight:'800', flex:1, marginHorizontal:spacing.xs },
  statusBanner: { flexDirection:'row', alignItems:'center', gap:spacing.xs, borderRadius:radius.md, borderWidth:1, padding:spacing.sm, marginBottom:spacing.md },
  statusBannerText: { fontSize:12, fontWeight:'700' },
  detailRow: { backgroundColor:colors.surface, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, padding:spacing.md, marginBottom:spacing.sm },
  detailLabel: { color:colors.textMuted, fontSize:12, fontWeight:'700', letterSpacing:0.5, textTransform:'uppercase' },
  detailValue: { color:colors.text, fontSize:14, lineHeight:20, marginTop:spacing.xs },
  section: { marginTop:spacing.md, marginBottom:spacing.xs },
  sectionTitle: { color:colors.textMuted, fontSize:11, fontWeight:'700', letterSpacing:1, marginBottom:spacing.sm },
  nodeRow: { flexDirection:'row', alignItems:'center', backgroundColor:colors.surface, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, padding:spacing.sm, marginBottom:spacing.xs, gap:spacing.xs },
  nodeIcon: { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  nodeName: { color:colors.text, fontSize:13, fontWeight:'600' },
  nodeExecutor: { color:colors.textMuted, fontSize:11 },
  nodeBadge: { borderRadius:radius.full, paddingHorizontal:8, paddingVertical:3 },
  nodeBadgeText: { fontSize:9, fontWeight:'700', fontFamily:'monospace' },
  commentCard: { backgroundColor:colors.surface, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, padding:spacing.sm, marginBottom:spacing.xs },
  commentTop: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  commentUser: { color:colors.text, fontSize:13, fontWeight:'600' },
  actionPill: { borderRadius:radius.full, paddingHorizontal:8, paddingVertical:2 },
  actionPillText: { fontSize:9, fontWeight:'700', fontFamily:'monospace' },
  commentDate: { color:colors.textMuted, fontSize:11 },
  commentText: { color:colors.textSecondary, fontSize:13 },
  actionRow: { flexDirection:'row', gap:spacing.xs, marginTop:spacing.lg },
  actionBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, borderRadius:radius.md, borderWidth:1, padding:spacing.sm },
  actionBtnText: { fontSize:12, fontWeight:'700' },
  utilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  utilityBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  utilityBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  field: { marginBottom:spacing.md },
  fieldLabel: { color:colors.textMuted, fontSize:11, fontFamily:'monospace', letterSpacing:1, marginBottom:spacing.xxs },
  input: { backgroundColor:colors.surfaceElevated, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, color:colors.text, paddingHorizontal:spacing.md, paddingVertical:spacing.sm, fontSize:14 },
  ta: { minHeight:80, textAlignVertical:'top', paddingTop:spacing.sm },
  formTopControls: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  topControlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  topControlText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  pageSwitchRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  pageBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  pageBtnActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  pageBtnText: { color: colors.textMuted, fontWeight: '700' },
  pageBtnTextActive: { color: '#fff' },
  pageTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: spacing.md, letterSpacing: 1 },
  legendBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  legendText: { color: colors.textSecondary, fontSize: 11 },
  rowSection: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surface },
  rowSectionTitle: { color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: spacing.xs },
  tableRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  rowInput: { flex: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  rowInputSmall: { width: 72, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textAlign: 'center' },
  rowSectionActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  addRowText: { color: ACCENT, fontSize: 11, fontWeight: '700' },
  removeRowText: { color: colors.error, fontSize: 11, fontWeight: '700' },
  chipRow: { flexDirection:'row', gap:spacing.xs },
  chip: { borderRadius:radius.full, borderWidth:1, borderColor:colors.border, paddingHorizontal:spacing.md, paddingVertical:6 },
  chipText: { color:colors.textMuted, fontSize:11, fontWeight:'700' },
  footerActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  cancelBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  submitBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing.xs, borderRadius:radius.lg, padding:spacing.md, marginTop:spacing.md },
  submitText: { color:'#fff', fontSize:15, fontWeight:'700' },
});
