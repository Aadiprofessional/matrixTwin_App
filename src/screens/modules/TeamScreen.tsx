import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Image,
  TouchableOpacity, TextInput, Modal, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import {
  getCustomRoles, updateUserRole, assignRoleToUser, deleteCustomRole,
  CustomRole,
} from '../../api/team';
import {
  getMyCompanyMembers, getPendingJoinRequests, approveCompanyJoinRequest,
  rejectCompanyJoinRequest, removeCompanyMember, JoinRequest,
} from '../../api/company';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'Team'>;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface CompanyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  skills?: string;
  assigned_projects?: Array<{ id: string; name: string }>;
  joinDate?: string;
}

// ─── Role colour map (matches web getRoleBadgeColor) ────────────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: colors.primary,
  projectManager: '#60a5fa',
  siteInspector: colors.success,
  contractor: colors.warning,
  worker: colors.textMuted,
  user: colors.textMuted,
  owner: colors.primary,
  generalContractor: '#a855f7',
  supervisoryUnit: colors.warning,
  bimConsultant: '#14b8a6',
  pendingApproval: colors.textMuted,
};

const roleColor = (role: string, customRoles: CustomRole[]) => {
  if (customRoles.some(r => r.name === role)) return '#a855f7';
  return ROLE_COLORS[role] ?? colors.textMuted;
};

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    projectManager: 'Project Manager',
    siteInspector: 'Site Inspector',
    contractor: 'Contractor',
    worker: 'Worker',
    admin: 'Admin',
    owner: 'Owner',
    generalContractor: 'General Contractor',
    supervisoryUnit: 'Supervisory Unit',
    bimConsultant: 'BIM Consultant',
    pendingApproval: 'Pending Approval',
    user: 'User',
  };
  return map[role] ?? role;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const Avatar: React.FC<{ uri?: string; name: string; size?: number; color: string }> = ({
  uri, name, size = 44, color,
}) => (
  <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }]}>
    {uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <Text style={{ color, fontSize: size * 0.4, fontWeight: '700' }}>
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </Text>
    )}
  </View>
);

const RoleBadge: React.FC<{ role: string; customRoles: CustomRole[] }> = ({ role, customRoles }) => {
  const c = roleColor(role, customRoles);
  return (
    <View style={[styles.roleBadge, { borderColor: c }]}>
      <Text style={[styles.roleText, { color: c }]}>{getRoleLabel(role)}</Text>
    </View>
  );
};

