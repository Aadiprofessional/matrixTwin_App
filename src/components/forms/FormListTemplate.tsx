import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

interface FormItem {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  created_at: string;
  created_by?: string;
  form_number?: string;
}

interface FormListTemplateProps {
  title: string;
  description?: string;
  items: FormItem[];
  loading: boolean;
  onCreatePress: () => void;
  onItemPress: (item: FormItem) => void;
  onRefresh?: () => void;
  statusColors?: Record<string, string>;
  searchPlaceholder?: string;
  filterOptions?: Array<{ label: string; value: string }>;
}

const statusColors: Record<string, string> = {
  draft: '#6b7280',
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#10b981',
  approved: '#10b981',
  rejected: '#ef4444',
  active: '#10b981',
  paused: '#f59e0b',
};

export default function FormListTemplate({
  title,
  description,
  items,
  loading,
  onCreatePress,
  onItemPress,
  onRefresh,
  statusColors: customStatusColors,
  searchPlaceholder = 'Search forms...',
  filterOptions = [],
}: FormListTemplateProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const mergedStatusColors = { ...statusColors, ...(customStatusColors || {}) };

  const filteredItems = items.filter(item => {
    const matchesSearch =
      (item.name || item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' || item.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const renderFormItem = ({ item }: { item: FormItem }) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: mergedStatusColors[item.status] || colors.primary,
      }}
      onPress={() => onItemPress(item)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
            }}
            numberOfLines={1}
          >
            {item.name || item.title}
          </Text>
          {item.form_number && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              #{item.form_number}
            </Text>
          )}
          {item.description && (
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: spacing.xs,
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: mergedStatusColors[item.status] + '22' || colors.primary + '22',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radius.sm,
            marginLeft: spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: mergedStatusColors[item.status] || colors.primary,
              textTransform: 'capitalize',
            }}
          >
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.md,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {item.priority && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon
              name="flag-outline"
              size={12}
              color={
                item.priority === 'high'
                  ? '#ef4444'
                  : item.priority === 'medium'
                  ? '#f59e0b'
                  : '#10b981'
              }
            />
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginLeft: spacing.xs,
                textTransform: 'capitalize',
              }}
            >
              {item.priority}
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {new Date(item.created_at).toLocaleDateString()}
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
          {title}
        </Text>
        {description && (
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            {description}
          </Text>
        )}
      </View>

      {/* Search and Filter Bar */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.sm,
          }}
        >
          <Icon name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              color: colors.text,
              fontSize: 14,
            }}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Button */}
        {filterOptions.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="filter-outline" size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginLeft: spacing.sm }}>
              Filters
            </Text>
          </TouchableOpacity>
        )}

        {/* Filter Options */}
        {showFilters && (
          <View
            style={{
              marginTop: spacing.sm,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.sm,
            }}
          >
            {filterOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSelectedFilter(option.value);
                  setShowFilters(false);
                }}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color:
                      selectedFilter === option.value ? colors.primary : colors.text,
                    fontWeight: selectedFilter === option.value ? '600' : '500',
                  }}
                >
                  {option.label}
                </Text>
                {selectedFilter === option.value && (
                  <Icon name="check" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name="inbox-outline" size={48} color={colors.textSecondary} />
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: spacing.md,
              fontSize: 14,
            }}
          >
            No items found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderFormItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: spacing.md }}
          onEndReachedThreshold={0.5}
          refreshing={loading}
          onRefresh={onRefresh}
        />
      )}

      {/* Create Button */}
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
        onPress={onCreatePress}
      >
        <Icon name="plus" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}
