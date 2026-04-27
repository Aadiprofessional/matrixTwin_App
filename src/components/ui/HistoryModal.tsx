import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export default function HistoryModal({ isOpen, onClose, history = [], onRestore, onView }: { isOpen: boolean; onClose: () => void; history?: any[]; onRestore?: (h: any) => void; onView?: (h: any) => void; }) {
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}><Text style={styles.title}>Update History</Text><TouchableOpacity onPress={onClose}><Text style={styles.close}>Close</Text></TouchableOpacity></View>
          <FlatList data={history} keyExtractor={h => h.id} renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.name}>{item.users?.name || 'Unknown'}</Text>
                  <Text style={styles.meta}>{new Date(item.changed_at).toLocaleString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => onView && onView(item)} style={styles.viewBtn}><Text style={{ color: colors.text }}>View</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => onRestore && onRestore(item)} style={styles.restoreBtn}><Text style={{ color: colors.text }}>Restore</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center' },
  sheet: { width:'92%', maxHeight:'80%', backgroundColor:'#0d0d0d', borderRadius:16, padding: spacing.md },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  close: { color: colors.textMuted },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  name: { color: colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12 },
  restoreBtn: { padding: 6, borderRadius: 6, backgroundColor: '#111' },
  viewBtn: { padding: 6, borderRadius: 6, backgroundColor: '#111', marginRight: 6 }
});
