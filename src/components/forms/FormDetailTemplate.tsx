import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface WorkflowNode {
  id: string;
  name: string;
  status: string;
  executor_name?: string;
  completed_at?: string;
}

interface FormDetailTemplateProps {
  title: string;
  formNumber?: string;
  description?: string;
  status: string;
  priority?: string;
  createdBy?: string;
  createdAt: string;
  workflowNodes?: WorkflowNode[];
  formData?: Record<string, any>;
  loading?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

const statusColors: Record<string, string> = {
  draft: '#6b7280',
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#10b981',
  approved: '#10b981',
  rejected: '#ef4444',
};

export default function FormDetailTemplate({
  title,
  formNumber,
  description,
  status,
  priority,
  createdBy,
  createdAt,
  workflowNodes = [],
  formData = {},
  loading = false,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onClose,
  children,
}: FormDetailTemplateProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const handleApprove = async () => {
    setSubmittingAction(true);
    try {
      await onApprove?.();
      setShowActionMenu(false);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    setSubmittingAction(true);
    try {
      await onReject?.();
      setShowActionMenu(false);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={onClose} style={{ padding: spacing.sm }}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {title}
          </Text>
          {formNumber && (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Form #{formNumber}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowActionMenu(!showActionMenu)}
          style={{ padding: spacing.sm }}
        >
          <Icon name="dots-vertical" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Status Badge */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            backgroundColor: statusColors[status] + '22',
            borderRadius: radius.full,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: statusColors[status],
              textTransform: 'capitalize',
            }}
          >
            {status.replace('_', ' ')}
          </Text>
        </View>

        {priority && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon
              name="flag-outline"
              size={14}
              color={
                priority === 'high'
                  ? '#ef4444'
                  : priority === 'medium'
                  ? '#f59e0b'
                  : '#10b981'
              }
            />
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginLeft: spacing.xs,
                textTransform: 'capitalize',
              }}
            >
              {priority}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: spacing.md }}
      >
        {loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: spacing.xl,
            }}
          >
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Description */}
            {description && (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  marginBottom: spacing.lg,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Description
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    marginTop: spacing.sm,
                    lineHeight: 20,
                  }}
                >
                  {description}
                </Text>
              </View>
            )}

            {/* Metadata */}
            <View
              style={{
                paddingHorizontal: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Created by
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    marginTop: spacing.xs,
                  }}
                >
                  {createdBy || 'Unknown'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Created on
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    marginTop: spacing.xs,
                  }}
                >
                  {new Date(createdAt).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Workflow Nodes */}
            {workflowNodes.length > 0 && (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  marginBottom: spacing.lg,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: spacing.md,
                  }}
                >
                  Workflow
                </Text>
                {workflowNodes.map((node, index) => (
                  <View
                    key={node.id}
                    style={{
                      marginBottom: spacing.md,
                      flexDirection: 'row',
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor:
                          node.status === 'completed' ? colors.success : colors.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      {node.status === 'completed' ? (
                        <Icon name="check" size={16} color={colors.white} />
                      ) : (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: colors.text,
                        }}
                      >
                        {node.name}
                      </Text>
                      {node.executor_name && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            marginTop: spacing.xs,
                          }}
                        >
                          {node.executor_name}
                        </Text>
                      )}
                      {node.completed_at && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                            marginTop: spacing.xs,
                          }}
                        >
                          {new Date(node.completed_at).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Custom Content */}
            {children && (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                }}
              >
                {children}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          gap: spacing.md,
        }}
      >
        {onReject && (
          <TouchableOpacity
            onPress={handleReject}
            disabled={submittingAction}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              opacity: submittingAction ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {submittingAction ? 'Processing...' : 'Reject'}
            </Text>
          </TouchableOpacity>
        )}

        {onApprove && (
          <TouchableOpacity
            onPress={handleApprove}
            disabled={submittingAction}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: 'center',
              opacity: submittingAction ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: '600' }}>
              {submittingAction ? 'Processing...' : 'Approve'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Menu */}
      {showActionMenu && (
        <View
          style={{
            position: 'absolute',
            top: spacing.xl + spacing.md,
            right: spacing.md,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            zIndex: 1000,
            minWidth: 160,
          }}
        >
          {onEdit && (
            <TouchableOpacity
              onPress={() => {
                onEdit();
                setShowActionMenu(false);
              }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon name="pencil-outline" size={18} color={colors.textSecondary} />
              <Text style={{ marginLeft: spacing.md, color: colors.text }}>Edit</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              onPress={() => {
                onDelete();
                setShowActionMenu(false);
              }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: onEdit ? 1 : 0,
                borderTopColor: colors.border,
              }}
            >
              <Icon name="trash-can-outline" size={18} color="#ef4444" />
              <Text style={{ marginLeft: spacing.md, color: '#ef4444' }}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
