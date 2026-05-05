import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';

const ACCENT = '#06b6d4';

type StatusType = 'S' | 'X' | 'NA' | '';

interface ChecklistItem {
  id: number;
  description: string;
  chinese: string;
  status: StatusType;
  action: string;
  remark: string;
  photo: boolean;
}

interface PhotoSlot {
  id: number;
  label: string;
  uri: string | null;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 1,  description: 'Maintenance of passageways, common accesses & public areas are free of obstruction', chinese: '保持通道，公共通道及公眾地方沒有阻礙', status: '', action: '', remark: '', photo: false },
  { id: 2,  description: 'Proper storage & stacking of materials', chinese: '物料存放規固及適當疊存', status: '', action: '', remark: '', photo: false },
  { id: 3,  description: 'Proper placement & storage of tools & equipment after work', chinese: '工具和設備在每日完工後適當地放置及儲存', status: '', action: '', remark: '', photo: false },
  { id: 4,  description: 'Proper sorting, storage and/or disposal of waste materials in accordance with WMP', chinese: '根據廢物處理計劃書將廢物適當分類，儲存和/或處置', status: '', action: '', remark: '', photo: false },
  { id: 5,  description: 'Proper securing of hoarding, barriers, guarding, lighting and signage of Works', chinese: '適供保護及確固的圍街板，圍欄，防護網和照明及現場指示標誌', status: '', action: '', remark: '', photo: false },
  { id: 6,  description: 'Prevention & removal of water ponds and flooding', chinese: '防止及清除積水及水浸', status: '', action: '', remark: '', photo: false },
  { id: 7,  description: 'Cleaning of stockpiling and wastes arising from the Works', chinese: '清理因工程堆積過多的廢料', status: '', action: '', remark: '', photo: false },
  { id: 8,  description: 'Condition of cleanliness and tidiness of the site including Public Cleaning Area in the perspective of the general public', chinese: '地盤整圓包括會對公眾構成影響的地方之清潔和整潔狀況', status: '', action: '', remark: '', photo: false },
  { id: 9,  description: 'Control of mosquitoes and removal of stagnant water', chinese: '控制蚊蟲孳生及清除積水', status: '', action: '', remark: '', photo: false },
  { id: 10, description: 'Keep Traffic Cone clean and in orderly manner', chinese: '保持警程標筒之整潔', status: '', action: '', remark: '', photo: false },
  { id: 11, description: 'Other Cleaning requirements as instructed by RE', chinese: '駐地盤工程師其他清潔指示', status: '', action: '', remark: '', photo: false },
];

export interface CleaningFormData {
  formNumber: string;
  contractNo: string;
  contractTitle: string;
  location: string;
  inspectionNo: string;
  inspectionDate: string;
  timeWeek: string;
  inspectionTime: string;
  inspectorName: string;
  appointedBy: string;
  techManager: string;
  date: string;
  erSignature: string;
  erDate: string;
  siteAgentSignature: string;
  siteAgentDate: string;
  projectManagerSignature: string;
  projectManagerDate: string;
  checklistItems: ChecklistItem[];
  photos: PhotoSlot[];
}

function genFormNo() { return `CL-${Date.now().toString().slice(-6)}`; }

