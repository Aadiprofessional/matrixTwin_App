/**
 * Icon mapping utility
 * Maps emoji icons to react-native-vector-icons
 */

export const IconMap = {
  // Building/Company icons
  building: { library: 'MaterialCommunityIcons', name: 'office-building', color: '#4F46E5' },
  company: { library: 'MaterialCommunityIcons', name: 'office-building', color: '#4F46E5' },
  factory: { library: 'MaterialCommunityIcons', name: 'factory', color: '#4F46E5' },
  
  // People/Team icons
  people: { library: 'MaterialCommunityIcons', name: 'people', color: '#7C3AED' },
  team: { library: 'MaterialCommunityIcons', name: 'people', color: '#7C3AED' },
  person: { library: 'MaterialCommunityIcons', name: 'account', color: '#7C3AED' },
  profile: { library: 'MaterialCommunityIcons', name: 'account-circle', color: '#7C3AED' },
  
  // Eye icons (password visibility)
  eye: { library: 'MaterialCommunityIcons', name: 'eye', color: '#666666' },
  eyeOff: { library: 'MaterialCommunityIcons', name: 'eye-off', color: '#666666' },
  
  // Status icons
  warning: { library: 'MaterialCommunityIcons', name: 'alert-circle', color: '#EF4444' },
  error: { library: 'MaterialCommunityIcons', name: 'alert-circle', color: '#EF4444' },
  success: { library: 'MaterialCommunityIcons', name: 'check-circle', color: '#10B981' },
  checkmark: { library: 'MaterialCommunityIcons', name: 'check', color: '#10B981' },
  
  // Dashboard/Analytics
  dashboard: { library: 'MaterialCommunityIcons', name: 'view-dashboard', color: '#3B82F6' },
  chart: { library: 'MaterialCommunityIcons', name: 'chart-line', color: '#3B82F6' },
  stats: { library: 'MaterialCommunityIcons', name: 'chart-box', color: '#3B82F6' },
  
  // Settings/Config
  settings: { library: 'MaterialCommunityIcons', name: 'cog', color: '#666666' },
  gear: { library: 'MaterialCommunityIcons', name: 'cog', color: '#666666' },
  
  // Other common icons
  notification: { library: 'MaterialCommunityIcons', name: 'bell', color: '#F59E0B' },
  bell: { library: 'MaterialCommunityIcons', name: 'bell', color: '#F59E0B' },
  clock: { library: 'MaterialCommunityIcons', name: 'clock', color: '#666666' },
  documents: { library: 'MaterialCommunityIcons', name: 'file-multiple', color: '#3B82F6' },
  
  // Construction
  construction: { library: 'MaterialCommunityIcons', name: 'hammer-wrench', color: '#F59E0B' },
  building_construction: { library: 'MaterialCommunityIcons', name: 'hard-hat', color: '#F59E0B' },
};

export type IconKey = keyof typeof IconMap;

export interface IconProps {
  library: 'MaterialCommunityIcons' | 'FontAwesome' | 'FontAwesome6' | 'Ionicons';
  name: string;
  color?: string;
}

export const getIcon = (key: IconKey): IconProps | null => {
  return IconMap[key] || null;
};
