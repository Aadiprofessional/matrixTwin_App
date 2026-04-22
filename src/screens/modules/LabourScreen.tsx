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
import { getLabourEntries, createLabourEntry } from '../../api/labour';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import client from '../../api/client';

type RouteProps = RouteProp<AppStackParamList, 'Labour'>;
const ACCENT = '#8b5cf6';
const TRADES = ['Carpentry','Masonry','Plumbing','Electrical','Steel Fixing','General Labour','Painting','Tiling'];

interface WorkflowNode { id: string; node_order: number; node_name: string; executor_id?: string; executor_name?: string; status: string; }
interface Comment { id: string; user_name: string; comment: string; action?: string; created_at: string; }
interface FullEntry {
  id: string; form_number?: string; date: string; supervisor: string; trade: string;
  workers_count: number; hours_worked: number; tasks_completed: string; notes?: string;
  status: string; created_at: string; project_id?: string;
  labour_workflow_nodes?: WorkflowNode[]; labour_comments?: Comment[];
  current_node_index?: number;
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

export default function LabourScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<FullEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'completed'|'rejected'>('all');

  const [selectedEntry, setSelectedEntry] = useState<FullEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [supervisor, setSupervisor] = useState('');
  const [trade, setTrade] = useState('General Labour');
  const [workersCount, setWorkersCount] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getLabourEntries(user.id, projectId);
      setEntries(Array.isArray(data) ? (data as FullEntry[]) : []);
    } catch (_) {}
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const openDetail = async (entry: FullEntry) => {
    setSelectedEntry(entry);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const res = await client.get(`/labour/${entry.id}`);
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
          [{ text: 'Cancel', onPress: () => resolve(), style: 'cancel' }, { text: 'Submit', onPress: (val) => { comment = val || ''; resolve(); } }],
          'plain-text',
        );
      });
      if (!comment.trim()) { Alert.alert('Required', 'A comment is required.'); return; }
    }
    setActionLoading(true);
    try {
      await client.put(`/labour/${selectedEntry.id}/update`, { action, comment, userId: user.id });
      Alert.alert('Success', `Labour log ${action}d successfully.`);
      await fetchEntries(); await openDetail(selectedEntry);
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.error || `Failed to ${action}`); }
    setActionLoading(false);
  };

  const handleDelete = (entry: FullEntry) => {
    Alert.alert('Delete Labour Log', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await client.delete(`/labour/${entry.id}`); setShowDetail(false); fetchEntries(); }
        catch (e: any) { Alert.alert('Error', e?.response?.data?.error || 'Failed to delete'); }
      }},
    ]);
  };

  const handleCreate = async () => {
    if (!user || !supervisor.trim() || !tasksCompleted.trim()) {
      Alert.alert('Validation', 'Supervisor and tasks completed are required.'); return;
    }
    setSubmitting(true);
    try {
      await createLabourEntry({
        date, project_id: projectId, supervisor, trade,
        workers_count: parseInt(workersCount) || 0,
        hours_worked: parseFloat(hoursWorked) || 0,
        tasks_completed: tasksCompleted, notes,
      });
      setShowCreate(false); resetForm(); fetchEntries();
      Alert.alert('Success', 'Labour log created successfully!');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to create labour log'); }
    setSubmitting(false);
  };

  const resetForm = () => {
    setDate(dayjs().format('YYYY-MM-DD')); setSupervisor(''); setTrade('General Labour');
    setWorkersCount(''); setHoursWorked(''); setTasksCompleted(''); setNotes('');
  };

  const filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    if (q && !e.supervisor?.toLowerCase().includes(q) && !e.trade?.toLowerCase().includes(q) && !e.tasks_completed?.toLowerCase().includes(q)) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'rejected') return e.status === 'rejected' || e.status === 'permanently_rejected';
      return e.status === filterStatus;
    }
    return true;
  });

  const total = entries.length;
  const pending = entries.filter(e => e.status === 'pending').length;
  const completed = entries.filter(e => e.status === 'completed').length;
  const totalWorkers = entries.reduce((s,e) => s + (e.workers_count||0), 0);

  const canApprove = (e: FullEntry) => {
    if (!user) return false;
    if (e.status === 'completed' || e.status === 'permanently_rejected') return false;
    if (user.role === 'admin') return true;
    const node = e.labour_workflow_nodes?.find(n => n.node_order === e.current_node_index);
    return node?.executor_id === user.id;
  };

  return (
    <ModuleShell title="Labour Tracking" iconName="account-group-outline" accentColor={ACCENT} projectName={projectName}
      rightAction={
        <TouchableOpacity style={[S.addBtn, { backgroundColor: ACCENT }]} onPress={() => setShowCreate(true)}>
          <Icon name="plus" size={16} color="#fff" /><Text style={S.addBtnText}>New Log</Text>
        </TouchableOpacity>
      }>

      <View style={S.searchRow}>
        <View style={S.searchBox}>
          <Icon name="magnify" size={16} color={colors.textMuted} />
          <TextInput style={S.searchInput} placeholder="Search labour logs..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={S.statsRow}>
        {[{l:'Total Logs',v:total,c:ACCENT},{l:'Pending',v:pending,c:colors.warning},{l:'Approved',v:completed,c:colors.success},{l:'Workers',v:totalWorkers,c:'#0ea5e9'}].map(s => (
          <View key={s.l} style={[S.statCard, { borderTopColor: s.c }]}>
            <Text style={[S.statValue, { color: s.c }]}>{s.v}</Text>
            <Text style={S.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={S.filterRow}>
        {(['all','pending','completed','rejected'] as const).map(f => (
          <TouchableOpacity key={f} style={[S.filterTab, filterStatus===f && { borderBottomColor:ACCENT, borderBottomWidth:2 }]} onPress={() => setFilterStatus(f)}>
            <Text style={[S.filterText, filterStatus===f && { color:ACCENT }]}>{f==='all'?'ALL':f.toUpperCase().slice(0,4)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={ACCENT} style={{ flex:1, marginTop:40 }} /> : (
        <FlatList data={filtered} keyExtractor={i => i.id} renderItem={({ item }) => (
          <TouchableOpacity style={S.card} onPress={() => openDetail(item)} activeOpacity={0.7}>
            <View style={S.cardTop}>
              <View style={S.cardLeft}>
                <Text style={S.formNum}>{item.form_number || item.id?.slice(0,8)}</Text>
                <View style={[S.pill, { backgroundColor: ACCENT+'22' }]}>
                  <Icon name="hammer-screwdriver" size={10} color={ACCENT} />
                  <Text style={[S.pillText, { color: ACCENT }]}>{item.trade}</Text>
                </View>
              </View>
              <View style={[S.statusBadge, { backgroundColor: statusColor(item.status)+'22' }]}>
                <Text style={[S.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <View style={S.statsInCard}>
              <View style={S.statInCardItem}><Icon name="account-multiple-outline" size={14} color={colors.textMuted} /><Text style={S.statInCardText}>{item.workers_count} workers</Text></View>
              <View style={S.statInCardItem}><Icon name="clock-outline" size={14} color={colors.textMuted} /><Text style={S.statInCardText}>{item.hours_worked}h</Text></View>
            </View>
            <Text style={S.descText} numberOfLines={2}>{item.tasks_completed}</Text>
            <View style={S.cardMeta}>
              <View style={S.metaItem}><Icon name="account-tie-outline" size={12} color={colors.textMuted} /><Text style={S.metaText}>{item.supervisor}</Text></View>
              <View style={S.metaItem}><Icon name="calendar-outline" size={12} color={colors.textMuted} /><Text style={S.metaText}>{dayjs(item.date).format('DD MMM YYYY')}</Text></View>
            </View>
          </TouchableOpacity>
        )} contentContainerStyle={S.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={S.empty}><Icon name="account-group-outline" size={48} color={colors.border} /><Text style={S.emptyText}>No labour logs found</Text><Text style={S.emptySubText}>Tap "New Log" to create one</Text></View>}
        />
      )}

      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={S.detailSheet}>
            <View style={S.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Icon name="arrow-left" size={20} color={colors.textMuted} /></TouchableOpacity>
              <Text style={S.modalTitle}>Labour Log Details</Text>
              {user?.role==='admin' && selectedEntry && <TouchableOpacity onPress={() => handleDelete(selectedEntry)}><Icon name="delete-outline" size={20} color={colors.error} /></TouchableOpacity>}
            </View>
            {loadingDetail ? <ActivityIndicator color={ACCENT} style={{ flex:1 }} /> : selectedEntry ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex:1 }}>
                <View style={[S.statusBanner, { backgroundColor: statusColor(selectedEntry.status)+'22', borderColor: statusColor(selectedEntry.status)+'44' }]}>
                  <Icon name="information-outline" size={14} color={statusColor(selectedEntry.status)} />
                  <Text style={[S.statusBannerText, { color: statusColor(selectedEntry.status) }]}>{statusLabel(selectedEntry.status)}</Text>
                </View>
                <View style={S.metricsRow}>
                  {[{i:'account-multiple-outline',l:'Workers',v:String(selectedEntry.workers_count)},{i:'clock-outline',l:'Hours',v:String(selectedEntry.hours_worked)},{i:'hammer-screwdriver',l:'Trade',v:selectedEntry.trade}].map(m => (
                    <View key={m.l} style={S.metricBox}><Icon name={m.i} size={16} color={ACCENT} /><Text style={S.metricVal}>{m.v}</Text><Text style={S.metricLbl}>{m.l}</Text></View>
                  ))}
                </View>
                <DRow icon="calendar-outline" label="Date" value={dayjs(selectedEntry.date).format('DD MMM YYYY')} />
                <DRow icon="account-tie-outline" label="Supervisor" value={selectedEntry.supervisor} />
                <DRow icon="clipboard-list-outline" label="Tasks Completed" value={selectedEntry.tasks_completed} multi />
                <DRow icon="note-text-outline" label="Notes" value={selectedEntry.notes} multi />

                {selectedEntry.labour_workflow_nodes && selectedEntry.labour_workflow_nodes.length > 0 && (
                  <View style={S.section}>
                    <Text style={S.sectionTitle}>WORKFLOW STATUS</Text>
                    {selectedEntry.labour_workflow_nodes.sort((a,b)=>a.node_order-b.node_order).map(node => (
                      <View key={node.id} style={S.nodeRow}>
                        <View style={[S.nodeIcon, { backgroundColor: statusColor(node.status)+'22' }]}>
                          <Icon name={node.status==='completed'?'check':node.status==='pending'?'clock-outline':'close'} size={12} color={statusColor(node.status)} />
                        </View>
                        <View style={{ flex:1 }}><Text style={S.nodeName}>{node.node_name}</Text>{node.executor_name ? <Text style={S.nodeExecutor}>Assigned: {node.executor_name}</Text> : null}</View>
                        <View style={[S.nodeBadge, { backgroundColor: statusColor(node.status)+'22' }]}><Text style={[S.nodeBadgeText, { color: statusColor(node.status) }]}>{node.status?.toUpperCase()}</Text></View>
                      </View>
                    ))}
                  </View>
                )}

                {selectedEntry.labour_comments && selectedEntry.labour_comments.length > 0 && (
                  <View style={S.section}>
                    <Text style={S.sectionTitle}>COMMENTS & ACTIONS</Text>
                    {[...selectedEntry.labour_comments].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(c => (
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
                        {actionLoading && act==='approve' ? <ActivityIndicator size="small" color={colors.success} /> : (
                          <><Icon name={act==='approve'?'check-circle-outline':act==='reject'?'close-circle-outline':'undo-variant'} size={16} color={act==='approve'?colors.success:act==='reject'?colors.error:colors.warning} /><Text style={[S.actionBtnText, { color: act==='approve'?colors.success:act==='reject'?colors.error:colors.warning }]}>{act==='approve'?'Approve':act==='reject'?'Reject':'Send Back'}</Text></>
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

      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{ flex:1 }}>
          <View style={S.overlay}>
            <View style={S.createSheet}>
              <View style={S.modalHeader}>
                <Text style={S.modalTitle}>New Labour Log</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}><Icon name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <FF label="Date *"><TextInput style={S.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} /></FF>
                <FF label="Supervisor *"><TextInput style={S.input} value={supervisor} onChangeText={setSupervisor} placeholder="Supervisor name" placeholderTextColor={colors.textMuted} /></FF>
                <FF label="Trade">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={[S.chipRow, { flexWrap:'nowrap' }]}>
                    {TRADES.map(t => <TouchableOpacity key={t} style={[S.chip, trade===t && { backgroundColor:ACCENT, borderColor:ACCENT }]} onPress={() => setTrade(t)}><Text style={[S.chipText, trade===t && { color:'#fff' }]}>{t}</Text></TouchableOpacity>)}
                  </View></ScrollView>
                </FF>
                <View style={{ flexDirection:'row', gap:spacing.sm }}>
                  <View style={{ flex:1 }}><FF label="Workers Count *"><TextInput style={S.input} value={workersCount} onChangeText={setWorkersCount} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></FF></View>
                  <View style={{ flex:1 }}><FF label="Hours Worked *"><TextInput style={S.input} value={hoursWorked} onChangeText={setHoursWorked} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" /></FF></View>
                </View>
                <FF label="Tasks Completed *"><TextInput style={[S.input,S.ta]} value={tasksCompleted} onChangeText={setTasksCompleted} placeholder="Describe tasks completed..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} /></FF>
                <FF label="Notes"><TextInput style={[S.input,S.ta]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor={colors.textMuted} multiline numberOfLines={2} /></FF>
                <TouchableOpacity style={[S.submitBtn, { backgroundColor:ACCENT }, submitting && { opacity:0.6 }]} onPress={handleCreate} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <><Icon name="send" size={16} color="#fff" /><Text style={S.submitText}>Submit Labour Log</Text></>}
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
      <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginBottom:4 }}><Icon name={icon} size={13} color={colors.textMuted} /><Text style={S.detailLabel}>{label}</Text></View>
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
  searchRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing.xl, paddingVertical:spacing.sm },
  searchBox: { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:colors.surface, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, paddingHorizontal:spacing.sm, gap:spacing.xs },
  searchInput: { flex:1, color:colors.text, fontSize:13, paddingVertical:spacing.xs },
  statsRow: { flexDirection:'row', paddingHorizontal:spacing.xl, paddingBottom:spacing.sm, gap:spacing.xs },
  statCard: { flex:1, backgroundColor:colors.surface, borderRadius:radius.md, borderTopWidth:2, borderWidth:1, borderColor:colors.border, padding:spacing.xs, alignItems:'center' },
  statValue: { fontSize:18, fontWeight:'800' },
  statLabel: { color:colors.textMuted, fontSize:9, marginTop:2, textAlign:'center' },
  filterRow: { flexDirection:'row', paddingHorizontal:spacing.xl, borderBottomWidth:1, borderBottomColor:colors.border },
  filterTab: { flex:1, alignItems:'center', paddingVertical:spacing.sm, borderBottomWidth:2, borderBottomColor:'transparent' },
  filterText: { color:colors.textMuted, fontSize:10, fontWeight:'700', letterSpacing:0.5 },
  list: { padding:spacing.xl, gap:spacing.sm },
  card: { backgroundColor:colors.surface, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, padding:spacing.md, gap:spacing.xs },
  cardTop: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  cardLeft: { flexDirection:'row', alignItems:'center', gap:spacing.xs },
  formNum: { color:ACCENT, fontSize:11, fontFamily:'monospace', fontWeight:'700' },
  pill: { flexDirection:'row', alignItems:'center', gap:3, borderRadius:radius.full, paddingHorizontal:7, paddingVertical:2 },
  pillText: { fontSize:10, fontWeight:'600' },
  statusBadge: { borderRadius:radius.full, paddingHorizontal:8, paddingVertical:3 },
  statusText: { fontSize:9, fontWeight:'700', fontFamily:'monospace' },
  statsInCard: { flexDirection:'row', gap:spacing.md, marginVertical:spacing.xs },
  statInCardItem: { flexDirection:'row', alignItems:'center', gap:4 },
  statInCardText: { color:colors.textSecondary, fontSize:12 },
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
  statusBanner: { flexDirection:'row', alignItems:'center', gap:spacing.xs, borderRadius:radius.md, borderWidth:1, padding:spacing.sm, marginBottom:spacing.md },
  statusBannerText: { fontSize:12, fontWeight:'700' },
  metricsRow: { flexDirection:'row', gap:spacing.xs, marginBottom:spacing.md },
  metricBox: { flex:1, backgroundColor:colors.surface, borderRadius:radius.md, borderWidth:1, borderColor:colors.border, padding:spacing.sm, alignItems:'center', gap:3 },
  metricVal: { color:colors.text, fontSize:16, fontWeight:'800' },
  metricLbl: { color:colors.textMuted, fontSize:9, fontWeight:'600' },
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
