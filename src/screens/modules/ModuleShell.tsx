import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface Props {
  title: string;
  iconName: string;
  accentColor?: string;
  projectName: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function ModuleShell({
  title,
  iconName,
  accentColor = colors.primary,
  projectName,
  rightAction,
  children,
}: Props) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.textSecondary} />
          <Text style={styles.backText} numberOfLines={1}>{projectName}</Text>
        </TouchableOpacity>

        <View style={styles.titleCenter} pointerEvents="none">
          <View style={[styles.iconWrap, { backgroundColor: accentColor + '22' }]}>
            <Icon name={iconName} size={16} color={accentColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.rightSlot}>
          {rightAction}
        </View>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flex: 1 },
  backText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  titleCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rightSlot: { flexDirection: 'row', justifyContent: 'flex-end', flex: 1 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
