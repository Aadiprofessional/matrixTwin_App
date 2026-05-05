/**
 * ModuleDetailModal – reusable bottom-sheet detail modal used by
 * Cleansing, Labour, Safety, RFI (and any future module screen).
 * Redesigned to match the web BuildSphere layout:
 *  – card-style bordered field panels
 *  – 2-column grid for "half" fields
 *  – completionText in header
 *  – circular status icons on workflow nodes
 *  – comment action badges
 *  – footer split: utility (Export/Print/Delete) | workflow (Close/History/Edit/SendBack/Reject/Approve)
 */
import React from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, StyleSheet,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

dayjs.extend(relativeTime);

// ─────────────────────────── Types ────────────────────────────

export interface DetailField {
  label: string;
  value?: string | null;
  icon?: string;
  half?: boolean;
}

export interface DetailMetric {
  label: string;
  value: string;
  color?: string;
}

export interface DetailWorkflowNode {
  id: string;
  node_order: number;
  node_name?: string;
  name?: string;
  executor_name?: string;
  executor?: string;
  status: string;
}

export interface DetailComment {
  user_name?: string;
  userName?: string;
  comment: string;
  action?: string;
  created_at: string;
}

export interface ModuleDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  accentColor: string;
  loading?: boolean;

  status?: string;
  completionText?: string;
  metrics?: DetailMetric[];
  fields?: DetailField[];

  workflowNodes?: DetailWorkflowNode[];
  currentNodeIndex?: number;
  comments?: DetailComment[];

  // Workflow actions
  canApprove?: boolean;
  actionLoading?: boolean;
  workflowComment?: string;
  onWorkflowCommentChange?: (v: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSendBack?: () => void;
  approveLabel?: string;

  // Edit / view form
  canEditForm?: boolean;
  onEditForm?: () => void;

  // Per-node reminder
  onNodeReminder?: (node: DetailWorkflowNode) => void;
  nodeReminderLoading?: Record<string, boolean>;

  // Action buttons
  onDelete?: () => void;
  onHistory?: () => void;
  onExport?: () => void;
  onPrint?: () => void;

  // Extra children rendered below fields (e.g. checklist items)
  children?: React.ReactNode;
}

// ─────────────────────────── Helpers ──────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  completed: '#22c55e',
  approved: '#22c55e',
  rejected: '#ef4444',
  permanently_rejected: '#dc2626',
  active: '#3b82f6',
  expired: '#6b7280',
  'in-review': '#8b5cf6',
  waiting: '#6b7280',
};

function statusColor(s?: string) {
  return STATUS_COLORS[(s || '').toLowerCase()] || '#64748b';
}

function nodeStatusIcon(status: string): string {
  switch ((status || '').toLowerCase()) {
    case 'completed': case 'approved': return 'check';
    case 'rejected': case 'permanently_rejected': return 'close';
    case 'pending': return 'clock-outline';
    default: return 'dots-horizontal';
  }
}

// ──────────────────── Sub-components ──────────────────────────

