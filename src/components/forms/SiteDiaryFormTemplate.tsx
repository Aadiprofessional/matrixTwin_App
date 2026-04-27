import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import type { SiteDiaryFormData, StaffRow, LabourRow, EquipmentRow, AssistanceRow } from '../../api/diary';

export type FormSaveHandler = (data: SiteDiaryFormData) => void;

const SCREEN_WIDTH = Dimensions.get('window').width;

function generateDiaryFormNumber() {
  return `DY-${dayjs().format('YYYYMMDD-HHmmss')}`;
}

function createDefaultFormData(): SiteDiaryFormData {
  return {
    formNumber: generateDiaryFormNumber(),
    date: dayjs().format('yyyy-MM-dd'),
    contractNo: '',
    day: dayjs().format('dddd'),
    contractDate: '',
    toBeInsert: '(To be insert)',
    clientDepartment: '',
    contractor: '',
    weatherAM: '',
    weatherPM: '',
    rainfall: '',
    signal: '',
    instructions: '',
    comments: '',
    utilities: '',
    visitor: '',
    remarks: '',
    weather: 'Sunny',
    temperature: '',
    work_completed: '',
    incidents_reported: '',
    materials_delivered: '',
    notes: '',
    staffData: [{ staffTitle: '', staffCount: '' }],
    staffData2: [{ staffTitle: '', staffCount: '' }],
    labourData: [{ labourType: '', labourCode: '', labourCount: '' }],
    equipmentData: [{ equipmentType: '', totalOnSite: '', working: '', idling: '' }],
    assistanceData: [{ description: '', workNo: '' }],
    signatures: {
      projectManagerName: '',
      projectManagerDate: '',
      contractorRepName: '',
      contractorRepDate: '',
      supervisorName: '',
      supervisorDate: '',
    },
  };
}

