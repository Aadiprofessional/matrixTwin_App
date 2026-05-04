/**
 * FormEntryCard — reusable card component that mirrors the web DiaryPage card design.
 * Used across Diary, Cleansing, Labour, Safety, RFI and other module list screens.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, radius } from '../../theme/spacing';
import { colors } from '../../theme/colors';

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  completed: '#22c55e',
  rejected: '#ef4444',
  permanently_rejected: '#dc2626',
  approved: '#22c55e',
  active: '#3b82f6',
  'in-review': '#8b5cf6',
  expired: '#6b7280',
  in_progress: '#3b82f6',
};

function statusColor(s: string) {
  return STATUS_COLORS[s] || '#6b7280';
}

function statusLabel(s: string) {
  if (s === 'permanently_rejected') return 'PERM. REJ.';
  return (s || 'UNKNOWN').toUpperCase().replace(/_/g, ' ');
}

// ─── Sub-components exposed for consumers ────────────────────────────────────

/** A labelled text content block — full-width. */
export function CardContentBlock({
  label,
  value,
  numberOfLines = 3,
}: {
  label: string;
  value?: string | null;
  numberOfLines?: number;
}) {
  return (
    <View style={S.contentBlock}>
      <Text style={S.blockLabel}>{label}</Text>
      <Text style={S.blockValue} numberOfLines={numberOfLines}>
        {value || 'None'}
      </Text>
    </View>
  );
}

