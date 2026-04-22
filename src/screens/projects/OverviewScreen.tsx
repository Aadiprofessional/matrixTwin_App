import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BarChart, PieChart } from 'react-native-chart-kit';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { getDashboardStats, DashboardStats } from '../../api/dashboard';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Overview'>;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

const CHART_CONFIG = {
  backgroundColor: colors.surface,
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
  labelColor: () => '#9e9e9e',
  barPercentage: 0.6,
  propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.05)' },
  propsForLabels: { fontSize: 10 },
};

const PIE_COLORS = ['#FF5722', '#FF8A65', '#E64A19', '#FFCCBC', '#BF360C', '#FFAB91', '#FBE9E7'];

export default function OverviewScreen() {
  const navigation = useNavigation();
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

  const types = stats ? Object.values(stats.by_type || {}) : [];
  const labels = types.map((t: any) => (t.label || t.type || '').slice(0, 8));

  const barData = {
    labels: labels.length > 0 ? labels : ['No data'],
    datasets: [
      {
        data: types.length > 0 ? types.map((t: any) => t.pending) : [0],
        color: (opacity = 1) => `rgba(255, 196, 0, ${opacity})`,
        strokeWidth: 1,
      },
      {
        data: types.length > 0 ? types.map((t: any) => t.completed) : [0],
        color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
        strokeWidth: 1,
      },
    ],
    legend: ['Pending', 'Completed'],
  };

  const pieData = types.slice(0, 7).map((t: any, i: number) => ({
    name: (t.label || t.type || 'Unknown').slice(0, 10),
    population: t.total || 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
    legendFontColor: '#9e9e9e',
    legendFontSize: 11,
  }));

  const summaryCards = [
    {
      title: 'TOTAL FORMS',
      value: stats?.total_forms ?? 0,
      icon: 'file-document-multiple-outline',
      accent: colors.primary,
      bg: colors.primary + '22',
    },
    {
      title: 'PENDING',
      value: stats?.pending_total ?? 0,
      icon: 'alarm-light-outline',
      accent: colors.warning,
      bg: colors.warning + '22',
    },
    {
      title: 'COMPLETED',
      value: stats?.completed_total ?? 0,
      icon: 'shield-check-outline',
      accent: colors.success,
      bg: colors.success + '22',
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>{projectName}</Text>
        </TouchableOpacity>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.projectName}>
              {projectName.toUpperCase()}{' '}
              <Text style={styles.projectNameAccent}>DASHBOARD</Text>
            </Text>
            <Text style={styles.subtitle}>Real-time Matrix Data Stream</Text>
          </View>
          <View style={styles.dateBadge}>
            <Icon name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: spacing.xl * 3 }}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.cardGrid}>
              {summaryCards.map((card, i) => (
                <View
                  key={card.title}
                  style={[
                    styles.summaryCard,
                    i === 0 && { backgroundColor: colors.primary, borderColor: colors.primaryDark },
                  ]}>
                  <View style={[styles.cardIconWrap, { backgroundColor: i === 0 ? 'rgba(0,0,0,0.2)' : card.bg }]}>
                    <Icon name={card.icon} size={22} color={i === 0 ? '#fff' : card.accent} />
                  </View>
                  {i === 0 && (
                    <View style={styles.liveBadgeSmall}>
                      <Text style={styles.liveBadgeSmallText}>Live</Text>
                    </View>
                  )}
                  <Text style={[styles.cardTitle, i === 0 && { color: 'rgba(255,255,255,0.7)' }]}>
                    {card.title}
                  </Text>
                  <Text style={[styles.cardValue, { color: i === 0 ? '#fff' : card.accent }]}>
                    {card.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Bar Chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartCornerTL} />
              <View style={styles.chartCornerBR} />
              <View style={styles.chartHeader}>
                <Icon name="chart-bar" size={18} color={colors.primary} />
                <Text style={styles.chartTitle}>FORM STATUS ANALYTICS</Text>
              </View>
              {types.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barData}
                    width={Math.max(CHART_WIDTH, labels.length * 80)}
                    height={220}
                    chartConfig={CHART_CONFIG}
                    style={styles.chart}
                    fromZero
                    showBarTops={false}
                    withInnerLines
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                </ScrollView>
              ) : (
                <View style={styles.emptyChart}>
                  <Icon name="chart-bar" size={36} color={colors.border} />
                  <Text style={styles.emptyChartText}>No data available</Text>
                </View>
              )}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FFC400' }]} />
                  <Text style={styles.legendLabel}>Pending</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendLabel}>Completed</Text>
                </View>
              </View>
            </View>

            {/* Pie Chart */}
            {pieData.length > 0 && (
              <View style={styles.chartCard}>
                <View style={styles.chartCornerTR} />
                <View style={styles.chartCornerBL} />
                <View style={styles.chartHeader}>
                  <Icon name="chart-donut" size={18} color={colors.primary} />
                  <Text style={styles.chartTitle}>DISTRIBUTION</Text>
                </View>
                <View style={styles.pieWrapper}>
                  <PieChart
                    data={pieData}
                    width={CHART_WIDTH}
                    height={200}
                    chartConfig={CHART_CONFIG}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="16"
                    hasLegend={false}
                    style={styles.chart}
                  />
                  <View style={styles.pieLegend}>
                    {pieData.map((item, i) => (
                      <View key={i} style={styles.pieLegendItem}>
                        <View style={[styles.pieLegendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.pieLegendLabel} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.pieLegendValue}>{item.population}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Detailed Breakdown */}
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <Icon name="format-list-bulleted" size={18} color={colors.primary} />
                <Text style={styles.chartTitle}>DETAILED BREAKDOWN</Text>
              </View>
              <View style={styles.breakdownGrid}>
                {types.map((type: any, i: number) => {
                  const completedPct = type.total > 0 ? (type.completed / type.total) * 100 : 0;
                  const pendingPct = type.total > 0 ? (type.pending / type.total) * 100 : 0;
                  return (
                    <View key={i} style={styles.breakdownItem}>
                      <Text style={styles.breakdownType} numberOfLines={1}>
                        {type.label || type.type}
                      </Text>
                      <View style={styles.breakdownStats}>
                        <View style={styles.breakdownStat}>
                          <Text style={styles.breakdownStatLabel}>Total</Text>
                          <Text style={styles.breakdownStatValue}>{type.total}</Text>
                        </View>
                        <View style={styles.breakdownStat}>
                          <Text style={styles.breakdownStatLabel}>Pending</Text>
                          <Text style={[styles.breakdownStatValue, { color: colors.warning }]}>{type.pending}</Text>
                        </View>
                        <View style={styles.breakdownStat}>
                          <Text style={styles.breakdownStatLabel}>Done</Text>
                          <Text style={[styles.breakdownStatValue, { color: colors.primary }]}>{type.completed}</Text>
                        </View>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressCompleted, { width: `${completedPct}%` }]} />
                        <View style={[styles.progressPending, { width: `${pendingPct}%` }]} />
                      </View>
                    </View>
                  );
                })}
                {types.length === 0 && (
                  <View style={styles.emptyBreakdown}>
                    <Icon name="file-document-outline" size={36} color={colors.border} />
                    <Text style={styles.emptyChartText}>No form data yet</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

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
  backText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', maxWidth: 180 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.statusActive },
  liveText: { color: colors.statusActive, fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 },

  scroll: { padding: spacing.xl, paddingBottom: 0 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xl },
  projectName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, flexShrink: 1 },
  projectNameAccent: { color: colors.primary },
  subtitle: { color: colors.textMuted, fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: spacing.xl },

  // Summary cards
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    minWidth: 95,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  liveBadgeSmall: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeSmallText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  cardTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 },
  cardValue: { fontSize: 28, fontWeight: '800', color: '#fff' },

  // Chart cards
  chartCard: {
    backgroundColor: 'rgba(17,17,17,0.8)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  chartCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 48,
    height: 48,
    borderTopLeftRadius: radius.xl,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.primary + '50',
  },
  chartCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderBottomRightRadius: radius.xl,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.primary + '50',
  },
  chartCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.primary + '50',
  },
  chartCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 48,
    height: 48,
    borderBottomLeftRadius: radius.xl,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.primary + '50',
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  chartTitle: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  chart: { borderRadius: radius.md, marginLeft: -spacing.sm },
  emptyChart: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyChartText: { color: colors.textMuted, fontSize: 13 },

  legendRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' },

  pieWrapper: { alignItems: 'center' },
  pieLegend: { width: '100%', marginTop: spacing.sm },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: spacing.xs,
  },
  pieLegendDot: { width: 10, height: 10, borderRadius: 5 },
  pieLegendLabel: { flex: 1, color: colors.textMuted, fontSize: 11 },
  pieLegendValue: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },

  // Breakdown
  breakdownCard: {
    backgroundColor: 'rgba(17,17,17,0.5)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  breakdownGrid: { gap: spacing.sm },
  breakdownItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  breakdownType: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  breakdownStats: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.sm },
  breakdownStat: { gap: 2 },
  breakdownStatLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'monospace' },
  breakdownStatValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  progressBar: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressCompleted: { height: 4, backgroundColor: colors.primary },
  progressPending: { height: 4, backgroundColor: colors.warning, opacity: 0.7 },
  emptyBreakdown: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
});
