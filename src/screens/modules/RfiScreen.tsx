import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getRfiEntries, createRfiEntry } from '../../api/rfi';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import client from '../../api/client';

type RouteProps = RouteProp<AppStackParamList, 'Rfi'>;

interface WorkflowNode { id: string; node_order: number; node_name: string; executor_id?: string; executor_name?: string; status: string; }
interface Comment { id: string; user_name: string; comment: string; action?: string; created_at: string; }
interface FullRfi {
  id: string; form_number?: string; subject: string; description: string;
  raised_by: string; assigned_to?: string; priority: string; status: string;
  response?: string; due_date?: string; created_at: string; project_id?: string;
  rfi_workflow_nodes?: WorkflowNode[]; rfi_comments?: Comment[];
  current_node_index?: number; created_by?: string;
  form_type?: string;
}

const statusColors: Record<string, string> = {
  pending: '#854d0e', // yellow-800
  answered: '#166534', // green-800
  closed: '#374151', // gray-800
  rejected: '#991b1b', // red-800
  completed: '#166534', // green-800
  permanently_rejected: '#7f1d1d', // red-900
};

const statusBgs: Record<string, string> = {
  pending: '#fef9c3', // yellow-100
  answered: '#dcfce7', // green-100
  closed: '#f3f4f6', // gray-100
  rejected: '#fee2e2', // red-100
  completed: '#dcfce7', // green-100
  permanently_rejected: '#fecaca', // red-200
};

const ACCENT = '#4f46e5';

