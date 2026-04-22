import React from 'react';
import { SafeAreaView, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../../theme/colors';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
}

export default function Screen({ children, style, ...rest }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
