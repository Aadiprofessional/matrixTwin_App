/**
 * Reusable Icon component for vector icons
 */

import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';

type IconLibrary = 'MaterialCommunityIcons' | 'FontAwesome' | 'FontAwesome6' | 'Ionicons';

interface IconProps {
  library?: IconLibrary;
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export const Icon: React.FC<IconProps> = ({
  library = 'MaterialCommunityIcons',
  name,
  size = 24,
  color = '#000',
  style,
}) => {
  const iconProps = { name, size, color, style };

  switch (library) {
    case 'FontAwesome':
      return <FontAwesome {...iconProps} />;
    case 'FontAwesome6':
      return <FontAwesome6 {...iconProps} />;
    case 'Ionicons':
      return <Ionicons {...iconProps} />;
    case 'MaterialCommunityIcons':
    default:
      return <MaterialCommunityIcons {...iconProps} />;
  }
};

export default Icon;