const StatCard: React.FC<{ icon: string; value: number; label: string; color: string }> = ({
  icon, value, label, color,
}) => (
  <View style={[styles.statCard, { borderColor: color + '33' }]}>
    <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const route = useRoute<RouteProps>();
  const { projectId } = route.params;
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  // ── Data ────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showRoleFilterModal, setShowRoleFilterModal] = useState(false);

  // Modals
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<CompanyMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  // Edit / Add form
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'worker', address: '', skills: '',
  });

  // ── Loaders ─────────────────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    try {
      const data = await getMyCompanyMembers();
      setMembers(
        (data ?? []).map((m: any) => ({
          id: m.user_id ?? m.id,
          name: m.name ?? m.user?.name ?? '',
          email: m.email ?? m.user?.email ?? '',
          role: m.role ?? 'user',
          avatar: m.avatar ?? m.user?.avatar,
          phone: m.phone || '',
          address: m.address || '',
          skills: m.skills || '',
          assigned_projects: m.assigned_projects ?? [],
          joinDate: m.joined_at ?? m.joinDate,
        })),
      );
    } catch {
      // silently ignore
    }
  }, []);

  const loadJoinRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getPendingJoinRequests();
      setJoinRequests(data ?? []);
    } catch {
      setJoinRequests([]);
    }
  }, [isAdmin]);

  const loadCustomRoles = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getCustomRoles();
      setCustomRoles(data ?? []);
    } catch {
      setCustomRoles([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadMembers(), loadJoinRequests(), loadCustomRoles()]);
      setLoading(false);
    })();
  }, [loadMembers, loadJoinRequests, loadCustomRoles]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingCount = joinRequests.filter(r => r.status === 'pending').length;
  const uniqueRoles = Array.from(new Set(members.map(m => m.role)));
  const totalProjects = (() => {
    const ids = new Set<string>();
    members.forEach(m => m.assigned_projects?.forEach(p => ids.add(p.id)));
    return ids.size;
  })();

  // ── Action handlers ──────────────────────────────────────────────────────

  const handleApproveRequest = async (req: JoinRequest) => {
    try {
      await approveCompanyJoinRequest(req.id);
      await Promise.all([loadJoinRequests(), loadMembers()]);
      showSuccess('Request approved.');
      if (joinRequests.length <= 1) setShowApplications(false);
    } catch {
      Alert.alert('Error', 'Failed to approve request.');
    }
  };

  const handleRejectRequest = async (req: JoinRequest) => {
    try {
      await rejectCompanyJoinRequest(req.id);
      await loadJoinRequests();
      showSuccess('Request rejected.');
      if (joinRequests.length <= 1) setShowApplications(false);
    } catch {
      Alert.alert('Error', 'Failed to reject request.');
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete || !user?.id) return;
    setIsDeletingMember(true);
    try {
      await removeCompanyMember(memberToDelete.id);
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setShowDeleteConfirm(false);
      setShowMemberDetails(false);
      setMemberToDelete(null);
      setDeleteConfirmText('');
      showSuccess('Member removed.');
    } catch {
      Alert.alert('Error', 'Failed to remove member.');
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember || !user?.id) return;
    try {
      if (selectedMember.role !== formData.role) {
        await updateUserRole(user.id, selectedMember.id, formData.role);
      }
      setMembers(prev =>
        prev.map(m =>
          m.id === selectedMember.id
            ? { ...m, name: formData.name, email: formData.email, phone: formData.phone, role: formData.role, address: formData.address, skills: formData.skills }
            : m,
        ),
      );
      setShowEditMember(false);
      showSuccess('Member updated.');
    } catch {
      Alert.alert('Error', 'Failed to update member.');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!user?.id) return;
    Alert.alert('Delete Role', 'Are you sure you want to delete this role?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteCustomRole(roleId, user.id);
            await loadCustomRoles();
            showSuccess('Role deleted.');
          } catch {
            Alert.alert('Error', 'Failed to delete role.');
          }
        },
      },
    ]);
  };

  const openEditMember = (member: CompanyMember) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone ?? '',
      role: member.role,
      address: member.address ?? '',
      skills: member.skills ?? '',
    });
    setShowMemberDetails(false);
    setShowEditMember(true);
  };

  const openDeleteConfirm = (member: CompanyMember) => {
    setMemberToDelete(member);
    setDeleteConfirmText('');
    setShowMemberDetails(false);
    setShowDeleteConfirm(true);
  };

  const formatDate = (d?: string) => {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleDateString(); } catch { return 'N/A'; }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ModuleShell title="Team Management" iconName="people">
      {!!successMsg && (
        <View style={styles.successBanner}>
          <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon="account-group" value={members.length} label="Members" color={colors.info} />
            <StatCard icon="shield-account" value={uniqueRoles.length} label="Roles" color="#a855f7" />
            <StatCard icon="office-building" value={totalProjects} label="Projects" color="#6366f1" />
            <StatCard icon="account-clock" value={pendingCount} label="Pending" color={colors.error} />
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search members…"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowRoleFilterModal(true)}>
              <MaterialCommunityIcons name="filter-variant" size={16} color={colors.primary} />
              <Text style={styles.filterBtnText}>{roleFilter === 'all' ? 'All Roles' : getRoleLabel(roleFilter)}</Text>
            </TouchableOpacity>
          </View>

          {/* Admin actions */}
          {isAdmin && (
            <View style={styles.adminActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.primary }]}
                onPress={() => {
                  setFormData({ name: '', email: '', phone: '', role: 'worker', address: '', skills: '' });
                  setShowAddMember(true);
                }}
              >
                <MaterialCommunityIcons name="account-plus" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add Member</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#a855f7' }]}
                onPress={() => setShowRoleManagement(true)}
              >
                <MaterialCommunityIcons name="shield-account" size={16} color="#a855f7" />
                <Text style={[styles.actionBtnText, { color: '#a855f7' }]}>Roles</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: pendingCount > 0 ? colors.error : colors.border }]}
                onPress={() => setShowApplications(true)}
              >
                <MaterialCommunityIcons name="account-check" size={16} color={pendingCount > 0 ? colors.error : colors.textMuted} />
                <Text style={[styles.actionBtnText, { color: pendingCount > 0 ? colors.error : colors.textMuted }]}>
                  Requests{pendingCount > 0 ? ` (${pendingCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Member list */}
          {filteredMembers.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No members match your search.' : 'No team members found.'}
              </Text>
            </View>
          ) : (
            filteredMembers.map(member => {
              const rc = roleColor(member.role, customRoles);
              return (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberCard}
                  onPress={() => { setSelectedMember(member); setShowMemberDetails(true); }}
                  activeOpacity={0.8}
                >
                  <Avatar uri={member.avatar} name={member.name} color={rc} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                    {!!member.phone && <Text style={styles.memberPhone}>{member.phone}</Text>}
                    <View style={styles.memberMeta}>
                      <RoleBadge role={member.role} customRoles={customRoles} />
                      {(member.assigned_projects?.length ?? 0) > 0 && (
                        <Text style={styles.projectCount}>
                          {member.assigned_projects!.length} project{member.assigned_projects!.length !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity style={styles.editIconBtn} onPress={() => openEditMember(member)}>
                      <MaterialCommunityIcons name="account-edit" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Member Details Modal ── */}
      <Modal visible={showMemberDetails} transparent animationType="slide" onRequestClose={() => setShowMemberDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedMember && (() => {
              const rc = roleColor(selectedMember.role, customRoles);
              return (
                <>
                  <View style={styles.detailHeader}>
                    <Avatar uri={selectedMember.avatar} name={selectedMember.name} size={64} color={rc} />
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <Text style={styles.detailName}>{selectedMember.name}</Text>
                      <RoleBadge role={selectedMember.role} customRoles={customRoles} />
                    </View>
                    <TouchableOpacity onPress={() => setShowMemberDetails(false)}>
                      <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ marginTop: spacing.md }}>
                    <DetailRow icon="email-outline" label="Email" value={selectedMember.email} />
                    {!!selectedMember.phone && <DetailRow icon="phone-outline" label="Phone" value={selectedMember.phone} />}
                    {!!selectedMember.address && <DetailRow icon="map-marker-outline" label="Address" value={selectedMember.address} />}
                    <DetailRow icon="calendar-outline" label="Joined" value={formatDate(selectedMember.joinDate)} />
                    {!!selectedMember.skills && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Skills</Text>
                        <Text style={styles.detailSectionBody}>{selectedMember.skills}</Text>
                      </View>
                    )}
                    {(selectedMember.assigned_projects?.length ?? 0) > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Assigned Projects</Text>
                        <View style={styles.projectTagsRow}>
                          {selectedMember.assigned_projects!.map(p => (
                            <View key={p.id} style={styles.projectTag}>
                              <Text style={styles.projectTagText}>{p.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    {isAdmin && (
                      <View style={styles.detailActions}>
                        <TouchableOpacity style={styles.detailEditBtn} onPress={() => openEditMember(selectedMember)}>
                          <MaterialCommunityIcons name="account-edit" size={16} color={colors.primary} />
                          <Text style={[styles.detailBtnText, { color: colors.primary }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.detailDeleteBtn} onPress={() => openDeleteConfirm(selectedMember)}>
                          <MaterialCommunityIcons name="delete-outline" size={16} color={colors.error} />
                          <Text style={[styles.detailBtnText, { color: colors.error }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit Member Modal ── */}
      <Modal
        visible={showAddMember || showEditMember}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowAddMember(false); setShowEditMember(false); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { paddingBottom: spacing.xl }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showAddMember ? 'Add New Member' : 'Edit Member'}</Text>
                <TouchableOpacity onPress={() => { setShowAddMember(false); setShowEditMember(false); }}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <FormField label="Full Name *" value={formData.name} onChangeText={v => setFormData(p => ({ ...p, name: v }))} placeholder="Enter full name" />
                <FormField label="Email *" value={formData.email} onChangeText={v => setFormData(p => ({ ...p, email: v }))} placeholder="user@example.com" keyboardType="email-address" />
                <FormField label="Phone" value={formData.phone} onChangeText={v => setFormData(p => ({ ...p, phone: v }))} placeholder="+1 (555) 123-4567" keyboardType="phone-pad" />
                <FormField label="Address" value={formData.address} onChangeText={v => setFormData(p => ({ ...p, address: v }))} placeholder="Street, City, State" />
                <FormField label="Skills" value={formData.skills} onChangeText={v => setFormData(p => ({ ...p, skills: v }))} placeholder="Skills, qualifications…" multiline />

                <Text style={styles.fieldLabel}>Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {[...customRoles.map(r => r.name), 'worker', 'contractor', 'siteInspector', 'projectManager'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.rolePickerItem, formData.role === r && styles.rolePickerItemActive]}
                      onPress={() => setFormData(p => ({ ...p, role: r }))}
                    >
                      <Text style={[styles.rolePickerText, formData.role === r && styles.rolePickerTextActive]}>
                        {getRoleLabel(r)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={showEditMember ? handleUpdateMember : () => {
                    const newMember: CompanyMember = {
                      id: String(Date.now()),
                      ...formData,
                      assigned_projects: [],
                      joinDate: new Date().toISOString(),
                    };
                    setMembers(prev => [...prev, newMember]);
                    setShowAddMember(false);
                    showSuccess('Member added.');
                  }}
                >
                  <Text style={styles.saveBtnText}>{showEditMember ? 'Save Changes' : 'Add Member'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Join Requests Modal ── */}
      <Modal visible={showApplications} transparent animationType="slide" onRequestClose={() => setShowApplications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Requests</Text>
              <TouchableOpacity onPress={() => setShowApplications(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {joinRequests.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="account-check-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No pending join requests.</Text>
                </View>
              ) : (
                joinRequests.map(req => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestRow}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
                        {req.user?.avatar ? (
                          <Image source={{ uri: req.user.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                        ) : (
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>
                            {req.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.memberName}>{req.user?.name ?? 'Unknown'}</Text>
                        <Text style={styles.memberEmail}>{req.user?.email ?? ''}</Text>
                        <Text style={styles.memberPhone}>{formatDate(req.created_at)}</Text>
                      </View>
                      <View style={[styles.roleBadge, { borderColor: req.status === 'pending' ? colors.warning : colors.success }]}>
                        <Text style={[styles.roleText, { color: req.status === 'pending' ? colors.warning : colors.success }]}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    {req.status === 'pending' && (
                      <View style={styles.requestActions}>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(req)}>
                          <MaterialCommunityIcons name="close" size={14} color={colors.error} />
                          <Text style={[styles.reqBtnText, { color: colors.error }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveRequest(req)}>
                          <MaterialCommunityIcons name="check" size={14} color={colors.success} />
                          <Text style={[styles.reqBtnText, { color: colors.success }]}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Role Management Modal ── */}
      <Modal visible={showRoleManagement} transparent animationType="slide" onRequestClose={() => setShowRoleManagement(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Role Management</Text>
              <TouchableOpacity onPress={() => setShowRoleManagement(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {customRoles.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="shield-account-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No custom roles yet.</Text>
                  <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
                    Create custom roles from the web admin panel.
                  </Text>
                </View>
              ) : (
                customRoles.map(r => (
                  <View key={r.id} style={styles.roleCard}>
                    <View style={[styles.roleIcon, { backgroundColor: '#a855f722' }]}>
                      <Text style={{ color: '#a855f7', fontSize: 16, fontWeight: '700' }}>
                        {r.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={styles.roleName}>{r.name}</Text>
                      <Text style={styles.roleDesc} numberOfLines={1}>{r.description || 'No description'}</Text>
                      <Text style={styles.roleDate}>
                        {(r.permissions?.length ?? 0)} permissions · Created {formatDate(r.created_at)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteRole(r.id)} style={styles.deleteRoleBtn}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Role Filter Modal ── */}
      <Modal visible={showRoleFilterModal} transparent animationType="fade" onRequestClose={() => setShowRoleFilterModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRoleFilterModal(false)}>
          <View style={styles.filterDropdown}>
            <Text style={styles.filterDropdownTitle}>Filter by Role</Text>
            {['all', ...uniqueRoles].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.filterDropdownItem, roleFilter === r && styles.filterDropdownItemActive]}
                onPress={() => { setRoleFilter(r); setShowRoleFilterModal(false); }}
              >
                <Text style={[styles.filterDropdownText, roleFilter === r && { color: colors.primary }]}>
                  {r === 'all' ? 'All Roles' : getRoleLabel(r)}
                </Text>
                {roleFilter === r && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', paddingHorizontal: spacing.xl }]}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Remove Member</Text>
            <Text style={styles.confirmBody}>
              Are you sure you want to remove{' '}
              <Text style={{ color: colors.text, fontWeight: '600' }}>{memberToDelete?.name}</Text>?
              This action cannot be undone.
            </Text>
            <Text style={styles.confirmHint}>
              Type <Text style={{ color: colors.error }}>DELETE</Text> to confirm.
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type DELETE to confirm"
              placeholderTextColor={colors.textMuted}
              style={styles.confirmInput}
              autoCapitalize="characters"
            />
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDelete, deleteConfirmText !== 'DELETE' && { opacity: 0.4 }]}
                onPress={handleDeleteMember}
                disabled={deleteConfirmText !== 'DELETE' || isDeletingMember}
              >
                {isDeletingMember
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '600' }}>Remove</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ModuleShell>
  );
}

// ─── Helper sub-components ───────────────────────────────────────────────────

const DetailRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <MaterialCommunityIcons name={icon} size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
    <Text style={styles.detailLabel}>{label}: </Text>
    <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
  </View>
);

const FormField: React.FC<{
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any; multiline?: boolean;
}> = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => (
  <View style={{ marginBottom: spacing.md }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      style={[styles.fieldInput, multiline && { height: 72, textAlignVertical: 'top' }]}
    />
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: spacing.huge },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.success + '22', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
  },
  successText: { color: colors.success, fontSize: 13, flex: 1 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { color: colors.text, fontWeight: '700', fontSize: 16 },
  statLabel: { color: colors.textMuted, fontSize: 10, textAlign: 'center' },

  toolbar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 40,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 40,
  },
  filterBtnText: { color: colors.textSecondary, fontSize: 13 },

  adminActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  memberInfo: { flex: 1, marginLeft: spacing.sm },
  memberName: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
  memberEmail: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  memberPhone: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  roleText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  projectCount: { color: colors.textMuted, fontSize: 11 },
  editIconBtn: { padding: spacing.xs },

  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },

  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  detailName: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  detailLabel: { color: colors.textMuted, fontSize: 13 },
  detailValue: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  detailSection: { marginTop: spacing.md },
  detailSectionTitle: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: spacing.xs },
  detailSectionBody: { color: colors.textSecondary, fontSize: 13 },
  projectTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  projectTag: {
    backgroundColor: colors.primary + '22', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.primary + '44',
  },
  projectTagText: { color: colors.primary, fontSize: 12 },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, paddingBottom: spacing.xl },
  detailEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  detailDeleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.error, borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  detailBtnText: { fontSize: 14, fontWeight: '600' },

  fieldLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  fieldInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: 14,
  },
  rolePickerItem: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginRight: spacing.xs,
  },
  rolePickerItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  rolePickerText: { color: colors.textMuted, fontSize: 13 },
  rolePickerTextActive: { color: colors.primary },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  requestCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  requestRow: { flexDirection: 'row', alignItems: 'flex-start' },
  requestActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'flex-end' },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.error, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5,
  },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5,
  },
  reqBtnText: { fontSize: 13, fontWeight: '600' },

  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  roleIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  roleName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  roleDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  roleDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  deleteRoleBtn: { padding: spacing.xs },

  filterDropdown: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginHorizontal: spacing.xl,
    alignSelf: 'center', width: '80%',
    position: 'absolute', bottom: '30%',
  },
  filterDropdownTitle: {
    color: colors.textMuted, fontSize: 12, fontWeight: '600',
    marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  filterDropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.sm,
  },
  filterDropdownItemActive: { backgroundColor: colors.primary + '22' },
  filterDropdownText: { color: colors.textSecondary, fontSize: 14 },

  confirmBox: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.error + '44',
  },
  confirmTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  confirmBody: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm },
  confirmHint: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm },
  confirmInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    color: colors.text, fontSize: 14, marginBottom: spacing.md,
  },
  confirmBtns: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  confirmCancel: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  confirmDelete: {
    backgroundColor: colors.error, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    minWidth: 100, alignItems: 'center',
  },
});