export default function DailyCleaningInspectionRN({
  visible, onClose, onSave, initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CleaningFormData) => void;
  initialData?: Partial<CleaningFormData>;
}) {
  console.log('[DailyCleaningInspectionRN] visible:', visible, 'has initialData:', !!initialData);
  const [page, setPage] = useState<1 | 2>(1);

  const [form, setForm] = useState<CleaningFormData>({
    formNumber:           initialData?.formNumber           || genFormNo(),
    contractNo:           initialData?.contractNo           || '',
    contractTitle:        initialData?.contractTitle        || '',
    location:             initialData?.location             || '',
    inspectionNo:         initialData?.inspectionNo         || '',
    inspectionDate:       initialData?.inspectionDate       || '',
    timeWeek:             initialData?.timeWeek             || '',
    inspectionTime:       initialData?.inspectionTime       || '',
    inspectorName:        initialData?.inspectorName        || '',
    appointedBy:          initialData?.appointedBy          || '',
    techManager:          initialData?.techManager          || '',
    date:                 initialData?.date                 || '',
    erSignature:          initialData?.erSignature          || '',
    erDate:               initialData?.erDate               || '',
    siteAgentSignature:   initialData?.siteAgentSignature   || '',
    siteAgentDate:        initialData?.siteAgentDate        || '',
    projectManagerSignature: initialData?.projectManagerSignature || '',
    projectManagerDate:   initialData?.projectManagerDate   || '',
    checklistItems:       initialData?.checklistItems       || DEFAULT_CHECKLIST,
    photos:               initialData?.photos               || [
      { id: 1, label: 'Photo 1', uri: null },
      { id: 2, label: 'Photo 2', uri: null },
      { id: 3, label: 'Photo 3', uri: null },
    ],
  });

  const setF = (k: keyof CleaningFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const setItemField = (id: number, field: keyof ChecklistItem, value: any) => {
    setForm(f => ({
      ...f,
      checklistItems: f.checklistItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const STATUS_OPTS: StatusType[] = ['S', 'X', 'NA'];
  const STATUS_COLORS: Record<string, string> = { S: '#22c55e', X: '#ef4444', NA: '#64748b' };
  const STATUS_LABELS: Record<string, string> = { S: 'S ✓', X: 'X ✗', NA: 'NA' };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={S.sheet}>

          <View style={S.header}>
            <Text style={S.headerTitle}>Daily Cleaning Inspection</Text>
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
            {['Checklist', 'Inspector Info'].map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[S.tab, page === i + 1 && { borderBottomColor: ACCENT, borderBottomWidth: 2 }]}
                onPress={() => setPage((i + 1) as 1 | 2)}
              >
                <Text style={[S.tabText, page === i + 1 && { color: ACCENT }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={S.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {page === 1 && (
              <View>
                <Text style={S.docTitle}>Daily Cleaning Inspection Checklist</Text>

                <View style={S.headerGrid}>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Form No.:</Text>
                    <TextInput style={S.input} value={form.formNumber} onChangeText={v => setF('formNumber', v)} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Inspection No.檢查編號:</Text>
                    <TextInput style={S.input} value={form.inspectionNo} onChangeText={v => setF('inspectionNo', v)} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Contract No:</Text>
                    <TextInput style={S.input} value={form.contractNo} onChangeText={v => setF('contractNo', v)} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Inspection Date檢查日期:</Text>
                    <TextInput style={S.input} value={form.inspectionDate} onChangeText={v => setF('inspectionDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Contract Title:</Text>
                    <TextInput style={S.input} value={form.contractTitle} onChangeText={v => setF('contractTitle', v)} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Time時間:</Text>
                    <TextInput style={S.input} value={form.timeWeek} onChangeText={v => setF('timeWeek', v)} placeholder="Week/Time" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Location:</Text>
                    <TextInput style={S.input} value={form.location} onChangeText={v => setF('location', v)} />
                  </View>
                  <View style={S.gridCell}>
                    <Text style={S.gridLabel}>Inspection Time 檢查時間:</Text>
                    <TextInput style={S.input} value={form.inspectionTime} onChangeText={v => setF('inspectionTime', v)} placeholder="HH:MM" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>

                <View style={S.legendBox}>
                  <Text style={S.legendText}>Status 檢查結果代號:  </Text>
                  <Text style={[S.legendBadge, { color: STATUS_COLORS['S'] }]}>S = Satisfactory (可接受)  </Text>
                  <Text style={[S.legendBadge, { color: STATUS_COLORS['X'] }]}>X = Need Improvement (需要改善)  </Text>
                  <Text style={[S.legendBadge, { color: STATUS_COLORS['NA'] }]}>NA = Not Applicable (不適用)</Text>
                </View>

                {form.checklistItems.map(item => (
                  <View key={item.id} style={S.itemCard}>
                    <Text style={S.itemDesc}>{item.id}. {item.description}</Text>
                    <Text style={S.itemChinese}>{item.chinese}</Text>
                    <View style={S.statusRow}>
                      {STATUS_OPTS.map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[S.statusBtn, item.status === s && { backgroundColor: STATUS_COLORS[s] + '22', borderColor: STATUS_COLORS[s] }]}
                          onPress={() => setItemField(item.id, 'status', item.status === s ? '' : s)}
                        >
                          <Text style={[S.statusBtnText, { color: item.status === s ? STATUS_COLORS[s] : colors.textMuted }]}>{STATUS_LABELS[s]}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[S.photoBtn, item.photo && { backgroundColor: '#06b6d422', borderColor: ACCENT }]}
                        onPress={() => setItemField(item.id, 'photo', !item.photo)}
                      >
                        <Icon name="camera" size={14} color={item.photo ? ACCENT : colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    {item.status === 'X' && (
                      <View style={{ marginTop: 6 }}>
                        <TextInput
                          style={[S.input, { fontSize: 12 }]}
                          value={item.action}
                          onChangeText={v => setItemField(item.id, 'action', v)}
                          placeholder="Action required..."
                          placeholderTextColor={colors.textMuted}
                        />
                        <TextInput
                          style={[S.input, { fontSize: 12, marginTop: 4 }]}
                          value={item.remark}
                          onChangeText={v => setItemField(item.id, 'remark', v)}
                          placeholder="Remark / 備註..."
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {page === 2 && (
              <View>

                {/* Photos Section */}
                <Text style={S.sectionHead}>Photos 照片</Text>
                <View style={S.photoRow}>
                  {form.photos.map(p => (
                    <View key={p.id} style={S.photoBox}>
                      {p.uri ? (
                        <Image source={{ uri: p.uri }} style={S.photoImage} resizeMode="cover" />
                      ) : (
                        <View style={S.photoPlaceholder}>
                          <Icon name="camera-outline" size={28} color="#333" />
                          <Text style={S.photoPlaceholderText}>{p.label}</Text>
                        </View>
                      )}
                      <TextInput
                        style={[S.input, { marginTop: 4, fontSize: 11 }]}
                        value={p.label}
                        onChangeText={v => setF('photos', form.photos.map(ph => ph.id === p.id ? { ...ph, label: v } : ph))}
                        placeholder="Caption..."
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  ))}
                </View>

                <View style={S.divider} />

                {/* Inspector Info */}
                <Text style={S.sectionHead}>Inspector Information</Text>
                <Row label="Name of Inspector 檢查人員姓名">
                  <TextInput style={S.input} value={form.inspectorName} onChangeText={v => setF('inspectorName', v)} placeholder="Inspector name" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Appointed by (Technical Manager)">
                  <TextInput style={S.input} value={form.appointedBy} onChangeText={v => setF('appointedBy', v)} placeholder="Appointed by" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Technical Manager">
                  <TextInput style={S.input} value={form.techManager} onChangeText={v => setF('techManager', v)} placeholder="Tech manager name" placeholderTextColor={colors.textMuted} />
                </Row>
                <Row label="Date 日期">
                  <TextInput style={S.input} value={form.date} onChangeText={v => setF('date', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                </Row>

                <View style={S.divider} />

                {/* Signatures */}
                <Text style={S.sectionHead}>Signatures</Text>

                <Text style={S.sigSectionLabel}>ER 工程師代表</Text>
                <Text style={S.sigNote}>Joint site inspection before the noon of the day following the cleaning day</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row label="Signature / Name">
                      <TextInput style={S.input} value={form.erSignature} onChangeText={v => setF('erSignature', v)} placeholder="Name / ref" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row label="Date">
                      <TextInput style={S.input} value={form.erDate} onChangeText={v => setF('erDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                </View>

                <Text style={S.sigSectionLabel}>Site Agent 地盤代表</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row label="Signature / Name">
                      <TextInput style={S.input} value={form.siteAgentSignature} onChangeText={v => setF('siteAgentSignature', v)} placeholder="Name / ref" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row label="Date">
                      <TextInput style={S.input} value={form.siteAgentDate} onChangeText={v => setF('siteAgentDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                </View>

                <Text style={S.sigSectionLabel}>Project Manager</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Row label="Signature / Name">
                      <TextInput style={S.input} value={form.projectManagerSignature} onChangeText={v => setF('projectManagerSignature', v)} placeholder="Name / ref" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row label="Date">
                      <TextInput style={S.input} value={form.projectManagerDate} onChangeText={v => setF('projectManagerDate', v)} placeholder="dd/mm/yyyy" placeholderTextColor={colors.textMuted} />
                    </Row>
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 50 }} />
          </ScrollView>

          <View style={S.footer}>
            <TouchableOpacity style={S.footerNav} onPress={() => setPage(p => Math.max(1, p - 1) as 1 | 2)} disabled={page === 1}>
              <Icon name="arrow-left" size={18} color={page === 1 ? '#333' : colors.textMuted} />
              <Text style={{ color: page === 1 ? '#333' : colors.textMuted, fontSize: 13 }}>Back</Text>
            </TouchableOpacity>
            {page < 2 ? (
              <TouchableOpacity style={[S.footerBtn, { backgroundColor: ACCENT }]} onPress={() => setPage(2)}>
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
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  body: { flex: 1, padding: spacing.md },
  docTitle: { textAlign: 'center', color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  headerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  gridCell: { width: '48%' },
  gridLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 3 },
  legendBox: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#0d0d0d', borderRadius: radius.md, borderWidth: 1, borderColor: '#1e1e1e', padding: spacing.sm, marginBottom: spacing.md },
  legendText: { color: colors.textMuted, fontSize: 10 },
  legendBadge: { fontSize: 10, fontWeight: '700' },
  itemCard: { backgroundColor: '#0d0d0d', borderRadius: radius.md, borderWidth: 1, borderColor: '#1e1e1e', padding: spacing.sm, marginBottom: 8 },
  itemDesc: { color: colors.text, fontSize: 12, lineHeight: 17, marginBottom: 2 },
  itemChinese: { color: colors.textMuted, fontSize: 10, marginBottom: 8, fontStyle: 'italic' },
  statusRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  statusBtn: { borderRadius: radius.sm, borderWidth: 1, borderColor: '#333', paddingHorizontal: 10, paddingVertical: 5 },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
  photoBtn: { borderRadius: radius.sm, borderWidth: 1, borderColor: '#333', padding: 6 },
  sectionHead: { color: ACCENT, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: spacing.md },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  photoBox: { flex: 1 },
  photoImage: { width: '100%', height: 90, borderRadius: radius.md },
  photoPlaceholder: { width: '100%', height: 90, backgroundColor: '#111', borderRadius: radius.md, borderWidth: 1, borderColor: '#222', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoPlaceholderText: { color: '#444', fontSize: 10, fontWeight: '600' },
  sigSectionLabel: { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 2, marginTop: spacing.sm },
  sigNote: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginBottom: spacing.sm, lineHeight: 15 },
  input: { backgroundColor: '#111', color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: '#222', paddingHorizontal: spacing.sm, paddingVertical: 7, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  footerNav: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  footerBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