export default function SiteDiaryFormTemplate({
  onClose,
  onSave,
  initialData,
  readOnly,
}: {
  onClose: () => void;
  onSave: FormSaveHandler;
  initialData?: Partial<SiteDiaryFormData>;
  readOnly?: boolean;
}) {
  const [page, setPage] = useState<1 | 2>(1);
  const [form, setForm] = useState<SiteDiaryFormData>(initialData ? ({ ...createDefaultFormData(), ...initialData } as SiteDiaryFormData) : createDefaultFormData());

  const updateField = (k: keyof SiteDiaryFormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const updateSign = (k: keyof SiteDiaryFormData['signatures'], v: string) => setForm(prev => ({ ...prev, signatures: { ...prev.signatures, [k]: v } }));

  const addRow = (key: 'staffData' | 'staffData2' | 'labourData' | 'equipmentData' | 'assistanceData') => {
    if (key === 'staffData' || key === 'staffData2') setForm(prev => ({ ...prev, [key]: [...prev[key], { staffTitle: '', staffCount: '' }] } as any));
    else if (key === 'labourData') setForm(prev => ({ ...prev, labourData: [...prev.labourData, { labourType: '', labourCode: '', labourCount: '' }] }));
    else if (key === 'equipmentData') setForm(prev => ({ ...prev, equipmentData: [...prev.equipmentData, { equipmentType: '', totalOnSite: '', working: '', idling: '' }] }));
    else setForm(prev => ({ ...prev, assistanceData: [...prev.assistanceData, { description: '', workNo: '' }] }));
  };

  const removeLastRow = (key: 'staffData' | 'staffData2' | 'labourData' | 'equipmentData' | 'assistanceData') => {
    setForm(prev => {
      const list = prev[key] as any[];
      if (list.length <= 1) return prev;
      return { ...prev, [key]: list.slice(0, -1) } as any;
    });
  };

  const updateStaff = (key: 'staffData' | 'staffData2', idx: number, field: keyof StaffRow, value: string) => {
    setForm(prev => { const rows = [...prev[key]]; rows[idx] = { ...rows[idx], [field]: value }; return { ...prev, [key]: rows } as any; });
  };
  const updateLabour = (idx: number, field: keyof LabourRow, value: string) => setForm(prev => { const rows = [...prev.labourData]; rows[idx] = { ...rows[idx], [field]: value }; return { ...prev, labourData: rows }; });
  const updateEquip = (idx: number, field: keyof EquipmentRow, value: string) => setForm(prev => { const rows = [...prev.equipmentData]; rows[idx] = { ...rows[idx], [field]: value }; return { ...prev, equipmentData: rows }; });
  const updateAssist = (idx: number, field: keyof AssistanceRow, value: string) => setForm(prev => { const rows = [...prev.assistanceData]; rows[idx] = { ...rows[idx], [field]: value }; return { ...prev, assistanceData: rows }; });

  const handleSave = () => {
    if (!form.work_completed?.trim()) { Alert.alert('Validation', 'Work Completed is required.'); return; }
    onSave(form);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={S.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.title}>SITE DIARY</Text>
            <Text style={S.subtitle}>Daily Project Activity Log</Text>
          </View>
          <View style={S.pageTabs}>
            <TouchableOpacity onPress={() => setPage(1)} style={[S.pageBtn, page === 1 && S.pageBtnActive]}>
              <Text style={[S.pageBtnText, page === 1 && S.pageBtnTextActive]}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPage(2)} style={[S.pageBtn, page === 2 && S.pageBtnActive]}>
              <Text style={[S.pageBtnText, page === 2 && S.pageBtnTextActive]}>2</Text>
            </TouchableOpacity>
          </View>
        </View>

        {page === 1 ? (
          <View>
            {/* Basic Information Section */}
            <View style={S.section}>
              <Text style={S.sectionHeader}>BASIC INFORMATION</Text>
              
              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Form Number</Text>
                  <TextInput style={[S.input, { backgroundColor: colors.border + '30' }]} value={form.formNumber} editable={false} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Contract No.</Text>
                  <TextInput style={S.input} placeholder="e.g., CON-001" value={form.contractNo} onChangeText={v => updateField('contractNo', v)} editable={!readOnly} />
                </View>
              </View>

              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Date</Text>
                  <TextInput style={S.input} placeholder="dd/mm/yyyy" value={form.date} onChangeText={v => updateField('date', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Day</Text>
                  <TextInput style={[S.input, { backgroundColor: colors.border + '30' }]} value={form.day} editable={false} />
                </View>
              </View>

              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Contract Date</Text>
                  <TextInput style={S.input} placeholder="dd/mm/yyyy" value={form.contractDate} onChangeText={v => updateField('contractDate', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>(To be insert)</Text>
                  <TextInput style={[S.input, { backgroundColor: colors.border + '30' }]} value={form.toBeInsert} editable={false} />
                </View>
              </View>

              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Client Department</Text>
                  <TextInput style={S.input} value={form.clientDepartment} onChangeText={v => updateField('clientDepartment', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Contractor</Text>
                  <TextInput style={S.input} value={form.contractor} onChangeText={v => updateField('contractor', v)} editable={!readOnly} />
                </View>
              </View>
            </View>

            {/* Weather & Conditions Section */}
            <View style={S.section}>
              <Text style={S.sectionHeader}>WEATHER & CONDITIONS</Text>
              
              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Weather (A.M.)</Text>
                  <TextInput style={S.input} value={form.weatherAM} onChangeText={v => updateField('weatherAM', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Weather (P.M.)</Text>
                  <TextInput style={S.input} value={form.weatherPM} onChangeText={v => updateField('weatherPM', v)} editable={!readOnly} />
                </View>
              </View>

              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Rainfall (mm)</Text>
                  <TextInput style={S.input} value={form.rainfall} onChangeText={v => updateField('rainfall', v)} editable={!readOnly} keyboardType="numeric" />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Signal</Text>
                  <TextInput style={S.input} value={form.signal} onChangeText={v => updateField('signal', v)} editable={!readOnly} />
                </View>
              </View>

              {/* Legend */}
              <View style={S.legend}>
                <View style={S.legendItem}><Text style={S.legendLabel}>B:</Text><Text style={S.legendText}>Breakdown</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>S:</Text><Text style={S.legendText}>Bad Weather</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>A:</Text><Text style={S.legendText}>Surplus</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>T:</Text><Text style={S.legendText}>Task Completed</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>W:</Text><Text style={S.legendText}>Working Instruction</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>N:</Text><Text style={S.legendText}>No Operator</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>P:</Text><Text style={S.legendText}>Assembly/Disassemble</Text></View>
                <View style={S.legendItem}><Text style={S.legendLabel}>X:</Text><Text style={S.legendText}>Not Required</Text></View>
              </View>
            </View>

            {/* Notes & Comments Section */}
            <View style={S.section}>
              <Text style={S.sectionHeader}>NOTES & COMMENTS</Text>
              
              <Text style={S.label}>Instructions</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Enter instructions..." multiline numberOfLines={4} value={form.instructions} onChangeText={v => updateField('instructions', v)} editable={!readOnly} />
              
              <Text style={S.label}>Comments</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Enter comments..." multiline numberOfLines={4} value={form.comments} onChangeText={v => updateField('comments', v)} editable={!readOnly} />
              
              <Text style={S.label}>Utilities</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Enter utilities..." multiline numberOfLines={3} value={form.utilities} onChangeText={v => updateField('utilities', v)} editable={!readOnly} />
              
              <Text style={S.label}>Visitor</Text>
              <TextInput style={S.input} placeholder="Enter visitor information..." value={form.visitor} onChangeText={v => updateField('visitor', v)} editable={!readOnly} />
              
              <Text style={S.label}>Remarks</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Enter remarks..." multiline numberOfLines={3} value={form.remarks} onChangeText={v => updateField('remarks', v)} editable={!readOnly} />
            </View>

            {/* Staff Section 1 */}
            <TableSection title="CONTRACTOR'S SITE STAFF">
              <View style={S.tableHeader}>
                <Text style={[S.tableHeaderCell, { flex: 2 }]}>Staff</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>No.</Text>
              </View>
              {form.staffData.map((row, idx) => (
                <View key={`staff1-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.tableCell, { flex: 2 }]} placeholder="Position" value={row.staffTitle} onChangeText={v => updateStaff('staffData', idx, 'staffTitle', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={row.staffCount} onChangeText={v => updateStaff('staffData', idx, 'staffCount', v)} editable={!readOnly} />
                </View>
              ))}
              <AddRemoveButtons onAdd={() => addRow('staffData')} onRemove={() => removeLastRow('staffData')} canRemove={form.staffData.length > 1} />
            </TableSection>

            {/* Staff Section 2 */}
            <TableSection title="CONTRACTOR'S SITE STAFF (Continued)">
              <View style={S.tableHeader}>
                <Text style={[S.tableHeaderCell, { flex: 2 }]}>Staff</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>No.</Text>
              </View>
              {form.staffData2.map((row, idx) => (
                <View key={`staff2-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.tableCell, { flex: 2 }]} placeholder="Position" value={row.staffTitle} onChangeText={v => updateStaff('staffData2', idx, 'staffTitle', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={row.staffCount} onChangeText={v => updateStaff('staffData2', idx, 'staffCount', v)} editable={!readOnly} />
                </View>
              ))}
              <AddRemoveButtons onAdd={() => addRow('staffData2')} onRemove={() => removeLastRow('staffData2')} canRemove={form.staffData2.length > 1} />
            </TableSection>

            {/* Labour Section */}
            <TableSection title="LABOUR">
              <View style={S.tableHeader}>
                <Text style={[S.tableHeaderCell, { flex: 2 }]}>Type</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>Code</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>No.</Text>
              </View>
              {form.labourData.map((row, idx) => (
                <View key={`labour-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.tableCell, { flex: 2 }]} placeholder="Labour type" value={row.labourType} onChangeText={v => updateLabour(idx, 'labourType', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="Code" value={row.labourCode} onChangeText={v => updateLabour(idx, 'labourCode', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={row.labourCount} onChangeText={v => updateLabour(idx, 'labourCount', v)} editable={!readOnly} />
                </View>
              ))}
              <AddRemoveButtons onAdd={() => addRow('labourData')} onRemove={() => removeLastRow('labourData')} canRemove={form.labourData.length > 1} />
            </TableSection>

            {/* Equipment Section */}
            <TableSection title="EQUIPMENT">
              <View style={S.tableHeader}>
                <Text style={[S.tableHeaderCell, { flex: 2 }]}>Type</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>Total</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>Work</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>Idle</Text>
              </View>
              {form.equipmentData.map((row, idx) => (
                <View key={`equip-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.tableCell, { flex: 2 }]} placeholder="Equipment type" value={row.equipmentType} onChangeText={v => updateEquip(idx, 'equipmentType', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={row.totalOnSite} onChangeText={v => updateEquip(idx, 'totalOnSite', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={row.working} onChangeText={v => updateEquip(idx, 'working', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="0" keyboardType="numeric" value={row.idling} onChangeText={v => updateEquip(idx, 'idling', v)} editable={!readOnly} />
                </View>
              ))}
              <AddRemoveButtons onAdd={() => addRow('equipmentData')} onRemove={() => removeLastRow('equipmentData')} canRemove={form.equipmentData.length > 1} />
            </TableSection>
          </View>
        ) : (
          <View>
            {/* Page 2 - Main Summary Section */}
            <View style={S.section}>
              <Text style={S.sectionHeader}>WORK SUMMARY</Text>
              
              <Text style={S.label}>Weather Conditions</Text>
              <TextInput style={S.input} placeholder="e.g., Sunny" value={form.weather} onChangeText={v => updateField('weather', v)} editable={!readOnly} />
              
              <Text style={S.label}>Temperature</Text>
              <TextInput style={S.input} placeholder="e.g., 25°C" value={form.temperature} onChangeText={v => updateField('temperature', v)} editable={!readOnly} />
              
              <Text style={S.label}>Work Completed *</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Describe work completed..." multiline numberOfLines={5} value={form.work_completed} onChangeText={v => updateField('work_completed', v)} editable={!readOnly} />
              
              <Text style={S.label}>Incidents Reported</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Describe any incidents..." multiline numberOfLines={4} value={form.incidents_reported} onChangeText={v => updateField('incidents_reported', v)} editable={!readOnly} />
              
              <Text style={S.label}>Materials Delivered</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="List materials delivered..." multiline numberOfLines={4} value={form.materials_delivered} onChangeText={v => updateField('materials_delivered', v)} editable={!readOnly} />
              
              <Text style={S.label}>Additional Notes</Text>
              <TextInput style={[S.input, S.textarea]} placeholder="Any additional notes..." multiline numberOfLines={4} value={form.notes} onChangeText={v => updateField('notes', v)} editable={!readOnly} />
            </View>

            {/* Assistance Section */}
            <TableSection title="ASSISTANCE / SUPPORT">
              <View style={S.tableHeader}>
                <Text style={[S.tableHeaderCell, { flex: 2 }]}>Description</Text>
                <Text style={[S.tableHeaderCell, { flex: 1 }]}>Work No</Text>
              </View>
              {form.assistanceData.map((row, idx) => (
                <View key={`assist-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.tableCell, { flex: 2 }]} placeholder="Description" value={row.description} onChangeText={v => updateAssist(idx, 'description', v)} editable={!readOnly} />
                  <TextInput style={[S.tableCell, { flex: 1 }]} placeholder="Work No" value={row.workNo} onChangeText={v => updateAssist(idx, 'workNo', v)} editable={!readOnly} />
                </View>
              ))}
              <AddRemoveButtons onAdd={() => addRow('assistanceData')} onRemove={() => removeLastRow('assistanceData')} canRemove={form.assistanceData.length > 1} />
            </TableSection>

            {/* Signatures Section */}
            <View style={S.section}>
              <Text style={S.sectionHeader}>SIGNATURES</Text>
              
              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Project Manager Name</Text>
                  <TextInput style={S.input} value={form.signatures.projectManagerName} onChangeText={v => updateSign('projectManagerName', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Date</Text>
                  <TextInput style={S.input} placeholder="dd/mm/yyyy" value={form.signatures.projectManagerDate} onChangeText={v => updateSign('projectManagerDate', v)} editable={!readOnly} />
                </View>
              </View>

              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Contractor Rep Name</Text>
                  <TextInput style={S.input} value={form.signatures.contractorRepName} onChangeText={v => updateSign('contractorRepName', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Date</Text>
                  <TextInput style={S.input} placeholder="dd/mm/yyyy" value={form.signatures.contractorRepDate} onChangeText={v => updateSign('contractorRepDate', v)} editable={!readOnly} />
                </View>
              </View>

              <View style={S.gridRow}>
                <View style={S.gridCol}>
                  <Text style={S.label}>Supervisor Name</Text>
                  <TextInput style={S.input} value={form.signatures.supervisorName} onChangeText={v => updateSign('supervisorName', v)} editable={!readOnly} />
                </View>
                <View style={S.gridCol}>
                  <Text style={S.label}>Date</Text>
                  <TextInput style={S.input} placeholder="dd/mm/yyyy" value={form.signatures.supervisorDate} onChangeText={v => updateSign('supervisorDate', v)} editable={!readOnly} />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={S.footer}>
          <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
            <Icon name="close" size={18} color={colors.textSecondary} />
            <Text style={S.cancelText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
            <Icon name="content-save-outline" size={18} color="#fff" />
            <Text style={S.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.section}>
      <Text style={S.sectionHeader}>{title}</Text>
      <View style={S.tableContainer}>
        {children}
      </View>
    </View>
  );
}

function AddRemoveButtons({ onAdd, onRemove, canRemove }: { onAdd: () => void; onRemove: () => void; canRemove: boolean }) {
  return (
    <View style={S.rowActions}>
      <TouchableOpacity onPress={onAdd} style={S.addRowBtn}>
        <Icon name="plus" size={14} color="#0ea5e9" />
        <Text style={S.addRowText}>Add Row</Text>
      </TouchableOpacity>
      {canRemove && (
        <TouchableOpacity onPress={onRemove} style={S.removeRowBtn}>
          <Icon name="minus" size={14} color={colors.error} />
          <Text style={S.removeRowText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  pageTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pageBtnActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#0ea5e9',
  },
  pageBtnText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  pageBtnTextActive: {
    color: '#fff',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  gridCol: {
    flex: 1,
  },
  legend: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  legendLabel: {
    fontWeight: '700',
    color: colors.text,
    width: 20,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  tableCell: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    fontSize: 13,
    minHeight: 44,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addRowText: {
    color: '#0ea5e9',
    fontWeight: '700',
    fontSize: 12,
  },
  removeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  removeRowText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: '#0ea5e9',
    paddingVertical: spacing.md,
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
