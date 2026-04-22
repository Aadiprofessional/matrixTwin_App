import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';

// Screens
import CompanyScreen from '../screens/company/CompanyScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import ProjectDashboardScreen from '../screens/projects/ProjectDashboardScreen';
import DiaryScreen from '../screens/modules/DiaryScreen';
import SafetyScreen from '../screens/modules/SafetyScreen';
import LabourScreen from '../screens/modules/LabourScreen';
import CleansingScreen from '../screens/modules/CleansingScreen';
import RfiScreen from '../screens/modules/RfiScreen';
import OverviewScreen from '../screens/projects/OverviewScreen';
import TeamScreen from '../screens/modules/TeamScreen';
import SettingsScreen from '../screens/modules/SettingsScreen';
import AskAIScreen from '../screens/modules/AskAIScreen';

export type AppStackParamList = {
  Company: undefined;
  Projects: undefined;
  ProjectDashboard: { projectId: string; projectName: string };
  Overview: { projectId: string; projectName: string };
  Diary: { projectId: string; projectName: string };
  Safety: { projectId: string; projectName: string };
  Labour: { projectId: string; projectName: string };
  Cleansing: { projectId: string; projectName: string };
  Rfi: { projectId: string; projectName: string };
  Team: { projectId: string; projectName: string };
  Settings: { projectId: string; projectName: string };
  AskAI: { projectId: string; projectName: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  const user = useAuthStore(state => state.user);

  // If user has no company and is not approved, send to Company setup screen
  const needsCompanySetup =
    user?.role === 'user' &&
    !user?.company_id &&
    user?.status !== 'approved';

  const initialRoute: keyof AppStackParamList = needsCompanySetup ? 'Company' : 'Projects';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Company" component={CompanyScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen
        name="ProjectDashboard"
        component={ProjectDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Overview"
        component={OverviewScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Safety"
        component={SafetyScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Labour"
        component={LabourScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Cleansing"
        component={CleansingScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Rfi"
        component={RfiScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Team"
        component={TeamScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AskAI"
        component={AskAIScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

