import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getProjectMembers, TeamMember } from '../../api/team';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Team'>;

const ROLE_COLORS: Record<string, string> = {
  admin: colors.primary,
  projectManager: colors.warning,
  siteInspector: colors.info,
  contractor: colors.success,
  worker: colors.textSecondary,
  user: colors.textMuted,
};

export default function TeamScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectMembers(projectId)
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const renderItem = ({ item }: { item: TeamMember }) => {
    const rc = ROLE_COLORS[item.role] ?? colors.textMuted;
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: rc + '22' }]}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarLetter, { color: rc }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { borderColor: rc }]}>
          <Text style={[styles.roleText, { color: rc }]}>{item.role}</Text>
        </View>
      </View>
    );
  };

  return (
    <ModuleShell title="Team Management" icon="👥" projectName={projectName}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{members.length} members</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No team members assigned yet.</Text>
            </View>
          }
        />
      )}
    </ModuleShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  count: { color: colors.textMuted, fontSize: 12 },
  list: { padding: spacing.md, paddingBottom: spacing.huge },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarLetter: { fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  email: { color: colors.textMuted, fontSize: 12 },
  roleBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
