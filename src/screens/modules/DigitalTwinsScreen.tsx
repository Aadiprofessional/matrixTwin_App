import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getProjectModels } from '../../api/digitalTwins';

type DigitalTwinsScreenProps = NativeStackScreenProps<AppStackParamList, 'DigitalTwins'>;

export default function DigitalTwinsScreen({ route, navigation }: DigitalTwinsScreenProps) {
  const { projectId, projectName } = route.params;
  const [activeTab, setActiveTab] = useState<'models' | 'analytics' | 'control'>('models');

  const { data: models, isLoading } = useQuery({
    queryKey: ['digital-twins', projectId],
    queryFn: () => getProjectModels(projectId),
  });

  useEffect(() => {
    navigation.setOptions({
      title: 'Digital Twins',
      headerShown: false,
    });
  }, []);

  const renderModelItem = ({ item }: any) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      onPress={() => {
        navigation.navigate('ModelViewer', { 
          modelId: item.id, 
          projectId 
        });
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
        {item.name}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
        {item.description}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm, justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          Status: {item.status}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
          Digital Twins
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
          {projectName}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {(['models', 'analytics', 'control'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderBottomWidth: 3,
              borderBottomColor: activeTab === tab ? colors.primary : 'transparent',
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: activeTab === tab ? '600' : '500',
                color: activeTab === tab ? colors.primary : colors.textSecondary,
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: spacing.md }}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xl }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : activeTab === 'models' ? (
          <FlatList
            data={models}
            renderItem={renderModelItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : activeTab === 'analytics' ? (
          <View style={{ paddingVertical: spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              Analytics
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: spacing.md }}>
              Model analytics and insights coming soon
            </Text>
          </View>
        ) : (
          <View style={{ paddingVertical: spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              Control Panel
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: spacing.md }}>
              Digital Twin controls coming soon
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: spacing.lg,
          right: spacing.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 28, color: colors.white }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
