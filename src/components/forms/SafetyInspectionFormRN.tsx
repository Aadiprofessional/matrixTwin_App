import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const ACCENT = '#f59e0b';

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};
const INSPECTION_TYPES = ['Routine', 'Pre-Task', 'Post-Incident', 'Regulatory', 'Environmental', 'Fire Safety'];

const CHECKLIST_SECTIONS = [
  {
    category: 'Personal Protective Equipment (PPE)',
    items: ['Hard hat worn correctly', 'Safety vest / hi-vis worn', 'Safety boots worn', 'Gloves worn where required', 'Eye/ear protection worn'],
  },
  {
    category: 'Work Area Safety',
    items: ['Area is properly demarcated', 'No trip/slip hazards observed', 'Fire extinguisher accessible', 'Emergency exits clear', 'First aid kit accessible'],
  },
  {
    category: 'Equipment & Tools',
    items: ['Tools in good condition', 'Electrical tools inspected / tagged', 'Scaffolding erected correctly', 'Ladders secured correctly', 'Lifting equipment inspected'],
  },
  {
    category: 'Housekeeping',
    items: ['Work area clean and tidy', 'Waste disposed correctly', 'Materials stored safely', 'Spill kits available', 'Signage adequate'],
  },
];

type CheckStatus = 'pass' | 'fail' | 'na';

