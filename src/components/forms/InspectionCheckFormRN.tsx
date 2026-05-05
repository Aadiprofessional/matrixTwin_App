import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  TextInput, StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const ACCENT = '#4f46e5';
const WORKS_CATEGORIES = [
  'General', 'Site Clearance', 'Landscape Softworks and Establishment Works',
  'Fencing', 'Drainage Works', 'Earthworks', 'Geotechnical Works',
];

export interface InspectionFormData {
  contractNo: string;
  riscNo: string;
  revision: string;
  supervisor: string;
  attention: string;
  works: string;
  location: string;
  worksToBeInspected: string;
  worksCategory: string;
  inspectionDate: string;
  inspectionTime: string;
  nextOperation: string;
  generalCleaning: string;
  scheduledDate: string;
  scheduledTime: string;
  equipment: string;
  issueTime: string;
  issueDate: string;
  issuedBy: string;
  receivedTime: string;
  receivedDate: string;
  receivedBy: string;
  siteAgentAttention: string;
  inspectedAt: string;
  inspectedBy: string;
  noObjection: boolean;
  deficienciesNoted: boolean;
  deficiencies: string[];
  formReturnedTime: string;
  formReturnedDate: string;
  formReturnedBy: string;
  counterSignedTime: string;
  counterSignedDate: string;
  counterSignedBy: string;
  formReceivedTime: string;
  formReceivedDate: string;
  formReceivedBy: string;
  project: string;
}

function genRiscNo() { return `RISC-${Math.floor(100000 + Math.random() * 900000)}`; }

