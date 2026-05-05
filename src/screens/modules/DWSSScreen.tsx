import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Modal, Alert, Linking, Dimensions, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { generateReport } from '../../api/analytics';
import { API_BASE_URL } from '../../api/client';

type DWSSScreenProps = NativeStackScreenProps<any, 'DWSS'>;

const isSmallScreen = Dimensions.get('window').width < 390;

interface WorkSite {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  lastUpdated: string;
  workers: number;
  equipment: number;
}

export default function DWSSScreen({ route, navigation }: DWSSScreenProps) {
  const { projectId, projectName } = route.params as { projectId: string; projectName: string };
  const [workSites, setWorkSites] = useState<WorkSite[]>([
    {
      id: '1',
      name: 'Foundation Works',
      status: 'active',
      lastUpdated: '2 hours ago',
      workers: 12,
      equipment: 5,
    },
    {
      id: '2',
      name: 'Concrete Pouring',
      status: 'active',
      lastUpdated: '30 minutes ago',
      workers: 8,
      equipment: 3,
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Digital Work Site Systems',
      headerShown: false,
    });
  }, []);

  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return workSites;
    const q = searchQuery.toLowerCase();
    return workSites.filter(s => s.name.toLowerCase().includes(q));
  }, [workSites, searchQuery]);

  const reportData = useMemo(() => {
    const active = workSites.filter(s => s.status === 'active').length;
    const paused = workSites.filter(s => s.status === 'paused').length;
    const completed = workSites.filter(s => s.status === 'completed').length;
    const totalWorkers = workSites.reduce((sum, s) => sum + s.workers, 0);
    const totalEquipment = workSites.reduce((sum, s) => sum + s.equipment, 0);
    return { active, paused, completed, totalWorkers, totalEquipment };
  }, [workSites]);

  const openPdfReport = async () => {
    setDownloadingReport(true);
    try {
      const report = await generateReport({
        projectId,
        type: 'daily',
        modules: ['dwss'],
        format: 'pdf',
      });
      const rawUrl = report?.fileUrl;
      if (!rawUrl) {
        Alert.alert('Unavailable', 'PDF file is not available for this report yet.');
        return;
      }
      const host = API_BASE_URL.replace(/\/api\/?$/, '');
      const resolvedUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${host}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      const canOpen = await Linking.canOpenURL(resolvedUrl);
      if (!canOpen) {
        Alert.alert('Error', 'Unable to open PDF download link on this device.');
        return;
      }
      await Linking.openURL(resolvedUrl);
      setShowReport(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to generate PDF report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const renderWorkSite = ({ item }: { item: WorkSite }) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
            {item.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              marginTop: spacing.sm,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  item.status === 'active'
                    ? '#10b981'
                    : item.status === 'paused'
                    ? '#f59e0b'
                    : '#6b7280',
                marginRight: spacing.sm,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' }}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {item.lastUpdated}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.md,
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Workers</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 }}>
            {item.workers}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Equipment</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 }}>
            {item.equipment}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>DWSS</Text>
            <Text style={{ color: '#888', fontSize: 12 }}>{projectName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowReport(true)} style={{ backgroundColor: '#2a2a2a', borderRadius: radius.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="file-chart-outline" size={20} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TextInput
          style={{
            backgroundColor: colors.background,
            borderRadius: 8,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            fontSize: 14,
          }}
          placeholder="Search work sites..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Work Sites List */}
      <FlatList
        data={filteredSites}
        renderItem={renderWorkSite}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Text style={{ color: colors.textSecondary }}>No work sites found</Text>
          </View>
        }
      />

      {/* Report Modal */}
      <Modal visible={showReport} animationType="slide" transparent>
        <View style={RS.modalOverlay}>
          <View style={[RS.reportSheet, isSmallScreen && RS.reportSheetMobile]}>
            <View style={RS.reportHeaderBar}>
              <View style={{ flex: 1 }}>
                <Text style={RS.reportHeaderTitle}>DWSS Full Report</Text>
                <Text style={RS.reportHeaderSub}>Overview of all work sites, workforce and equipment status.</Text>
              </View>
              <TouchableOpacity style={RS.reportHeaderAction} onPress={openPdfReport} disabled={downloadingReport}>
                {downloadingReport
                  ? <ActivityIndicator color="#0a0a0a" size="small" />
                  : <Icon name="download" size={14} color="#0a0a0a" />}
                <Text style={RS.reportHeaderActionText}>{downloadingReport ? 'Generating…' : 'Download PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowReport(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={RS.reportBody} showsVerticalScrollIndicator={false}>
              <View style={RS.reportStatsRow}>
                <View style={RS.reportStatCard}>
                  <Text style={RS.reportStatLabel}>Total Sites</Text>
                  <Text style={RS.reportStatValue}>{workSites.length}</Text>
                </View>
                <View style={RS.reportStatCard}>
                  <Text style={RS.reportStatLabel}>Workers</Text>
                  <Text style={RS.reportStatValue}>{reportData.totalWorkers}</Text>
                </View>
                <View style={RS.reportStatCard}>
                  <Text style={RS.reportStatLabel}>Equipment</Text>
                  <Text style={RS.reportStatValue}>{reportData.totalEquipment}</Text>
                </View>
              </View>

              <View style={RS.reportChartsRow}>
                <View style={RS.reportCard}>
                  <Text style={RS.reportCardTitle}>Site Status</Text>
                  {[
                    { label: 'Active', count: reportData.active, color: '#6f8f38' },
                    { label: 'Paused', count: reportData.paused, color: '#90a86f' },
                    { label: 'Completed', count: reportData.completed, color: '#5a7030' },
                  ].map(item => {
                    const total = workSites.length || 1;
                    const width = Math.max(8, Math.round((item.count / total) * 100));
                    return (
                      <View key={item.label} style={RS.reportBarItem}>
                        <View style={[RS.reportBarFill, { width: `${width}%`, backgroundColor: item.color }]} />
                        <Text style={RS.reportBarLabel}>{item.label} ({item.count})</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={RS.reportCard}>
                  <Text style={RS.reportCardTitle}>Workforce per Site</Text>
                  {workSites.length === 0 && <Text style={RS.reportMuted}>No data available</Text>}
                  {workSites.slice(0, 4).map(site => {
                    const max = Math.max(...workSites.map(s => s.workers), 1);
                    const width = Math.max(8, Math.round((site.workers / max) * 100));
                    return (
                      <View key={site.id} style={RS.reportBarItem}>
                        <View style={[RS.reportBarFillMuted, { width: `${width}%` }]} />
                        <Text style={RS.reportBarLabel}>{site.name} ({site.workers})</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={RS.reportCard}>
                <Text style={RS.reportCardTitle}>Report Highlights</Text>
                <View style={RS.reportHighlightGrid}>
                  <View style={RS.reportHighlightItem}>
                    <Text style={RS.reportHighlightText}>{reportData.active} of {workSites.length} sites are currently active.</Text>
                  </View>
                  <View style={RS.reportHighlightItem}>
                    <Text style={RS.reportHighlightText}>Total workforce across all sites: {reportData.totalWorkers} workers.</Text>
                  </View>
                  <View style={RS.reportHighlightItem}>
                    <Text style={RS.reportHighlightText}>Total equipment deployed: {reportData.totalEquipment} units.</Text>
                  </View>
                  {reportData.paused > 0 && (
                    <View style={RS.reportHighlightItem}>
                      <Text style={RS.reportHighlightText}>{reportData.paused} site(s) are currently paused and may need attention.</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={RS.reportCard}>
                <Text style={RS.reportCardTitle}>Work Sites Overview</Text>
                <View style={RS.reportTableHeader}>
                  <Text style={[RS.reportTableHeadText, { flex: 2 }]}>Site Name</Text>
                  <Text style={[RS.reportTableHeadText, { flex: 1 }]}>Status</Text>
                  <Text style={[RS.reportTableHeadText, { flex: 1 }]}>Workers</Text>
                  <Text style={[RS.reportTableHeadText, { flex: 1 }]}>Equipment</Text>
                </View>
                {workSites.length === 0 ? (
                  <Text style={RS.reportEmptyTable}>No work sites found.</Text>
                ) : workSites.map(site => (
                  <View key={site.id} style={RS.reportTableRow}>
                    <Text style={[RS.reportTableCell, { flex: 2 }]} numberOfLines={1}>{site.name}</Text>
                    <Text style={[RS.reportTableCell, { flex: 1, textTransform: 'capitalize' }]}>{site.status}</Text>
                    <Text style={[RS.reportTableCell, { flex: 1 }]}>{site.workers}</Text>
                    <Text style={[RS.reportTableCell, { flex: 1 }]}>{site.equipment}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const RS = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  reportSheet: { width: '92%', maxHeight: '92%', backgroundColor: '#070b05', borderRadius: 12, borderWidth: 1, borderColor: '#2a3b19', overflow: 'hidden' },
  reportSheetMobile: { width: '95%', maxHeight: '94%' },

  reportHeaderBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#5f7f2b' },
  reportHeaderTitle: { color: '#fff', fontSize: 21, fontWeight: '700' },
  reportHeaderSub: { color: '#e3efcf', fontSize: 12, marginTop: 2 },
  reportHeaderAction: { minHeight: 34, borderRadius: 8, backgroundColor: '#b8d37a', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportHeaderActionText: { color: '#0a0a0a', fontSize: 12, fontWeight: '700' },

  reportBody: { paddingHorizontal: 12, paddingVertical: 12 },
  reportStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  reportStatCard: { flex: 1, backgroundColor: '#0b1108', borderWidth: 1, borderColor: '#1a2811', borderRadius: 8, padding: 10 },
  reportStatLabel: { color: '#8aaa63', fontSize: 11, marginBottom: 4 },
  reportStatValue: { color: '#e7f1d5', fontSize: 18, fontWeight: '700' },

  reportChartsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  reportCard: { flex: 1, backgroundColor: '#080c06', borderWidth: 1, borderColor: '#1a2811', borderRadius: 8, padding: 10, marginBottom: 10 },
  reportCardTitle: { color: '#dceabf', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  reportMuted: { color: '#6f8257', fontSize: 12 },
  reportBarItem: { height: 26, justifyContent: 'center', marginBottom: 8, position: 'relative', borderRadius: 4, overflow: 'hidden', backgroundColor: '#10180b' },
  reportBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6f8f38' },
  reportBarFillMuted: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#90a86f' },
  reportBarLabel: { color: '#deedbe', fontSize: 11, paddingHorizontal: 8, zIndex: 2 },

  reportHighlightGrid: { gap: 8 },
  reportHighlightItem: { borderWidth: 1, borderColor: '#172311', backgroundColor: '#0d1309', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  reportHighlightText: { color: '#d8e8bb', fontSize: 12 },

  reportTableHeader: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1a2811', paddingVertical: 7, marginBottom: 4 },
  reportTableHeadText: { color: '#9eb879', fontSize: 11, fontWeight: '700' },
  reportTableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#131c0d' },
  reportTableCell: { color: '#deebc5', fontSize: 11, paddingRight: 8 },
  reportEmptyTable: { color: '#7f9363', fontSize: 12, paddingVertical: 10, textAlign: 'center' },
});
