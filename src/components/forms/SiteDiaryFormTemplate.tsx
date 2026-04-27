import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import dayjs from 'dayjs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SiteDiaryFormData, StaffRow, LabourRow, EquipmentRow, AssistanceRow } from '../../api/diary';

export type FormSaveHandler = (data: SiteDiaryFormData) => void;

function generateDiaryFormNumber() {
  return `DY-${dayjs().format('YYYYMMDD-HHmmss')}`;
}

function createDefaultFormData(): SiteDiaryFormData {
  return {
    formNumber: generateDiaryFormNumber(),
    date: dayjs().format('DD/MM/YYYY'),
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
    // If not readOnly, user must provide some basic info
    if (!readOnly && !form.work_completed?.trim() && page === 2) {
      Alert.alert('Validation', 'Please switch to Page 2 and ensure Work Completed is filled.');
      return;
    }
    onSave(form);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={S.container} showsVerticalScrollIndicator={false} contentContainerStyle={S.contentContainer}>
        {/* Top bar controls */}
        <View style={S.topControls}>
          <TouchableOpacity style={S.cancelBtnTop} onPress={onClose}>
            <Text style={S.cancelTextTop}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.downloadBtn} onPress={() => Alert.alert('Info', 'PDF download not supported on mobile yet.')}>
            <Text style={S.downloadText}>Download PDF</Text>
          </TouchableOpacity>
          <View style={S.pageTabs}>
            <TouchableOpacity onPress={() => setPage(1)} style={[S.pageBtn, page === 1 && S.pageBtnActive]}>
              <Text style={[S.pageBtnText, page === 1 && S.pageBtnTextActive]}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPage(2)} style={[S.pageBtn, page === 2 && S.pageBtnActive]}>
              <Text style={[S.pageBtnText, page === 2 && S.pageBtnTextActive]}>2</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={S.saveBtnTop} onPress={handleSave}>
            <Text style={S.saveTextTop}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Paper Form Surface */}
        <View style={S.paperForm}>
          {page === 1 ? (
            <View>
              {/* Paper Header Grid */}
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Form Number:</Text>
                  <Text style={S.paperValue}>{form.formNumber}</Text>
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Contract No.:</Text>
                  <TextInput style={S.paperInput} value={form.contractNo} onChangeText={v => updateField('contractNo', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Date:</Text>
                  <TextInput style={S.paperInput} placeholder="dd/mm/yyyy" value={form.date} onChangeText={v => updateField('date', v)} editable={!readOnly} />
                </View>
              </View>
              
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 1 }]} />
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Day:</Text>
                  <Text style={S.paperValue}>{form.day}</Text>
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Contract Date:</Text>
                  <TextInput style={S.paperInput} placeholder="dd/mm/yyyy" value={form.contractDate} onChangeText={v => updateField('contractDate', v)} editable={!readOnly} />
                  <Text style={S.paperLabel}>(To be insert)</Text>
                </View>
              </View>

              <Text style={S.paperTitleCenter}>SITE DIARY</Text>

              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Client Department:</Text>
                  <TextInput style={S.paperInput} value={form.clientDepartment} onChangeText={v => updateField('clientDepartment', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Contractor:</Text>
                  <TextInput style={S.paperInput} value={form.contractor} onChangeText={v => updateField('contractor', v)} editable={!readOnly} />
                </View>
              </View>

              {/* Weather Row */}
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Weather (A.M.):</Text>
                  <TextInput style={S.paperInput} value={form.weatherAM} onChangeText={v => updateField('weatherAM', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Weather (P.M.):</Text>
                  <TextInput style={S.paperInput} value={form.weatherPM} onChangeText={v => updateField('weatherPM', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Rainfall (mm):</Text>
                  <TextInput style={S.paperInput} value={form.rainfall} onChangeText={v => updateField('rainfall', v)} editable={!readOnly} keyboardType="numeric" />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Signal:</Text>
                  <TextInput style={S.paperInput} value={form.signal} onChangeText={v => updateField('signal', v)} editable={!readOnly} />
                </View>
              </View>

              <View style={S.legendRow}>
                <Text style={S.legendText}>B: Breakdown  S: Bad Weather  A: Surplus  T: Task Completed  W: Working Instruction  N: No Operator  P: Assembly/Disassemble  X: Not Required</Text>
              </View>

              {/* Text Areas */}
              <View style={S.cell}>
                <Text style={S.paperLabel}>Instructions</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={3} value={form.instructions} onChangeText={v => updateField('instructions', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Comments</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={3} value={form.comments} onChangeText={v => updateField('comments', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Utilities</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={2} value={form.utilities} onChangeText={v => updateField('utilities', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Visitor</Text>
                <TextInput style={S.paperInput} value={form.visitor} onChangeText={v => updateField('visitor', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Remarks</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={2} value={form.remarks} onChangeText={v => updateField('remarks', v)} editable={!readOnly} />
              </View>

              {/* Staff Section */}
              <Text style={S.sectionHeading}>Contractor's Site Staff</Text>
              <View style={S.tableHeader}>
                <Text style={[S.th, { flex: 2 }]}>Staff</Text>
                <Text style={[S.th, { flex: 1, borderLeftWidth: 1, borderColor: '#ccc' }]}>No.</Text>
              </View>
              {form.staffData.map((row, idx) => (
                <View key={`staff1-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.td, { flex: 2 }]} value={row.staffTitle} onChangeText={v => updateStaff('staffData', idx, 'staffTitle', v)} editable={!readOnly} />
                  <TextInput style={[S.td, { flex: 1, borderLeftWidth: 1, borderColor: '#ccc' }]} value={row.staffCount} keyboardType="numeric" onChangeText={v => updateStaff('staffData', idx, 'staffCount', v)} editable={!readOnly} />
                </View>
              ))}
              {!readOnly && (
                <TouchableOpacity style={S.addRowBtn} onPress={() => addRow('staffData')}>
                  <Text style={S.addRowText}>+ Add Row</Text>
                </TouchableOpacity>
              )}

              <Text style={S.sectionHeading}>Contractor's Site Staff</Text>
              <View style={S.tableHeader}>
                <Text style={[S.th, { flex: 2 }]}>Staff</Text>
                <Text style={[S.th, { flex: 1, borderLeftWidth: 1, borderColor: '#ccc' }]}>No.</Text>
              </View>
              {form.staffData2.map((row, idx) => (
                <View key={`staff2-${idx}`} style={S.tableRow}>
                  <TextInput style={[S.td, { flex: 2 }]} value={row.staffTitle} onChangeText={v => updateStaff('staffData2', idx, 'staffTitle', v)} editable={!readOnly} />
                  <TextInput style={[S.td, { flex: 1, borderLeftWidth: 1, borderColor: '#ccc' }]} value={row.staffCount} keyboardType="numeric" onChangeText={v => updateStaff('staffData2', idx, 'staffCount', v)} editable={!readOnly} />
                </View>
              ))}
              {!readOnly && (
                <TouchableOpacity style={S.addRowBtn} onPress={() => addRow('staffData2')}>
                  <Text style={S.addRowText}>+ Add Row</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {/* Page 2 Layout */}
              <View style={S.cell}>
                <Text style={S.paperLabel}>Work Completed (Required)*</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={5} value={form.work_completed} onChangeText={v => updateField('work_completed', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Incidents Reported</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={3} value={form.incidents_reported} onChangeText={v => updateField('incidents_reported', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Materials Delivered</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={3} value={form.materials_delivered} onChangeText={v => updateField('materials_delivered', v)} editable={!readOnly} />
              </View>
              <View style={S.cell}>
                <Text style={S.paperLabel}>Additional Notes</Text>
                <TextInput style={S.paperTextArea} multiline numberOfLines={3} value={form.notes} onChangeText={v => updateField('notes', v)} editable={!readOnly} />
              </View>
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Weather Conditions</Text>
                  <TextInput style={S.paperInput} value={form.weather} onChangeText={v => updateField('weather', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Temperature</Text>
                  <TextInput style={S.paperInput} value={form.temperature} onChangeText={v => updateField('temperature', v)} editable={!readOnly} />
                </View>
              </View>

              {/* Signatures */}
              <Text style={[S.sectionHeading, { marginTop: 20 }]}>Signatures</Text>
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 2 }]}>
                  <Text style={S.paperLabel}>Project Manager Name</Text>
                  <TextInput style={S.paperInput} value={form.signatures.projectManagerName} onChangeText={v => updateSign('projectManagerName', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Date</Text>
                  <TextInput style={S.paperInput} value={form.signatures.projectManagerDate} onChangeText={v => updateSign('projectManagerDate', v)} editable={!readOnly} />
                </View>
              </View>
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 2 }]}>
                  <Text style={S.paperLabel}>Contractor Rep Name</Text>
                  <TextInput style={S.paperInput} value={form.signatures.contractorRepName} onChangeText={v => updateSign('contractorRepName', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Date</Text>
                  <TextInput style={S.paperInput} value={form.signatures.contractorRepDate} onChangeText={v => updateSign('contractorRepDate', v)} editable={!readOnly} />
                </View>
              </View>
              <View style={S.gridRow}>
                <View style={[S.cell, { flex: 2 }]}>
                  <Text style={S.paperLabel}>Supervisor Name</Text>
                  <TextInput style={S.paperInput} value={form.signatures.supervisorName} onChangeText={v => updateSign('supervisorName', v)} editable={!readOnly} />
                </View>
                <View style={[S.cell, { flex: 1 }]}>
                  <Text style={S.paperLabel}>Date</Text>
                  <TextInput style={S.paperInput} value={form.signatures.supervisorDate} onChangeText={v => updateSign('supervisorDate', v)} editable={!readOnly} />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // background around the form
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelBtnTop: {
    padding: 8,
  },
  cancelTextTop: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  pageTabs: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    padding: 2,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pageBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pageBtnText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  pageBtnTextActive: {
    color: '#111827',
  },
  saveBtnTop: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveTextTop: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paperForm: {
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#cccccc',
    padding: 8,
    margin: -0.5, // collapse borders
  },
  paperLabel: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 4,
  },
  paperValue: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  paperInput: {
    fontSize: 12,
    color: '#000000',
    padding: 0,
    margin: 0,
  },
  paperTextArea: {
    fontSize: 12,
    color: '#000000',
    padding: 0,
    margin: 0,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  paperTitleCenter: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#000',
    letterSpacing: 2,
  },
  legendRow: {
    borderWidth: 1,
    borderColor: '#cccccc',
    padding: 8,
    margin: -0.5,
  },
  legendText: {
    fontSize: 9,
    color: '#666666',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#cccccc',
    margin: -0.5,
  },
  th: {
    padding: 8,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#cccccc',
    margin: -0.5,
  },
  td: {
    padding: 8,
    fontSize: 12,
    color: '#000',
  },
  addRowBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  addRowText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '500',
  },
});
