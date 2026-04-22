import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';
import { getProjects, Project } from '../../api/projects';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<AppStackParamList>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'in_progress': return colors.statusActive;
    case 'planning':    return colors.statusPlanning;
    case 'on_hold':     return colors.statusOnHold;
    case 'completed':   return colors.statusCompleted;
    default:            return colors.primary;
  }
}

interface StatCardProps { label: string; value: number | string; accent?: boolean }
function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface ProjectRowProps { project: Project; onPress: () => void }
function ProjectRow({ project, onPress }: ProjectRowProps) {
  return (
    <TouchableOpacity style={styles.projectRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.projectRowLeft}>
        <Text style={styles.projectRowName} numberOfLines={1}>{project.name}</Text>
        <Text style={styles.projectRowSub} numberOfLines={1}>
          {project.location ?? 'No location'} · {project.client ?? '—'}
        </Text>
      </View>
      <View style={styles.projectRowRight}>
        <View style={[styles.badge, { backgroundColor: statusColor(project.status) }]}>
          <Text style={styles.badgeText}>{project.status.replace('_', ' ')}</Text>
        </View>
        {project.deadline ? (
          <Text style={styles.projectRowDate}>
            {dayjs(project.deadline).format('D MMM YY')}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);

  const { data: projects = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const recentProjects = projects.slice(0, 5);

  const handleProjectPress = useCallback((projectId: string) => {
    navigation.navigate('ProjectDetail', { projectId });
  }, [navigation]);

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <FlatList
        data={recentProjects}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>{firstName}</Text>
              </View>
              <View style={styles.datePill}>
                <View style={styles.pulseDot} />
                <Text style={styles.dateText}>{dayjs().format('D MMM YYYY')}</Text>
              </View>
            </View>

            {/* Stat cards */}
            <View style={styles.statsRow}>
              <StatCard label="TOTAL PROJECTS" value={projects.length} accent />
              <StatCard
                label="ACTIVE"
                value={projects.filter(p =>
                  ['active', 'in_progress'].includes(p.status?.toLowerCase())).length}
              />
              <StatCard
                label="COMPLETED"
                value={projects.filter(p =>
                  p.status?.toLowerCase() === 'completed').length}
              />
            </View>

            {/* Section heading */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Projects</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Projects' })}>
                <Text style={styles.sectionLink}>View all →</Text>
              </TouchableOpacity>
            </View>

            {isLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading matrix data...</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ProjectRow project={item} onPress={() => handleProjectPress(item.id)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏗️</Text>
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptySubtitle}>
                Projects assigned to your account will appear here.
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xxxl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  dateText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  // Stat cards
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statCardAccent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Section heading
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Loading
  loadingBox: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Project row
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  projectRowLeft: { flex: 1, marginRight: spacing.md },
  projectRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectRowSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  projectRowRight: { alignItems: 'flex-end', gap: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectRowDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  // Empty state
  emptyBox: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