export default function InspectionCheckFormRN({
  visible, onClose, onSave, initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: InspectionFormData) => void;
  initialData?: Partial<InspectionFormData>;
}) {
  console.log('[InspectionCheckFormRN] rendered, visible:', visible, 'initialData keys:', initialData ? Object.keys(initialData) : 'none');
  console.log('[InspectionCheckFormRN] initialData values:', JSON.stringify(initialData));

  const [form, setForm] = useState<InspectionFormData>({
    contractNo: initialData?.contractNo || '',
    riscNo: initialData?.riscNo || genRiscNo(),
    revision: initialData?.revision || '',
    supervisor: initialData?.supervisor || '',
    attention: initialData?.attention || '',
    works: initialData?.works || 'is expected to be ready for your inspection / testing / checking:',
    location: initialData?.location || '',
    worksToBeInspected: initialData?.worksToBeInspected || '',
    worksCategory: initialData?.worksCategory || 'General',
    inspectionDate: initialData?.inspectionDate || '',
    inspectionTime: initialData?.inspectionTime || '',
    nextOperation: initialData?.nextOperation || '',
    generalCleaning: initialData?.generalCleaning || '',
    scheduledDate: initialData?.scheduledDate || '',
    scheduledTime: initialData?.scheduledTime || '',
    equipment: initialData?.equipment || '',
    issueTime: initialData?.issueTime || '',
    issueDate: initialData?.issueDate || '',
    issuedBy: initialData?.issuedBy || '',
    receivedTime: initialData?.receivedTime || '',
    receivedDate: initialData?.receivedDate || '',
    receivedBy: initialData?.receivedBy || '',
    siteAgentAttention: initialData?.siteAgentAttention || '',
    inspectedAt: initialData?.inspectedAt || '',
    inspectedBy: initialData?.inspectedBy || '',
    noObjection: initialData?.noObjection || false,
    deficienciesNoted: initialData?.deficienciesNoted || false,
    deficiencies: initialData?.deficiencies || ['', '', '', '', '', '', ''],
    formReturnedTime: initialData?.formReturnedTime || '',
    formReturnedDate: initialData?.formReturnedDate || '',
    formReturnedBy: initialData?.formReturnedBy || '',
    counterSignedTime: initialData?.counterSignedTime || '',
    counterSignedDate: initialData?.counterSignedDate || '',
    counterSignedBy: initialData?.counterSignedBy || '',
    formReceivedTime: initialData?.formReceivedTime || '',
    formReceivedDate: initialData?.formReceivedDate || '',
    formReceivedBy: initialData?.formReceivedBy || '',
    project: initialData?.project || '',
  });

  const set = (k: keyof InspectionFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    console.log('[InspectionCheckFormRN] saving:', JSON.stringify(form));
    onSave(form);
  };

  const handleDeficiencyChange = (index: number, value: string) => {
    const next = [...form.deficiencies];
    next[index] = value;
    set('deficiencies', next);
    if (index === form.deficiencies.length - 1 && value.trim() !== '') {
      set('deficiencies', [...next, '']);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={S.sheet}>

          {/* Header */}
          <View style={S.header}>
            <Text style={S.headerTitle}>Inspection Form</Text>
            <TouchableOpacity onPress={onClose} style={S.closeBtn}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Action bar */}
          <View style={S.actionBar}>
            <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
              <Text style={S.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
              <Icon name="content-save" size={15} color="#fff" />
              <Text style={S.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={S.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Document title */}
            <Text style={S.docTitle}>Request for Inspection Check Form</Text>

            {/* Contract No (top right) */}
            <Row label="Contract No.:">
              <TextInput style={S.input} value={form.contractNo} onChangeText={v => set('contractNo', v)} placeholder="e.g. CT-001" placeholderTextColor={colors.textMuted} />
            </Row>

            <Divider />

            {/* To: The Supervisor */}
            <Text style={S.sectionHead}>To: The Supervisor,</Text>

            {/* Attention + RISC No + Rev */}
            <View style={S.attentionRow}>
              <Text style={S.inlineTxt}>(Attention:</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.attention} onChangeText={v => set('attention', v)} placeholder="attention" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>)</Text>
            </View>
            <View style={S.riscRow}>
              <Text style={S.boldTxt}>RISC No.:</Text>
              <TextInput style={[S.input, { width: 120 }]} value={form.riscNo} onChangeText={v => set('riscNo', v)} />
              <Text style={S.boldTxt}>Rev.</Text>
              <TextInput style={[S.input, { width: 70 }]} value={form.revision} onChangeText={v => set('revision', v)} placeholder="Rev-1" placeholderTextColor={colors.textMuted} />
            </View>

            <Divider />

            {/* Works statement */}
            <Text style={S.worksStatement}>
              The following <Text style={S.italic}>works</Text> {form.works}
            </Text>

            {/* (1) Location */}
            <View style={S.numberedRow}>
              <Text style={S.numberedLabel}>(1) Location, portion, chainage, level of <Text style={S.italic}>works</Text>:</Text>
              <TextInput style={[S.input, S.fullWidth]} value={form.location} onChangeText={v => set('location', v)} placeholder="Location" placeholderTextColor={colors.textMuted} />
            </View>

            {/* (2) Works to be Inspected */}
            <View style={S.numberedRow}>
              <Text style={S.numberedLabel}>(2) <Text style={S.italic}>Works</Text> to be Inspected:</Text>
              <TextInput style={[S.input, S.ta, S.fullWidth]} value={form.worksToBeInspected} onChangeText={v => set('worksToBeInspected', v)} placeholder="Describe works to be inspected..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
            </View>

            {/* (3) Works Category */}
            <View style={S.numberedRow}>
              <Text style={S.numberedLabel}>(3) <Text style={S.italic}>Works Category</Text>:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={S.chipRow}>
                  {WORKS_CATEGORIES.map(c => (
                    <TouchableOpacity key={c} style={[S.chip, form.worksCategory === c && S.chipActive]} onPress={() => set('worksCategory', c)}>
                      <Text style={[S.chipText, form.worksCategory === c && S.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Inspection time/date */}
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>at</Text>
              <TextInput style={[S.input, S.timeInput]} value={form.inspectionTime} onChangeText={v => set('inspectionTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>on</Text>
              <TextInput style={[S.input, S.dateInput]} value={form.inspectionDate} onChangeText={v => set('inspectionDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>before proceeding to the next operation of</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.nextOperation} onChangeText={v => set('nextOperation', v)} placeholder="next operation" placeholderTextColor={colors.textMuted} />
            </View>

            {/* General cleaning */}
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>Check general cleaning</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.generalCleaning} onChangeText={v => set('generalCleaning', v)} placeholder="cleaning details" placeholderTextColor={colors.textMuted} />
            </View>

            {/* Scheduled time/date + equipment */}
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>which is scheduled for</Text>
              <TextInput style={[S.input, S.timeInput]} value={form.scheduledTime} onChangeText={v => set('scheduledTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <TextInput style={[S.input, S.dateInput]} value={form.scheduledDate} onChangeText={v => set('scheduledDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>using the following Equipment:</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.equipment} onChangeText={v => set('equipment', v)} placeholder="Equipment" placeholderTextColor={colors.textMuted} />
            </View>

            <Divider />

            {/* Issued by the Contractor */}
            <Text style={S.sigSectionLabel}><Text style={S.italic}>Issued by the Contractor</Text>:</Text>
            <View style={S.inlineRow}>
              <TextInput style={[S.input, S.timeInput]} value={form.issueTime} onChangeText={v => set('issueTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <TextInput style={[S.input, S.dateInput]} value={form.issueDate} onChangeText={v => set('issueDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>by</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.issuedBy} onChangeText={v => set('issuedBy', v)} placeholder="Name" placeholderTextColor={colors.textMuted} />
            </View>
            <Text style={S.sigPlaceholder}>(Signature)</Text>

            {/* Received by RE/IOW */}
            <Text style={S.sigSectionLabel}>Received by RE/IOW:</Text>
            <View style={S.inlineRow}>
              <TextInput style={[S.input, S.timeInput]} value={form.receivedTime} onChangeText={v => set('receivedTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <TextInput style={[S.input, S.dateInput]} value={form.receivedDate} onChangeText={v => set('receivedDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>by</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.receivedBy} onChangeText={v => set('receivedBy', v)} placeholder="Name" placeholderTextColor={colors.textMuted} />
            </View>
            <Text style={S.sigPlaceholder}>(Signature)</Text>

            <Divider />

            {/* To: Site Agent */}
            <Text style={S.sectionHead}>To: Site Agent,</Text>
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>(Attention:</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.siteAgentAttention} onChangeText={v => set('siteAgentAttention', v)} placeholder="Site agent attention" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>)</Text>
            </View>

            {/* Inspected at / by */}
            <View style={S.inlineRow}>
              <Text style={S.inlineTxt}>Inspected at</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.inspectedAt} onChangeText={v => set('inspectedAt', v)} placeholder="Location / area" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>by</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.inspectedBy} onChangeText={v => set('inspectedBy', v)} placeholder="Inspector name" placeholderTextColor={colors.textMuted} />
            </View>

            {/* No Objection checkbox */}
            <TouchableOpacity style={S.checkRow} onPress={() => set('noObjection', !form.noObjection)}>
              <Icon name={form.noObjection ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={form.noObjection ? '#22c55e' : colors.textMuted} />
              <Text style={S.checkLabel}>There is no objection to you proceeding with the work.</Text>
            </TouchableOpacity>

            {/* Deficiencies checkbox */}
            <TouchableOpacity style={S.checkRow} onPress={() => set('deficienciesNoted', !form.deficienciesNoted)}>
              <Icon name={form.deficienciesNoted ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={form.deficienciesNoted ? '#ef4444' : colors.textMuted} />
              <Text style={S.checkLabel}>The following deficiencies have been noted.</Text>
            </TouchableOpacity>

            {/* Deficiency list */}
            {form.deficiencies.map((d, i) => (
              <View key={i} style={S.defRow}>
                <Text style={S.defNum}>{i + 1}.</Text>
                <TextInput
                  style={[S.input, S.defInput]}
                  value={d}
                  onChangeText={v => handleDeficiencyChange(i, v)}
                  placeholder={`Deficiency ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}
            <TouchableOpacity style={S.addLineBtn} onPress={() => set('deficiencies', [...form.deficiencies, ''])}>
              <Icon name="plus" size={16} color={ACCENT} />
              <Text style={S.addLineBtnText}>Add line</Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <Text style={S.disclaimer}>
              The giving of this information and this inspection shall not relieve the Contractor of any liabilities or obligations under this contract.
            </Text>

            <Divider />

            {/* Form returned and signed by */}
            <Text style={S.sigSectionLabel}>Form returned and signed by</Text>
            <View style={S.inlineRow}>
              <TextInput style={[S.input, S.timeInput]} value={form.formReturnedTime} onChangeText={v => set('formReturnedTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <TextInput style={[S.input, S.dateInput]} value={form.formReturnedDate} onChangeText={v => set('formReturnedDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>by</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.formReturnedBy} onChangeText={v => set('formReturnedBy', v)} placeholder="Name" placeholderTextColor={colors.textMuted} />
            </View>
            <Text style={S.sigPlaceholder}>(Signature)</Text>

            {/* Countersigned by RE */}
            <Text style={S.sigSectionLabel}>#Countersigned by the RE</Text>
            <View style={S.inlineRow}>
              <TextInput style={[S.input, S.timeInput]} value={form.counterSignedTime} onChangeText={v => set('counterSignedTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <TextInput style={[S.input, S.dateInput]} value={form.counterSignedDate} onChangeText={v => set('counterSignedDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>by</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.counterSignedBy} onChangeText={v => set('counterSignedBy', v)} placeholder="Name" placeholderTextColor={colors.textMuted} />
            </View>
            <Text style={S.sigPlaceholder}>(Signature)</Text>

            {/* Form received and signed by the Contractor */}
            <Text style={S.sigSectionLabel}>Form received and signed by the Contractor</Text>
            <View style={S.inlineRow}>
              <TextInput style={[S.input, S.timeInput]} value={form.formReceivedTime} onChangeText={v => set('formReceivedTime', v)} placeholder="--:-- --" placeholderTextColor={colors.textMuted} />
              <TextInput style={[S.input, S.dateInput]} value={form.formReceivedDate} onChangeText={v => set('formReceivedDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
              <Text style={S.inlineTxt}>by</Text>
              <TextInput style={[S.input, S.flexInput]} value={form.formReceivedBy} onChangeText={v => set('formReceivedBy', v)} placeholder="Name" placeholderTextColor={colors.textMuted} />
            </View>
            <Text style={S.sigPlaceholder}>(Signature)</Text>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#1e1e1e', marginVertical: spacing.sm }} />;
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '96%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  closeBtn: { padding: 6 },
  actionBar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: '#1a1a1a', borderRadius: radius.md, borderWidth: 1, borderColor: '#333' },
  cancelBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: ACCENT, borderRadius: radius.md },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  body: { padding: spacing.md },
  docTitle: { textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  sectionHead: { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: spacing.xs, marginTop: spacing.xs },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  riscRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs, flexWrap: 'wrap' },
  boldTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
  worksStatement: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  italic: { fontStyle: 'italic' },
  numberedRow: { marginBottom: spacing.sm },
  numberedLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: spacing.xs },
  inlineTxt: { color: colors.textMuted, fontSize: 11 },
  fullWidth: { width: '100%' },
  flexInput: { flex: 1, minWidth: 70 },
  timeInput: { width: 80 },
  dateInput: { width: 100 },
  sigSectionLabel: { color: colors.text, fontWeight: '600', fontSize: 12, marginBottom: 4, marginTop: spacing.xs },
  sigPlaceholder: { color: colors.textMuted, fontSize: 11, textAlign: 'right', marginBottom: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
  checkLabel: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 },
  defRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 5 },
  defNum: { color: colors.textMuted, fontSize: 13, width: 22 },
  defInput: { flex: 1 },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.md },
  addLineBtnText: { color: ACCENT, fontSize: 13, fontWeight: '600' },
  disclaimer: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginBottom: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1e1e1e', lineHeight: 16 },
  input: { backgroundColor: '#111', color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: '#222', paddingHorizontal: spacing.sm, paddingVertical: 7, fontSize: 13 },
  ta: { minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.sm },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: '#333', paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
});
