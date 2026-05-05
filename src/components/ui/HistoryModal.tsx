import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, radius } from '../../theme/spacing';
import { colors } from '../../theme/colors';

interface HistoryItem {
  id: string;
  changed_at?: string;
  timestamp?: string;
  users?: { name: string; email: string };
  performed_by?: string;
  action?: string;
  changes?: string;
  form_data?: any;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history?: HistoryItem[];
  loading?: boolean;
  isAdmin?: boolean;
  onRestore?: (h: HistoryItem) => void;
  onView?: (h: HistoryItem) => void;
}

export default function HistoryModal({ isOpen, onClose, history = [], loading, isAdmin, onRestore, onView }: HistoryModalProps) {
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Update History</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#4f46e5" style={{ marginVertical: 32 }} />
          ) : history.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="history" size={40} color="#333" />
              <Text style={styles.emptyText}>No history available for this entry.</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={h => h.id}
              style={{ flex: 1 }}
              renderItem={({ item }) => {
                const dateStr = item.timestamp || item.changed_at || '';
                const displayDate = dateStr ? new Date(dateStr).toLocaleDateString() : '—';
                const displayTime = dateStr ? new Date(dateStr).toLocaleTimeString() : '';
                const userName = item.performed_by || item.users?.name || 'Unknown User';
                const userSub = item.action || item.users?.email || '';
                return (
                  <View style={styles.item}>
                    {/* Top row: user + date */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={styles.avatar}>
                          <Icon name="account" size={16} color="#4f46e5" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>{userName}</Text>
                          {userSub ? <Text style={styles.subText} numberOfLines={1}>{userSub}</Text> : null}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.meta}>{displayDate}</Text>
                        <Text style={styles.metaSmall}>{displayTime}</Text>
                      </View>
                    </View>

                    {/* Changes summary */}
                    <View style={styles.changeBox}>
                      <Text style={styles.changeLabel}>Changes: </Text>
                      <Text style={styles.changeText}>{item.changes || 'Form updated'}</Text>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      {isAdmin && (
                        <TouchableOpacity onPress={() => onRestore && onRestore(item)} style={styles.restoreBtn}>
                          <Icon name="history" size={13} color="#f97316" />
                          <Text style={[styles.btnText, { color: '#f97316' }]}>Restore</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => onView && onView(item)} style={styles.viewBtn}>
                        <Icon name="file-document-outline" size={13} color={colors.text} />
                        <Text style={styles.btnText}>View Form Snapshot</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '94%', maxHeight: '80%', backgroundColor: '#0d0d0d', borderRadius: radius.lg, borderWidth: 1, borderColor: '#1a1a1a', padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: 10 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4f46e522', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { color: colors.text, fontSize: 13, fontWeight: '700' },
  subText: { color: colors.textMuted, fontSize: 11 },
  meta: { color: colors.text, fontSize: 12, fontWeight: '600' },
  metaSmall: { color: colors.textMuted, fontSize: 10 },
  changeBox: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#111', borderRadius: radius.sm, padding: 8 },
  changeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  changeText: { color: colors.text, fontSize: 12, flexShrink: 1 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: '#f9731655', backgroundColor: '#f9731611' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: '#2a2a2a', backgroundColor: '#111' },
  btnText: { color: colors.text, fontSize: 11, fontWeight: '700' },
});
