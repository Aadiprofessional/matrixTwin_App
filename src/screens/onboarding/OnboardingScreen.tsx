import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
}

// Content pulled directly from the web landing page (HomePage.tsx + FeatureSection)
const SLIDES: Slide[] = [
  {
    id: '1',
    iconName: 'hard-hat',
    title: 'MatrixTwin\nDigital Construction Platform',
    subtitle:
      'Trusted by construction leaders worldwide. Powered by advanced AI and digital twin technology. Create virtual replicas of your construction sites and manage everything in one platform.',
  },
  {
    id: '2',
    iconName: 'wrench',
    title: 'Digital Twins & IoT Integration',
    subtitle:
      'Create precise virtual replicas of physical construction sites. Connect IoT sensors for real-time monitoring of environmental conditions, equipment usage, and safety parameters.',
  },
  {
    id: '3',
    iconName: 'robot',
    title: 'AI-Powered Analytics',
    subtitle:
      'Analyze project data to identify potential delays, optimize resource allocation, and provide actionable insights throughout the project lifecycle.',
  },
];

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSkip = () => navigation.replace('Login');

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(prev => prev + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <MaterialCommunityIcons
        name={item.iconName}
        size={80}
        color={colors.primary}
        style={styles.icon}
      />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity style={styles.ctaBtn} onPress={handleNext}>
        <Text style={styles.ctaText}>
          {isLast ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: spacing.xl + 8,
    right: spacing.xl,
    zIndex: 10,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  slide: {
    width,
    height: height * 0.72,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  ctaBtn: {
    width: width - spacing.xl * 2,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  ctaText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

