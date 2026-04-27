import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

export interface ProcessNode {
  id: string;
  type: 'start' | 'node' | 'end';
  name: string;
  executor?: string;
  executorId?: string;
  ccRecipients?: any[];
  editAccess?: boolean;
  expireTime?: string;
  expireDuration?: number | null;
  settings?: Record<string, any>;
}

export default function ProcessFlowBuilder({ nodes, onSelectNode, selectedNodeId, onAdd }: {
  nodes: ProcessNode[];
  onSelectNode: (node: ProcessNode) => void;
  selectedNodeId?: string | null;
  onAdd?: () => void;
}) {
  return (
    <View style={{ padding: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Process Flow</Text>
        <TouchableOpacity onPress={onAdd} style={{ padding: 6 }}>
          <Icon name="plus" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <FlatList data={nodes} keyExtractor={n => n.id} renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelectNode(item)} style={[styles.nodeRow, selectedNodeId === item.id && styles.nodeRowActive]}>
          <View style={styles.nodeLeft}><Icon name={item.type === 'start' ? 'arrow-right-bold-circle' : item.type === 'end' ? 'checkbox-marked-circle' : 'circle-outline'} size={18} color={colors.textMuted} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nodeName}>{item.name}</Text>
            {item.executor ? <Text style={styles.nodeMeta}>Executor: {item.executor}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.nodeMeta}>{item.ccRecipients ? `${item.ccRecipients.length} CC` : 'No CC'}</Text>
          </View>
        </TouchableOpacity>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  nodeRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: '#333', marginBottom: spacing.xs, backgroundColor: '#0d0d0d' },
  nodeRowActive: { borderColor: '#0ea5e9' },
  nodeLeft: { width: 36, alignItems: 'center', justifyContent: 'center' },
  nodeName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  nodeMeta: { color: colors.textMuted, fontSize: 12 },
});