/** Two-column grid of labelled boxes. */
export function CardGrid({ items }: { items: Array<{ label: string; value?: string | null }> }) {
  // Pair items in rows of 2
  const rows: Array<Array<{ label: string; value?: string | null }>> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return (
    <View style={S.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={S.gridRow}>
          {row.map((item, ci) => (
            <View key={ci} style={[S.gridCell, row.length === 1 && S.gridCellFull]}>
              <Text style={S.blockLabel}>{item.label}</Text>
              <Text style={S.blockValue} numberOfLines={2}>
                {item.value || 'None'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Row of small metric boxes (used in Labour, Safety, RFI, Cleansing). */
export function CardMetrics({ items }: { items: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <View style={S.metricsRow}>
      {items.map((item, i) => (
        <View key={i} style={S.metricBox}>
          <Text style={[S.metricValue, item.color ? { color: item.color } : null]} numberOfLines={1}>
            {item.value}
          </Text>
          <Text style={S.metricLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main card ───────────────────────────────────────────────────────────────

export interface FormEntryCardMeta {
  icon: string;
  text: string;
}

export interface FormEntryCardProps {
  // Header
  date: string;
  title: string;
  status: string;
  /** Override the displayed status text (e.g. to include node info) */
  statusDisplayText?: string;
  accentColor: string;

  // Meta row below title
  metaItems?: FormEntryCardMeta[];

  // Expiry pill (shown in meta row)
  expiresAt?: string | null;
  isExpired?: boolean;

  // Content area — use <CardContentBlock>, <CardGrid>, <CardMetrics>, or custom children
  children?: React.ReactNode;

  // Admin expiry controls section
  isAdmin?: boolean;
  expiryDraft?: string;
  onExpiryDraftChange?: (val: string) => void;
  onSetExpiry?: () => void;
  savingExpiry?: boolean;
  onSetExpired?: () => void;
  updatingExpiry?: boolean;
  onSetActive?: () => void;

  // Actions
  onViewDetails?: () => void;
  showViewDetails?: boolean;
  onHistory?: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
  editLabel?: string;
  onRename?: () => void;
  onDelete?: () => void;
}

export function FormEntryCard({
  date,
  title,
  status,
  statusDisplayText,
  accentColor,
  metaItems,
  expiresAt,
  isExpired,
  children,
  isAdmin,
  expiryDraft,
  onExpiryDraftChange,
  onSetExpiry,
  savingExpiry,
  onSetExpired,
  updatingExpiry,
  onSetActive,
  onViewDetails,
  showViewDetails = true,
  onHistory,
  onEdit,
  showEdit,
  editLabel = 'Edit Form',
  onRename,
  onDelete,
}: FormEntryCardProps) {
  const sc = statusColor(status);

  // Compute expiry pill text
  let expiryText = '';
  let expiryColor = '#22c55e';
  if (isExpired) {
    if (expiresAt) {
      const daysOver = Math.max(1, Math.floor((Date.now() - new Date(expiresAt).getTime()) / (1000 * 60 * 60 * 24)));
      expiryText = `Expired ${daysOver}d ago`;
    } else {
      expiryText = 'Expired';
    }
    expiryColor = '#ef4444';
  } else if (expiresAt) {
    const msLeft = new Date(expiresAt).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    expiryText = daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft}d`;
    expiryColor = daysLeft <= 3 ? '#f97316' : daysLeft <= 7 ? '#f59e0b' : '#22c55e';
  }

  return (
    <View style={S.card}>
      {/* ── Header band ─────────────────────────────────── */}
      <View style={S.headerBand}>
        {/* Row: date + status badge */}
        <View style={S.headerTop}>
          <View style={S.dateRow}>
            <Icon name="calendar-outline" size={13} color="#888" />
            <Text style={S.dateText}>{date}</Text>
          </View>
          <View style={[S.statusBadge, { backgroundColor: sc + '22', borderColor: sc }]}>
            <Text style={[S.statusText, { color: sc }]}>
              {statusDisplayText || statusLabel(status)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={S.title} numberOfLines={2}>{title}</Text>

        {/* Meta row */}
        <View style={S.metaRow}>
          {metaItems?.map((item, i) => (
            <View key={i} style={S.metaItem}>
              <Icon name={item.icon} size={11} color="#888" />
              <Text style={S.metaText} numberOfLines={1}>{item.text}</Text>
            </View>
          ))}
          {expiryText ? (
            <View style={[S.expiryPill, { backgroundColor: expiryColor + '22', borderColor: expiryColor }]}>
              <Icon name="clock-outline" size={10} color={expiryColor} />
              <Text style={[S.expiryPillText, { color: expiryColor }]}>{expiryText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Body ────────────────────────────────────────── */}
      <View style={S.body}>
        {children}

        {/* Expiry controls (admin only) */}
        {isAdmin && (
          <View style={S.expiryControlsBox}>
            <Text style={S.blockLabel}>{isExpired ? 'ACTIVATION' : 'EXPIRY CONTROLS'}</Text>
            {isExpired ? (
              <TouchableOpacity
                style={[S.actionBtn, { borderColor: accentColor, marginTop: 8 }]}
                onPress={onSetActive}
                disabled={!!updatingExpiry}
              >
                {updatingExpiry
                  ? <ActivityIndicator size="small" color={accentColor} />
                  : <>
                      <Icon name="refresh" size={13} color={accentColor} />
                      <Text style={[S.actionBtnText, { color: accentColor }]}>Set Active</Text>
                    </>
                }
              </TouchableOpacity>
            ) : (
              <View style={S.expiryControlsRow}>
                <TextInput
                  style={S.expiryInput}
                  value={expiryDraft || ''}
                  onChangeText={onExpiryDraftChange}
                  placeholder="DD/MM/YYYY, hh:mm AM"
                  placeholderTextColor="#444"
                />
                <TouchableOpacity
                  style={[S.actionBtn, S.expiryBtn, { borderColor: '#444' }]}
                  onPress={onSetExpiry}
                  disabled={!!savingExpiry}
                >
                  {savingExpiry
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Icon name="calendar-clock" size={12} color="#ccc" />
                        <Text style={S.actionBtnText}>Set Expiry</Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.actionBtn, S.expiryBtn, { borderColor: '#444' }]}
                  onPress={onSetExpired}
                  disabled={!!updatingExpiry}
                >
                  {updatingExpiry
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Icon name="timer-off-outline" size={12} color="#ccc" />
                        <Text style={S.actionBtnText}>Set Expired</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Actions ───────────────────────────────────── */}
        <View style={S.actionsRow}>
          {showViewDetails && onViewDetails && (
            <TouchableOpacity style={[S.actionBtn, { borderColor: accentColor }]} onPress={onViewDetails}>
              <Text style={[S.actionBtnText, { color: accentColor }]}>View Details</Text>
              <Icon name="arrow-right" size={13} color={accentColor} />
            </TouchableOpacity>
          )}
          {onHistory && (
            <TouchableOpacity style={S.actionBtn} onPress={onHistory}>
              <Icon name="history" size={13} color="#888" />
              <Text style={S.actionBtnText}>History</Text>
            </TouchableOpacity>
          )}
          {showEdit && onEdit && (
            <TouchableOpacity style={[S.actionBtn, { borderColor: accentColor }]} onPress={onEdit}>
              <Icon name="pencil-outline" size={13} color={accentColor} />
              <Text style={[S.actionBtnText, { color: accentColor }]}>{editLabel}</Text>
            </TouchableOpacity>
          )}
          {isAdmin && onRename && (
            <TouchableOpacity style={S.actionBtn} onPress={onRename}>
              <Icon name="form-textbox" size={13} color="#888" />
              <Text style={S.actionBtnText}>Rename</Text>
            </TouchableOpacity>
          )}
          {isAdmin && onDelete && (
            <TouchableOpacity style={[S.actionBtn, S.deleteBtn]} onPress={onDelete}>
              <Icon name="trash-can-outline" size={13} color="#ef4444" />
              <Text style={[S.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 16,
    overflow: 'hidden',
  },

  // Header band
  headerBand: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#888',
    fontSize: 11,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expiryPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Body
  body: {
    padding: 16,
    gap: 12,
  },

  // Content block
  contentBlock: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 12,
  },
  blockLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  blockValue: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 19,
  },

  // Grid
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCell: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 12,
  },
  gridCellFull: {
    flex: 1,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Expiry controls
  expiryControlsBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252525',
    padding: 12,
  },
  expiryControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  expiryInput: {
    flex: 1,
    minWidth: 140,
    height: 36,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    paddingHorizontal: 10,
    fontSize: 12,
  },
  expiryBtn: {
    paddingHorizontal: 10,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    backgroundColor: '#171717',
  },
  actionBtnText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    borderColor: '#3a1515',
    backgroundColor: '#1a0a0a',
  },
});

export default FormEntryCard;
