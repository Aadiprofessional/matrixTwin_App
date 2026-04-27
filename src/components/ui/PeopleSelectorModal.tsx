import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, radius } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export default function PeopleSelectorModal({ isOpen, onClose, users, onSelect, loading, title }: {
  isOpen: boolean; onClose: () => void; users: any[]; onSelect: (u: any) => void; loading?: boolean; title?: string;
}) {
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}><Text style={styles.title}>{title || 'Select Person'}</Text><TouchableOpacity onPress={onClose}><Text style={styles.close}>Close</Text></TouchableOpacity></View>
          <FlatList data={users} keyExtractor={u => u.id} renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </TouchableOpacity>
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
  email: { color: colors.textMuted, fontSize: 12 },
});
