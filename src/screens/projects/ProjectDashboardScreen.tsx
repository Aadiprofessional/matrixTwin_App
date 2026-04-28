import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
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
  description: string;
  accentColor: string;
  roles?: string[];
}

const NAV_MODULES: NavModule[] = [
  {
    key: 'Overview',
    label: 'Overview',
    icon: 'chart-bar',
    section: 'main',
    description: 'Dashboard & analytics',
    accentColor: colors.primary,
  },

  {
    key: 'ModelViewer',
    label: 'Digital Twin',
    icon: 'cube-outline',
    section: 'main',
    description: 'Direct BIMFACE 3D viewer',
    accentColor: '#8b5cf6',
  },
  {
    key: 'Rfi',
    label: 'RFI / RICS',
    icon: 'clipboard-list-outline',
    section: 'dwss',
    description: 'Requests for information',
    accentColor: '#6366f1',
  },
  {
    key: 'Diary',
    label: 'Site Diary',
    icon: 'notebook-outline',
    section: 'dwss',
    description: 'Daily site records',
    accentColor: '#0ea5e9',
  },
  {
    key: 'Safety',
    label: 'Safety Inspections',
    icon: 'shield-check-outline',
    section: 'dwss',
    description: 'Health & safety checks',
    accentColor: '#ef4444',
  },
  {
    key: 'Labour',
    label: 'Labour Return',
    icon: 'hard-hat',
    section: 'dwss',
    description: 'Workforce tracking',
    accentColor: '#f59e0b',
  },
  {
    key: 'Cleansing',
    label: 'Cleansing Records',
    icon: 'broom',
    section: 'dwss',
    description: 'Cleaning inspections',
    accentColor: '#10b981',
  },
 
  {
    key: 'Forms',
    label: 'Forms',
    icon: 'file-document-multiple-outline',
    section: 'dwss',
    description: 'Templates and approvals',
    accentColor: '#5f7cae',
  },
  {
    key: 'Team',
    label: 'Team Management',
    icon: 'account-group-outline',
    section: 'management',
    description: 'Manage project members',
    accentColor: '#8b5cf6',
    roles: ['admin', 'projectManager', 'contractor'],
  },

  {
    key: 'Settings',
    label: 'Settings',
    icon: 'cog-outline',
    section: 'management',
    description: 'Project configuration',
    accentColor: colors.textMuted,
  },
];

export default function ProjectDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const canAccess = (mod: NavModule): boolean => {
    if (!mod.roles) return true;
    return mod.roles.includes(user?.role ?? '');
  };

  const handleNav = (mod: NavModule) => {
    if (!canAccess(mod)) return;
    navigation.navigate(mod.key as any, { projectId, projectName });
  };

  const renderSection = (title: string, section: 'main' | 'dwss' | 'management') => {
    const mods = NAV_MODULES.filter(m => m.section === section);
    return (
      <View style={styles.section} key={section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{title}</Text>
          <View style={styles.sectionLine} />
        </View>
        {mods.map(mod => {
          const locked = !canAccess(mod);
          return (
            <TouchableOpacity
              key={String(mod.key)}
              style={[styles.moduleCard, locked && styles.moduleCardLocked]}
              onPress={() => handleNav(mod)}
              activeOpacity={locked ? 1 : 0.7}
              disabled={locked}>
              <View style={[styles.iconContainer, { backgroundColor: mod.accentColor + '22' }]}>
                <Icon
                  name={mod.icon}
                  size={22}
                  color={locked ? colors.textMuted : mod.accentColor}
                />
              </View>
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleLabel, locked && styles.moduleLabelLocked]}>
                  {mod.label}
                </Text>
                <Text style={styles.moduleDesc} numberOfLines={1}>
                  {mod.description}
                </Text>
              </View>
              <Icon
                name={locked ? 'lock-outline' : 'chevron-right'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>Projects</Text>
        </TouchableOpacity>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTag}>// PROJECT</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {projectName.toUpperCase()}
        </Text>
        <View style={styles.heroDivider} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {renderSection('MAIN', 'main')}
        {renderSection('DWSS MODULES', 'dwss')}
        {renderSection('MANAGEMENT', 'management')}
        <View style={{ height: spacing.huge }} />
      </ScrollView>

      {/* Floating Action Button for Ask AI */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AskAI', { projectId, projectName })}
        style={styles.fabButton}
        activeOpacity={0.8}>
        <Icon name="brain" size={24} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.statusActive },
  activeBadgeText: {
    color: colors.statusActive,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  heroTag: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroDivider: { height: 2, width: 40, backgroundColor: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl },
  section: { marginTop: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginRight: spacing.xs,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  moduleCardLocked: { opacity: 0.45 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleInfo: { flex: 1 },
  moduleLabel: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  moduleLabelLocked: { color: colors.textMuted },
  moduleDesc: { color: colors.textMuted, fontSize: 12 },
  fabButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: spacing.xl + 10,
    right: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
