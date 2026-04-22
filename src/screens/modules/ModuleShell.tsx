/**
 * Shared screen shell for all DWSS module screens.
 * Provides the top nav bar with back button + project context.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface Props {
  title: string;
  icon: string;
  projectName: string;
  children: React.ReactNode;
}

export default function ModuleShell({ title, icon, projectName, children }: Props) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText} numberOfLines={1}>{projectName}</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flex: 1 },
  backIcon: { color: colors.textSecondary, fontSize: 18 },
  backText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  icon: { fontSize: 16 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
