import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import ModuleShell from './ModuleShell';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import {
  createCustomFormEntry,
  CustomFormEntry,
  CustomFormTemplate,
  FormField,
  FormPageStructure,
  getCustomFormEntries,
  getCustomFormEntryDetails,
  getCustomFormTemplates,
  updateCustomFormEntry,
} from '../../api/customForms';

type RouteProps = RouteProp<AppStackParamList, 'Forms'>;
type TabKey = 'templates' | 'entries';

const ACCENT = '#5f7cae';

const extractOptions = (field: FormField) => {
  const fromField = Array.isArray(field.options) ? field.options : [];
  const rawSettingsOptions = field.settings?.options;
  const fromSettings = Array.isArray(rawSettingsOptions) ? rawSettingsOptions : [];
  return [...fromField, ...fromSettings].map((option: any) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return {
      label: option?.label || option?.value || 'Option',
      value: option?.value || option?.label || 'Option',
    };
  });
};

const isRequired = (field: FormField) =>
  field.required === true || field.settings?.required === true;

const getFieldLabel = (field: FormField) => field.label || field.settings?.label || 'Untitled field';

const getFieldPlaceholder = (field: FormField) =>
  field.placeholder || field.settings?.placeholder || 'Enter a value';

const getTemplatePages = (template?: CustomFormTemplate | null): FormPageStructure[] => {
  const structure = template?.form_structure;
  if (!structure || typeof structure === 'string') {
    return [];
  }
  return Array.isArray(structure.pages) ? structure.pages : [];
};

const formatStatus = (status: string) => {
  if (!status) return 'UNKNOWN';
  if (status === 'permanently_rejected') return 'PERM. REJECTED';
  return status.replace(/_/g, ' ').toUpperCase();
};

const statusColor = (status: string) => {
  if (status === 'completed' || status === 'approved') return colors.success;
  if (status === 'pending') return colors.warning;
  if (status === 'rejected' || status === 'permanently_rejected') return colors.error;
  return colors.textMuted;
};

