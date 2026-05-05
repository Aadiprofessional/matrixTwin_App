import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import { getProjects, createProject, deleteProject, Project } from '../../api/projects';
import { getCompany } from '../../api/company';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useProjectStore } from '../../store/projectStore';
import NotificationsModal from '../../components/ui/NotificationsModal';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<AppStackParamList>;

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

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.skeletonBlock, { height: 130, borderRadius: radius.lg, marginBottom: spacing.md }]} />
      <View style={[styles.skeletonBlock, { height: 14, width: '60%', marginBottom: spacing.xs }]} />
      <View style={[styles.skeletonBlock, { height: 11, width: '40%' }]} />
    </View>
  );
}

interface ProjectCardProps { project: Project; index: number; onPress: () => void }
function ProjectCard({ project, index, onPress }: ProjectCardProps) {
  const indexLabel = (index + 1).toString().padStart(2, '0');
  const sc = statusColor(project.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Image / colour hero */}
      <View style={[styles.cardHero, { backgroundColor: sc + '18' }]}>
        {project.image_url ? (
          <Image source={{ uri: project.image_url }} style={styles.cardHeroImage} resizeMode="cover" />
        ) : (
          <Text style={[styles.cardInitial, { color: sc }]}>
            {project.name.charAt(0).toUpperCase()}
          </Text>
        )}
        <View style={styles.statusTag}>
          <View style={[styles.statusDot, { backgroundColor: sc }]} />
          <Text style={[styles.statusTagText, { color: sc }]}>
            {project.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardContentLeft}>
          <View style={styles.cardIndexRow}>
            <Text style={[styles.cardIndex, { color: sc }]}>{indexLabel}</Text>
            <Text style={styles.cardName} numberOfLines={1}>{project.name.toUpperCase()}</Text>
          </View>
          {project.location ? (
            <Text style={styles.cardLocation} numberOfLines={1}>📍 {project.location}</Text>
          ) : null}
        </View>
        <View style={styles.cardContentRight}>
          <Text style={styles.cardMeta}>Client</Text>
          <Text style={styles.cardMetaValue} numberOfLines={1}>{project.client ?? '—'}</Text>
          {project.deadline ? (
            <Text style={styles.cardDeadline}>{dayjs(project.deadline).format('D MMM YYYY')}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();
  const { unreadCount, startPolling, stopPolling } = useNotificationStore();
  const { setProjects: setStoreProjects } = useProjectStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [company, setCompany] = useState<any>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New project form
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      if (Array.isArray(data)) {
        setProjects(data);
        setStoreProjects(data); // populate global store for notification deep-links
      }
    } catch (err: any) {
      if (!err?.message?.includes('Admin user is not assigned')) {
        console.error('Error fetching projects:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCompany = async () => {
    if (!user?.company_id || user.company_id === 'inferred-from-projects') return;
    try {
      const data = await getCompany(user.company_id);
      setCompany(data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchProjects();
    fetchCompany();
    // Start polling notifications (30s interval, same as website)
    startPolling();
    return () => stopPolling();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await createProject({
        name: newName,
        location: newLocation,
        client: newClient,
        description: newDesc,
        deadline: newDeadline,
        status: 'active',
        creator_uid: user?.id,
      });
      setShowNewProject(false);
      setNewName(''); setNewLocation(''); setNewClient(''); setNewDesc(''); setNewDeadline('');
      await fetchProjects();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePress = (project: Project) => {
    navigation.navigate('ProjectDashboard', { projectId: project.id, projectName: project.name });
  };

  const filterOptions = ['all', 'active', 'planning', 'on_hold', 'completed'];

  const filteredProjects = projects.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Notifications Modal */}
      <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            {company && (
              <View style={styles.companyRow}>
                <Text style={styles.companyLetter}>{company.name?.charAt(0)?.toUpperCase()}</Text>
                <Text style={styles.companyName} numberOfLines={1}>{company.name}</Text>
              </View>
            )}
            <Text style={styles.headerTitle}>
              PROJECTS <Text style={styles.headerAccent}>MATRIX</Text>
            </Text>
            <Text style={styles.headerSub}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Notification Bell */}
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => setShowNotifications(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="bell-outline" size={22} color={colors.textSecondary} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {user?.role === 'admin' && (
              <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewProject(true)}>
                <Text style={styles.newBtnText}>+ NEW</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: spacing.xs }}>
          {filterOptions.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}>
              <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={loading ? Array(4).fill(null) : filteredProjects}
        keyExtractor={(item, i) => item?.id ?? `skel-${i}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) =>
          item == null ? <SkeletonCard /> : (
            <ProjectCard project={item} index={index} onPress={() => handlePress(item)} />
          )
        }
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyTitle}>No projects found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'No projects match your search.' : 'Create your first project to get started.'}
            </Text>
          </View>
        ) : null}
      />

      {/* New Project Modal */}
      <Modal visible={showNewProject} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Project</Text>

            {[
              { label: 'Name *', value: newName, set: setNewName, placeholder: 'Project name' },
              { label: 'Location', value: newLocation, set: setNewLocation, placeholder: 'City, Country' },
              { label: 'Client', value: newClient, set: setNewClient, placeholder: 'Client name' },
              { label: 'Deadline (YYYY-MM-DD)', value: newDeadline, set: setNewDeadline, placeholder: '2025-12-31' },
            ].map(field => (
              <View key={field.label}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={field.value}
                  onChangeText={field.set}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Project description..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewProject(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!newName || isCreating) && styles.submitBtnDisabled]}
                onPress={handleCreateProject}
                disabled={!newName || isCreating}>
                {isCreating ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  companyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxs },
  companyLetter: {
    width: 22, height: 22, borderRadius: radius.sm,
    backgroundColor: colors.primary,
    color: colors.white, textAlign: 'center', lineHeight: 22,
    fontSize: 12, fontWeight: '700', marginRight: spacing.xxs,
  },
  companyName: { color: colors.textSecondary, fontSize: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerAccent: { color: colors.primary },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellBtn: {
    position: 'relative',
    padding: 6,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  bellBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  newBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  newBtnText: { color: colors.white, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  logoutBtn: {
    width: 36, height: 36,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { color: colors.textSecondary, fontSize: 16 },
  searchRow: { marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    color: colors.text, fontSize: 14,
  },
  filterRow: { marginBottom: spacing.xs },

  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
  filterTabTextActive: { color: colors.white, fontWeight: '600' },

  list: { padding: spacing.md, paddingBottom: spacing.huge },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHero: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardHeroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardInitial: { fontSize: 56, fontWeight: '800', opacity: 0.6 },
  statusTag: {
    position: 'absolute',
    top: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.xs, paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTagText: { fontSize: 10, textTransform: 'capitalize', fontWeight: '600' },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cardContentLeft: { flex: 1, marginRight: spacing.md },
  cardContentRight: { alignItems: 'flex-end' },
  cardIndexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginBottom: spacing.xxs },
  cardIndex: { fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  cardLocation: { fontSize: 12, color: colors.textSecondary },
  cardMeta: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' },
  cardMetaValue: { fontSize: 12, color: colors.text, fontWeight: '600', maxWidth: 120 },
  cardDeadline: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  skeletonBlock: { backgroundColor: colors.surfaceElevated },

  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  emptyDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.huge,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xxs, marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.text, fontSize: 14,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  submitBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontWeight: '700' },
});

