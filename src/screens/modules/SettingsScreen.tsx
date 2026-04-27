import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows = [
    { label: 'Name', value: user?.name ?? '—' },
    { label: 'Email', value: user?.email ?? '—' },
    { label: 'Role', value: user?.role ?? '—' },
    { label: 'Project', value: projectName },
    { label: 'Project ID', value: projectId },
  ];

  return (
    <ModuleShell title="Settings" iconName="cog" projectName={projectName}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {rows.map(r => (
          <View key={r.label} style={styles.row}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowValue}>{r.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>↩  SIGN OUT</Text>
      </TouchableOpacity>
    </ModuleShell>
  );
}

const styles = StyleSheet.create({
  section: {
    margin: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: colors.textMuted, fontSize: 11, fontFamily: 'monospace',
    letterSpacing: 2, textTransform: 'uppercase',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textSecondary, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: spacing.md },
  logoutBtn: {
    alignSelf: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  logoutText: {
    color: colors.error, fontFamily: 'monospace',
    fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
  },
});
