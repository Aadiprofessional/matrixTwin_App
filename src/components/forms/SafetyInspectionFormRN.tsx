import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  TextInput, StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const ACCENT = '#f59e0b';

type ResponseStatus = 'Y' | 'N' | 'NA' | '';

interface ChecklistItem { id: string; description: string; }
interface ChecklistCategory { id: string; description: string; items: ChecklistItem[]; }
interface PhotoRecord { id: string; location: string; finding: string; action: string; }

const DEFAULT_CATEGORIES: ChecklistCategory[] = [
  { id: '1',  description: 'General',                          items: [{ id: '1.1', description: '' }] },
  { id: '2',  description: 'Flammable Liquids/Gases',          items: [{ id: '2.1', description: '' }] },
  { id: '3',  description: 'Hazardous Substances',             items: [{ id: '3.1', description: '' }] },
  { id: '4',  description: 'Electricity',                      items: [{ id: '4.1', description: '' }] },
  { id: '5',  description: 'Fire Precaution',                  items: [{ id: '5.1', description: '' }] },
  { id: '6',  description: 'Working Area',                     items: [{ id: '6.1', description: '' }] },
  { id: '7',  description: 'Lifting Operation',                items: [{ id: '7.1', description: '' }] },
  { id: '8',  description: 'Material Hoist',                   items: [{ id: '8.1', description: '' }] },
  { id: '9',  description: 'Confined Spaces',                  items: [{ id: '9.1', description: '' }] },
  { id: '10', description: 'Noise',                            items: [{ id: '10.1', description: '' }] },
  { id: '11', description: 'Gas Welding and Cutting Equipment', items: [{ id: '11.1', description: '' }] },
  { id: '12', description: 'Electricity-arc Welding',          items: [{ id: '12.1', description: '' }] },
  { id: '13', description: 'Mechanical Plant and Equipment',   items: [{ id: '13.1', description: '' }] },
  { id: '14', description: 'Tunnel',                           items: [{ id: '14.1', description: '' }] },
  { id: '15', description: 'Formwork',                         items: [{ id: '15.1', description: '' }] },
  { id: '16', description: 'Hoarding',                         items: [{ id: '16.1', description: '' }] },
  { id: '17', description: 'Working at Height',                items: [{ id: '17.1', description: '' }] },
  { id: '18', description: 'Abrasive Wheels',                  items: [{ id: '18.1', description: '' }] },
  { id: '19', description: 'Excavations',                      items: [{ id: '19.1', description: '' }] },
  { id: '20', description: 'Slings and other Lifting Gears',   items: [{ id: '20.1', description: '' }] },
  { id: '21', description: 'Compressed Air/Pneumatic Air Tools', items: [{ id: '21.1', description: '' }] },
  { id: '22', description: 'Protection of the Public',         items: [{ id: '22.1', description: '' }] },
  { id: '23', description: 'Prevention of Mosquito Breed',     items: [{ id: '23.1', description: '' }] },
  { id: '24', description: 'Work Over Water',                  items: [{ id: '24.1', description: '' }] },
  { id: '25', description: 'Welfare Facilities',               items: [{ id: '25.1', description: '' }] },
];

interface ChecklistDateEntry {
  agreedDate: string;
  dateCompleted: string;
  rectificationStatus: string;
}

export interface SafetyFormData {
  formNumber: string;
  contractNo: string;
  contractTitle: string;
  date: string;
  time: string;
  recordName: string;
  recordDate: string;
  checklistItems: ChecklistCategory[];
  responses: Record<string, Record<string, string>>;
  checklistDates: Record<string, Record<string, ChecklistDateEntry>>;
  photoRecords: PhotoRecord[];
}

function genFormNo() { return `SAFETY-${Date.now().toString().slice(-6)}`; }

