import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/authStore';
import { getCurrentUser } from '../../api/auth';
import {
  submitAdminRequest,
  updateAdminRequest,
  getMyAdminRequest,
  joinCompany,
  AdminRequest,
} from '../../api/company';
import { getProjects } from '../../api/projects';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

export default function CompanyScreen() {
  const { user, setUser, logout } = useAuthStore();

  const [adminRequest, setAdminRequest] = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal visibility
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Admin request form
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  // Join form
  const [joinCompanyId, setJoinCompanyId] = useState('');

  // Navigate to Projects — handled by AppNavigator detecting company_id
  const refreshAndNavigate = async () => {
    try {
      const freshUser = await getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
      }
    } catch (_) {}
  };

  useEffect(() => {
    checkAndInit();
  }, []);

  const checkAndInit = async () => {
    if (!user) { setLoading(false); return; }

    // Already has company_id
    if (user.company_id) {
      setLoading(false);
      return; // AppNavigator will route to Projects
    }

    // Double check with server
    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.company_id) {
        setUser(currentUser);
        setLoading(false);
        return;
      }

      // Fallback: check project access
      try {
        const projects = await getProjects();
        if (Array.isArray(projects)) {
          const patched = { ...currentUser!, company_id: 'inferred-from-projects' };
          setUser(patched);
          setLoading(false);
          return;
        }
      } catch (_) {}
    } catch (_) {}

    // Stay on company screen, fetch admin request
    fetchAdminRequest();
  };

  const fetchAdminRequest = async () => {
    try {
      const data = await getMyAdminRequest();
      if (data) {
        setAdminRequest(data);
        setCompanyName(data.company_name);
        setCompanyAddress(data.company_details?.address || '');
        setCompanyPhone(data.company_details?.phone || '');
        setCompanyWebsite(data.company_details?.website || '');

        if (data.status === 'approved') {
          const freshUser = await getCurrentUser();
          if (freshUser) {
            setUser({ ...freshUser, status: 'approved', role: 'admin', company_id: data.company_id || freshUser.company_id });
          }
        }
      }
    } catch (_) {
      // No request yet
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRequestSubmit = async () => {
    setError(null);
    setLoading(true);
    const payload = {
      company_name: companyName,
      company_details: { address: companyAddress, phone: companyPhone, website: companyWebsite },
    };
    try {
      if (adminRequest && (adminRequest.status === 'pending' || adminRequest.status === 'rejected')) {
        await updateAdminRequest(adminRequest.id, payload);
        Alert.alert('Success', 'Admin request updated!');
      } else {
        await submitAdminRequest(payload);
        Alert.alert('Success', 'Admin request submitted!');
      }
      await fetchAdminRequest();
      setShowAdminModal(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit admin request');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    setError(null);
    setLoading(true);
    try {
      await joinCompany(joinCompanyId);
      Alert.alert('Success', 'Joined company!');
      const freshUser = await getCurrentUser();
      if (freshUser) setUser(freshUser);
      setShowJoinModal(false);
      await refreshAndNavigate();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to join company');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    logout();
  };

  const statusBadgeColor = (status: string) => {
    if (status === 'pending') return '#ffc400';
    if (status === 'rejected') return colors.error;
    return colors.success;
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.tagline}>// Onboarding</Text>
          <Text style={styles.title}>COMPANY{'\n'}<Text style={styles.titleOutline}>SETUP</Text></Text>
          <View style={styles.descBorder}>
            <Text style={styles.desc}>
              Join an existing team to collaborate on projects, or register a new organization to manage your own workspace.
            </Text>
          </View>
        </View>

        {loading && (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: spacing.xxl }} />
        )}

        {!loading && (
          <>
            {/* Register New Company */}
            <TouchableOpacity style={styles.optionCard} onPress={() => setShowAdminModal(true)} activeOpacity={0.8}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <MaterialCommunityIcons
                  name="office-building"
                  size={32}
                  color="#3B82F6"
                />
              </View>
              <Text style={styles.optionTitle}>Register New Company</Text>
              <Text style={styles.optionDesc}>
                Create a new organization and become the administrator. Full control over projects, teams, and resources.
              </Text>
              <View style={styles.optionFooter}>
                <Text style={styles.optionAction}>
                  {adminRequest ? 'VIEW STATUS' : 'START REGISTRATION'}
                </Text>
                <Text style={styles.optionArrow}>→</Text>
              </View>
              {adminRequest && (
                <View style={[styles.statusBadge, { borderColor: statusBadgeColor(adminRequest.status) }]}>
                  <Text style={[styles.statusBadgeText, { color: statusBadgeColor(adminRequest.status) }]}>
                    {adminRequest.status.toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Join Existing Company */}
            <TouchableOpacity style={styles.optionCard} onPress={() => setShowJoinModal(true)} activeOpacity={0.8}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(5, 194, 123, 0.15)' }]}>
                <MaterialCommunityIcons
                  name="people"
                  size={32}
                  color="#05C27B"
                />
              </View>
              <Text style={styles.optionTitle}>Join Existing Company</Text>
              <Text style={styles.optionDesc}>
                Enter a Company ID to join an existing team. Start collaborating on assigned projects immediately.
              </Text>
              <View style={styles.optionFooter}>
                <Text style={styles.optionAction}>JOIN TEAM</Text>
                <Text style={styles.optionArrow}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.logoutText}>↩  SIGN OUT</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Admin Request Modal */}
      <Modal visible={showAdminModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Company</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.fieldLabel}>Company Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Acme Construction Ltd."
              placeholderTextColor={colors.textMuted}
              value={companyName}
              onChangeText={setCompanyName}
            />

            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Builder St, City"
              placeholderTextColor={colors.textMuted}
              value={companyAddress}
              onChangeText={setCompanyAddress}
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 555 000 0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={companyPhone}
              onChangeText={setCompanyPhone}
            />

            <Text style={styles.fieldLabel}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={companyWebsite}
              onChangeText={setCompanyWebsite}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAdminModal(false); setError(null); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!companyName || loading) && styles.submitBtnDisabled]}
                onPress={handleAdminRequestSubmit}
                disabled={!companyName || loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : (
                  <Text style={styles.submitText}>{adminRequest ? 'Update' : 'Submit'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Company</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.fieldLabel}>Company ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter the Company ID given by your admin"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={joinCompanyId}
              onChangeText={setJoinCompanyId}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowJoinModal(false); setError(null); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!joinCompanyId || loading) && styles.submitBtnDisabled]}
                onPress={handleJoinCompany}
                disabled={!joinCompanyId || loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : (
                  <Text style={styles.submitText}>Join</Text>
                )}
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
  scroll: { padding: spacing.xl, paddingBottom: spacing.huge },

  headerSection: { marginBottom: spacing.xxl },
  tagline: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  titleOutline: {
    color: 'transparent',
    // React Native doesn't support text-stroke natively; use a darker color
    color: colors.border,
  },
  descBorder: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  optionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  optionFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  optionAction: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  optionArrow: { color: colors.textMuted, fontSize: 14 },
  statusBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },

  logoutBtn: {
    marginTop: spacing.xxl,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  logoutText: {
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xxs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontWeight: '700' },
});
