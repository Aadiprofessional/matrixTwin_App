import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getDashboardStats, DashboardStats } from '../../api/dashboard';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'ProjectDashboard'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

interface NavModule {
  key: keyof AppStackParamList;
  label: string;
  icon: string;
  section: 'main' | 'dwss' | 'management';
  badgeKey?: string;
  roles?: string[];
}

const NAV_MODULES: NavModule[] = [
  // Main
  { key: 'ProjectDashboard', label: 'Overview', icon: '📊', section: 'main' },
  // DWSS Modules
  { key: 'Rfi', label: 'RFI / RICS', icon: '📋', section: 'dwss', badgeKey: 'rfi' },
  { key: 'Diary', label: 'Site Diary', icon: '📔', section: 'dwss', badgeKey: 'diary' },
  { key: 'Safety', label: 'Safety Inspections', icon: '🛡️', section: 'dwss', badgeKey: 'safety' },
  { key: 'Labour', label: 'Labour Return', icon: '👷', section: 'dwss', badgeKey: 'labour' },
  { key: 'Cleansing', label: 'Cleansing Records', icon: '🧹', section: 'dwss', badgeKey: 'cleansing' },
  // Management
  { key: 'Team', label: 'Team Management', icon: '👥', section: 'management', roles: ['admin', 'projectManager', 'contractor'] },
  { key: 'Settings', label: 'Settings', icon: '⚙️', section: 'management' },
];

export default function ProjectDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDashboardStats(projectId, user.id)
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, user]);

  const getBadgeCount = (key?: string): number => {
    if (!key || !stats?.by_type) return 0;
    const entry = stats.by_type[key];
    return entry?.pending ?? 0;
  };

  const canAccess = (mod: NavModule): boolean => {
    if (!mod.roles) return true;
    return mod.roles.includes(user?.role ?? '');
  };

  const handleNav = (mod: NavModule) => {
    if (mod.key === 'ProjectDashboard') return; // already here
    if (!canAccess(mod)) return;
    navigation.navigate(mod.key as any, { projectId, projectName });
  };

  const statCards = [
    { label: 'Total Forms', value: stats?.total_forms ?? 0, color: colors.primary },
    { label: 'Pending', value: stats?.pending_total ?? 0, color: colors.warning },
    { label: 'Completed', value: stats?.completed_total ?? 0, color: colors.success },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Projects</Text>
        </TouchableOpacity>
        <View style={styles.projectBadge}>
          <View style={[styles.pulseDot, { backgroundColor: colors.statusActive }]} />
          <Text style={styles.projectBadgeText}>ACTIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTag}>// Project Dashboard</Text>
          <Text style={styles.heroTitle}>{projectName.toUpperCase()}</Text>
          <View style={styles.heroDivider} />
        </View>

        {/* Stats row */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : (
          <View style={styles.statsRow}>
            {statCards.map(s => (
              <View key={s.label} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 2 }]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Main section */}
        <SectionHeader title="MAIN" />
        {NAV_MODULES.filter(m => m.section === 'main').map(mod => (
          <ModuleRow key={mod.key} mod={mod} onPress={() => handleNav(mod)} badge={0} isActive />
        ))}

        {/* DWSS Modules section */}
        <SectionHeader title="DWSS MODULES" />
        {NAV_MODULES.filter(m => m.section === 'dwss').map(mod => (
          <ModuleRow
            key={mod.key}
            mod={mod}
            onPress={() => handleNav(mod)}
            badge={getBadgeCount(mod.badgeKey)}
            isActive
          />
        ))}

        {/* Management section */}
        <SectionHeader title="MANAGEMENT" />
        {NAV_MODULES.filter(m => m.section === 'management').map(mod => (
          <ModuleRow
            key={mod.key}
            mod={mod}
            onPress={() => handleNav(mod)}
            badge={0}
            isActive={canAccess(mod)}
            locked={!canAccess(mod)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.text}>{title}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  text: { color: colors.textMuted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginRight: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
});

interface ModuleRowProps {
  mod: NavModule;
  onPress: () => void;
  badge: number;
  isActive: boolean;
  locked?: boolean;
}

function ModuleRow({ mod, onPress, badge, isActive, locked }: ModuleRowProps) {
  return (
    <TouchableOpacity
      style={[modStyles.row, !isActive && modStyles.rowDisabled]}
      onPress={onPress}
      activeOpacity={locked ? 1 : 0.7}
      disabled={locked}>
      <View style={modStyles.iconBox}>
        <Text style={modStyles.icon}>{mod.icon}</Text>
      </View>
      <Text style={[modStyles.label, !isActive && modStyles.labelDisabled]}>{mod.label}</Text>
      <View style={modStyles.right}>
        {badge > 0 && (
          <View style={modStyles.badge}>
            <Text style={modStyles.badgeText}>{badge}</Text>
          </View>
        )}
        {locked ? (
          <Text style={modStyles.lock}>🔒</Text>
        ) : (
          <Text style={modStyles.arrow}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const modStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.xs,
  },
  rowDisabled: { opacity: 0.4 },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 18 },
  label: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 },
  labelDisabled: { color: colors.textMuted },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  lock: { fontSize: 12 },
  arrow: { color: colors.textMuted, fontSize: 20, lineHeight: 22 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  backIcon: { color: colors.textSecondary, fontSize: 18 },
  backText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  projectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  projectBadgeText: { color: colors.statusActive, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },

  scroll: { padding: spacing.xl, paddingBottom: spacing.huge },

  hero: { marginBottom: spacing.xl },
  heroTag: { color: colors.primary, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.xs },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: spacing.sm },
  heroDivider: { height: 2, width: 40, backgroundColor: colors.primary },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
