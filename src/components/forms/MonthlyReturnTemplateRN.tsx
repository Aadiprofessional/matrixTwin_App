import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { spacing, radius } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Simplified RN port of the web MonthlyReturnTemplate
// Provides paginated pages, editable rows and a Save handler that returns the whole formData

export interface WorkerEntry {
  uid: string;
  page?: number;
  id: number;
  trade: string;
  tradeDivision: string;
  org: string;
  code: string;
  days: Record<number, string>;
  mandays: string;
  duration: string;
  dailyWageRate: { average: string; high: string; low: string };
}

export interface MonthlyFormData {
  formNumber: string;
  dept: string;
  month: string;
  year: string;
  contractNo: string;
  contractTitle: string;
  contractor: string;
  isNominatedSubcontractor: boolean;
  worksCode: string;
  workers: WorkerEntry[];
}

const createWorkerUid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const initialWorkerData = (): WorkerEntry[] => {
  // minimal set for RN default; keep subset of web trades for performance
  const trades = [
    { id: 1, trade: 'Bar Bender & Fixer', tradeDivision: 'Bar Bender & Fixer', org: 'C304 / C404', code: 'C304 / C404' },
    { id: 2, trade: 'Concreter', tradeDivision: 'Concreter', org: 'C309 / C409', code: 'C309 / C409' },
    { id: 3, trade: 'Drainlayer', tradeDivision: 'Drainlayer', org: 'C314', code: 'C314 / C414' },
    { id: 4, trade: 'Plumber', tradeDivision: 'Plumber', org: 'C339 / C439', code: 'C339 / C439' },
    { id: 5, trade: 'Carpenter', tradeDivision: 'Carpenter', org: 'C307 / C407', code: 'C307 / C407' },
  ];

  return trades.map(t => ({
    uid: createWorkerUid(),
    id: t.id,
    trade: t.trade,
    tradeDivision: t.tradeDivision,
    org: t.org,
    code: t.code,
    days: {},
    mandays: '',
    duration: '8',
    dailyWageRate: { average: '', high: '', low: '' }
  }));
};

