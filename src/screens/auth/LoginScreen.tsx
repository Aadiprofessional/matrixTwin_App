import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Same schema as the web login form
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setToken, setUser } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setApiError(null);
    try {
      const response = await login({ email: data.email, password: data.password });
      setToken(response.token);
      setUser(response.user);
      // RootNavigator will switch to AppNavigator automatically when token is set
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? err?.message ?? 'Login failed';
      if (err?.response?.status === 401) {
        setApiError('Invalid email or password.');
      } else {
        setApiError(msg);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>MatrixTwin</Text>
          <Text style={styles.tagline}>Digital Construction Platform</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {/* API error */}
          {apiError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{apiError}</Text>
            </View>
          )}

          {/* Email */}
          <Text style={styles.fieldLabel}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.email && (
            <Text style={styles.fieldError}>{errors.email.message}</Text>
          )}

          {/* Password */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Password</Text>
          <View style={styles.passwordRow}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(v => !v)}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.fieldError}>{errors.password.message}</Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Footer link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,69,93,0.12)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorBannerText: { color: colors.error, fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.error },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: { color: colors.textSecondary, fontSize: 13 },
  footerLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
