import React, { useState, useEffect, useCallback } from 'react';
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
const ACCENT = '#6366f1';
const PRIORITIES = ['low','medium','high'];
const PRIORITY_COLORS: Record<string,string> = { low: colors.success, medium: colors.warning, high: colors.error };

interface WorkflowNode { id: string; node_order: number; node_name: string; executor_id?: string; executor_name?: string; status: string; }
interface Comment { id: string; user_name: string; comment: string; action?: string; created_at: string; }
interface FullRfi {
  id: string; form_number?: string; subject: string; description: string;
  raised_by: string; assigned_to?: string; priority: string; status: string;
  response?: string; due_date?: string; created_at: string; project_id?: string;
  rfi_workflow_nodes?: WorkflowNode[]; rfi_comments?: Comment[];
  current_node_index?: number; created_by?: string;
}

function statusColor(s: string) {
  if (s === 'completed' || s === 'answered') return colors.success;
  if (s === 'pending') return colors.warning;
  if (s === 'rejected' || s === 'permanently_rejected') return colors.error;
  if (s === 'closed') return colors.textMuted;
  return colors.textMuted;
}
function statusLabel(s: string) {
  if (s === 'permanently_rejected') return 'PERM.REJ';
  return s?.toUpperCase() ?? 'UNKNOWN';
}

