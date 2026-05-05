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
import { FormEntryCard, CardMetrics } from '../../components/ui/FormEntryCard';
import ModuleDetailModal from '../../components/ui/ModuleDetailModal';
import HistoryModal from '../../components/ui/HistoryModal';
import { getProjectMembers } from '../../api/team';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import client from '../../api/client';

dayjs.extend(relativeTime);

type RouteProps = RouteProp<AppStackParamList, 'Rfi'>;
type FormType = 'inspection' | 'survey';
type FilterType = 'all' | 'inspection' | 'survey' | 'approved' | 'rejected';

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
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [workflowComment, setWorkflowComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showFormView, setShowFormView] = useState(false);
  const [editFormKey, setEditFormKey] = useState(0);

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

  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [savingExpiry, setSavingExpiry] = useState<Record<string, boolean>>({});
  const [updatingExpiryStatus, setUpdatingExpiryStatus] = useState<Record<string, boolean>>({});
  const [sendingNodeReminder, setSendingNodeReminder] = useState<Record<string, boolean>>({});

  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderNode, setReminderNode] = useState<any | null>(null);
  const [reminderMsg, setReminderMsg] = useState('');

  // History form snapshot state
  const [showHistoryFormSnapshot, setShowHistoryFormSnapshot] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);

  const openDetail = async (entry: any) => {
    console.log('[RfiScreen] openDetail called, entry.id:', entry.id, 'form_type:', entry.form_type);
    setSelectedEntry(entry);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const res = await client.get(`/${entry.form_type}/${entry.id}`);
      console.log('[RfiScreen] openDetail API response keys:', Object.keys(res.data || {}));
      console.log('[RfiScreen] openDetail API response.form_data:', JSON.stringify(res.data?.form_data));
      console.log('[RfiScreen] openDetail API response (root fields):', JSON.stringify({ risc_no: res.data?.risc_no, supervisor: res.data?.supervisor, works_to_be_inspected: res.data?.works_to_be_inspected, contract_no: res.data?.contract_no, location: res.data?.location }));
      setSelectedEntry({ ...res.data, form_type: entry.form_type });
    } catch (e: any) {
      console.log('[RfiScreen] openDetail error:', e?.message);
    }
    setLoadingDetail(false);
  };

  const openFormView = async (entry: any) => {
    console.log('[RfiScreen] openFormView called, entry.id:', entry.id, 'has form_data:', !!entry.form_data);
    setSelectedEntry(entry);
    if (!entry.form_data) {
      try {
        const res = await client.get(`/${entry.form_type}/${entry.id}`);
        console.log('[RfiScreen] openFormView fetched full entry, form_data:', JSON.stringify(res.data?.form_data));
        setSelectedEntry({ ...res.data, form_type: entry.form_type });
      } catch (e: any) {
        console.log('[RfiScreen] openFormView fetch error:', e?.message);
      }
    } else {
      console.log('[RfiScreen] openFormView using existing form_data:', JSON.stringify(entry.form_data));
    }
    setEditFormKey(k => k + 1);
    setShowFormView(true);
  };

  const resolveFormData = (entry: any): any => {
    console.log('[RfiScreen] resolveFormData entry id:', entry?.id, 'has form_data:', !!entry?.form_data, 'form_data type:', typeof entry?.form_data);
    if (entry?.form_data && typeof entry.form_data === 'object' && Object.keys(entry.form_data).length > 0) {
      console.log('[RfiScreen] resolveFormData using form_data, keys:', Object.keys(entry.form_data));
      return entry.form_data;
    }
    const mapped = {
      riscNo: entry?.risc_no || entry?.riscNo,
      contractNo: entry?.contract_no || entry?.contractNo,
      revision: entry?.revision,
      supervisor: entry?.supervisor,
      attention: entry?.attention,
      works: entry?.works,
      location: entry?.location,
      worksToBeInspected: entry?.works_to_be_inspected || entry?.worksToBeInspected,
      worksCategory: entry?.works_category || entry?.worksCategory,
      inspectionDate: entry?.inspection_date || entry?.inspectionDate || entry?.date,
      inspectionTime: entry?.inspection_time || entry?.inspectionTime,
      nextOperation: entry?.next_operation || entry?.nextOperation,
      generalCleaning: entry?.general_cleaning || entry?.generalCleaning,
      scheduledDate: entry?.scheduled_date || entry?.scheduledDate,
      scheduledTime: entry?.scheduled_time || entry?.scheduledTime,
      equipment: entry?.equipment,
      issueTime: entry?.issue_time || entry?.issueTime,
      issuedBy: entry?.issued_by || entry?.issuedBy,
      issueDate: entry?.issue_date || entry?.issueDate,
      receivedTime: entry?.received_time || entry?.receivedTime,
      receivedBy: entry?.received_by || entry?.receivedBy,
      receivedDate: entry?.received_date || entry?.receivedDate,
      siteAgentAttention: entry?.site_agent_attention || entry?.siteAgentAttention,
      inspectedBy: entry?.inspected_by || entry?.inspectedBy || entry?.inspector,
      inspectedAt: entry?.inspected_at || entry?.inspectedAt,
      noObjection: entry?.no_objection || entry?.noObjection,
      deficienciesNoted: entry?.deficiencies_noted || entry?.deficienciesNoted,
      deficiencies: entry?.deficiencies || ['', '', '', '', '', '', ''],
      formReturnedTime: entry?.form_returned_time || entry?.formReturnedTime,
      formReturnedDate: entry?.form_returned_date || entry?.formReturnedDate,
      formReturnedBy: entry?.form_returned_by || entry?.formReturnedBy,
      counterSignedTime: entry?.counter_signed_time || entry?.counterSignedTime,
      counterSignedDate: entry?.counter_signed_date || entry?.counterSignedDate,
      counterSignedBy: entry?.counter_signed_by || entry?.counterSignedBy,
      formReceivedTime: entry?.form_received_time || entry?.formReceivedTime,
      formReceivedDate: entry?.form_received_date || entry?.formReceivedDate,
      formReceivedBy: entry?.form_received_by || entry?.formReceivedBy,
      project: entry?.project || entry?.name,
      survey: entry?.survey,
      surveyField: entry?.survey_field || entry?.surveyField,
      surveyedBy: entry?.surveyed_by || entry?.surveyedBy || entry?.surveyor,
      surveyedAt: entry?.surveyed_at || entry?.surveyedAt,
    };
    console.log('[RfiScreen] resolveFormData fallback mapped riscNo:', mapped.riscNo, 'contractNo:', mapped.contractNo);
    return mapped;
  };

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
    if (!entryName.trim()) { Alert.alert('Validation', 'Please provide an entry name.'); return; }

    try {
      // Prepare process nodes for backend
      const processNodesForBackend = processNodes.map(node => ({
        ...node,
        executorId: node.executorId,
        executorName: node.executor,
        editAccess: node.editAccess !== false,
      }));

      const formType = pendingType;

      // Generate RISC number if missing
      const generatedRiscNo = (pendingFormData as any).riscNo || `RISC-${Math.floor(100000 + Math.random() * 900000)}`;

      const mappedFormData: any = {
        ...(pendingFormData as any),
        project: projectName || 'Unknown Project',
        projectId,
        riscNo: generatedRiscNo,
      };

      if (formType === 'survey') {
        delete mappedFormData.inspectionTime;
      } else {
        // Inspection-specific field defaults
        mappedFormData.inspectionTime = mappedFormData.inspectionTime || '09:00';
        mappedFormData.inspectionDate = mappedFormData.inspectionDate || new Date().toISOString().split('T')[0];
        mappedFormData.inspector = mappedFormData.inspectedBy || user.name || 'Unknown Inspector';
        mappedFormData.contractNo = mappedFormData.contractNo || 'N/A';
        mappedFormData.revision = mappedFormData.revision || 'Rev-1';
        mappedFormData.supervisor = mappedFormData.supervisor || 'N/A';
        mappedFormData.attention = mappedFormData.attention || 'N/A';
        mappedFormData.location = mappedFormData.location || 'N/A';
        mappedFormData.worksToBeInspected = mappedFormData.worksToBeInspected || 'General inspection';
        mappedFormData.worksCategory = mappedFormData.worksCategory || 'General';
        mappedFormData.nextOperation = mappedFormData.nextOperation || 'N/A';
        mappedFormData.generalCleaning = mappedFormData.generalCleaning || 'N/A';
        mappedFormData.scheduledTime = mappedFormData.scheduledTime || '10:00';
        mappedFormData.scheduledDate = mappedFormData.scheduledDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
        mappedFormData.equipment = mappedFormData.equipment || 'N/A';
        mappedFormData.noObjection = mappedFormData.noObjection !== undefined ? mappedFormData.noObjection : false;
        mappedFormData.deficienciesNoted = mappedFormData.deficienciesNoted !== undefined ? mappedFormData.deficienciesNoted : false;
        mappedFormData.deficiencies = mappedFormData.deficiencies || [];
      }

      await client.post(formType === 'inspection' ? '/inspection/create' : '/survey/create', {
        formData: mappedFormData,
        processNodes: processNodesForBackend,
        createdBy: user.id,
        projectId,
        formId: generatedRiscNo,
        name: entryName.trim(),
        ...(expiresAt ? { expiresAt } : {}),
      });

      setShowProcessFlow(false);
      setPendingFormData(null);
      setExpiresAt('');
      setEntryName('');
      setProcessNodes([
        { id: '1', type: 'start', name: 'Submit', executor: user?.name || '', executorId: user?.id || '', editAccess: true, settings: {} },
        { id: '2', type: 'end', name: 'Approval', executor: '', executorId: '', editAccess: false, settings: {} },
      ]);
      loadEntries();
      Alert.alert('Success', `${formType === 'survey' ? 'Survey' : 'Inspection'} check created successfully!`);
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed to create entry'); }
  };

  const handleWorkflowAction = async (action: 'approve' | 'reject' | 'back') => {
    if (!selectedEntry || !user) return;
    // Require a comment for reject/back (matching web behaviour)
    if ((action === 'reject' || action === 'back') && !workflowComment.trim()) {
      Alert.alert('Comment Required', `A comment is required when ${action === 'reject' ? 'rejecting' : 'sending back'} an entry.`);
      return;
    }
    setActionLoading(true);
    try {
      const result = await client.put(`/${selectedEntry.form_type}/${selectedEntry.id}/update`, { action, comment: workflowComment.trim(), userId: user.id });
      if (result.data?.permanently_rejected) {
        Alert.alert('Permanently Rejected', 'Entry has been permanently rejected — no more edits are allowed as all nodes have reached their completion limit.');
      } else {
        Alert.alert('Success', `Entry ${action}d successfully! Notifications have been sent.`);
      }
      setWorkflowComment('');
      setShowDetail(false);
      loadEntries();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Action failed';
      Alert.alert('Error', msg);
    }
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

  const handleCardSetExpiry = async (entry: any, draft: string) => {
    if (!user?.id || !isAdmin || !draft) return;
    try {
      setSavingExpiry(prev => ({ ...prev, [entry.id]: true }));
      await client.patch(`/${entry.form_type}/${entry.id}/expiry`, { expiresAt: new Date(draft).toISOString() });
      loadEntries();
    } catch { Alert.alert('Error', 'Failed to set expiry'); }
    setSavingExpiry(prev => ({ ...prev, [entry.id]: false }));
  };

  const handleCardSetExpiryStatus = async (entry: any, status: 'active' | 'expired') => {
    if (!user?.id || !isAdmin) return;
    try {
      setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: true }));
      await client.patch(`/${entry.form_type}/${entry.id}/expiry-status`, { status });
      loadEntries();
    } catch { Alert.alert('Error', 'Failed to update status'); }
    setUpdatingExpiryStatus(prev => ({ ...prev, [entry.id]: false }));
  };

  // ── Permission checks (matching web RfiPage logic) ──────────
  const canUserEditEntry = (entry: any) => {
    if (!user?.id) return false;
    if (entry.status === 'permanently_rejected' || entry.status === 'closed') return false;
    if (isAdmin && (entry.status === 'pending' || entry.status === 'rejected')) return true;
    const nodes = entry.workflow_nodes || entry.inspection_workflow_nodes || entry.survey_workflow_nodes || [];
    const currentNode = nodes.find((n: any) => n.node_order === (entry.current_node_index ?? 0));
    if (currentNode && currentNode.executor_id === user.id && entry.status === 'rejected') return true;
    return false;
  };

  const canUserUpdateForm = (entry: any) => {
    if (!user?.id) return false;
    if (entry.status === 'permanently_rejected' || entry.status === 'closed') return false;
    if (isAdmin && entry.created_by === user.id) return true;
    const nodes = entry.workflow_nodes || entry.inspection_workflow_nodes || entry.survey_workflow_nodes || [];
    const currentNode = nodes.find((n: any) => n.node_order === (entry.current_node_index ?? 0));
    if (currentNode && currentNode.executor_id === user.id) {
      if (entry.status === 'rejected') return true;
      const completionCount = currentNode.completion_count || 0;
      const maxCompletions = currentNode.max_completions || 2;
      return (currentNode.can_re_edit !== false) && completionCount < maxCompletions;
    }
    const isAssigned = (entry.rfi_assignments || entry.inspection_assignments || entry.survey_assignments || []).some(
      (a: any) => a.user_id === user.id && a.node_id === currentNode?.node_id
    );
    return isAssigned && entry.status === 'rejected';
  };

  const canUserApproveEntry = (entry: any) => {
    if (!user?.id) return false;
    if (entry.status === 'permanently_rejected' || entry.status === 'completed' || entry.status === 'closed') return false;
    if (isAdmin) return true;
    const nodes = entry.workflow_nodes || entry.inspection_workflow_nodes || entry.survey_workflow_nodes || [];
    const currentNode = nodes.find((n: any) => n.node_order === (entry.current_node_index ?? 0));
    if (currentNode && currentNode.executor_id === user.id) {
      if (entry.status === 'rejected') return true;
      const completionCount = currentNode.completion_count || 0;
      const maxCompletions = currentNode.max_completions || 2;
      return (currentNode.can_re_edit !== false) && completionCount < maxCompletions;
    }
    return false;
  };

  // ── Node reminder (matching web handleNodeReminder) ──────────
  const handleNodeReminder = (node: any) => {
    if (!isAdmin || !selectedEntry) return;
    const defaultMsg = `Reminder: Please action "${node.node_name || node.name}" step.`;
    setReminderNode(node);
    setReminderMsg(defaultMsg);
    setShowReminderModal(true);
  };

  const sendNodeReminder = async () => {
    if (!reminderNode || !selectedEntry || !user) return;
    const key = String(reminderNode.node_order);
    try {
      setSendingNodeReminder(prev => ({ ...prev, [key]: true }));
      await client.post(`/${selectedEntry.form_type}/${selectedEntry.id}/nodes/${reminderNode.node_order}/delay-notify`, {
        userId: user.id,
        message: reminderMsg.trim(),
      });
      setShowReminderModal(false);
      Alert.alert('Success', 'Reminder sent successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to send reminder.');
    } finally {
      setSendingNodeReminder(prev => ({ ...prev, [key]: false }));
    }
  };

  const filtered = entries.filter(e => {
    if (filter === 'inspection' && e.form_type !== 'inspection') return false;
    if (filter === 'survey' && e.form_type !== 'survey') return false;
    if (filter === 'approved' && e.status !== 'approved' && e.status !== 'completed') return false;
    if (filter === 'rejected' && e.status !== 'rejected') return false;
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

      {loading ? (
        <ActivityIndicator color={INSPECTION_COLOR} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.form_type + '-' + i.id}
          contentContainerStyle={S.listContent}
          ListHeaderComponent={() => (
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
                ] as const).map(({ key, icon, count, label }) => {
                  const active = filter === key;
                  const accent = key === 'inspection' ? INSPECTION_COLOR : key === 'survey' ? SURVEY_COLOR : key === 'approved' ? '#22c55e' : key === 'rejected' ? '#ef4444' : '#555';
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setFilter(key as FilterType)}
                      style={[S.tab, active && S.tabActive]}
                    >
                      <Icon name={icon} size={15} color={active ? accent : '#666'} />
                      <Text style={[S.tabText, active && { color: accent }]}>{count}</Text>
                      <Text style={[S.tabLabel, active && { color: accent }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <Text style={S.shownText}>{filtered.length} shown</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isInspection = item.form_type === 'inspection';
            const accent = isInspection ? INSPECTION_COLOR : SURVEY_COLOR;
            return (
              <View style={S.listItem}>
                <FormEntryCard
                date={dayjs(item.created_at).format('YYYY-MM-DD')}
                title={item.name || item.risc_no || `RISC-${(item.id || '').slice(-6)}`}
                status={item.status}
                accentColor={accent}
                expiresAt={item.expires_at}
                metaItems={[
                  { icon: 'account-outline', text: item.supervisor || item.issued_by || '—' },
                  { icon: 'tag-outline', text: isInspection ? 'Inspection' : 'Survey' },
                  { icon: 'file-document-outline', text: `RISC: ${item.risc_no || '—'}` },
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
                showEdit={canUserEditEntry(item) || canUserUpdateForm(item)}
                onEdit={() => openFormView(item)}
                onRename={() => openRename(item)}
                onDelete={() => handleDelete(item)}
              >
                <CardMetrics
                  items={[
                    { label: 'RISC No', value: item.risc_no || '—', color: accent },
                    { label: 'Category', value: item.works_category || '—' },
                    { label: 'Location', value: item.location || '—' },
                  ]}
                />
              </FormEntryCard>
              </View>
            );
          }}
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
      <ModuleDetailModal
        visible={showDetail && !!selectedEntry}
        onClose={() => setShowDetail(false)}
        title={`RFI Details`}
        accentColor={accentFor(selectedEntry)}
        loading={loadingDetail}
        status={selectedEntry?.status}
        completionText={selectedEntry ? (() => {
          const nodes = selectedEntry?.workflow_nodes || selectedEntry?.inspection_workflow_nodes || selectedEntry?.survey_workflow_nodes || [];
          const currentNode = (nodes as any[]).find((n: any) => n.node_order === (selectedEntry.current_node_index || 0));
          if (currentNode && selectedEntry.status === 'pending') {
            const count = currentNode.completion_count || 0;
            const max = currentNode.max_completions || 2;
            return `Completions (${count}/${max})`;
          }
          return undefined;
        })() : undefined}
        metrics={selectedEntry ? [
          { label: 'RISC No', value: selectedEntry.risc_no || selectedEntry.form_data?.riscNo || selectedEntry.form_data?.risc_no || '—', color: accentFor(selectedEntry) },
          { label: 'Category', value: selectedEntry.works_category || selectedEntry.form_data?.worksCategory || '—' },
          { label: 'Location', value: selectedEntry.location || selectedEntry.form_data?.location || '—' },
        ] : []}
        fields={selectedEntry ? [
          { label: 'Submitted By', value: selectedEntry.submittedBy || selectedEntry.supervisor || selectedEntry.form_data?.supervisor || selectedEntry.surveyor || selectedEntry.form_data?.surveyor || selectedEntry.created_by, icon: 'account-outline', half: true },
          { label: 'Priority', value: selectedEntry.priority ? (selectedEntry.priority.charAt(0).toUpperCase() + selectedEntry.priority.slice(1)) : 'Medium', icon: 'flag-outline', half: true },
          { label: 'Description', value: selectedEntry.description || selectedEntry.works_to_be_inspected || selectedEntry.form_data?.worksToBeInspected || selectedEntry.survey || selectedEntry.form_data?.survey, icon: 'text-box-outline' },
          { label: 'Assigned To', value: selectedEntry.assignedTo || selectedEntry.form_data?.assignedTo, icon: 'account-check-outline' },
          { label: 'Response', value: selectedEntry.response || selectedEntry.form_data?.response || 'No response yet', icon: 'comment-outline' },
          { label: 'Contract No', value: selectedEntry.contract_no || selectedEntry.form_data?.contractNo, icon: 'file-sign', half: true },
          { label: 'Revision', value: selectedEntry.revision || selectedEntry.form_data?.revision, icon: 'source-branch', half: true },
          ...(selectedEntry.form_type === 'inspection' ? [
            { label: 'Works to be Inspected', value: selectedEntry.works_to_be_inspected || selectedEntry.form_data?.worksToBeInspected, icon: 'clipboard-list-outline' },
            { label: 'Inspection Date', value: selectedEntry.inspection_date || selectedEntry.form_data?.inspectionDate, icon: 'calendar-outline', half: true as const },
            { label: 'Inspection Time', value: selectedEntry.inspection_time || selectedEntry.form_data?.inspectionTime, icon: 'clock-outline', half: true as const },
            { label: 'Next Operation', value: selectedEntry.next_operation || selectedEntry.form_data?.nextOperation, icon: 'arrow-right-circle-outline' },
            { label: 'Inspected By', value: selectedEntry.inspected_by || selectedEntry.inspector || selectedEntry.form_data?.inspectedBy, icon: 'account-search-outline' },
          ] : [
            { label: 'Survey Description', value: selectedEntry.survey || selectedEntry.form_data?.survey, icon: 'clipboard-text-outline' },
            { label: 'Survey Field', value: selectedEntry.survey_field || selectedEntry.form_data?.surveyField, icon: 'map-outline' },
            { label: 'Surveyed By', value: selectedEntry.surveyed_by || selectedEntry.surveyor || selectedEntry.form_data?.surveyedBy, icon: 'account-search-outline' },
          ]),
          { label: 'Issued By', value: selectedEntry.issued_by || selectedEntry.form_data?.issuedBy, icon: 'account-arrow-right-outline', half: true },
          { label: 'Expires At', value: selectedEntry.expires_at ? dayjs(selectedEntry.expires_at).format('DD MMM YYYY HH:mm') : undefined, icon: 'clock-alert-outline', half: true },
        ] : []}
        workflowNodes={(selectedEntry?.workflow_nodes || selectedEntry?.inspection_workflow_nodes || selectedEntry?.survey_workflow_nodes || []) as any}
        currentNodeIndex={selectedEntry?.current_node_index || 0}
        comments={(selectedEntry?.comments || selectedEntry?.inspection_comments || selectedEntry?.survey_comments || []) as any}
        canApprove={selectedEntry ? canUserApproveEntry(selectedEntry) && (selectedEntry.status === 'pending' || selectedEntry.status === 'rejected') : false}
        actionLoading={actionLoading}
        workflowComment={workflowComment}
        onWorkflowCommentChange={setWorkflowComment}
        onApprove={() => handleWorkflowAction('approve')}
        onSendBack={() => handleWorkflowAction('back')}
        onReject={() => handleWorkflowAction('reject')}
        approveLabel={(selectedEntry?.current_node_index === 1) ? 'Complete' : 'Approve'}
        canEditForm={selectedEntry ? (canUserUpdateForm(selectedEntry) || canUserEditEntry(selectedEntry)) : false}
        onEditForm={() => { setShowDetail(false); setEditFormKey(k => k + 1); setShowFormView(true); }}
        onNodeReminder={isAdmin ? handleNodeReminder : undefined}
        nodeReminderLoading={Object.fromEntries(Object.entries(sendingNodeReminder).map(([k, v]) => [k, v]))}
        onDelete={() => { setShowDetail(false); selectedEntry && handleDelete(selectedEntry); }}
        onHistory={() => { setShowDetail(false); selectedEntry && openHistory(selectedEntry); }}
        onExport={() => {}}
        onPrint={() => {}}
      />

      {/* Edit Form Modals (conditional on form type) */}
      {selectedEntry?.form_type === 'inspection' ? (
        <InspectionCheckFormRN
          key={editFormKey}
          visible={showFormView}
          onClose={() => setShowFormView(false)}
          initialData={resolveFormData(selectedEntry)}
          onSave={async (data: InspectionFormData) => {
            if (!selectedEntry || !user) return;
            try {
              await client.put(`/inspection/${selectedEntry.id}/form`, { formData: data, userId: user.id });
              setShowFormView(false);
              loadEntries();
              Alert.alert('Success', 'Inspection form updated.');
            } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Failed to update'); }
          }}
        />
      ) : (
        <SurveyCheckFormRN
          key={editFormKey}
          visible={showFormView}
          onClose={() => setShowFormView(false)}
          initialData={resolveFormData(selectedEntry)}
          onSave={async (data: SurveyFormData) => {
            if (!selectedEntry || !user) return;
            try {
              await client.put(`/survey/${selectedEntry.id}/form`, { formData: data, userId: user.id });
              setShowFormView(false);
              loadEntries();
              Alert.alert('Success', 'Survey form updated.');
            } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Failed to update'); }
          }}
        />
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={historyList}
        loading={historyLoading}
        isAdmin={isAdmin}
        onRestore={(h) => restoreHistory(h.id)}
        onView={(h) => {
          setSelectedHistoryEntry(h);
          setShowHistory(false);
          setShowHistoryFormSnapshot(true);
        }}
      />

      {/* History Form Snapshot Modal */}
      {showHistoryFormSnapshot && selectedHistoryEntry && historyEntry && (
        <Modal visible={showHistoryFormSnapshot} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }}>
            {historyEntry.form_type === 'inspection' ? (
              <InspectionCheckFormRN
                key={'snapshot-' + selectedHistoryEntry.id}
                visible
                onClose={() => { setShowHistoryFormSnapshot(false); setShowHistory(true); }}
                initialData={selectedHistoryEntry.form_data}
                onSave={() => { setShowHistoryFormSnapshot(false); setShowHistory(true); }}
              />
            ) : historyEntry.form_type === 'survey' ? (
              <SurveyCheckFormRN
                key={'snapshot-' + selectedHistoryEntry.id}
                visible
                onClose={() => { setShowHistoryFormSnapshot(false); setShowHistory(true); }}
                initialData={selectedHistoryEntry.form_data}
                onSave={() => { setShowHistoryFormSnapshot(false); setShowHistory(true); }}
              />
            ) : (
              <View style={M.centeredOverlay}>
                <View style={M.dialog}>
                  <Text style={M.mTitle}>Form Snapshot</Text>
                  <ScrollView style={{ maxHeight: 400, marginTop: spacing.sm }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' }}>
                      {JSON.stringify(selectedHistoryEntry.form_data, null, 2)}
                    </Text>
                  </ScrollView>
                  <TouchableOpacity style={[M.cancelBtn, { marginTop: spacing.md }]} onPress={() => { setShowHistoryFormSnapshot(false); setShowHistory(true); }}>
                    <Text style={M.cancelBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* Node Reminder Modal */}
      <Modal visible={showReminderModal} animationType="fade" transparent>
        <View style={M.centeredOverlay}>
          <View style={M.dialog}>
            <Text style={M.mTitle}>Send Reminder</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.xs }}>
              Enter reminder message for: {reminderNode?.node_name || reminderNode?.name || 'this step'}
            </Text>
            <TextInput
              style={[M.input, { marginTop: spacing.sm, minHeight: 80, textAlignVertical: 'top' }]}
              value={reminderMsg}
              onChangeText={setReminderMsg}
              placeholder="Enter reminder message..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[M.cancelBtn, { flex: 1 }]} onPress={() => setShowReminderModal(false)}>
                <Text style={M.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[M.saveBtn, { flex: 1, backgroundColor: accentFor(selectedEntry) }]}
                onPress={sendNodeReminder}
                disabled={!!sendingNodeReminder[String(reminderNode?.node_order)]}
              >
                {sendingNodeReminder[String(reminderNode?.node_order)] ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={M.saveBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
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
  listContent: { paddingBottom: 80 },
  listItem: { marginVertical: 8, marginHorizontal: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 10, height: 42 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8 },
  sortBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  pageHeader: { paddingHorizontal: 20 },
  pageDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 19 },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', gap: 2 },
  tabActive: { backgroundColor: '#1a1a2a', borderColor: INSPECTION_COLOR },
  tabText: { color: '#666', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: INSPECTION_COLOR },
  tabLabel: { color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 0.2 },
  tabLabelActive: { color: INSPECTION_COLOR },
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
