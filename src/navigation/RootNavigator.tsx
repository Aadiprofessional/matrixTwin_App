import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { getCurrentUser } from '../api/auth';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { colors } from '../theme/colors';

export default function RootNavigator() {
  const { token, user, setUser, setInitialized, isInitialized, logout } = useAuthStore();

  useEffect(() => {
    // On mount, refresh user from server to pick up any changes (e.g. company_id)
    const init = async () => {
      if (token) {
        try {
          const freshUser = await getCurrentUser();
          if (freshUser) {
            setUser(freshUser);
          }
        } catch (err: any) {
          if (err?.response?.status === 401) {
            logout();
          }
        }
      }
      setInitialized(true);
    };
    init();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