function FieldCard({ label, value, icon, half }: DetailField) {
  const empty = !value;
  return (
    <View style={[st.fieldCard, half && st.fieldCardHalf]}>
      <View style={st.fieldCardHead}>
        {icon && <Icon name={icon} size={13} color="#666" style={{ marginRight: 4 }} />}
        <Text style={st.fieldCardLabel}>{label.toUpperCase()}</Text>
      </View>
      <Text style={[st.fieldCardValue, empty && st.fieldCardValueNone]}>{value || 'None'}</Text>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={st.metric}>
      <Text style={[st.metricValue, color ? { color } : {}]}>{value}</Text>
      <Text style={st.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={st.sectionHeader}>
      <Icon name={icon} size={13} color="#555" />
      <Text style={st.sectionTitle}>{title}</Text>
    </View>
  );
}

// ──────────────────── Main Component ──────────────────────────

export default function ModuleDetailModal({
  visible,
  onClose,
  title,
  accentColor,
  loading,
  status,
  completionText,
  metrics = [],
  fields = [],
  workflowNodes = [],
  currentNodeIndex = 0,
  comments = [],
  canApprove,
  actionLoading,
  workflowComment = '',
  onWorkflowCommentChange,
  onApprove,
  onReject,
  onSendBack,
  approveLabel,
  canEditForm,
  onEditForm,
  onNodeReminder,
  nodeReminderLoading = {},
  onDelete,
  onHistory,
  onExport,
  onPrint,
  children,
}: ModuleDetailModalProps) {
  const sc = statusColor(status);

  // Group consecutive half-width fields into 2-column rows
  const fieldRows: Array<DetailField | [DetailField, DetailField]> = [];
  let fi = 0;
  while (fi < fields.length) {
    if (fields[fi].half && fi + 1 < fields.length && fields[fi + 1].half) {
      fieldRows.push([fields[fi], fields[fi + 1]]);
      fi += 2;
    } else {
      fieldRows.push(fields[fi]);
      fi++;
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={st.overlay}>
        <View style={st.sheet}>

          {/* ── Header ── */}
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.headerTitle}>{title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                {status && (
                  <View style={[st.statusBadge, { backgroundColor: sc + '22', borderColor: sc }]}>
                    <Icon name="circle-medium" size={12} color={sc} />
                    <Text style={[st.statusText, { color: sc }]}>
                      {status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                )}
                {completionText && (
                  <Text style={st.completionText}>{completionText}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={accentColor} style={{ margin: 48 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

              {/* ── Metrics row ── */}
              {metrics.length > 0 && (
                <View style={st.metricsRow}>
                  {metrics.map((m, i) => (
                    <Metric key={i} label={m.label} value={m.value} color={m.color || accentColor} />
                  ))}
                </View>
              )}

              {/* ── Fields (card style, 2-col for half) ── */}
              {fieldRows.map((row, idx) =>
                Array.isArray(row) ? (
                  <View key={idx} style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs }}>
                    <FieldCard {...row[0]} />
                    <FieldCard {...row[1]} />
                  </View>
                ) : (
                  <View key={idx} style={{ marginBottom: spacing.xs }}>
                    <FieldCard {...(row as DetailField)} />
                  </View>
                )
              )}

              {/* ── Extra children ── */}
              {children}

              {/* ── Workflow Status ── */}
              {workflowNodes.length > 0 && (
                <View style={st.section}>
                  <SectionHeader icon="chart-timeline-variant" title="WORKFLOW STATUS" />
                  {[...workflowNodes]
                    .sort((a, b) => a.node_order - b.node_order)
                    .map((node, idx) => {
                      const nc = statusColor(node.status);
                      const iconName = nodeStatusIcon(node.status);
                      const nodeName = String(node.node_name || node.name || '').toLowerCase();
                      const canRemind = onNodeReminder && nodeName !== 'start' && nodeName !== 'complete';
                      const reminderKey = String(node.node_order);
                      return (
                        <View key={node.id || idx} style={st.nodeCard}>
                          <View style={[st.nodeIconCircle, { backgroundColor: nc + '22', borderColor: nc + '55' }]}>
                            <Icon name={iconName} size={14} color={nc} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={st.nodeLabel}>{node.node_name || node.name || `Step ${idx + 1}`}</Text>
                            {(node.executor_name || node.executor) ? (
                              <Text style={st.nodeSub}>Assigned to: {node.executor_name || node.executor}</Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {canRemind && (
                              <TouchableOpacity
                                onPress={() => onNodeReminder!(node)}
                                disabled={nodeReminderLoading[reminderKey]}
                                style={[st.reminderBtn, { borderColor: accentColor + '55' }]}
                              >
                                {nodeReminderLoading[reminderKey] ? (
                                  <ActivityIndicator size="small" color={accentColor} />
                                ) : (
                                  <>
                                    <Icon name="bell-outline" size={11} color={accentColor} />
                                    <Text style={[st.reminderBtnText, { color: accentColor }]}>Remind</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                            <View style={[st.nodeBadge, { backgroundColor: nc + '22', borderColor: nc }]}>
                              <Text style={[st.nodeBadgeText, { color: nc }]}>
                                {(node.status || 'pending').toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* ── Comments & Actions ── */}
              {comments.length > 0 && (
                <View style={st.section}>
                  <SectionHeader icon="comment-text-outline" title="COMMENTS & ACTIONS" />
                  {[...comments]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((c, idx) => (
                      <View key={idx} style={st.commentRow}>
                        <View style={[st.commentAvatar, { backgroundColor: accentColor + '33' }]}>
                          <Text style={[st.commentAvatarText, { color: accentColor }]}>
                            {(c.user_name || c.userName || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <Text style={st.commentUser}>{c.user_name || c.userName || 'User'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              {c.action && (
                                <View style={[st.actionBadge, {
                                  backgroundColor: c.action === 'approve' ? '#22c55e22' : c.action === 'reject' ? '#ef444422' : '#33333333',
                                  borderColor: c.action === 'approve' ? '#22c55e55' : c.action === 'reject' ? '#ef444455' : '#44444455',
                                }]}>
                                  <Text style={[st.actionBadgeText, {
                                    color: c.action === 'approve' ? '#22c55e' : c.action === 'reject' ? '#ef4444' : '#888',
                                  }]}>
                                    {c.action.charAt(0).toUpperCase() + c.action.slice(1)}
                                  </Text>
                                </View>
                              )}
                              <Text style={st.commentTime}>{dayjs(c.created_at).fromNow()}</Text>
                            </View>
                          </View>
                          <Text style={st.commentText}>{c.comment}</Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}

              {/* ── Workflow comment input (if can approve) ── */}
              {canApprove && (
                <View style={st.section}>
                  <TextInput
                    style={st.commentInput}
                    value={workflowComment}
                    onChangeText={onWorkflowCommentChange}
                    placeholder="Comment (optional)…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>
          )}

          {/* ── Footer: utility row + workflow row ── */}
          <View style={st.footerWrap}>
            {/* Row 1 – utility: Export / Print / Delete */}
            <View style={st.footerUtility}>
              {onExport && (
                <TouchableOpacity style={st.utilBtn} onPress={onExport}>
                  <Icon name="download-outline" size={14} color={colors.textMuted} />
                  <Text style={st.utilBtnText}>Export</Text>
                </TouchableOpacity>
              )}
              {onPrint && (
                <TouchableOpacity style={st.utilBtn} onPress={onPrint}>
                  <Icon name="printer-outline" size={14} color={colors.textMuted} />
                  <Text style={st.utilBtnText}>Print</Text>
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity style={[st.utilBtn, { borderColor: '#3a1a1a' }]} onPress={onDelete}>
                  <Icon name="trash-can-outline" size={14} color="#ef4444" />
                  <Text style={[st.utilBtnText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Row 2 – workflow: Close / History / Edit / SendBack / Reject / Approve */}
            <View style={st.footerWorkflow}>
              <TouchableOpacity style={st.outlineBtn} onPress={onClose}>
                <Text style={st.outlineBtnText}>Close</Text>
              </TouchableOpacity>
              {onHistory && (
                <TouchableOpacity style={st.outlineBtn} onPress={onHistory}>
                  <Icon name="history" size={13} color={colors.textMuted} />
                  <Text style={st.outlineBtnText}>History</Text>
                </TouchableOpacity>
              )}
              {onEditForm && (
                <TouchableOpacity
                  style={[st.outlineBtn, canEditForm && { borderColor: accentColor + '66' }]}
                  onPress={onEditForm}
                >
                  <Icon name={canEditForm ? 'pencil-outline' : 'eye-outline'} size={13} color={canEditForm ? accentColor : colors.textMuted} />
                  <Text style={[st.outlineBtnText, canEditForm && { color: accentColor }]}>
                    {canEditForm ? 'Edit Form' : 'View Form'}
                  </Text>
                </TouchableOpacity>
              )}
              {canApprove && onSendBack && (
                <TouchableOpacity
                  style={[st.outlineBtn, { borderColor: '#f9731644' }]}
                  onPress={onSendBack}
                  disabled={actionLoading}
                >
                  <Text style={[st.outlineBtnText, { color: '#f97316' }]}>Send Back</Text>
                </TouchableOpacity>
              )}
              {canApprove && onReject && (
                <TouchableOpacity
                  style={[st.outlineBtn, { borderColor: '#ef444444' }]}
                  onPress={onReject}
                  disabled={actionLoading}
                >
                  <Text style={[st.outlineBtnText, { color: '#ef4444' }]}>Reject</Text>
                </TouchableOpacity>
              )}
              {canApprove && onApprove && (
                <TouchableOpacity
                  style={[st.primaryBtn, { backgroundColor: accentColor, borderColor: accentColor }]}
                  onPress={onApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={st.primaryBtnText}>{approveLabel || 'Approve'}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────── Styles ───────────────────────────────

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '93%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1e1e1e',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  completionText: { fontSize: 11, color: '#888', fontWeight: '600' },

  scrollContent: { padding: spacing.md },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  metricLabel: { fontSize: 9, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Field cards
  fieldCard: {
    flex: 1,
    backgroundColor: '#0e0e0e',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
  },
  fieldCardHalf: { flex: 1 },
  fieldCardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldCardLabel: { color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldCardValue: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  fieldCardValueNone: { color: '#555', fontStyle: 'italic', fontWeight: '400' },

  // Section header
  section: { marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
  sectionTitle: { color: '#555', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },

  // Workflow nodes
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 8,
    backgroundColor: '#111',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 10,
  },
  nodeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nodeLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  nodeSub: { color: '#666', fontSize: 11, marginTop: 2 },
  nodeBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  nodeBadgeText: { fontSize: 9, fontWeight: '800' },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'transparent',
  },
  reminderBtnText: { fontSize: 9, fontWeight: '800' },

  // Comments
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 8,
    backgroundColor: '#111',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 10,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 13, fontWeight: '800' },
  commentUser: { color: colors.text, fontSize: 12, fontWeight: '700' },
  commentText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  commentTime: { color: '#555', fontSize: 10 },
  actionBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  actionBadgeText: { fontSize: 9, fontWeight: '800' },

  // Workflow comment input
  commentInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.sm,
    fontSize: 14,
    minHeight: 56,
    textAlignVertical: 'top',
  },

  // Footer
  footerWrap: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  footerUtility: {
    flexDirection: 'row',
    gap: 6,
  },
  footerWorkflow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  utilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  utilBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  outlineBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 80,
  },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