export default function MonthlyReturnTemplateRN({
  visible,
  onClose,
  onSave,
  initialData
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: MonthlyFormData) => void;
  initialData?: Partial<MonthlyFormData>;
}) {
  const totalPages = 3; // compact pages on mobile
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState<MonthlyFormData>({
    formNumber: initialData?.formNumber || `LB-${Date.now().toString().slice(-6)}`,
    dept: initialData?.dept || '',
    month: initialData?.month || '',
    year: initialData?.year || '',
    contractNo: initialData?.contractNo || '',
    contractTitle: initialData?.contractTitle || '',
    contractor: initialData?.contractor || '',
    isNominatedSubcontractor: initialData?.isNominatedSubcontractor || false,
    worksCode: initialData?.worksCode || '',
    workers: (initialData?.workers as WorkerEntry[]) || initialWorkerData()
  });

  const monthDays = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const changePage = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const handleWorkerField = (uid: string, field: keyof WorkerEntry, value: any) => {
    setFormData(d => ({ ...d, workers: d.workers.map(w => w.uid === uid ? { ...w, [field]: value } : w) }));
  };

  const handleDayChange = (uid: string, day: number, value: string) => {
    setFormData(d => ({ ...d, workers: d.workers.map(w => w.uid === uid ? { ...w, days: { ...w.days, [day]: value } } : w) }));
  };

  const handleAddRow = () => {
    setFormData(d => ({ ...d, workers: [...d.workers, { uid: createWorkerUid(), id: Date.now() % 100000, trade: '', tradeDivision: '', org: '', code: '', days: {}, mandays: '', duration: '8', dailyWageRate: { average: '', high: '', low: '' } }] }));
  };

  const handleSave = () => {
    // minimal validation
    if (!formData.contractTitle && !formData.contractNo) {
      Alert.alert('Validation', 'Please provide Contract Title or Contract No.');
      return;
    }
    onSave(formData);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Monthly Return (Mobile)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => onClose()} style={styles.iconBtn}><Icon name="close" size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
          </View>

          <View style={styles.pagerRow}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <TouchableOpacity key={p} onPress={() => changePage(p)} style={[styles.pageBtn, currentPage===p && { backgroundColor: '#111' }]}>
                <Text style={{ color: currentPage===p ? '#fff' : colors.textMuted }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.body}>
            {/* Page 1: Metadata */}
            {currentPage === 1 && (
              <View>
                <Text style={styles.label}>Form Number</Text>
                <TextInput style={styles.input} value={formData.formNumber} onChangeText={(v)=>setFormData({...formData, formNumber:v})} />

                <Text style={styles.label}>Dept/Div</Text>
                <TextInput style={styles.input} value={formData.dept} onChangeText={(v)=>setFormData({...formData, dept:v})} />

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex:1 }}>
                    <Text style={styles.label}>Month</Text>
                    <TextInput style={styles.input} value={formData.month} onChangeText={(v)=>setFormData({...formData, month:v})} placeholder="MM" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.label}>Year</Text>
                    <TextInput style={styles.input} value={formData.year} onChangeText={(v)=>setFormData({...formData, year:v})} placeholder="YYYY" />
                  </View>
                </View>

                <Text style={styles.label}>Contract No.</Text>
                <TextInput style={styles.input} value={formData.contractNo} onChangeText={(v)=>setFormData({...formData, contractNo:v})} />

                <Text style={styles.label}>Contract Title</Text>
                <TextInput style={styles.input} value={formData.contractTitle} onChangeText={(v)=>setFormData({...formData, contractTitle:v})} />

                <Text style={styles.label}>Contractor</Text>
                <TextInput style={styles.input} value={formData.contractor} onChangeText={(v)=>setFormData({...formData, contractor:v})} />
              </View>
            )}

            {/* Page 2: Worker rows (compact) */}
            {currentPage === 2 && (
              <View>
                {formData.workers.map((w) => (
                  <View key={w.uid} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{w.trade || 'Trade'}</Text>
                    <TextInput placeholder="Trade" style={styles.input} value={w.trade} onChangeText={(v)=>handleWorkerField(w.uid, 'trade', v)} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Mandays</Text>
                        <TextInput style={styles.input} value={w.mandays} onChangeText={(v)=>handleWorkerField(w.uid, 'mandays', v)} keyboardType="numeric" />
                      </View>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Duration</Text>
                        <TextInput style={styles.input} value={w.duration} onChangeText={(v)=>handleWorkerField(w.uid, 'duration', v)} keyboardType="numeric" />
                      </View>
                    </View>
                    <Text style={styles.label}>Avg Wage</Text>
                    <TextInput style={styles.input} value={w.dailyWageRate.average} onChangeText={(v)=>{ handleWorkerField(w.uid, 'dailyWageRate', { ...w.dailyWageRate, average: v }); }} />
                  </View>
                ))}
                <TouchableOpacity style={styles.addRowBtn} onPress={handleAddRow}><Icon name="plus" size={16} color="#fff" /><Text style={styles.addRowText}>Add Row</Text></TouchableOpacity>
              </View>
            )}

            {/* Page 3: Day-by-day inputs (compact horizontal scroll) */}
            {currentPage === 3 && (
              <View>
                <Text style={styles.label}>Day entries (1..31)</Text>
                {formData.workers.map(w => (
                  <View key={w.uid} style={styles.dayRow}>
                    <Text style={styles.rowTitleSmall}>{w.trade || 'Trade'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      {monthDays.map(day => (
                        <View key={day} style={styles.dayCell}>
                          <Text style={styles.dayLabel}>{day}</Text>
                          <TextInput style={styles.dayInput} value={w.days[day] || ''} onChangeText={(v)=>handleDayChange(w.uid, day, v)} />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', padding: spacing.md },
  sheet: { backgroundColor: '#0d0d0d', borderRadius: 14, maxHeight: '92%', overflow: 'hidden' },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: spacing.md, borderBottomWidth:1, borderBottomColor:'#222' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  iconBtn: { padding: 6 },
  pagerRow: { flexDirection: 'row', padding: spacing.sm, gap: 8, justifyContent: 'center' },
  pageBtn: { padding: 6, borderRadius: 20, backgroundColor: 'transparent' },
  body: { padding: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: '#111', color: colors.text, padding: 8, borderRadius: 8, borderWidth:1, borderColor:'#222', marginBottom: 10 },
  rowCard: { backgroundColor: '#0b0b0b', padding: spacing.sm, borderRadius: 10, borderWidth:1, borderColor:'#222', marginBottom: spacing.sm },
  rowTitle: { color: colors.text, fontWeight:'700', marginBottom: 6 },
  rowTitleSmall: { color: colors.text, fontSize: 12, fontWeight:'700', marginBottom: 6 },
  addRowBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor: '#111', padding: 10, borderRadius: 10, marginTop: 8 },
  addRowText: { color: '#fff', marginLeft: 8 },
  footer: { flexDirection:'row', justifyContent:'space-between', padding: spacing.md, borderTopWidth:1, borderTopColor:'#222' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: colors.textMuted },
  saveBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight:'700' },
  dayRow: { marginBottom: spacing.sm },
  dayCell: { width: 48, alignItems:'center', marginRight: 6 },
  dayLabel: { color: colors.textMuted, fontSize: 10 },
  dayInput: { backgroundColor: '#111', color: colors.text, padding: 4, borderRadius: 6, width: 40, textAlign:'center', borderWidth:1, borderColor:'#222' }
});