const renderValuePreview = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function FormsScreen() {
  const route = useRoute<RouteProps>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('templates');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CustomFormTemplate[]>([]);
  const [entries, setEntries] = useState<CustomFormEntry[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomFormTemplate | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CustomFormEntry | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [entryComment, setEntryComment] = useState('');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [templateData, entryData] = await Promise.all([
        getCustomFormTemplates(projectId),
        getCustomFormEntries(user.id, projectId),
      ]);
      setTemplates(templateData);
      setEntries(entryData);
    } catch (error) {
      console.error('Failed to load forms data:', error);
      Alert.alert('Forms', 'Unable to load form templates right now.');
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const templatePages = useMemo(
    () => getTemplatePages(selectedTemplate),
    [selectedTemplate],
  );

  const currentPage = templatePages[pageIndex];

  const totalFields = useMemo(
    () => templates.reduce((sum, template) => sum + (template.fieldsCount || 0), 0),
    [templates],
  );

  const openTemplate = (template: CustomFormTemplate) => {
    setSelectedTemplate(template);
    setPageIndex(0);
    setFormValues({});
    setShowTemplateModal(true);
  };

  const openEntry = async (entry: CustomFormEntry) => {
    try {
      setActionLoading(true);
      const detailedEntry = await getCustomFormEntryDetails(entry.id);
      setSelectedEntry(detailedEntry);
      setEntryComment('');
      setShowEntryModal(true);
    } catch (error) {
      console.error('Failed to load form entry details:', error);
      Alert.alert('Forms', 'Unable to open this form entry.');
    } finally {
      setActionLoading(false);
    }
  };

  const setFieldValue = (fieldId: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    const value = formValues[field.id];
    const options = extractOptions(field);
    const label = String(getFieldLabel(field));
    const placeholder = String(getFieldPlaceholder(field));
    const type = field.type?.toLowerCase();

    if (type === 'checkbox') {
      const checked = value === true;
      return (
        <TouchableOpacity
          key={field.id}
          style={styles.checkboxField}
          onPress={() => setFieldValue(field.id, !checked)}>
          <View style={[styles.checkboxBox, checked ? styles.checkboxBoxChecked : null]}>
            {checked ? <Icon name="check" size={14} color={colors.white} /> : null}
          </View>
          <Text style={styles.checkboxLabel}>{label}</Text>
        </TouchableOpacity>
      );
    }

    if (options.length > 0) {
      const selectedValue = typeof value === 'string' ? value : '';
      return (
        <View key={field.id} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>
            {label}
            {isRequired(field) ? ' *' : ''}
          </Text>
          <View style={styles.optionWrap}>
            {options.map(option => (
              <TouchableOpacity
                key={`${field.id}-${option.value}`}
                style={[
                  styles.optionChip,
                  selectedValue === option.value ? styles.optionChipActive : null,
                ]}
                onPress={() => setFieldValue(field.id, option.value)}>
                <Text
                  style={[
                    styles.optionChipText,
                    selectedValue === option.value ? styles.optionChipTextActive : null,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View key={field.id} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>
          {label}
          {isRequired(field) ? ' *' : ''}
        </Text>
        <TextInput
          style={[
            styles.fieldInput,
            type === 'textarea' || type === 'long_text' ? styles.fieldInputMultiline : null,
          ]}
          value={typeof value === 'string' ? value : value ? String(value) : ''}
          onChangeText={text => setFieldValue(field.id, text)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={type === 'textarea' || type === 'long_text'}
          keyboardType={type === 'number' ? 'numeric' : 'default'}
        />
        {['signature', 'file', 'attachment', 'image', 'annotation'].includes(type) ? (
          <Text style={styles.unsupportedText}>
            This template uses a richer widget type on the website. Native support is being ported next.
          </Text>
        ) : null}
      </View>
    );
  };

  const validateCurrentTemplate = () => {
    const missingField = templatePages
      .flatMap((page: FormPageStructure) => page.fields || [])
      .find((field: FormField) => {
        if (!isRequired(field)) return false;
        const value = formValues[field.id];
        return value === undefined || value === null || value === '' || value === false;
      });

    if (missingField) {
      Alert.alert('Forms', `${getFieldLabel(missingField)} is required.`);
      return false;
    }

    return true;
  };

  const submitTemplate = async () => {
    if (!selectedTemplate) return;
    if (!validateCurrentTemplate()) return;

    try {
      setSubmitting(true);
      await createCustomFormEntry({
        templateId: selectedTemplate.id,
        formData: formValues,
        projectId,
      });
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setFormValues({});
      await fetchData();
      Alert.alert('Forms', 'Form submitted successfully.');
    } catch (error) {
      console.error('Failed to submit form entry:', error);
      Alert.alert('Forms', 'Unable to submit this form right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntryAction = async (action: 'approve' | 'reject' | 'back' | 'update') => {
    if (!selectedEntry || !user?.id) return;
    if ((action === 'reject' || action === 'back') && !entryComment.trim()) {
      Alert.alert('Forms', 'A comment is required for this action.');
      return;
    }

    try {
      setActionLoading(true);
      await updateCustomFormEntry(selectedEntry.id, {
        action,
        comment: entryComment.trim() || undefined,
        userId: user.id,
        formData: action === 'update' ? selectedEntry.form_data || {} : undefined,
      });
      setShowEntryModal(false);
      setSelectedEntry(null);
      setEntryComment('');
      await fetchData();
      Alert.alert('Forms', `Form ${action}d successfully.`);
    } catch (error) {
      console.error(`Failed to ${action} form entry:`, error);
      Alert.alert('Forms', `Unable to ${action} this form right now.`);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStat = (label: string, value: number, color: string) => (
    <View style={[styles.statCard, { borderTopColor: color }]} key={label}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderTemplateCard = ({ item }: { item: CustomFormTemplate }) => {
    const pageCount = getTemplatePages(item).length;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openTemplate(item)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {item.description || 'No description provided.'}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.cardMetaRow}>
          <View style={styles.metaPill}>
            <Icon name="text-box-multiple-outline" size={12} color={ACCENT} />
            <Text style={styles.metaPillText}>{item.fieldsCount || 0} fields</Text>
          </View>
          <View style={styles.metaPill}>
            <Icon name="file-document-outline" size={12} color={ACCENT} />
            <Text style={styles.metaPillText}>{pageCount} pages</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEntryCard = ({ item }: { item: CustomFormEntry }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEntry(item)} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.template_name}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            Created {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'recently'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}22` }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {formatStatus(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.entryPreviewText} numberOfLines={2}>
        {Object.entries(item.form_data || {})
          .slice(0, 2)
          .map(([key, value]) => `${key}: ${renderValuePreview(value)}`)
          .join(' · ') || 'Tap to view workflow details.'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ModuleShell
      title="Forms"
      iconName="file-document-multiple-outline"
      accentColor={ACCENT}>
      <View style={styles.tabRow}>
        {(['templates', 'entries'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>
              {tab === 'templates' ? 'Templates' : 'Entries'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsRow}>
        {renderStat('Templates', templates.length, ACCENT)}
        {renderStat('Entries', entries.length, colors.warning)}
        {renderStat('Fields', totalFields, colors.success)}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : activeTab === 'templates' ? (
        <FlatList
          data={templates}
          keyExtractor={item => item.id}
          renderItem={renderTemplateCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="file-document-outline" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>No templates found</Text>
              <Text style={styles.emptySubtitle}>
                Create templates on the website and they will appear here for native form filling.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderEntryCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="file-document-outline" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>No entries found</Text>
              <Text style={styles.emptySubtitle}>
                Submitted forms for this project will appear here.
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showTemplateModal} animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Icon name="arrow-left" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{selectedTemplate?.name || 'Template'}</Text>
              <Text style={styles.modalSubtitle}>
                Page {templatePages.length === 0 ? 0 : pageIndex + 1} of {templatePages.length}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, submitting ? styles.submitBtnDisabled : null]}
              onPress={submitTemplate}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSectionTitle}>
              {currentPage?.title || `Form Page ${pageIndex + 1}`}
            </Text>
            <Text style={styles.modalDescription}>
              {selectedTemplate?.description || 'Complete the form below and submit it to start the workflow.'}
            </Text>
            {(currentPage?.fields || []).map(renderField)}
          </ScrollView>

          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.paginationBtn, pageIndex === 0 ? styles.paginationBtnDisabled : null]}
              disabled={pageIndex === 0}
              onPress={() => setPageIndex(prev => Math.max(0, prev - 1))}>
              <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              <Text style={styles.paginationText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paginationBtn,
                pageIndex >= templatePages.length - 1 ? styles.paginationBtnDisabled : null,
              ]}
              disabled={pageIndex >= templatePages.length - 1}
              onPress={() =>
                setPageIndex(prev => Math.min(templatePages.length - 1, prev + 1))
              }>
              <Text style={styles.paginationText}>Next</Text>
              <Icon name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEntryModal} animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEntryModal(false)}>
              <Icon name="arrow-left" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{selectedEntry?.template_name || 'Form Entry'}</Text>
              <Text style={styles.modalSubtitle}>{formatStatus(selectedEntry?.status || '')}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSectionTitle}>Form Data</Text>
            {Object.entries(selectedEntry?.form_data || {}).map(([key, value]) => (
              <View key={key} style={styles.summaryRow}>
                <Text style={styles.summaryKey}>{key}</Text>
                <Text style={styles.summaryValue}>{renderValuePreview(value)}</Text>
              </View>
            ))}

            <Text style={[styles.modalSectionTitle, styles.sectionSpacing]}>Workflow</Text>
            {(selectedEntry?.form_workflow_nodes || []).map((node: any, index: number) => (
              <View style={styles.workflowCard} key={`${node.node_id || node.id || index}`}>
                <Text style={styles.workflowTitle}>
                  {node.node_name || node.name || `Node ${index + 1}`}
                </Text>
                <Text style={styles.workflowMeta}>
                  {node.executor_name || node.executorName || 'Unassigned'} ·{' '}
                  {formatStatus(node.status || 'pending')}
                </Text>
              </View>
            ))}

            <Text style={[styles.modalSectionTitle, styles.sectionSpacing]}>Comment</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={entryComment}
              onChangeText={setEntryComment}
              placeholder="Add a workflow comment"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </ScrollView>

          <View style={styles.actionRow}>
            {(['approve', 'back', 'reject'] as const).map(action => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor:
                      action === 'approve'
                        ? colors.success
                        : action === 'reject'
                        ? colors.error
                        : colors.warning,
                  },
                  actionLoading ? styles.submitBtnDisabled : null,
                ]}
                onPress={() => handleEntryAction(action)}
                disabled={actionLoading}>
                <Text style={styles.actionBtnText}>{action.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ModuleShell>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: `${ACCENT}18`,
    borderColor: `${ACCENT}55`,
  },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: ACCENT },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  loader: { flex: 1, marginTop: 48 },
  list: { padding: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  cardMetaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${ACCENT}18`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  metaPillText: { color: ACCENT, fontSize: 11, fontWeight: '600' },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  entryPreviewText: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { color: colors.textSecondary, fontSize: 15, fontWeight: '700', marginTop: spacing.md },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  modalSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  submitBtn: {
    backgroundColor: ACCENT,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  modalBody: { padding: spacing.xl, paddingBottom: spacing.huge },
  modalSectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalDescription: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, marginBottom: spacing.lg },
  fieldBlock: { marginBottom: spacing.lg },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: spacing.xs },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  fieldInputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  unsupportedText: { color: colors.warning, fontSize: 11, marginTop: spacing.xs, lineHeight: 16 },
  checkboxField: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkboxLabel: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  optionChipActive: { backgroundColor: `${ACCENT}22`, borderColor: `${ACCENT}55` },
  optionChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  optionChipTextActive: { color: ACCENT },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  paginationBtnDisabled: { opacity: 0.35 },
  paginationText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  summaryRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryKey: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { color: colors.text, fontSize: 14, lineHeight: 20 },
  sectionSpacing: { marginTop: spacing.xl },
  workflowCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  workflowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  workflowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  actionBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
});