export default function SafetyInspectionFormRN({
  visible, onClose, onSave, initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: SafetyFormData) => void;
  initialData?: Partial<SafetyFormData>;
}) {
  console.log('[SafetyInspectionFormRN] visible:', visible, 'has initialData:', !!initialData);
  const totalPages = 4;
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<SafetyFormData>({
    formNumber:    initialData?.formNumber    || genFormNo(),
    contractNo:    initialData?.contractNo    || '',
    contractTitle: initialData?.contractTitle || '',
    date:          initialData?.date          || '',
    time:          initialData?.time          || '',
    recordName:    initialData?.recordName    || '',
    recordDate:    initialData?.recordDate    || '',
    checklistItems: initialData?.checklistItems || DEFAULT_CATEGORIES,
    responses:      initialData?.responses      || {},
    checklistDates: initialData?.checklistDates  || {},
    photoRecords:   initialData?.photoRecords   || [
      { id: '1', location: '', finding: '', action: '' },
      { id: '2', location: '', finding: '', action: '' },
    ],
  });

  const setF = (k: keyof SafetyFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const setResponse = (catId: string, itemId: string, status: string) => {
    setForm(f => ({
      ...f,
      responses: { ...f.responses, [catId]: { ...(f.responses[catId] || {}), [itemId]: status } },
    }));
  };

  const setChecklistDate = (catId: string, itemId: string, field: keyof ChecklistDateEntry, value: string) => {
    const emptyEntry: ChecklistDateEntry = { agreedDate: '', dateCompleted: '', rectificationStatus: '' };
    setForm(f => ({
      ...f,
      checklistDates: {
        ...f.checklistDates,
        [catId]: {
          ...(f.checklistDates[catId] || {}),
          [itemId]: { ...emptyEntry, ...(f.checklistDates[catId]?.[itemId] || {}), [field]: value },
        },
      },
    }));
  };

  const setItemDesc = (catId: string, itemId: string, desc: string) => {
    setForm(f => ({
      ...f,
      checklistItems: f.checklistItems.map(cat =>
        cat.id !== catId ? cat : {
          ...cat,
          items: cat.items.map(it => it.id === itemId ? { ...it, description: desc } : it),
        }
      ),
    }));
  };

  const addItem = (catId: string) => {
    setForm(f => ({
      ...f,
      checklistItems: f.checklistItems.map(cat => {
        if (cat.id !== catId) return cat;
        const last = cat.items[cat.items.length - 1];
        const newId = `${catId}.${Number(last.id.split('.')[1]) + 1}`;
        return { ...cat, items: [...cat.items, { id: newId, description: '' }] };
      }),
    }));
  };

  const setPhotoField = (idx: number, field: keyof PhotoRecord, value: string) => {
    setForm(f => {
      const next = [...f.photoRecords];
      next[idx] = { ...next[idx], [field]: value };
      return { ...f, photoRecords: next };
    });
  };

  const addPhotoRecord = () => {
    setForm(f => ({
      ...f,
      photoRecords: [...f.photoRecords, { id: String(f.photoRecords.length + 1), location: '', finding: '', action: '' }],
    }));
  };

  const STATUS_OPTIONS: ResponseStatus[] = ['Y', 'N', 'NA'];
  const STATUS_COLORS: Record<string, string> = { 'Y': '#22c55e', 'N': '#ef4444', 'NA': '#64748b' };

  const page2cats = form.checklistItems.slice(0, 12);
  const page3cats = form.checklistItems.slice(12);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={S.sheet}>

          <View style={S.header}>
            <Text style={S.headerTitle}>Safety Inspection Checklist</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={S.actionBar}>
            <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
              <Text style={S.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.saveBtn, { backgroundColor: ACCENT }]} onPress={() => onSave(form)}>
              <Icon name="content-save" size={15} color="#fff" />
              <Text style={S.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={S.tabRow}>
            {['Header', 'Check 1–12', 'Check 13–25', 'Photos'].map((t, i) => (
              <TouchableOpacity key={t} style={[S.tab, page === i + 1 && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]} onPress={() => setPage(i + 1)}>
                <Text style={[S.tabText, page === i + 1 && { color: ACCENT }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={S.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {page === 1 && (
              <View>
                <Row label="Form Number">
                  <TextInput style={S.input} value={form.formNumber} onChangeText={v => setF('formNumber', v)} />
                </Row>
                <Row label="Contract No.">
                  <TextInput style={S.input} value={form.contractNo} onChangeText={v => setF('contractNo', v)} placeholder="e.g. CT-2024-001" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Contract Title">
                  <TextInput style={S.input} value={form.contractTitle} onChangeText={v => setF('contractTitle', v)} placeholder="Contract / project title" placeholderTextColor={colors.textMuted} />
                </Row>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row label="Date">
                      <TextInput style={S.input} value={form.date} onChangeText={v => setF('date', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row label="Time">
                      <TextInput style={S.input} value={form.time} onChangeText={v => setF('time', v)} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row label="Record Name">
                      <TextInput style={S.input} value={form.recordName} onChangeText={v => setF('recordName', v)} placeholder="Name" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row label="Record Date">
                      <TextInput style={S.input} value={form.recordDate} onChangeText={v => setF('recordDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                </View>
              </View>
            )}

            {(page === 2 || page === 3) && (
              <View>
                {(page === 2 ? page2cats : page3cats).map(cat => (
                  <View key={cat.id} style={S.catBlock}>
                    <Text style={S.catTitle}>{cat.id}. {cat.description}</Text>
                    {cat.items.map(item => {
                      const resp = (form.responses[cat.id] || {})[item.id] || '';
                      const dates = (form.checklistDates[cat.id] || {})[item.id] || { agreedDate: '', dateCompleted: '', rectificationStatus: '' };
                      return (
                        <View key={item.id} style={S.itemBlock}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 6 }}>
                            <Text style={S.itemId}>{item.id}</Text>
                            <TextInput
                              style={[S.input, { flex: 1, fontSize: 12 }]}
                              value={item.description}
                              onChangeText={v => setItemDesc(cat.id, item.id, v)}
                              placeholder="Insert item"
                              placeholderTextColor={colors.textMuted}
                            />
                          </View>
                          <View style={S.statusRow}>
                            {STATUS_OPTIONS.map(s => {
                              const active = resp === s;
                              return (
                                <TouchableOpacity
                                  key={s}
                                  style={[S.statusBtn, active && { backgroundColor: STATUS_COLORS[s] + '22', borderColor: STATUS_COLORS[s] }]}
                                  onPress={() => setResponse(cat.id, item.id, active ? '' : s)}
                                >
                                  <Text style={[S.statusBtnText, { color: active ? STATUS_COLORS[s] : colors.textMuted }]}>{s}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          {resp === 'N' && (
                            <View style={S.datesBlock}>
                              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={S.dateLabel}>Agreed date for completion</Text>
                                  <TextInput style={S.dateInput} value={dates.agreedDate} onChangeText={v => setChecklistDate(cat.id, item.id, 'agreedDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={S.dateLabel}>Date completed</Text>
                                  <TextInput style={S.dateInput} value={dates.dateCompleted} onChangeText={v => setChecklistDate(cat.id, item.id, 'dateCompleted', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                                </View>
                              </View>
                              <Text style={S.dateLabel}>Rectification Status</Text>
                              <TextInput style={S.dateInput} value={dates.rectificationStatus} onChangeText={v => setChecklistDate(cat.id, item.id, 'rectificationStatus', v)} placeholder="e.g. In Progress / Completed" placeholderTextColor={colors.textMuted} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                    <TouchableOpacity style={S.addItemBtn} onPress={() => addItem(cat.id)}>
                      <Icon name="plus" size={14} color={ACCENT} />
                      <Text style={S.addItemText}>Add item</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {page === 4 && (
              <View>
                <Text style={S.sectionTitle}>Environmental Photo Records</Text>
                {form.photoRecords.map((rec, idx) => (
                  <View key={rec.id} style={S.photoCard}>
                    <Text style={S.photoCardTitle}>Record {idx + 1}</Text>
                    <Row label="Location">
                      <TextInput style={S.input} value={rec.location} onChangeText={v => setPhotoField(idx, 'location', v)} placeholder="Location" placeholderTextColor={colors.textMuted} />
                    </Row>
                    <Row label="Finding">
                      <TextInput style={[S.input, S.ta]} value={rec.finding} onChangeText={v => setPhotoField(idx, 'finding', v)} placeholder="Finding / observation" placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
                    </Row>
                    <Row label="Action">
                      <TextInput style={[S.input, S.ta]} value={rec.action} onChangeText={v => setPhotoField(idx, 'action', v)} placeholder="Action required" placeholderTextColor={colors.textMuted} multiline numberOfLines={2} />
                    </Row>
                  </View>
                ))}
                <TouchableOpacity style={S.addPhotoBtn} onPress={addPhotoRecord}>
                  <Icon name="plus" size={16} color={ACCENT} />
                  <Text style={S.addPhotoBtnText}>Add Photo Record</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={S.footer}>
            <TouchableOpacity style={S.footerNav} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <Icon name="arrow-left" size={18} color={page === 1 ? '#333' : colors.textMuted} />
              <Text style={{ color: page === 1 ? '#333' : colors.textMuted, fontSize: 13 }}>Back</Text>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '96%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  actionBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: '#1a1a1a', borderRadius: radius.md, borderWidth: 1, borderColor: '#333' },
  cancelBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.md },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  body: { flex: 1, padding: spacing.md },
  sectionTitle: { color: ACCENT, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
  catBlock: { marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: spacing.sm },
  catTitle: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: spacing.sm },
  itemBlock: { backgroundColor: '#0d0d0d', borderRadius: radius.md, borderWidth: 1, borderColor: '#1e1e1e', padding: spacing.sm, marginBottom: spacing.xs },
  itemId: { color: colors.textMuted, fontSize: 11, width: 30 },
  statusRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusBtn: { borderRadius: radius.sm, borderWidth: 1, borderColor: '#333', paddingHorizontal: 8, paddingVertical: 4 },
  statusBtnText: { fontSize: 10, fontWeight: '700' },
  datesBlock: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e1e1e' },
  dateLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 3 },
  dateInput: { backgroundColor: '#0a0a0a', color: colors.text, borderRadius: radius.sm, borderWidth: 1, borderColor: '#222', paddingHorizontal: 6, paddingVertical: 5, fontSize: 11, marginBottom: 4 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addItemText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
  photoCard: { backgroundColor: '#0d0d0d', borderRadius: radius.lg, borderWidth: 1, borderColor: '#1e1e1e', padding: spacing.md, marginBottom: spacing.md },
  photoCardTitle: { color: ACCENT, fontWeight: '800', fontSize: 12, marginBottom: spacing.sm },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#333', padding: spacing.sm },
  addPhotoBtnText: { color: ACCENT, fontWeight: '700', fontSize: 13 },
  input: { backgroundColor: '#111', color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: '#222', paddingHorizontal: spacing.sm, paddingVertical: 7, fontSize: 13 },
  ta: { minHeight: 60, textAlignVertical: 'top', paddingTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  footerNav: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  footerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
