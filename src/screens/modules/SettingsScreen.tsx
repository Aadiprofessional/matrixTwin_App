import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { useAuthStore } from '../../store/authStore';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { API_BASE_URL } from '../../api/client';
import { storage } from '../../utils/storage';

// ── Types ─────────────────────────────────────────────────────────────────────
type UploadType = 'signature' | 'attachment' | 'pic';

interface UploadedFile {
  id?: string;
  url?: string;
  fileUrl?: string;
  file_url?: string;
  fileName?: string;
  originalname?: string;
  original_name?: string;
  name?: string;
  mimeType?: string;
  mimetype?: string;
  mime_type?: string;
  size?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface GroupedUploads {
  signature: UploadedFile[];
  attachment: UploadedFile[];
  image: UploadedFile[];
  pic: UploadedFile[];
}

interface UploadState {
  uploading: boolean;
  success: string;
  error: string;
}

interface ProfileFormState {
  name: string;
  email: string;
  role: string;
  phone: string;
  bio: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const emptyUploads: GroupedUploads = { signature: [], attachment: [], image: [], pic: [] };

const uploadSectionTypes: UploadType[] = ['signature', 'attachment'];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];


// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeFile = (file: UploadedFile): UploadedFile => ({
  ...file,
  fileUrl:   file.fileUrl   || file.file_url  || file.url || '',
  fileName:  file.fileName  || file.originalname || file.original_name || file.name || '',
  mimeType:  file.mimeType  || file.mimetype  || file.mime_type || '',
  createdAt: file.createdAt || file.created_at || file.updatedAt || file.updated_at || '',
});

const normalizeUploads = (payload: any): GroupedUploads => {
  const v = payload?.data || payload || {};
  return {
    signature:  Array.isArray(v.signature)  ? v.signature.map(normalizeFile)  : [],
    attachment: Array.isArray(v.attachment) ? v.attachment.map(normalizeFile) : [],
    image:      Array.isArray(v.image)      ? v.image.map(normalizeFile)      : [],
    pic:        Array.isArray(v.pic)        ? v.pic.map(normalizeFile)        : [],
  };
};

const getFileName = (f: UploadedFile) =>
  f.originalname || f.original_name || f.fileName || f.name || 'Uploaded file';