interface ChecklistRow {
  key: string;
  status: CheckStatus;
  remarks: string;
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

export interface SafetyFormData {
  formNumber: string;
  contractNo: string;
  contractTitle: string;
  date: string;
  time: string;
  location: string;
  inspector: string;
  inspectionType: string;
  riskLevel: string;
  findings: string;
  correctiveActions: string;
  notes: string;
  checklist: ChecklistRow[];
  incidentsReported: string;
  score?: number;
}

export default function SafetyInspectionFormRN({
  visible, onClose, onSave, initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: SafetyFormData) => void;
  initialData?: Partial<SafetyFormData>;
}) {
  const totalPages = 3;
  const [page, setPage] = useState(1);

  const defaultChecklist: ChecklistRow[] = CHECKLIST_SECTIONS.flatMap(s =>
    s.items.map(item => ({ key: `${s.category}::${item}`, status: 'na' as CheckStatus, remarks: '' }))
  );

  const [form, setForm] = useState<SafetyFormData>({
    formNumber: initialData?.formNumber || `SAFETY-${Date.now().toString().slice(-6)}`,
    contractNo: initialData?.contractNo || '',
    contractTitle: initialData?.contractTitle || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    location: initialData?.location || '',
    inspector: initialData?.inspector || '',
    inspectionType: initialData?.inspectionType || 'Routine',
    riskLevel: initialData?.riskLevel || 'medium',
    findings: initialData?.findings || '',
    correctiveActions: initialData?.correctiveActions || '',
    notes: initialData?.notes || '',
    checklist: initialData?.checklist || defaultChecklist,
    incidentsReported: initialData?.incidentsReported || '',
  });

  const setField = (k: keyof SafetyFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const setChecklistRow = (idx: number, field: 'status' | 'remarks', val: any) => {
    setForm(f => {
      const next = [...f.checklist];
      next[idx] = { ...next[idx], [field]: val };
      return { ...f, checklist: next };
    });
  };

  const calcScore = () => {
    const rows = form.checklist.filter(r => r.status !== 'na');
    if (!rows.length) return 100;
    const pass = rows.filter(r => r.status === 'pass').length;
    return Math.round((pass / rows.length) * 100);
  };

  const handleSave = () => {
    onSave({ ...form, score: calcScore() });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={S.sheet}>
          {/* Header */}
          <View style={S.header}>
            <View>
              <Text style={S.headerTitle}>Safety Inspection</Text>
              <Text style={S.headerSub}>Page {page}/{totalPages}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={S.closeBtn}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Page tabs */}
          <View style={S.tabRow}>
            {['Details', 'Checklist', 'Summary'].map((t, i) => (
              <TouchableOpacity key={t} style={[S.tab, page === i + 1 && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]} onPress={() => setPage(i + 1)}>
                <Text style={[S.tabText, page === i + 1 && { color: ACCENT }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={S.body} showsVerticalScrollIndicator={false}>

            {/* PAGE 1: Details */}
            {page === 1 && (
              <View>
                <Row label="Form Number">
                  <TextInput style={S.input} value={form.formNumber} onChangeText={v => setField('formNumber', v)} />
                </Row>
                <Row label="Contract No.">
                  <TextInput style={S.input} value={form.contractNo} onChangeText={v => setField('contractNo', v)} placeholder="e.g. CT-2024-001" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Contract Title">
                  <TextInput style={S.input} value={form.contractTitle} onChangeText={v => setField('contractTitle', v)} placeholder="Contract / project title" placeholderTextColor={colors.textMuted} />
                </Row>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row label="Date">
                      <TextInput style={S.input} value={form.date} onChangeText={v => setField('date', v)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row label="Time">
                      <TextInput style={S.input} value={form.time} onChangeText={v => setField('time', v)} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                </View>
                <Row label="Inspector *">
                  <TextInput style={S.input} value={form.inspector} onChangeText={v => setField('inspector', v)} placeholder="Inspector name" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Location *">
                  <TextInput style={S.input} value={form.location} onChangeText={v => setField('location', v)} placeholder="Inspection location" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Inspection Type">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={S.chipRow}>
                      {INSPECTION_TYPES.map(t => (
                        <TouchableOpacity key={t} style={[S.chip, form.inspectionType === t && { backgroundColor: ACCENT, borderColor: ACCENT }]} onPress={() => setField('inspectionType', t)}>
                          <Text style={[S.chipText, form.inspectionType === t && { color: '#fff' }]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </Row>
                <Row label="Risk Level">
                  <View style={S.chipRow}>
                    {RISK_LEVELS.map(r => (
                      <TouchableOpacity key={r} style={[S.chip, form.riskLevel === r && { backgroundColor: RISK_COLORS[r], borderColor: RISK_COLORS[r] }]} onPress={() => setField('riskLevel', r)}>
                        <Text style={[S.chipText, form.riskLevel === r && { color: '#fff' }]}>{r.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Row>
              </View>
            )}

            {/* PAGE 2: Checklist */}
            {page === 2 && (
              <View>
                {CHECKLIST_SECTIONS.map((section, sIdx) => (
                  <View key={section.category} style={S.section}>
                    <Text style={S.sectionTitle}>{section.category}</Text>
                    {section.items.map((item, iIdx) => {
                      const globalIdx = CHECKLIST_SECTIONS.slice(0, sIdx).reduce((a, s) => a + s.items.length, 0) + iIdx;
                      const row = form.checklist[globalIdx];
                      return (
                        <View key={item} style={S.checkRow}>
                          <Text style={S.checkItem}>{item}</Text>
                          <View style={S.checkBtns}>
                            {(['pass', 'fail', 'na'] as CheckStatus[]).map(s => (
                              <TouchableOpacity
                                key={s}
                                style={[S.checkBtn, row?.status === s && { backgroundColor: s === 'pass' ? '#22c55e22' : s === 'fail' ? '#ef444422' : '#64748b22', borderColor: s === 'pass' ? '#22c55e' : s === 'fail' ? '#ef4444' : '#64748b' }]}
                                onPress={() => setChecklistRow(globalIdx, 'status', s)}
                              >
                                <Text style={[S.checkBtnText, { color: s === 'pass' ? '#22c55e' : s === 'fail' ? '#ef4444' : '#64748b' }]}>
                                  {s === 'pass' ? '✓' : s === 'fail' ? '✗' : 'N/A'}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          {row?.status === 'fail' && (
                            <TextInput
                              style={[S.input, { marginTop: 4, fontSize: 12 }]}
                              value={row.remarks}
                              onChangeText={v => setChecklistRow(globalIdx, 'remarks', v)}
                              placeholder="Remarks..."
                              placeholderTextColor={colors.textMuted}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* PAGE 3: Summary */}
            {page === 3 && (
              <View>
                <View style={S.scoreBox}>
                  <Text style={S.scoreLabel}>Safety Score</Text>
                  <Text style={[S.scoreValue, { color: calcScore() >= 80 ? '#22c55e' : calcScore() >= 60 ? ACCENT : '#ef4444' }]}>
                    {calcScore()}%
                  </Text>
                </View>
                <Row label="Findings / Observations *">
                  <TextInput style={[S.input, S.ta]} value={form.findings} onChangeText={v => setField('findings', v)} placeholder="Describe findings..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
                </Row>
                <Row label="Corrective Actions">
                  <TextInput style={[S.input, S.ta]} value={form.correctiveActions} onChangeText={v => setField('correctiveActions', v)} placeholder="Required corrective actions..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
                </Row>
                <Row label="Incidents Reported">
                  <TextInput style={S.input} value={form.incidentsReported} onChangeText={v => setField('incidentsReported', v)} placeholder="Any incidents reported? (none if blank)" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Notes">
                  <TextInput style={[S.input, S.ta]} value={form.notes} onChangeText={v => setField('notes', v)} placeholder="Additional notes..." placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
                </Row>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Footer */}
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
              <TouchableOpacity style={[S.footerBtn, { backgroundColor: ACCENT }]} onPress={handleSave}>
                <Icon name="check" size={16} color="#fff" />
                <Text style={S.footerBtnText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
  closeBtn: { padding: 6 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  body: { flex: 1, padding: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionTitle: { color: ACCENT, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
  checkRow: { backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#222', padding: spacing.sm, marginBottom: spacing.xs },
  checkItem: { color: colors.text, fontSize: 13, marginBottom: 6 },
  checkBtns: { flexDirection: 'row', gap: spacing.xs },
  checkBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: '#333', backgroundColor: '#0d0d0d' },
  checkBtnText: { fontSize: 12, fontWeight: '700' },
  scoreBox: { backgroundColor: '#111', borderRadius: radius.lg, borderWidth: 1, borderColor: '#222', padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  scoreLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  scoreValue: { fontSize: 48, fontWeight: '900' },
  input: { backgroundColor: '#111', color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: '#222', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  ta: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { borderRadius: radius.full, borderWidth: 1, borderColor: '#333', paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  footerNav: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  footerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
