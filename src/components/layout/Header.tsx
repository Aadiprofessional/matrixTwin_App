import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationsModal from '../ui/NotificationsModal';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  /** Render a notification bell on the right side */
  showNotificationBell?: boolean;
  /** Extra content to render in the right slot (overrides bell when provided) */
  right?: React.ReactNode;
}

export default function Header({ title, onBack, showNotificationBell, right }: HeaderProps) {
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const [showModal, setShowModal] = useState(false);

  const rightContent = right ?? (
    showNotificationBell ? (
      <>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.bellBtn}
        >
          <Icon name="bell-outline" size={22} color={colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <NotificationsModal visible={showModal} onClose={() => setShowModal(false)} />
      </>
    ) : null
  );

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.back}>{'←'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>{rightContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { width: 40 },
  right: { width: 40, alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text },
  back: { fontSize: 22, color: colors.primary },
  bellBtn: {
    position: 'relative',
    padding: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
});