const getFileUrl = (f: UploadedFile) =>
  (f.fileUrl || f.file_url || f.url || '').trim().replace(/[`'"]/g, '');

const getFileType = (f: UploadedFile) =>
  f.mimeType || f.mimetype || f.mime_type || 'unknown';

const isImageFile = (f: UploadedFile) => {
  const ft = getFileType(f).toLowerCase();
  const fn = getFileName(f).toLowerCase();
  return ft.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fn);
};

const isPdfFile = (f: UploadedFile) => {
  const ft = getFileType(f).toLowerCase();
  return ft.includes('pdf') || getFileName(f).toLowerCase().endsWith('.pdf');
};

const isDocFile = (f: UploadedFile) => {
  const ft = getFileType(f).toLowerCase();
  const fn = getFileName(f).toLowerCase();
  return ft.includes('msword') || ft.includes('officedocument.wordprocessingml') || /\.(doc|docx)$/.test(fn);
};

const getFormattedSize = (size?: number) => {
  if (!size || isNaN(size)) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileDate = (f: UploadedFile) => {
  const v = f.createdAt || f.created_at || f.updatedAt || f.updated_at;
  if (!v) return 'Unknown date';
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleString();
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user, logout, setUser } = useAuthStore();

  const [uploads, setUploads] = useState<GroupedUploads>(emptyUploads);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadsError, setUploadsError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name:  user?.name  || '',
    email: user?.email || '',
    role:  user?.role  || '',
    phone: (user as any)?.phone || '',
    bio:   (user as any)?.bio   || '',
  });
  const [uploadState, setUploadState] = useState<Record<UploadType, UploadState>>({
    signature:  { uploading: false, success: '', error: '' },
    attachment: { uploading: false, success: '', error: '' },
    pic:        { uploading: false, success: '', error: '' },
  });
  const [activePreview, setActivePreview] = useState<{ file: UploadedFile; url: string } | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [editingProfile, setEditingProfile] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<UploadType | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // ── API ─────────────────────────────────────────────────────────────────────
  const getToken = () => storage.getString('auth_token');

  const fetchUploads = useCallback(async () => {
    const token = getToken();
    if (!token) { setUploadsError('Missing auth token. Please sign in again.'); return; }
    setLoadingUploads(true);
    setUploadsError('');
    try {
      const res = await fetch(`${API_BASE_URL}/uploads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || 'Failed to load uploads');
      setUploads(normalizeUploads(body));
    } catch (e) {
      setUploadsError((e as Error).message);
      setUploads(emptyUploads);
    } finally {
      setLoadingUploads(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleSaveProfile = async () => {
    const token = getToken();
    if (!token || !user) return;
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name:  profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          bio:   profileForm.bio.trim(),
          role:  profileForm.role.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || 'Failed to update profile');
      const updated = body.user || body.data || body;
      setUser({ ...user, ...updated });
      setProfileSuccess('Profile details updated successfully.');
    } catch (e) {
      setProfileError((e as Error).message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadFile = async (
    uploadType: UploadType,
    fileUri: string,
    fileName: string,
    mimeType: string,
  ) => {
    const token = getToken();
    if (!token) {
      setUploadState(prev => ({
        ...prev,
        [uploadType]: { uploading: false, success: '', error: 'Missing auth token.' },
      }));
      return;
    }
    setUploadState(prev => ({ ...prev, [uploadType]: { uploading: true, success: '', error: '' } }));
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
    try {
      const res = await fetch(`${API_BASE_URL}/uploads/${uploadType}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || `Failed to upload ${uploadType}`);
      setUploadState(prev => ({
        ...prev,
        [uploadType]: { uploading: false, success: `${fileName} uploaded`, error: '' },
      }));
      await fetchUploads();
    } catch (e) {
      setUploadState(prev => ({
        ...prev,
        [uploadType]: { uploading: false, success: '', error: (e as Error).message },
      }));
    }
  };

  const handleUploadPress = (uploadType: UploadType) => {
    if (uploadType === 'pic' || uploadType === 'signature') {
      Alert.alert(
        'Select Image',
        undefined,
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false });
              if (!result.didCancel && !result.errorCode && result.assets?.[0]?.uri) {
                const asset = result.assets[0];
                await uploadFile(uploadType, asset.uri!, asset.fileName || 'photo.jpg', asset.type || 'image/jpeg');
              } else if (result.errorCode) {
                Alert.alert('Camera Error', result.errorMessage || 'Could not access camera.');
              }
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
              if (!result.didCancel && !result.errorCode && result.assets?.[0]?.uri) {
                const asset = result.assets[0];
                await uploadFile(uploadType, asset.uri!, asset.fileName || 'photo.jpg', asset.type || 'image/jpeg');
              } else if (result.errorCode) {
                Alert.alert('Library Error', result.errorMessage || 'Could not access photo library.');
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      DocumentPicker.pick({ type: [DocumentPicker.types.allFiles] })
        .then(async (results) => {
          const file = results[0];
          await uploadFile(uploadType, file.uri, file.name || 'document', file.type || 'application/octet-stream');
        })
        .catch((e) => {
          if (!DocumentPicker.isCancel(e)) {
            Alert.alert('Error', 'Failed to select file.');
          }
        });
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete your account and all associated data. Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    const token = getToken();
                    if (!token) return;
                    try {
                      const res = await fetch(`${API_BASE_URL}/auth/me`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(body?.message || body?.error || 'Failed to delete account');
                      }
                      logout();
                    } catch (e) {
                      Alert.alert('Error', (e as Error).message || 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const profileImageUrl = uploads.pic[0] ? getFileUrl(uploads.pic[0]) : user?.avatar;
  const selectedLangObj = LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <ModuleShell title="Settings" iconName="cog">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Profile Header ──────────────────────────────────────── */}
          <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => handleUploadPress('pic')} activeOpacity={0.8}>
              {profileImageUrl
                ? <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
                : (
                  <View style={styles.avatarPlaceholder}>
                    <Icon name="account" size={44} color={colors.textMuted} />
                  </View>
                )}
              <View style={styles.avatarBadge}>
                <Icon name="camera" size={11} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{user?.name || 'Your Name'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            {!!user?.role && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{user.role}</Text>
              </View>
            )}
          </View>

          {/* ── ACCOUNT ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.group}>
            <TouchableOpacity style={styles.row} onPress={() => setEditingProfile(v => !v)} activeOpacity={0.7}>
              <View style={[styles.rowIconWrap, { backgroundColor: '#3b82f6' }]}>
                <Icon name="account-edit" size={16} color="#fff" />
              </View>
              <Text style={styles.rowLabel}>Edit Profile</Text>
              <Icon name={editingProfile ? 'chevron-up' : 'chevron-right'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {editingProfile && (
              <View style={styles.expandedForm}>
                <View style={styles.separator} />
                <TextInput
                  style={styles.input}
                  value={profileForm.name}
                  onChangeText={v => setProfileForm(p => ({ ...p, name: v }))}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profileForm.email}
                  editable={false}
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={profileForm.role}
                  onChangeText={v => setProfileForm(p => ({ ...p, role: v }))}
                  placeholder="Job Title"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={profileForm.phone}
                  onChangeText={v => setProfileForm(p => ({ ...p, phone: v }))}
                  placeholder="Phone"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={profileForm.bio}
                  onChangeText={v => setProfileForm(p => ({ ...p, bio: v }))}
                  placeholder="Bio"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {!!profileSuccess && <Text style={styles.successText}>{profileSuccess}</Text>}
                {!!profileError && <Text style={styles.errorText}>{profileError}</Text>}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── FILES ────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>FILES</Text>
          <View style={styles.group}>
            {uploadSectionTypes.map((uType, idx) => (
              <View key={uType}>
                {idx > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setExpandedFiles(expandedFiles === uType ? null : uType)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowIconWrap, { backgroundColor: uType === 'signature' ? '#8b5cf6' : '#f59e0b' }]}>
                    <Icon name={uType === 'signature' ? 'draw' : 'file-document'} size={16} color="#fff" />
                  </View>
                  <Text style={styles.rowLabel}>
                    {uType === 'signature' ? 'Signatures' : 'Attachments'}
                  </Text>
                  <View style={styles.rowTrailing}>
                    {uploads[uType].length > 0 && (
                      <View style={styles.countPill}>
                        <Text style={styles.countPillText}>{uploads[uType].length}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleUploadPress(uType)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {uploadState[uType].uploading
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Icon name="plus" size={15} color={colors.primary} />}
                    </TouchableOpacity>
                    <Icon name={expandedFiles === uType ? 'chevron-up' : 'chevron-right'} size={18} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
                {expandedFiles === uType && (
                  <View style={styles.fileExpanded}>
                    {loadingUploads && (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 14 }} />
                    )}
                    {!!uploadsError && <Text style={styles.errorText}>{uploadsError}</Text>}
                    {!loadingUploads && uploads[uType].length === 0 && (
                      <Text style={styles.emptyText}>No {uType} files uploaded yet.</Text>
                    )}
                    {!loadingUploads && uploads[uType].map((file, i) => {
                      const fileUrl = getFileUrl(file);
                      return (
                        <TouchableOpacity
                          key={file.id || String(i)}
                          style={[styles.fileRow, i > 0 && { borderTopWidth: 1, borderTopColor: `${colors.border}60` }]}
                          onPress={() => fileUrl ? setActivePreview({ file, url: fileUrl }) : undefined}
                          activeOpacity={0.7}
                        >
                          <View style={styles.fileIconBox}>
                            {fileUrl && isImageFile(file)
                              ? <Image source={{ uri: fileUrl }} style={styles.fileThumbImg} />
                              : <Icon
                                  name={isPdfFile(file) ? 'file-pdf-box' : isDocFile(file) ? 'file-word' : 'file-outline'}
                                  size={22}
                                  color={isPdfFile(file) ? '#ef4444' : isDocFile(file) ? '#3b82f6' : colors.textMuted}
                                />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fileName} numberOfLines={1}>{getFileName(file)}</Text>
                            <Text style={styles.fileMeta}>{getFormattedSize(file.size)} · {getFileDate(file)}</Text>
                          </View>
                          <Icon name="chevron-right" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* ── PREFERENCES ──────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.group}>
            <TouchableOpacity style={styles.row} onPress={() => setDarkMode(v => !v)} activeOpacity={0.7}>
              <View style={[styles.rowIconWrap, { backgroundColor: darkMode ? '#374151' : '#f59e0b' }]}>
                <Icon name={darkMode ? 'moon-waning-crescent' : 'white-balance-sunny'} size={16} color="#fff" />
              </View>
              <Text style={styles.rowLabel}>{darkMode ? 'Dark Mode' : 'Light Mode'}</Text>
              <View style={[styles.toggle, darkMode && styles.toggleActive]}>
                <View style={[styles.toggleThumb, darkMode && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={() => setShowLanguagePicker(v => !v)} activeOpacity={0.7}>
              <View style={[styles.rowIconWrap, { backgroundColor: '#10b981' }]}>
                <Icon name="translate" size={16} color="#fff" />
              </View>
              <Text style={styles.rowLabel}>Language</Text>
              <View style={styles.rowTrailing}>
                <Text style={styles.rowValue}>{selectedLangObj.flag} {selectedLangObj.name}</Text>
                <Icon name={showLanguagePicker ? 'chevron-up' : 'chevron-right'} size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
            {showLanguagePicker && (
              <View style={styles.langPicker}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={styles.langRow}
                    onPress={() => { setSelectedLanguage(lang.code); setShowLanguagePicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langName, selectedLanguage === lang.code && styles.langNameActive]}>
                      {lang.name}
                    </Text>
                    {selectedLanguage === lang.code && (
                      <Icon name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── PRIVACY & SECURITY ───────────────────────────────────── */}
          <Text style={styles.sectionLabel}>PRIVACY & SECURITY</Text>
          <View style={styles.group}>
            {[
              { icon: 'lock', color: '#3b82f6', title: 'Secure Authentication', sub: 'JWT session, stored securely on-device' },
              { icon: 'eye-off', color: '#8b5cf6', title: 'Data Privacy', sub: 'Files accessible only to you & your team' },
              { icon: 'shield-account', color: '#10b981', title: 'Account Security', sub: 'Contact your admin to reset password' },
            ].map((item, idx) => (
              <View key={item.icon}>
                {idx > 0 && <View style={styles.separator} />}
                <View style={styles.row}>
                  <View style={[styles.rowIconWrap, { backgroundColor: item.color }]}>
                    <Icon name={item.icon} size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.title}</Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* ── SIGN OUT & DELETE ACCOUNT ────────────────────────────── */}
          <View style={styles.signOutWrap}>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Icon name="logout" size={17} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
              <Icon name="delete-forever" size={17} color="#ef4444" />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </ModuleShell>

      {/* ── File Preview Modal ────────────────────────────────────────── */}
      <Modal
        visible={!!activePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePreview(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFileName} numberOfLines={1}>
                  {activePreview ? getFileName(activePreview.file) : ''}
                </Text>
                <Text style={styles.modalFileMeta}>
                  {activePreview
                    ? `${getFileType(activePreview.file)} • ${getFormattedSize(activePreview.file.size)}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActivePreview(null)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {activePreview && (
              <View style={styles.modalContent}>
                {isImageFile(activePreview.file) && (
                  <Image
                    source={{ uri: activePreview.url }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                )}
                {(isPdfFile(activePreview.file) || isDocFile(activePreview.file)) && (
                  <WebView
                    source={{
                      uri: isPdfFile(activePreview.file)
                        ? `${activePreview.url}#view=FitH`
                        : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activePreview.url)}`,
                    }}
                    style={{ flex: 1 }}
                    startInLoadingState
                    renderLoading={() => (
                      <ActivityIndicator
                        size="large"
                        color={colors.primary}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                    )}
                  />
                )}
                {!isImageFile(activePreview.file) && !isPdfFile(activePreview.file) && !isDocFile(activePreview.file) && (
                  <View style={styles.modalFallback}>
                    <TouchableOpacity
                      style={{ alignItems: 'center', gap: spacing.xs }}
                      onPress={() => Linking.openURL(activePreview.url)}
                    >
                      <Icon name="open-in-new" size={28} color={colors.primary} />
                      <Text style={styles.modalFallbackText}>Open file in browser</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    gap: 6,
  },
  avatarContainer: { position: 'relative', marginBottom: 6 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a0d14',
  },
  profileName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: 13,
  },
  rolePill: {
    marginTop: 4,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  rolePillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  group: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 50,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 13,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 58,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  countPill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedForm: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  inputDisabled: { opacity: 0.45 },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileExpanded: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileThumbImg: { width: 40, height: 40 },
  fileName: { color: colors.text, fontSize: 13, fontWeight: '500' },
  fileMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  langPicker: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  langFlag: { fontSize: 22 },
  langName: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  langNameActive: { color: colors.primary, fontWeight: '600' },
  signOutWrap: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a0606',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ef444433',
    paddingVertical: 14,
    marginTop: 10,
  },
  deleteAccountText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  successText: { color: colors.success, fontSize: 12 },
  errorText: { color: colors.error, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  modalFileName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modalFileMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  modalCloseBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  modalContent: { height: 480 },
  modalImage: { width: '100%', height: '100%' },
  modalFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    margin: spacing.md,
    borderRadius: radius.md,
  },
  modalFallbackText: { color: colors.primary, fontSize: 13, marginTop: spacing.xs },
});
