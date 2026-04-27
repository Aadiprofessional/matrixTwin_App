import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type DWSSScreenProps = NativeStackScreenProps<any, 'DWSS'>;

interface WorkSite {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  lastUpdated: string;
  workers: number;
  equipment: number;
}

export default function DWSSScreen({ route, navigation }: DWSSScreenProps) {
  const { projectId, projectName } = route.params;
  const [workSites, setWorkSites] = useState<WorkSite[]>([
    {
      id: '1',
      name: 'Foundation Works',
      status: 'active',
      lastUpdated: '2 hours ago',
      workers: 12,
      equipment: 5,
    },
    {
      id: '2',
      name: 'Concrete Pouring',
      status: 'active',
      lastUpdated: '30 minutes ago',
      workers: 8,
      equipment: 3,
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    navigation.setOptions({
      title: 'Digital Work Site Systems',
      headerShown: false,
    });
  }, []);

  const renderWorkSite = ({ item }: { item: WorkSite }) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
            {item.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              marginTop: spacing.sm,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  item.status === 'active'
                    ? '#10b981'
                    : item.status === 'paused'
                    ? '#f59e0b'
                    : '#6b7280',
                marginRight: spacing.sm,
              }}
            />
            <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' }}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {item.lastUpdated}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.md,
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Workers</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 }}>
            {item.workers}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Equipment</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 }}>
            {item.equipment}
          </Text>
        </View>
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
          DWSS
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
          {projectName}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TextInput
          style={{
            backgroundColor: colors.background,
            borderRadius: 8,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            fontSize: 14,
          }}
          placeholder="Search work sites..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Work Sites List */}
      <FlatList
        data={workSites}
        renderItem={renderWorkSite}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Text style={{ color: colors.textSecondary }}>No work sites found</Text>
          </View>
        }
      />
    </View>
  );
}
