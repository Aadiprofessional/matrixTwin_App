import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface InfoRowProps { label: string; value: string }
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
  const firstName = user?.name?.split(' ')[0] ?? 'User';

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          MY <Text style={styles.headerAccent}>PROFILE</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          {user?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ACCOUNT DETAILS</Text>
          {user?.name       && <InfoRow label="Name"        value={user.name} />}
          {user?.email      && <InfoRow label="Email"       value={user.email} />}
          {user?.role       && <InfoRow label="Role"        value={user.role} />}
          {user?.company_id && <InfoRow label="Company"     value={user.company_id} />}
          {user?.status     && <InfoRow label="Status"      value={user.status} />}
          {user?.id         && <InfoRow label="Account ID"  value={user.id} />}
        </View>

        {/* Sign out button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>MatrixTwin · Digital Construction Platform</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 60 },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 0.5,
  },
  headerAccent: { color: colors.primary },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 88, height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
  avatarLetter: {
    fontSize: 38, fontWeight: '800', color: colors.white,
  },
  name: {
    fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4,
  },
  email: {
    fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md,
  },
  roleBadge: {
    backgroundColor: colors.primary + '22',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary + '66',
  },
  roleBadgeText: {
    fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.5,
  },

  card: {
    margin: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 2, marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: {
    fontSize: 13, fontWeight: '600', color: colors.text,
    flex: 1.2, textAlign: 'right',
  },

  signOutBtn: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.error + '18',
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.error + '66',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15, fontWeight: '700', color: colors.error, letterSpacing: 0.5,
  },

  footer: {
    textAlign: 'center',
    fontSize: 11, color: colors.textMuted,
    marginTop: spacing.xxxl, letterSpacing: 1,
  },
});
