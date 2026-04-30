import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, StyleSheet, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const ACCENT = '#7c3aed';
const WORKS_CATEGORIES = ['General', 'Survey', 'Measurement', 'Setting Out', 'Level Check', 'As-Built'];

export interface SurveyFormData {
  contractNo: string;
  riscNo: string;
  revision: string;
  supervisor: string;
  attention: string;
  location: string;
  survey: string;
  surveyField: string;
  worksCategory: string;
  inspectionDate: string;
  inspectionTime: string;
  nextOperation: string;
  scheduledDate: string;
  scheduledTime: string;
  equipment: string;
  issuedBy: string;
  issueDate: string;
  receivedBy: string;
  receivedDate: string;
  surveyedBy: string;
  surveyedAt: string;
  noObjection: boolean;
  deficienciesNoted: boolean;
  deficiencies: string[];
  project: string;
}

function genRiscNo() { return `RISC-${Math.floor(100000 + Math.random() * 900000)}`; }

export default function SurveyCheckFormRN({
  visible, onClose, onSave, initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: SurveyFormData) => void;
  initialData?: Partial<SurveyFormData>;
}) {
  const totalPages = 3;
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<SurveyFormData>({
    contractNo: initialData?.contractNo || '',
    riscNo: initialData?.riscNo || genRiscNo(),
    revision: initialData?.revision || 'Rev-1',
    supervisor: initialData?.supervisor || '',
    attention: initialData?.attention || '',
    location: initialData?.location || '',
    survey: initialData?.survey || '',
    surveyField: initialData?.surveyField || '',
    worksCategory: initialData?.worksCategory || 'General',
    inspectionDate: initialData?.inspectionDate || '',
    inspectionTime: initialData?.inspectionTime || '',
    nextOperation: initialData?.nextOperation || '',
    scheduledDate: initialData?.scheduledDate || '',
    scheduledTime: initialData?.scheduledTime || '',
    equipment: initialData?.equipment || '',
    issuedBy: initialData?.issuedBy || '',
    issueDate: initialData?.issueDate || '',
    receivedBy: initialData?.receivedBy || '',
    receivedDate: initialData?.receivedDate || '',
    surveyedBy: initialData?.surveyedBy || '',
    surveyedAt: initialData?.surveyedAt || '',
    noObjection: initialData?.noObjection || false,
    deficienciesNoted: initialData?.deficienciesNoted || false,
    deficiencies: initialData?.deficiencies || ['', '', '', ''],
    project: initialData?.project || '',
  });

  const set = (k: keyof SurveyFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.header}>
            <View>
              <Text style={S.headerTitle}>Survey Check Form</Text>
              <Text style={S.headerSub}>Page {page}/{totalPages}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={S.tabRow}>
            {['Request', 'Survey', 'Outcome'].map((t, i) => (
              <TouchableOpacity key={t} style={[S.tab, page === i + 1 && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]} onPress={() => setPage(i + 1)}>
                <Text style={[S.tabText, page === i + 1 && { color: ACCENT }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={S.body} showsVerticalScrollIndicator={false}>

            {page === 1 && (
              <View>
                <TRow label="RISC No.">
                  <TextInput style={S.input} value={form.riscNo} onChangeText={v => set('riscNo', v)} />
                </TRow>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <TRow label="Contract No.">
                      <TextInput style={S.input} value={form.contractNo} onChangeText={v => set('contractNo', v)} placeholder="e.g. CT-001" placeholderTextColor={colors.textMuted} />
                    </TRow>
                  </View>
                  <View style={{ flex: 1 }}>
                    <TRow label="Revision">
                      <TextInput style={S.input} value={form.revision} onChangeText={v => set('revision', v)} placeholder="Rev-1" placeholderTextColor={colors.textMuted} />
                    </TRow>
                  </View>
                </View>
                <TRow label="Supervisor">
                  <TextInput style={S.input} value={form.supervisor} onChangeText={v => set('supervisor', v)} placeholder="Supervisor name" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Attention To">
                  <TextInput style={S.input} value={form.attention} onChangeText={v => set('attention', v)} placeholder="Attention to" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Location *">
                  <TextInput style={S.input} value={form.location} onChangeText={v => set('location', v)} placeholder="Site location" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Survey / Works Description *">
                  <TextInput style={[S.input, S.ta]} value={form.survey} onChangeText={v => set('survey', v)} placeholder="Describe survey works..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
                </TRow>
                <TRow label="Survey Field">
                  <TextInput style={S.input} value={form.surveyField} onChangeText={v => set('surveyField', v)} placeholder="Survey field reference" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Works Category">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={S.chipRow}>
                      {WORKS_CATEGORIES.map(c => (
                        <TouchableOpacity key={c} style={[S.chip, form.worksCategory === c && { backgroundColor: ACCENT, borderColor: ACCENT }]} onPress={() => set('worksCategory', c)}>
                          <Text style={[S.chipText, form.worksCategory === c && { color: '#fff' }]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </TRow>
              </View>
            )}

            {page === 2 && (
              <View>
                <Text style={S.sectionTitle}>Requested Survey</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <TRow label="Date">
                      <TextInput style={S.input} value={form.inspectionDate} onChangeText={v => set('inspectionDate', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
                    </TRow>
                  </View>
                  <View style={{ flex: 1 }}>
                    <TRow label="Time">
                      <TextInput style={S.input} value={form.inspectionTime} onChangeText={v => set('inspectionTime', v)} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />
                    </TRow>
                  </View>
                </View>
                <TRow label="Next Operation">
                  <TextInput style={S.input} value={form.nextOperation} onChangeText={v => set('nextOperation', v)} placeholder="Next planned operation" placeholderTextColor={colors.textMuted} />
                </TRow>
                <Text style={S.sectionTitle}>Scheduled Visit</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <TRow label="Date">
                      <TextInput style={S.input} value={form.scheduledDate} onChangeText={v => set('scheduledDate', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
                    </TRow>
                  </View>
                  <View style={{ flex: 1 }}>
                    <TRow label="Time">
                      <TextInput style={S.input} value={form.scheduledTime} onChangeText={v => set('scheduledTime', v)} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />
                    </TRow>
                  </View>
                </View>
                <TRow label="Equipment">
                  <TextInput style={S.input} value={form.equipment} onChangeText={v => set('equipment', v)} placeholder="Equipment required" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Issued By">
                  <TextInput style={S.input} value={form.issuedBy} onChangeText={v => set('issuedBy', v)} placeholder="Issued by" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Issue Date">
                  <TextInput style={S.input} value={form.issueDate} onChangeText={v => set('issueDate', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
                </TRow>
              </View>
            )}

            {page === 3 && (
              <View>
                <Text style={S.sectionTitle}>Survey Outcome</Text>
                <TRow label="Surveyed By">
                  <TextInput style={S.input} value={form.surveyedBy} onChangeText={v => set('surveyedBy', v)} placeholder="Surveyor name" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Surveyed At">
                  <TextInput style={S.input} value={form.surveyedAt} onChangeText={v => set('surveyedAt', v)} placeholder="Location / area" placeholderTextColor={colors.textMuted} />
                </TRow>
                <View style={S.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.switchLabel}>No Objection</Text>
                    <Text style={S.switchSub}>Survey results accepted</Text>
                  </View>
                  <Switch value={form.noObjection} onValueChange={v => set('noObjection', v)} thumbColor={form.noObjection ? '#22c55e' : '#888'} trackColor={{ true: '#22c55e44', false: '#333' }} />
                </View>
                <View style={S.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.switchLabel}>Deficiencies Noted</Text>
                    <Text style={S.switchSub}>Corrections required</Text>
                  </View>
                  <Switch value={form.deficienciesNoted} onValueChange={v => set('deficienciesNoted', v)} thumbColor={form.deficienciesNoted ? '#ef4444' : '#888'} trackColor={{ true: '#ef444444', false: '#333' }} />
                </View>
                {form.deficienciesNoted && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={S.sectionTitle}>Deficiency Details</Text>
                    {form.deficiencies.map((d, i) => (
                      <TextInput key={i} style={[S.input, { marginBottom: spacing.xs }]} value={d}
                        onChangeText={v => { const next = [...form.deficiencies]; next[i] = v; set('deficiencies', next); }}
                        placeholder={`Deficiency ${i + 1}`} placeholderTextColor={colors.textMuted} />
                    ))}
                  </View>
                )}
                <TRow label="Received By">
                  <TextInput style={S.input} value={form.receivedBy} onChangeText={v => set('receivedBy', v)} placeholder="Received by" placeholderTextColor={colors.textMuted} />
                </TRow>
                <TRow label="Received Date">
                  <TextInput style={S.input} value={form.receivedDate} onChangeText={v => set('receivedDate', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
                </TRow>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>

          <View style={S.footer}>
            <TouchableOpacity style={S.footerNav} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <Icon name="arrow-left" size={18} color={page === 1 ? '#444' : colors.textMuted} />
              <Text style={{ color: page === 1 ? '#444' : colors.textMuted, fontSize: 13 }}>Back</Text>
            </TouchableOpacity>
            {page < totalPages ? (
              <TouchableOpacity style={[S.footerBtn, { backgroundColor: ACCENT }]} onPress={() => setPage(p => p + 1)}>
                <Text style={S.footerBtnText}>Next</Text>
                <Icon name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[S.footerBtn, { backgroundColor: ACCENT }]} onPress={() => onSave(form)}>
                <Icon name="check" size={16} color="#fff" />
                <Text style={S.footerBtnText}>Continue to Process Flow</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5 }}>{label}</Text>
      {children}
    </View>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '95%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  body: { flex: 1, padding: spacing.md },
  sectionTitle: { color: ACCENT, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase', marginTop: spacing.sm },
  input: { backgroundColor: '#111', color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: '#222', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  ta: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { borderRadius: radius.full, borderWidth: 1, borderColor: '#333', paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#222', padding: spacing.sm, marginBottom: spacing.xs },
  switchLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  switchSub: { color: colors.textMuted, fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  footerNav: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  footerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