export default function RfiScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<FullRfi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');

  const [selectedEntry, setSelectedEntry] = useState<FullRfi | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [formType, setFormType] = useState('inspection');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getRfiEntries(user.id, projectId);
      const enriched = data.map(d => ({
        ...d,
        form_type: d.subject?.toLowerCase().includes('survey') ? 'survey' : 'inspection'
      }));
      setEntries(enriched as FullRfi[]);
    } catch (_) {}
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const openDetail = async (entry: FullRfi) => {
    setSelectedEntry(entry);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const res = await client.get(`/rfi/${entry.id}`);
      setSelectedEntry(res.data);
    } catch (_) {}
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
      await client.put(`/rfi/${selectedEntry.id}/update`, { action, comment, userId: user.id });
      Alert.alert('Success', `RFI ${action}d successfully.`);
      await fetchEntries();
      await openDetail(selectedEntry);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || `Failed to ${action}`);
    }
    setActionLoading(false);
  };

  const handleDelete = (entry: FullRfi) => {
    Alert.alert('Delete RFI', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/rfi/${entry.id}`);
          setShowDetail(false);
          fetchEntries();
        } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Failed to delete'); }
      }},
    ]);
  };

  const handleCreate = async () => {
    if (!user || !subject.trim() || !description.trim()) {
      Alert.alert('Validation', 'Subject and description are required.'); return;
    }
    setSubmitting(true);
    try {
      await createRfiEntry({ subject, description, project_id: projectId, priority });
      setShowCreate(false);
      setSubject('');
      setDescription('');
      fetchEntries();
      Alert.alert('Success', 'RFI created successfully!');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to create RFI'); }
    setSubmitting(false);
  };

  const filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    if (q && !e.subject?.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q) && !e.raised_by?.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (formTypeFilter !== 'all' && e.form_type !== formTypeFilter) return false;
    return true;
  });

  const renderHeader = () => (
    <View style={{ padding: spacing.md }}>
      <View style={S.headerCard}>
        <Text style={S.headerTitle}>
          <Icon name="file-document-outline" size={24} color="#c7d2fe" /> Requests for Information
        </Text>
        <Text style={S.headerSubtitle}>
          Manage information requests with faster scanning, stronger status visibility, and cleaner workflow context.
        </Text>
        <View style={S.headerButtons}>
          <TouchableOpacity style={S.primaryBtn} onPress={() => setShowCreate(true)}>
            <Icon name="plus" size={16} color="#fff" />
            <Text style={S.primaryBtnText}>New Request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.outlineBtn}>
            <Icon name="file-chart-outline" size={16} color="#fff" />
            <Text style={S.outlineBtnText}>Generate Report</Text>
          </TouchableOpacity>
        </View>

        <View style={S.statsContainer}>
          <View style={S.statBox}>
            <Text style={S.statLabel}>Total Requests</Text>
            <Text style={S.statValue}>{entries.length}</Text>
          </View>
          <View style={S.statBox}>
            <Text style={S.statLabel}>Pending Responses</Text>
            <Text style={[S.statValue, { color: '#e0e7ff' }]}>{entries.filter(e => e.status === 'pending').length}</Text>
          </View>
          <View style={S.statBox}>
            <Text style={S.statLabel}>Closed Requests</Text>
            <Text style={[S.statValue, { color: '#dbeafe' }]}>{entries.filter(e => e.status === 'closed').length}</Text>
          </View>
        </View>
      </View>

      <View style={S.filterCard}>
        <View style={S.filterHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="filter-variant" size={16} color={ACCENT} />
            <Text style={S.filterTitle}>Search & Filter</Text>
          </View>
          {(searchQuery || statusFilter !== 'all' || formTypeFilter !== 'all') && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setStatusFilter('all'); setFormTypeFilter('all'); }}>
              <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={S.searchBox}>
          <Icon name="magnify" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search by title, submitter, description"
            placeholderTextColor={colors.textMuted}
            style={S.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipScroll}>
          {['all', 'inspection', 'survey'].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setFormTypeFilter(s)}
              style={[S.filterChip, formTypeFilter === s ? S.filterChipActive : S.filterChipInactive]}
            >
              <Text style={[S.filterChipText, formTypeFilter === s ? S.filterChipTextActive : S.filterChipTextInactive]}>
                {s === 'all' ? 'All forms' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'pending', 'answered', 'closed'].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[S.filterChip, statusFilter === s ? S.filterChipActive : S.filterChipInactive]}
            >
              <Text style={[S.filterChipText, statusFilter === s ? S.filterChipTextActive : S.filterChipTextInactive]}>
                {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <ModuleShell title="RFI / RICS" iconName="file-question-outline" accentColor={ACCENT}>
      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ flex: 1, marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <TouchableOpacity style={S.card} onPress={() => openDetail(item)} activeOpacity={0.7}>
              <View style={S.cardHeader}>
                <View style={S.cardHeaderTop}>
                  <View style={S.dateWrap}>
                    <Icon name="calendar-blank-outline" size={16} color="#4338ca" />
                    <Text style={S.dateText}>{dayjs(item.created_at).format('DD MMM YYYY')}</Text>
                  </View>
                  <View style={[S.statusBadge, { backgroundColor: statusBgs[item.status] || statusBgs.pending }]}>
                    <Text style={[S.statusText, { color: statusColors[item.status] || statusColors.pending }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={S.subjectText} numberOfLines={1}>{item.subject}</Text>
                <View style={S.metaRow}>
                  <Icon name="account-outline" size={14} color="#4b5563" />
                  <Text style={{ fontSize: 12, color: '#4b5563' }}>From: {item.raised_by}</Text>
                  
                  {item.due_date && (
                    <View style={S.metaPill}>
                      <Icon name="clock-outline" size={12} color="#1e40af" />
                      <Text style={S.metaPillText}>Due: {dayjs(item.due_date).format('DD MMM')}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={S.cardBody}>
                <Text style={S.descLabel}>Description:</Text>
                <Text style={S.descText} numberOfLines={2}>{item.description}</Text>
                
                <View style={S.infoGrid}>
                  <View style={S.infoBox}>
                    <Text style={S.infoBoxLabel}>Type:</Text>
                    <Text style={S.infoBoxValue} numberOfLines={1}>
                      {item.form_type ? item.form_type.charAt(0).toUpperCase() + item.form_type.slice(1) : 'RFI'}
                    </Text>
                  </View>
                  <View style={S.infoBox}>
                    <Text style={S.infoBoxLabel}>Assigned To:</Text>
                    <Text style={S.infoBoxValue} numberOfLines={1}>{item.assigned_to || 'Unassigned'}</Text>
                  </View>
                  <View style={S.infoBox}>
                    <Text style={S.infoBoxLabel}>RISC No:</Text>
                    <Text style={S.infoBoxValue} numberOfLines={1}>{item.form_number || 'Not available'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Icon name="file-question-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12 }}>No RFIs found</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={S.detailSheet}>
            <View style={S.modalTopRow}>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="arrow-left" size={24} color={colors.text} /></TouchableOpacity>
              <Text style={S.modalTopTitle}>RFI Details</Text>
              {user?.role === 'admin' && selectedEntry ? (
                <TouchableOpacity onPress={() => handleDelete(selectedEntry)}>
                  <Icon name="delete-outline" size={24} color={colors.error} />
                </TouchableOpacity>
              ) : <View style={{ width: 24 }} />}
            </View>

            {loadingDetail ? <ActivityIndicator color={ACCENT} style={{ flex: 1 }} /> : selectedEntry ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={[S.detailStatusBanner, { backgroundColor: statusBgs[selectedEntry.status] || statusBgs.pending, borderColor: statusColors[selectedEntry.status] || statusColors.pending }]}>
                  <Icon name="information-outline" size={16} color={statusColors[selectedEntry.status] || statusColors.pending} />
                  <Text style={[S.detailStatusText, { color: statusColors[selectedEntry.status] || statusColors.pending }]}>
                    {selectedEntry.status.toUpperCase()}
                  </Text>
                </View>
                
                <DetailRow icon="file-document-outline" label="Subject" value={selectedEntry.subject} />
                <DetailRow icon="text" label="Description" value={selectedEntry.description} multi />
                <DetailRow icon="account-outline" label="Raised By" value={selectedEntry.raised_by} />
                <DetailRow icon="account-arrow-right-outline" label="Assigned To" value={selectedEntry.assigned_to} />
                {selectedEntry.due_date && <DetailRow icon="calendar-alert" label="Due Date" value={dayjs(selectedEntry.due_date).format('DD MMM YYYY')} />}
                {selectedEntry.response && <DetailRow icon="message-reply-outline" label="Response" value={selectedEntry.response} multi />}

                {selectedEntry.rfi_workflow_nodes && selectedEntry.rfi_workflow_nodes.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={S.sectionTitle}>WORKFLOW STATUS</Text>
                    {selectedEntry.rfi_workflow_nodes.sort((a,b) => a.node_order - b.node_order).map(node => (
                      <View key={node.id} style={S.nodeRow}>
                        <View style={[S.nodeIcon, { backgroundColor: (statusBgs[node.status] || statusBgs.pending) }]}>
                          <Icon name={node.status==='completed'?'check':node.status==='pending'?'clock-outline':node.status==='rejected'?'close':'dots-horizontal'} size={14} color={statusColors[node.status] || statusColors.pending} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={S.nodeName}>{node.node_name}</Text>
                          {node.executor_name && <Text style={S.nodeExecutor}>Assigned: {node.executor_name}</Text>}
                        </View>
                        <View style={[S.nodeBadge, { backgroundColor: statusBgs[node.status] || statusBgs.pending }]}>
                          <Text style={[S.nodeBadgeText, { color: statusColors[node.status] || statusColors.pending }]}>
                            {node.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {selectedEntry && (user?.role === 'admin' || (selectedEntry.rfi_workflow_nodes?.find(n => n.node_order === selectedEntry.current_node_index)?.executor_id === user?.id)) && selectedEntry.status !== 'completed' && selectedEntry.status !== 'permanently_rejected' && selectedEntry.status !== 'closed' && (
                  <View style={S.actionRow}>
                    {(['reject','back','approve'] as const).map(act => (
                      <TouchableOpacity key={act} style={[S.actionBtn, { backgroundColor: act==='approve'?statusBgs.completed:act==='reject'?statusBgs.rejected:statusBgs.pending, borderColor: act==='approve'?statusColors.completed:act==='reject'?statusColors.rejected:statusColors.pending }]} onPress={() => handleWorkflowAction(act)} disabled={actionLoading}>
                        {actionLoading && act === 'approve' ? <ActivityIndicator size="small" color={statusColors.completed} /> : (
                          <>
                            <Icon name={act==='approve'?'check-circle-outline':act==='reject'?'close-circle-outline':'undo-variant'} size={16} color={act==='approve'?statusColors.completed:act==='reject'?statusColors.rejected:statusColors.pending} />
                            <Text style={[S.actionBtnText, { color: act==='approve'?statusColors.completed:act==='reject'?statusColors.rejected:statusColors.pending }]}>{act==='approve'?'Approve':act==='reject'?'Reject':'Send Back'}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={S.overlay}>
            <View style={S.detailSheet}>
              <View style={S.modalTopRow}>
                <Text style={S.modalTopTitle}>New RFI</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={S.formField}>
                  <Text style={S.formLabel}>Type *</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[S.typeBtn, formType === 'inspection' && S.typeBtnActive]} onPress={() => setFormType('inspection')}>
                      <Text style={[S.typeBtnText, formType === 'inspection' && S.typeBtnTextActive]}>Inspection</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[S.typeBtn, formType === 'survey' && S.typeBtnActive]} onPress={() => setFormType('survey')}>
                      <Text style={[S.typeBtnText, formType === 'survey' && S.typeBtnTextActive]}>Survey</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={S.formField}>
                  <Text style={S.formLabel}>Subject *</Text>
                  <TextInput
                    style={S.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Enter subject"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={S.formField}>
                  <Text style={S.formLabel}>Description *</Text>
                  <TextInput
                    style={[S.input, S.inputMulti]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                  />
                </View>
                <TouchableOpacity style={S.submitBtn} onPress={handleCreate} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Icon name="send" size={18} color="#fff" />
                      <Text style={S.submitBtnText}>Submit RFI</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ModuleShell>
  );
}

function DetailRow({ icon, label, value, multi }: { icon: string; label: string; value?: string; multi?: boolean }) {
  if (!value) return null;
  return (
    <View style={S.detailRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon name={icon} size={14} color={colors.textMuted} />
        <Text style={S.detailLabel}>{label}</Text>
      </View>
      <Text style={[S.detailValue, multi && { lineHeight: 20 }]}>{value}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  headerCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 16,
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#4338ca',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  outlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  outlineBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  filterCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    color: colors.text,
  },
  chipScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: ACCENT + '1A',
    borderColor: ACCENT,
  },
  filterChipInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: ACCENT,
  },
  filterChipTextInactive: {
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginHorizontal: spacing.md,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#c7d2fe',
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#312e81',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaPillText: {
    fontSize: 11,
    color: '#1e40af',
    marginLeft: 4,
    fontWeight: '500',
  },
  cardBody: {
    padding: 16,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  infoBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoBoxValue: {
    fontSize: 13,
    color: '#4b5563',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTopTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  detailStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailRow: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 12,
  },
  nodeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  nodeExecutor: {
    fontSize: 11,
    color: colors.textMuted,
  },
  nodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nodeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 14,
  },
  inputMulti: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  typeBtnActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '1A',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  typeBtnTextActive: {
    color: ACCENT,
  },
  submitBtn: {
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