export default function RfiScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<FullRfi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'answered'|'rejected'>('all');
  const [filterPriority, setFilterPriority] = useState<'all'|'low'|'medium'|'high'>('all');

  const [selectedEntry, setSelectedEntry] = useState<FullRfi | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getRfiEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? (data as FullRfi[]) : []);
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
      await createRfiEntry({ subject, description, project_id: projectId, priority, due_date: dueDate || undefined });
      setShowCreate(false); resetForm(); fetchEntries();
      Alert.alert('Success', 'RFI created successfully!');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to create RFI'); }
    setSubmitting(false);
  };

  const resetForm = () => { setSubject(''); setDescription(''); setPriority('medium'); setDueDate(''); };

  const filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    if (q && !e.subject?.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q) && !e.raised_by?.toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'rejected') return e.status === 'rejected' || e.status === 'permanently_rejected';
      return e.status === filterStatus;
    }
    if (filterPriority !== 'all' && e.priority !== filterPriority) return false;
    return true;
  });

  const total = entries.length;
  const pending = entries.filter(e => e.status === 'pending').length;
  const answered = entries.filter(e => e.status === 'answered' || e.status === 'completed').length;
  const rejected = entries.filter(e => e.status === 'rejected' || e.status === 'permanently_rejected').length;

  const canApprove = (e: FullRfi) => {
    if (!user) return false;
    if (e.status === 'completed' || e.status === 'permanently_rejected' || e.status === 'closed') return false;
    if (user.role === 'admin') return true;
    const node = e.rfi_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    return node?.executor_id === user.id;
  };

  return (
    <ModuleShell title="RFI / RICS" iconName="file-question-outline" accentColor={ACCENT} projectName={projectName}
      rightAction={
        <TouchableOpacity style={[S.addBtn, { backgroundColor: ACCENT }]} onPress={() => setShowCreate(true)}>
          <Icon name="plus" size={16} color="#fff" />
          <Text style={S.addBtnText}>New RFI</Text>
        </TouchableOpacity>
      }>

      <View style={S.searchRow}>
        <View style={S.searchBox}>
          <Icon name="magnify" size={16} color={colors.textMuted} />
          <TextInput style={S.searchInput} placeholder="Search RFIs..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={S.statsRow}>
        {[{l:'Total',v:total,c:ACCENT},{l:'Pending',v:pending,c:colors.warning},{l:'Answered',v:answered,c:colors.success},{l:'Rejected',v:rejected,c:colors.error}].map(s => (
          <View key={s.l} style={[S.statCard, { borderTopColor: s.c }]}>
            <Text style={[S.statValue, { color: s.c }]}>{s.v}</Text>
            <Text style={S.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={S.filterRow}>
        {(['all','pending','answered','rejected'] as const).map(f => (
          <TouchableOpacity key={f} style={[S.filterTab, filterStatus === f && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]} onPress={() => setFilterStatus(f)}>
            <Text style={[S.filterText, filterStatus === f && { color: ACCENT }]}>{f === 'all' ? 'ALL' : f.toUpperCase().slice(0,4)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Priority filter */}
      <View style={S.priorityRow}>
        {(['all','high','medium','low'] as const).map(p => (
          <TouchableOpacity key={p} style={[S.priorityChip, filterPriority === p && { backgroundColor: p==='all'?ACCENT:PRIORITY_COLORS[p], borderColor: p==='all'?ACCENT:PRIORITY_COLORS[p] }]} onPress={() => setFilterPriority(p)}>
            <Text style={[S.priorityText, filterPriority === p && { color: '#fff' }]}>{p.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={ACCENT} style={{ flex:1, marginTop:40 }} /> : (
        <FlatList data={filtered} keyExtractor={i => i.id} renderItem={({ item }) => (
          <TouchableOpacity style={S.card} onPress={() => openDetail(item)} activeOpacity={0.7}>
            <View style={S.cardTop}>
              <View style={S.cardLeft}>
                <Text style={S.formNum}>{item.form_number || item.id?.slice(0,8)}</Text>
                <View style={[S.pill, { backgroundColor: (PRIORITY_COLORS[item.priority] || colors.textMuted)+'22' }]}>
                  <Icon name="flag-outline" size={10} color={PRIORITY_COLORS[item.priority] || colors.textMuted} />
                  <Text style={[S.pillText, { color: PRIORITY_COLORS[item.priority] || colors.textMuted }]}>{item.priority?.toUpperCase()}</Text>
                </View>
              </View>
              <View style={[S.statusBadge, { backgroundColor: statusColor(item.status)+'22' }]}>
                <Text style={[S.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={S.subjectText} numberOfLines={1}>{item.subject}</Text>
            <Text style={S.descText} numberOfLines={2}>{item.description}</Text>
            <View style={S.cardMeta}>
              <View style={S.metaItem}><Icon name="account-outline" size={12} color={colors.textMuted} /><Text style={S.metaText}>{item.raised_by}</Text></View>
              {item.assigned_to ? <View style={S.metaItem}><Icon name="account-arrow-right-outline" size={12} color={colors.textMuted} /><Text style={S.metaText}>{item.assigned_to}</Text></View> : null}
              {item.due_date ? <View style={S.metaItem}><Icon name="calendar-alert" size={12} color={colors.warning} /><Text style={S.metaText}>{dayjs(item.due_date).format('DD MMM')}</Text></View> : null}
            </View>
          </TouchableOpacity>
        )} contentContainerStyle={S.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={S.empty}><Icon name="file-question-outline" size={48} color={colors.border} /><Text style={S.emptyText}>No RFIs found</Text><Text style={S.emptySubText}>Tap "New RFI" to create one</Text></View>}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={S.detailSheet}>
            <View style={S.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="arrow-left" size={20} color={colors.textMuted} /></TouchableOpacity>
              <Text style={S.modalTitle} numberOfLines={1}>RFI Details</Text>
              {user?.role === 'admin' && selectedEntry && <TouchableOpacity onPress={() => handleDelete(selectedEntry)}><Icon name="delete-outline" size={20} color={colors.error} /></TouchableOpacity>}
            </View>
            {loadingDetail ? <ActivityIndicator color={ACCENT} style={{ flex:1 }} /> : selectedEntry ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex:1 }}>
                <View style={[S.statusBanner, { backgroundColor: statusColor(selectedEntry.status)+'22', borderColor: statusColor(selectedEntry.status)+'44' }]}>
                  <Icon name="information-outline" size={14} color={statusColor(selectedEntry.status)} />
                  <Text style={[S.statusBannerText, { color: statusColor(selectedEntry.status) }]}>{statusLabel(selectedEntry.status)}</Text>
                  <View style={[S.priorityInBanner, { backgroundColor: (PRIORITY_COLORS[selectedEntry.priority]||colors.textMuted)+'22' }]}>
                    <Text style={{ color: PRIORITY_COLORS[selectedEntry.priority]||colors.textMuted, fontSize:10, fontWeight:'700' }}>{selectedEntry.priority?.toUpperCase()} PRIORITY</Text>
                  </View>
                </View>
                <DRow icon="file-document-outline" label="Subject" value={selectedEntry.subject} />
                <DRow icon="text" label="Description" value={selectedEntry.description} multi />
                <DRow icon="account-outline" label="Raised By" value={selectedEntry.raised_by} />
                <DRow icon="account-arrow-right-outline" label="Assigned To" value={selectedEntry.assigned_to} />
                <DRow icon="calendar-alert" label="Due Date" value={selectedEntry.due_date ? dayjs(selectedEntry.due_date).format('DD MMM YYYY') : undefined} />
                {selectedEntry.response ? <DRow icon="message-reply-outline" label="Response" value={selectedEntry.response} multi /> : null}

                {selectedEntry.rfi_workflow_nodes && selectedEntry.rfi_workflow_nodes.length > 0 && (
                  <View style={S.section}>
                    <Text style={S.sectionTitle}>WORKFLOW STATUS</Text>
                    {selectedEntry.rfi_workflow_nodes.sort((a,b)=>a.node_order-b.node_order).map(node => (
                      <View key={node.id} style={S.nodeRow}>
                        <View style={[S.nodeIcon, { backgroundColor: statusColor(node.status)+'22' }]}>
                          <Icon name={node.status==='completed'?'check':node.status==='pending'?'clock-outline':node.status==='rejected'?'close':'dots-horizontal'} size={12} color={statusColor(node.status)} />
                        </View>
                        <View style={{ flex:1 }}>
                          <Text style={S.nodeName}>{node.node_name}</Text>
                          {node.executor_name ? <Text style={S.nodeExecutor}>Assigned: {node.executor_name}</Text> : null}
                        </View>
                        <View style={[S.nodeBadge, { backgroundColor: statusColor(node.status)+'22' }]}>
                          <Text style={[S.nodeBadgeText, { color: statusColor(node.status) }]}>{node.status?.toUpperCase()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {selectedEntry.rfi_comments && selectedEntry.rfi_comments.length > 0 && (
                  <View style={S.section}>
                    <Text style={S.sectionTitle}>COMMENTS & ACTIONS</Text>
                    {[...selectedEntry.rfi_comments].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(c => (
                      <View key={c.id} style={S.commentCard}>
                        <View style={S.commentTop}>
                          <Text style={S.commentUser}>{c.user_name}</Text>
                          <View style={{ flexDirection:'row', gap:spacing.xs, alignItems:'center' }}>
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
                <View style={{ height:40 }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
          <View style={S.overlay}>
            <View style={S.createSheet}>
              <View style={S.modalHeader}>
                <Text style={S.modalTitle}>New RFI</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <FF label="Subject *"><TextInput style={S.input} value={subject} onChangeText={setSubject} placeholder="RFI subject / title..." placeholderTextColor={colors.textMuted} /></FF>
                <FF label="Description *"><TextInput style={[S.input,S.ta]} value={description} onChangeText={setDescription} placeholder="Describe the request for information..." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} /></FF>
                <FF label="Priority">
                  <View style={S.chipRow}>
                    {PRIORITIES.map(p => <TouchableOpacity key={p} style={[S.chip, priority===p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]} onPress={() => setPriority(p)}><Text style={[S.chipText, priority===p && { color:'#fff' }]}>{p.toUpperCase()}</Text></TouchableOpacity>)}
                  </View>
                </FF>
                <FF label="Due Date (optional)"><TextInput style={S.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} /></FF>
                <TouchableOpacity style={[S.submitBtn, { backgroundColor:ACCENT }, submitting && { opacity:0.6 }]} onPress={handleCreate} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <><Icon name="send" size={16} color="#fff" /><Text style={S.submitText}>Submit RFI</Text></>}
                </TouchableOpacity>
                <View style={{ height:40 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  addBtn: { flexDirection:'row', alignItems:'center', gap:4, borderRadius:radius.md, paddingHorizontal:spacing.sm, paddingVertical:6 },
  addBtnText: { color:'#fff', fontSize:12, fontWeight:'700' },
  searchRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing.xl, paddingVertical:spacing.sm, gap:spacing.xs },
  searchBox: { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:colors.surface, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, paddingHorizontal:spacing.sm, gap:spacing.xs },
  searchInput: { flex:1, color:colors.text, fontSize:13, paddingVertical:spacing.xs },
  statsRow: { flexDirection:'row', paddingHorizontal:spacing.xl, paddingBottom:spacing.sm, gap:spacing.xs },
  statCard: { flex:1, backgroundColor:colors.surface, borderRadius:radius.md, borderTopWidth:2, borderWidth:1, borderColor:colors.border, padding:spacing.xs, alignItems:'center' },
  statValue: { fontSize:18, fontWeight:'800' },
  statLabel: { color:colors.textMuted, fontSize:9, marginTop:2, textAlign:'center' },
  filterRow: { flexDirection:'row', paddingHorizontal:spacing.xl, borderBottomWidth:1, borderBottomColor:colors.border },
  filterTab: { flex:1, alignItems:'center', paddingVertical:spacing.sm, borderBottomWidth:2, borderBottomColor:'transparent' },
  filterText: { color:colors.textMuted, fontSize:10, fontWeight:'700', letterSpacing:0.5 },
  priorityRow: { flexDirection:'row', gap:spacing.xs, paddingHorizontal:spacing.xl, paddingVertical:spacing.sm },
  priorityChip: { borderRadius:radius.full, borderWidth:1, borderColor:colors.border, paddingHorizontal:spacing.sm, paddingVertical:4 },
  priorityText: { color:colors.textMuted, fontSize:10, fontWeight:'700' },
  list: { padding:spacing.xl, gap:spacing.sm },
  card: { backgroundColor:colors.surface, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, padding:spacing.md, gap:spacing.xs },
  cardTop: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  cardLeft: { flexDirection:'row', alignItems:'center', gap:spacing.xs },
  formNum: { color:ACCENT, fontSize:11, fontFamily:'monospace', fontWeight:'700' },
  pill: { flexDirection:'row', alignItems:'center', gap:3, borderRadius:radius.full, paddingHorizontal:7, paddingVertical:2 },
  pillText: { fontSize:10, fontWeight:'600' },
  statusBadge: { borderRadius:radius.full, paddingHorizontal:8, paddingVertical:3 },
  statusText: { fontSize:9, fontWeight:'700', fontFamily:'monospace' },
  subjectText: { color:colors.text, fontSize:14, fontWeight:'600' },
  descText: { color:colors.textSecondary, fontSize:12, lineHeight:17 },
  cardMeta: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm, marginTop:spacing.xxs },
  metaItem: { flexDirection:'row', alignItems:'center', gap:3 },
  metaText: { color:colors.textMuted, fontSize:11 },
  empty: { alignItems:'center', paddingVertical:80, gap:spacing.sm },
  emptyText: { color:colors.textSecondary, fontSize:15, fontWeight:'600' },
  emptySubText: { color:colors.textMuted, fontSize:13 },
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  detailSheet: { backgroundColor:'#0d0d0d', borderTopLeftRadius:24, borderTopRightRadius:24, padding:spacing.xl, maxHeight:'92%' },
  createSheet: { backgroundColor:'#0d0d0d', borderTopLeftRadius:24, borderTopRightRadius:24, padding:spacing.xl, maxHeight:'94%' },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing.lg },
  modalTitle: { color:colors.text, fontSize:17, fontWeight:'800', flex:1, marginHorizontal:spacing.xs },
  statusBanner: { flexDirection:'row', alignItems:'center', gap:spacing.xs, borderRadius:radius.md, borderWidth:1, padding:spacing.sm, marginBottom:spacing.md, flexWrap:'wrap' },
  statusBannerText: { fontSize:12, fontWeight:'700' },
  priorityInBanner: { borderRadius:radius.full, paddingHorizontal:8, paddingVertical:3, marginLeft:'auto' },
  detailRow: { backgroundColor:colors.surface, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, padding:spacing.sm, marginBottom:spacing.xs },
  detailLabel: { color:colors.textMuted, fontSize:11, fontWeight:'700', letterSpacing:0.5, textTransform:'uppercase' },
  detailValue: { color:colors.text, fontSize:14 },
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
  field: { marginBottom:spacing.md },
  fieldLabel: { color:colors.textMuted, fontSize:11, fontFamily:'monospace', letterSpacing:1, marginBottom:spacing.xxs },
  input: { backgroundColor:colors.surfaceElevated, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, color:colors.text, paddingHorizontal:spacing.md, paddingVertical:spacing.sm, fontSize:14 },
  ta: { minHeight:80, textAlignVertical:'top', paddingTop:spacing.sm },
  chipRow: { flexDirection:'row', gap:spacing.xs, flexWrap:'wrap' },
  chip: { borderRadius:radius.full, borderWidth:1, borderColor:colors.border, paddingHorizontal:spacing.md, paddingVertical:6 },
  chipText: { color:colors.textMuted, fontSize:11, fontWeight:'700' },
  submitBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing.xs, borderRadius:radius.lg, padding:spacing.md, marginTop:spacing.md },
  submitText: { color:'#fff', fontSize:15, fontWeight:'700' },
});
