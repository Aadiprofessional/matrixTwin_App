import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { getProjectById } from '../../api/projects';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'ProjectDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList, 'ProjectDetail'>;

function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'in_progress':  return colors.statusActive;
    case 'planning':     return colors.statusPlanning;
    case 'on_hold':      return colors.statusOnHold;
    case 'completed':    return colors.statusCompleted;
    default:             return colors.primary;
  }
}

interface MetaRowProps { label: string; value: string; icon?: string }
function MetaRow({ label, value, icon }: MetaRowProps) {
  return (
    <View style={styles.metaRow}>
      {icon && <MaterialCommunityIcons name={icon} size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />}
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export default function ProjectDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { projectId } = route.params;

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProjectById(projectId),
  });

  const sc = project ? statusColor(project.status) : colors.primary;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Projects</Text>
        </TouchableOpacity>
        {project && (
          <View style={[styles.navBadge, { backgroundColor: sc + '22', borderColor: sc + '66' }]}>
            <View style={[styles.pulseDot, { backgroundColor: sc }]} />
            <Text style={[styles.navBadgeText, { color: sc }]}>
              {project.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading project data...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={40}
            color={colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>Failed to load project</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {project && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero colour block — mirrors web project image area */}
          <View style={[styles.heroBlock, { backgroundColor: sc + '18' }]}>
            <View style={[styles.heroOverlay, { borderColor: sc + '33' }]} />
            <Text style={[styles.heroInitial, { color: sc }]}>
              {project.name.charAt(0).toUpperCase()}
            </Text>
            <View style={styles.heroDatePill}>
              <Text style={styles.heroDateText}>{dayjs().format('D MMM YYYY')}</Text>
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.projectName}>{project.name.toUpperCase()}</Text>
            <Text style={styles.projectSubLabel}>Real-time Matrix Data Stream</Text>
          </View>

          {/* Metadata card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaCardTitle}>PROJECT DETAILS</Text>
            {project.location   ? <MetaRow label="Location" value={project.location} icon="map-marker" />   : null}
            {project.client     ? <MetaRow label="Client"   value={project.client} icon="office-building" />     : null}
            {project.deadline   ? <MetaRow label="Deadline" value={dayjs(project.deadline).format('D MMMM YYYY')} icon="calendar" /> : null}
            {project.created_at ? <MetaRow label="Created"  value={dayjs(project.created_at).format('D MMMM YYYY')} icon="calendar" /> : null}
            {project.created_by ? <MetaRow label="Owner"    value={project.created_by} icon="account" /> : null}
          </View>

          {/* Description */}
          {project.description ? (
            <View style={styles.descCard}>
              <Text style={styles.metaCardTitle}>DESCRIPTION</Text>
              <Text style={styles.descText}>{project.description}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: sc + '66' }]} activeOpacity={0.8}>
              <MaterialCommunityIcons name="view-dashboard" size={18} color={sc} />
              <Text style={[styles.actionBtnText, { color: sc }]}>  Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} activeOpacity={0.8}>
              <MaterialCommunityIcons name="people" size={18} color={colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>  Team</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { fontSize: 20, color: colors.primary },
  backText:  { fontSize: 15, color: colors.primary, fontWeight: '600' },
  navBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  pulseDot: { width: 7, height: 7, borderRadius: radius.full },
  navBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  heroBlock: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderBottomWidth: 1,
  },
  heroInitial: { fontSize: 80, fontWeight: '800', opacity: 0.5 },
  heroDatePill: {
    position: 'absolute',
    bottom: 14, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  heroDateText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },

  titleSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  projectName: {
    fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: 0.5,
  },
  projectSubLabel: {
    fontSize: 11, color: colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4,
  },

  metaCard: {
    margin: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  metaCardTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 2, marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  metaLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  metaValue: {
    fontSize: 13, fontWeight: '600', color: colors.text,
    flex: 1.5, textAlign: 'right',
  },

  descCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  actionBtn: {
    flex: 1, borderWidth: 1, flexDirection: 'row',
    borderRadius: radius.lg, paddingVertical: spacing.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

  loadingBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md,
  },
  loadingText: {
    fontSize: 12, color: colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  errorBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  errorIcon: { marginBottom: spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.xs,
    borderRadius: radius.lg, marginTop: spacing.sm,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
