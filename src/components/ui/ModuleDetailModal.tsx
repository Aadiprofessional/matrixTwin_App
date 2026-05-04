/**
 * ModuleDetailModal – reusable bottom-sheet detail modal used by
 * Cleansing, Labour, Safety, RFI (and any future module screen).
 *
 * Props let the parent supply typed field lists, workflow nodes,
 * comments, and optional edit-form callbacks.
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
  created_at: string;
}

export interface ModuleDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  accentColor: string;
  loading?: boolean;

  status?: string;
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

  // Edit / view form
  canEditForm?: boolean;
  onEditForm?: () => void;

  // Action buttons
  onDelete?: () => void;
  onHistory?: () => void;
  onExport?: () => void;
  onPrint?: () => void;

  // Extra children rendered below fields (e.g. checklist items)
  children?: React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  completed: '#22c55e',
  approved: '#22c55e',
  rejected: '#ef4444',
  permanently_rejected: '#dc2626',
  active: '#3b82f6',
  expired: '#6b7280',
  'in-review': '#8b5cf6',
};

function statusColor(s?: string) {
  return STATUS_COLORS[s || ''] || '#64748b';
}

// ──────────────────── Sub-components ──────────────────────────

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={st.field}>
      <Text style={st.fieldLabel}>{label.toUpperCase()}</Text>
      <Text style={st.fieldValue}>{value}</Text>
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

// ──────────────────── Main Component ──────────────────────────

export default function ModuleDetailModal({
  visible,
  onClose,
  title,
  accentColor,
  loading,
  status,
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
  canEditForm,
  onEditForm,
  onDelete,
  onHistory,
  onExport,
  onPrint,
  children,
}: ModuleDetailModalProps) {
  const sc = statusColor(status);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={st.overlay}>
        <View style={st.sheet}>
          {/* Header */}
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.headerTitle}>{title}</Text>
              {status && (
                <View style={[st.statusBadge, { backgroundColor: sc + '22', borderColor: sc }]}>
                  <Icon name="circle-medium" size={12} color={sc} />
                  <Text style={[st.statusText, { color: sc }]}>
                    {status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={accentColor} style={{ margin: 48 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

              {/* Metrics row */}
              {metrics.length > 0 && (
                <View style={st.metricsRow}>
                  {metrics.map((m, i) => (
                    <Metric key={i} label={m.label} value={m.value} color={m.color || accentColor} />
                  ))}
                </View>
              )}

              {/* Field list */}
              {fields.map((f, i) => <Field key={i} label={f.label} value={f.value} />)}

              {/* Extra children */}
              {children}

              {/* Workflow */}
              {workflowNodes.length > 0 && (
                <View style={st.section}>
                  <Text style={st.sectionTitle}>WORKFLOW</Text>
                  {[...workflowNodes]
                    .sort((a, b) => a.node_order - b.node_order)
                    .map((node, idx) => {
                      const dotColor =
                        idx < currentNodeIndex
                          ? '#22c55e'
                          : idx === currentNodeIndex
                          ? accentColor
                          : '#333';
                      const nc = statusColor(node.status);
                      return (
                        <View key={node.id || idx} style={st.nodeRow}>
                          <View style={[st.nodeDot, { backgroundColor: dotColor }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={st.nodeLabel}>
                              {node.node_name || node.name || `Step ${idx + 1}`}
                            </Text>
                            <Text style={st.nodeSub}>
                              {node.executor_name || node.executor || 'Unassigned'}
                            </Text>
                          </View>
                          <View style={[st.nodeBadge, { backgroundColor: nc + '22', borderColor: nc }]}>
                            <Text style={[st.nodeBadgeText, { color: nc }]}>
                              {(node.status || 'pending').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* Comments */}
              {comments.length > 0 && (
                <View style={st.section}>
                  <Text style={st.sectionTitle}>COMMENTS</Text>
                  {comments.map((c, idx) => (
                    <View key={idx} style={st.commentRow}>
                      <View style={[st.commentAvatar, { backgroundColor: accentColor + '33' }]}>
                        <Text style={[st.commentAvatarText, { color: accentColor }]}>
                          {(c.user_name || c.userName || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.commentUser}>{c.user_name || c.userName || 'User'}</Text>
                        <Text style={st.commentText}>{c.comment}</Text>
                        <Text style={st.commentTime}>{dayjs(c.created_at).fromNow()}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Workflow action buttons */}
              {canApprove && (
                <View style={st.section}>
                  <Text style={st.sectionTitle}>WORKFLOW ACTION</Text>
                  <TextInput
                    style={st.commentInput}
                    value={workflowComment}
                    onChangeText={onWorkflowCommentChange}
                    placeholder="Comment (optional)…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <TouchableOpacity
                      style={[st.wfBtn, { backgroundColor: '#22c55e22', borderColor: '#22c55e', flex: 1 }]}
                      onPress={onApprove}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#22c55e" />
                      ) : (
                        <Text style={[st.wfBtnText, { color: '#22c55e' }]}>Approve</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[st.wfBtn, { backgroundColor: '#f9731622', borderColor: '#f97316', flex: 1 }]}
                      onPress={onSendBack}
                      disabled={actionLoading}
                    >
                      <Text style={[st.wfBtnText, { color: '#f97316' }]}>Send Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[st.wfBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444', flex: 1 }]}
                      onPress={onReject}
                      disabled={actionLoading}
                    >
                      <Text style={[st.wfBtnText, { color: '#ef4444' }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Export / Print */}
              <View style={st.section}>
                <Text style={st.sectionTitle}>EXPORT</Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <TouchableOpacity
                    style={[st.exportBtn, { flex: 1 }]}
                    onPress={onExport}
                  >
                    <Icon name="download-outline" size={15} color="#fff" />
                    <Text style={st.exportBtnText}>Export</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[st.exportBtn, { flex: 1 }]}
                    onPress={onPrint}
                  >
                    <Icon name="printer-outline" size={15} color="#fff" />
                    <Text style={st.exportBtnText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* Footer */}
          <View style={st.footer}>
            {onDelete && (
              <TouchableOpacity style={st.deleteBtn} onPress={onDelete}>
                <Icon name="trash-can-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
            {onHistory && (
              <TouchableOpacity style={st.historyBtn} onPress={onHistory}>
                <Icon name="history" size={15} color={colors.textMuted} />
                <Text style={st.historyBtnText}>History</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.closeBtn} onPress={onClose}>
              <Text style={st.closeBtnText}>Close</Text>
            </TouchableOpacity>
            {onEditForm && (
              <TouchableOpacity
                style={[st.editBtn, { backgroundColor: canEditForm ? accentColor : '#222', borderColor: canEditForm ? accentColor : '#333' }]}
                onPress={onEditForm}
              >
                <Icon name={canEditForm ? 'pencil-outline' : 'eye-outline'} size={15} color={canEditForm ? '#fff' : colors.textMuted} />
                <Text style={[st.editBtnText, { color: canEditForm ? '#fff' : colors.textMuted }]}>
                  {canEditForm ? 'Edit Form' : 'View Form'}
                </Text>
              </TouchableOpacity>
            )}
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
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  scrollContent: { padding: spacing.md },

  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  field: { marginBottom: spacing.sm },
  fieldLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  fieldValue: { color: colors.text, fontSize: 14, lineHeight: 20 },

  section: { marginTop: spacing.md },
  sectionTitle: {
    color: '#444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },

  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nodeLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  nodeSub: { color: '#555', fontSize: 11, marginTop: 1 },
  nodeBadge: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nodeBadgeText: { fontSize: 9, fontWeight: '800' },

  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: '#111',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 13, fontWeight: '800' },
  commentUser: { color: colors.text, fontSize: 12, fontWeight: '700' },
  commentText: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  commentTime: { color: '#555', fontSize: 10, marginTop: 3 },

  commentInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.sm,
    fontSize: 14,
    marginBottom: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  wfBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wfBtnText: { fontSize: 12, fontWeight: '800' },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  deleteBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#1a0a0a',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  historyBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  closeBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  editBtn: {
    flex: 2,
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editBtnText: { fontWeight: '800', fontSize: 14 },
  exportBtn: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
