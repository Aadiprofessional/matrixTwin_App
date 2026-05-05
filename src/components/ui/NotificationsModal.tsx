import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotificationStore } from '../../store/notificationStore';
import { useProjectStore } from '../../store/projectStore';
import type { Notification } from '../../api/notifications';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<AppStackParamList>;

// Mirrors website's notificationService.handleNotificationClick form_type → route mapping
function formTypeToScreen(formType: string | undefined): keyof AppStackParamList | null {
  if (!formType) return null;
  const ft = (formType === 'inspection' || formType === 'survey') ? 'rfi' : formType.toLowerCase();
  const map: Partial<Record<string, keyof AppStackParamList>> = {
    diary: 'Diary',
    safety: 'Safety',
    labour: 'Labour',
    cleansing: 'Cleansing',
    rfi: 'Rfi',
    forms: 'Forms',
  };
  return map[ft] ?? null;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.72;

interface Props {
  visible: boolean;
  onClose: () => void;
}

function typeAccent(type: string): string {
  switch (type) {
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    case 'error':   return colors.error;
    default:        return colors.primary; // info → orange (matches website)
  }
}

function typeIcon(type: string): string {
  switch (type) {
    case 'warning': return 'alert-circle-outline';
    case 'success': return 'check-circle-outline';
    case 'error':   return 'close-circle-outline';
    default:        return 'information-outline';
  }
}

interface NotifItemProps {
  item: Notification;
  formatRelativeTime: (t: string) => string;
  onPress: (n: Notification) => void;
  onDelete: (id: string) => void;
}

function NotifItem({ item, formatRelativeTime, onPress, onDelete }: NotifItemProps) {
  const accent = typeAccent(item.type);
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={[
        styles.notifRow,
        !item.read && styles.notifRowUnread,
        { borderLeftColor: accent },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: accent + '22' }]}>
        <Icon name={typeIcon(item.type)} size={18} color={accent} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.form_id && (
            <Text style={styles.notifFormId}>#{item.form_id.substring(0, 8)}</Text>
          )}
        </View>
        <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(item.created_at)}</Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteBtn}
      >
        <Icon name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NotificationsModal({ visible, onClose }: Props) {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    formatRelativeTime,
  } = useNotificationStore();
  const { projects } = useProjectStore();
  const navigation = useNavigation<Nav>();

  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      fetchNotifications();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: PANEL_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Mirrors website's handleNotificationClick — close modal, mark read, then navigate to the form
  const handleNotifPress = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id);
    onClose();

    if (!n.project_id) return;

    const project = projects.find(p => p.id === n.project_id);
    const projectName = project?.name ?? '';

    const screenName = formTypeToScreen(n.form_type);
    if (screenName && n.form_id) {
      navigation.navigate(screenName as any, {
        projectId: n.project_id,
        projectName,
        initialFormId: n.form_id,
      });
    } else if (screenName) {
      navigation.navigate(screenName as any, { projectId: n.project_id, projectName });
    } else {
      navigation.navigate('ProjectDashboard', { projectId: n.project_id, projectName });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/*
        Correct RN bottom-sheet pattern:
        - container: flex:1 dimmed background, justifyContent:'flex-end'
        - TouchableWithoutFeedback fills all space above the panel → tapping closes
        - Animated panel at bottom (not absolute, no z-index issues)
      */}
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropArea} />
        </TouchableWithoutFeedback>

        {/* Panel */}
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
        >
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="bell-outline" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={() => markAllAsRead()} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Mark read</Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity onPress={() => clearAll()} style={styles.actionBtn}>
                  <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {isLoading && notifications.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.centered}>
              <Icon name="bell-off-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <NotifItem
                  item={item}
                  formatRelativeTime={formatRelativeTime}
                  onPress={handleNotifPress}
                  onDelete={removeNotification}
                />
              )}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Outer container — full screen, dimmed, panel at bottom
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  // Fills all space above the panel; tapping closes modal
  backdropArea: {
    flex: 1,
  },
  panel: {
    height: PANEL_HEIGHT,
    // No position: 'absolute' — sits naturally at the bottom of the flex container
    backgroundColor: '#121212',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginLeft: spacing.xs,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: spacing.xs,
  },
  headerBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  actionBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 4,
    marginLeft: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  // Notification row — matches website's type-colored left border style
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notifRowUnread: {
    backgroundColor: 'rgba(255,87,34,0.04)',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  notifTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  notifTitleUnread: {
    color: colors.text,
    fontWeight: '700',
  },
  notifFormId: {
    color: colors.textMuted,
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notifMsg: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  notifTime: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 10,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: spacing.xs,
    flexShrink: 0,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: spacing.xs,
    marginTop: 2,
  },
});
