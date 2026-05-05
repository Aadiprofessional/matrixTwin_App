import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, Switch } from 'react-native';
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
  day: string;
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

const w = (id: number, trade: string, tradeDivision: string, org: string, code: string): WorkerEntry => ({
  uid: createWorkerUid(), id, trade, tradeDivision, org, code,
  days: {}, mandays: '', duration: '8', dailyWageRate: { average: '', high: '', low: '' },
});

const initialWorkerData = (): WorkerEntry[] => [
  // 1
  w(1, 'Bar Bender & Fixer', 'Bar Bender & Fixer', 'C304 / C404', 'C304 / C404'),
  // 2
  w(2, 'Concreter', 'Concrete and Grouting Worker (Master)', '—', 'C3016'),
  w(2, 'Concreter', 'Concreter', 'C309 / C409', 'C309 / C409'),
  w(2, 'Concreter', 'Concrete Repairer (Spalling Concrete)', '—', 'C308'),
  w(2, 'Concreter', 'Shotcretor', '—', 'C342'),
  w(2, 'Concreter', 'Grouting Worker', '—', 'C321'),
  // 3
  w(3, 'Drainlayer', 'Drain and Pipe Layer (Master)', '—', 'C306b'),
  w(3, 'Drainlayer', 'Drainlayer', 'C314', 'C314 / C414'),
  w(3, 'Drainlayer', 'Pipelayer', '—', 'C331'),
  // 4
  w(4, 'Plumber', 'Plumber', 'C339 / C439', 'C339 / C439'),
  // 5
  w(5, 'Leveller', 'Leveller', 'C323 / C423', 'C323 / C423'),
  // 6
  w(6, 'Scaffolder', 'Scaffolder (Master)', 'C303 / C403', 'C303 / C403'),
  w(6, 'Scaffolder', 'Bamboo Scaffolder', 'C303 / C403', 'C303 / C403'),
  w(6, 'Scaffolder', 'Metal Scaffolder', '—', 'C327 / C427'),
  // 7
  w(7, 'General Workers', '—', '—', 'C406'),
  // 8
  w(8, 'Carpenter (Formwork)', 'Carpenter (Fender)', '—', 'C306'),
  w(8, 'Carpenter (Formwork)', 'Carpenter (Formwork) (Master)', 'C307 / C407', 'C307 / C407'),
  w(8, 'Carpenter (Formwork)', 'Carpenter (Formwork - Civil Construction)', '—', 'C307a / C407a'),
  w(8, 'Carpenter (Formwork)', 'Carpenter (Formwork - Civil Construction) (Striking)', '—', 'C307d'),
  w(8, 'Carpenter (Formwork)', 'Carpenter (Formwork - Building Construction)', '—', 'C307e / C407e'),
  w(8, 'Carpenter (Formwork)', 'Carpenter (Formwork - Building Construction) (Striking)', '—', 'C307n'),
  // 9
  w(9, 'Joiner', 'Joiner', 'C322 / C422', 'C322 / C422'),
  w(9, 'Joiner', 'Joiner (Assembling)', '—', 'C322a'),
  w(9, 'Joiner', 'Ground Investigation Operator/Driller/Borer', '—', 'C320 / C420'),
  // 10
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Fork-lift Truck)', '—', 'C335f'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Mini-loader)', '—', 'C335k'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Mini-loader (with Attachments))', '—', 'C335e'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Grader)', '—', 'C335g'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Suspended Working Platform)', '—', 'C335'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Demolition - Excavator)', '—', 'C336'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Excavator)', '—', 'C335b'),
  w(10, 'Plant & Equipment Operator (General)', "Builder's Lift Operator", '—', 'C332'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Bulldozer)', '—', 'C335a'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Truck-mounted Crane)', '—', 'C334d'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Dumper)', '—', 'C335h'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Loader)', '—', 'C335c'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Locomotive)', '—', 'C333i'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Compactor)', '—', 'C335j'),
  w(10, 'Plant & Equipment Operator (General)', 'Plant and Equipment Operator (Scraper)', '—', 'C335k'),
  // 11
  w(11, 'Truck Driver', 'Construction Goods Vehicle Driver (Master)', 'C349', 'C349'),
  w(11, 'Truck Driver', 'Truck Driver (Medium Goods Vehicles)', '—', 'C349c'),
  w(11, 'Truck Driver', 'Truck Driver (Heavy Goods Vehicles)', '—', 'C349a'),
  w(11, 'Truck Driver', 'Truck Driver (Special Purpose Vehicles)', '—', 'C349b'),
  w(11, 'Truck Driver', 'Truck Driver (Articulated Vehicles)', '—', 'C349d'),
  // 12
  w(12, 'Flooring Worker', 'Floor Layer (Master)', '—', 'C316 / C416'),
  w(12, 'Flooring Worker', 'Floor Layer (Timber Flooring)', '—', 'C316b / C416b'),
  w(12, 'Flooring Worker', 'Floor Layer (PVC Flooring)', '—', 'C316a / C416a'),
  w(12, 'Flooring Worker', 'Floor Layer (Terrazzo/Mosaic)', '—', 'C316c'),
  w(12, 'Flooring Worker', 'Plant and Equipment Operator (Percussive Pile)', '—', 'C335b / C435b'),
  w(12, 'Flooring Worker', 'Plant and Equipment Operator (Bored Pile)', '—', 'C335a / C435a'),
  // 13
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Tower Crane)', '—', 'C334c'),
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Crawler-mounted Mobile Crane)', '—', 'C334a'),
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Wheeled-mounted Mobile Crane)', '—', 'C334b'),
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Gantry Crane)', '—', 'C334b'),
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Tunneling) - Jumbo Drilling', '—', 'C336a / C436a'),
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Tunneling) - Segment Erection', '—', 'C336c / C436c'),
  w(13, 'Plant & Equipment Operator (Heavy)', 'Plant and Equipment Operator (Tunneling) - Tunnel Boring Machine', '—', 'C336d / C436d'),
  // 14
  w(14, 'General Welder', 'General Welder', 'C318 / C418', 'C318 / C418'),
  w(14, 'General Welder', 'Metalwork Worker (Master)', '—', 'C326 / C426'),
  // 15
  w(15, 'Metal Worker', 'Metal Worker', 'C326 / C426', 'C326 / C426'),
  w(15, 'Metal Worker', 'Electronic Equipment Mechanic (Construction Work) (Master)', '—', 'E303E / E403E'),
  // 16
  w(16, 'Equipment and System Mechanic', 'Building Security System Mechanic', '—', 'E323 / E423'),
  w(16, 'Equipment and System Mechanic', 'Communication System Mechanic', '—', 'E393 / E493'),
  w(16, 'Equipment and System Mechanic', 'Plant and Equipment Mechanic (Construction Work) (Master)', '—', 'C326 / C426'),
  // 17
  w(17, 'Piling Worker', 'Piling Operative (Master)', '—', 'C335 / C435'),
  w(17, 'Piling Worker', 'Piling Operative (Percussive Pile)', '—', 'C335b / C435b'),
  w(17, 'Piling Worker', 'Piling Operative (Bored Pile)', '—', 'C335a / C435a'),
  // 18
  w(18, 'Waterproofing Worker', 'Waterproofing Worker (Master)', '—', 'C361'),
  w(18, 'Waterproofing Worker', 'Waterproofing Worker (Liquid Membrane)', '—', 'C361c'),
  w(18, 'Waterproofing Worker', 'Waterproofing Worker (Bitumastic Felt)', '—', 'C361b / C461b'),
  w(18, 'Waterproofing Worker', 'Waterproofing Worker (Adhesive-type Felt)', '—', 'C361a'),
  // 19
  w(19, 'Paving Block Layer', 'Paving Block Layer', '—', 'C358'),
  // 20
  w(20, 'Tiler', 'Tiler', '—', 'C347 / C447'),
  w(20, 'Tiler', 'Tiler (Master)', '—', 'C347a / C447a'),
  w(20, 'Tiler', 'Tiler (Tile)', '—', 'C347b / C447b'),
  // 21
  w(21, 'Demolition Worker', 'Demolition Worker (Master)', '—', 'C312'),
  w(21, 'Demolition Worker', 'Demolition Worker (Building)', '—', 'C312a'),
  w(21, 'Demolition Worker', 'Demolition Worker (Unauthorized Building Works)', '—', 'C312b'),
  // 22
  w(22, 'Marine Construction Plant Operator', 'Marine Construction Plant Operator (Lifting) (Master)', '—', 'C325c / C425c'),
  w(22, 'Marine Construction Plant Operator', 'Marine Construction Plant Operator (Derrick)', '—', 'C325c / C425c'),
  w(22, 'Marine Construction Plant Operator', 'Marine Construction Plant Operator (Boom-grab Bucket)', '—', 'C325e / C425e'),
  w(22, 'Marine Construction Plant Operator', 'Marine Construction Plant Operator (Boom-hook)', '—', 'C325b / C425b'),
  // 23
  w(23, 'Aluminum Window Installer', 'Window Frame Installer', '—', 'C350 / C450'),
  // 24
  w(24, 'Curtain Wall and Glass Installer', 'Curtain Wall and Glass Panes Installer (Master)', '—', 'C301 / C401'),
  w(24, 'Curtain Wall and Glass Installer', 'Glazier', 'C319', 'C319 / C419'),
  w(24, 'Curtain Wall and Glass Installer', 'Curtain Wall Installer', '—', 'C311 / C411'),
  // 25
  w(25, 'Painter & Decorator', 'Painter and Decorator (Master)', 'C329 / C429', 'C329 / C429'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Roller Painting)', '—', 'C329a'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Surface Filling)', '—', 'C329b'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Emulsion Painting)', '—', 'C329c'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Brushing Painting)', '—', 'C329d'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Synthetic Painting)', '—', 'C329e'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Clear Lacquering)', '—', 'C329f'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Texture-spray)', '—', 'C329g'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Metal Paint Spray)', '—', 'C329h'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Lettering)', '—', 'C329i'),
  w(25, 'Painter & Decorator', 'Painter and Decorator (Sign Writing)', '—', 'C329j'),
  // 26
  w(26, 'Plasterer', 'Cement Sand Mortar Worker (Master)', '—', 'C308 / C408'),
  w(26, 'Plasterer', 'Plasterer', 'C337 / C437', 'C337 / C437'),
  w(26, 'Plasterer', 'Plasterer (Floor)', '—', 'C337a / C437a'),
  // 27
  w(27, 'Tuckpointer', 'Tuckpointer', '—', 'C348'),
  // 28
  w(28, 'False Ceiling Installer', 'False Ceiling Installer', '—', 'C305 / C405'),
  // 29
  w(29, 'Gas Installer', 'Gas Installer', '—', 'E375'),
  // 30
  w(30, 'Bricklayer', 'Bricklayer', 'C305 / C405', 'C305 / C405'),
  // 31
  w(31, 'Structural Steel Welder', 'Structural Steel Welder', 'C346', 'C346'),
  // 32
  w(32, 'Rigger/Metal Formwork Erector', 'Rigger / Metal Formwork Erector', 'C341', 'C341 / C441'),
  // 33
  w(33, 'Asphalter (Road Construction)', 'Asphalter (Road Construction)', 'C302', 'C302 / C402'),
  // 34
  w(34, 'Construction Plant Mechanic', 'Construction Plant Mechanic', 'C310 / C410', 'C310 / C410'),
  w(34, 'Construction Plant Mechanic', 'Control Panel Assembler', '—', 'E305a / E405a'),
  // 35
  w(35, 'Electrical Fitter (incl. Electrician)', 'Electrical Worker', '—', 'E309 / E409'),
  w(35, 'Electrical Fitter (incl. Electrician)', 'Electrical Fitter', 'E305', 'E305'),
  // 36
  w(36, 'Mechanical Fitter', 'Mechanical Fitter', 'E310 / E410', 'E310 / E410'),
  w(36, 'Mechanical Fitter', 'Refrigeration/AC/Ventilation Mechanic (Master)', 'E314 / E414', 'E314'),
  w(36, 'Mechanical Fitter', 'Refrigeration/AC/Ventilation Mechanic (Water System)', '—', 'E314a / E414a'),
  // 37
  w(37, 'Refrigeration/AC/Ventilation Mechanic', 'Refrigeration/AC/Ventilation Mechanic (Air System)', '—', 'E314a / E414a'),
  w(37, 'Refrigeration/AC/Ventilation Mechanic', 'Refrigeration/AC/Ventilation Mechanic (Thermal Insulation)', '—', 'E314c / E414c'),
  w(37, 'Refrigeration/AC/Ventilation Mechanic', 'Refrigeration/AC/Ventilation Mechanic (Control System)', '—', 'E314b / E414b'),
  w(37, 'Refrigeration/AC/Ventilation Mechanic', 'Refrigeration/AC/Ventilation Mechanic (Unitary System)', '—', 'E314d / E414d'),
  // 38
  w(38, 'Fire Service Mechanic', 'Fire Service Mechanic (Master)', 'E306', 'E306'),
  w(38, 'Fire Service Mechanic', 'Fire Service Portable Equipment Fitter', '—', 'E306b'),
  w(38, 'Fire Service Mechanic', 'Fire Service Electrical Fitter', '—', 'E306c / E406c'),
  w(38, 'Fire Service Mechanic', 'Fire Service Mechanical Fitter', '—', 'E306a / E406a'),
  // 39
  w(39, 'Lift and Escalator Mechanic', 'Lift and Escalator Mechanic (Master)', 'E309', 'E309'),
  w(39, 'Lift and Escalator Mechanic', 'Lift Mechanic', '—', 'E309a'),
  w(39, 'Lift and Escalator Mechanic', 'Escalator Mechanic', '—', 'E309b'),
];

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

  console.log('[MonthlyReturnTemplateRN] visible:', visible, 'has initialData:', !!initialData);
  const [formData, setFormData] = useState<MonthlyFormData>({
    formNumber: initialData?.formNumber || `LB-${Date.now().toString().slice(-6)}`,
    dept: initialData?.dept || '',
    day: initialData?.day || '',
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
            <Text style={styles.title}>Monthly Return (Labour)</Text>
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
                    <Text style={styles.label}>Day</Text>
                    <TextInput style={styles.input} value={formData.day} onChangeText={(v)=>setFormData({...formData, day:v})} placeholder="DD" keyboardType="numeric" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.label}>Month</Text>
                    <TextInput style={styles.input} value={formData.month} onChangeText={(v)=>setFormData({...formData, month:v})} placeholder="MM" keyboardType="numeric" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.label}>Year</Text>
                    <TextInput style={styles.input} value={formData.year} onChangeText={(v)=>setFormData({...formData, year:v})} placeholder="YYYY" keyboardType="numeric" />
                  </View>
                </View>

                <Text style={styles.label}>Contract No.</Text>
                <TextInput style={styles.input} value={formData.contractNo} onChangeText={(v)=>setFormData({...formData, contractNo:v})} />

                <Text style={styles.label}>Contract Title</Text>
                <TextInput style={styles.input} value={formData.contractTitle} onChangeText={(v)=>setFormData({...formData, contractTitle:v})} />

                <Text style={styles.label}>Contractor</Text>
                <TextInput style={styles.input} value={formData.contractor} onChangeText={(v)=>setFormData({...formData, contractor:v})} />

                <Text style={styles.label}>Works Code</Text>
                <TextInput style={styles.input} value={formData.worksCode} onChangeText={(v)=>setFormData({...formData, worksCode:v})} placeholder="e.g. WC-001" placeholderTextColor={colors.textMuted} />

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Nominated Sub-contractor</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>Is this a nominated sub-contractor?</Text>
                  </View>
                  <Switch
                    value={formData.isNominatedSubcontractor}
                    onValueChange={(v) => setFormData({ ...formData, isNominatedSubcontractor: v })}
                    thumbColor={formData.isNominatedSubcontractor ? '#0ea5e9' : '#888'}
                    trackColor={{ true: '#0ea5e944', false: '#333' }}
                  />
                </View>
              </View>
            )}

            {/* Page 2: Worker rows */}
            {currentPage === 2 && (
              <View>
                {formData.workers.map((w) => (
                  <View key={w.uid} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{w.trade || 'New Trade'}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Trade</Text>
                        <TextInput placeholder="Trade" style={styles.input} value={w.trade} onChangeText={(v)=>handleWorkerField(w.uid, 'trade', v)} />
                      </View>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Trade Division</Text>
                        <TextInput placeholder="Division" style={styles.input} value={w.tradeDivision} onChangeText={(v)=>handleWorkerField(w.uid, 'tradeDivision', v)} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Org</Text>
                        <TextInput placeholder="Org" style={styles.input} value={w.org} onChangeText={(v)=>handleWorkerField(w.uid, 'org', v)} />
                      </View>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Code</Text>
                        <TextInput placeholder="Code" style={styles.input} value={w.code} onChangeText={(v)=>handleWorkerField(w.uid, 'code', v)} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Mandays</Text>
                        <TextInput style={styles.input} value={w.mandays} onChangeText={(v)=>handleWorkerField(w.uid, 'mandays', v)} keyboardType="numeric" />
                      </View>
                      <View style={{ flex:1 }}>
                        <Text style={styles.label}>Hrs/Day</Text>
                        <TextInput style={styles.input} value={w.duration} onChangeText={(v)=>handleWorkerField(w.uid, 'duration', v)} keyboardType="numeric" />
                      </View>
                    </View>
                    <Text style={styles.label}>Daily Wage Rate (Avg / High / Low)</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TextInput placeholder="Avg" style={[styles.input, { flex:1 }]} value={w.dailyWageRate.average} onChangeText={(v)=>handleWorkerField(w.uid, 'dailyWageRate', { ...w.dailyWageRate, average: v })} keyboardType="numeric" />
                      <TextInput placeholder="High" style={[styles.input, { flex:1 }]} value={w.dailyWageRate.high} onChangeText={(v)=>handleWorkerField(w.uid, 'dailyWageRate', { ...w.dailyWageRate, high: v })} keyboardType="numeric" />
                      <TextInput placeholder="Low" style={[styles.input, { flex:1 }]} value={w.dailyWageRate.low} onChangeText={(v)=>handleWorkerField(w.uid, 'dailyWageRate', { ...w.dailyWageRate, low: v })} keyboardType="numeric" />
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.addRowBtn} onPress={handleAddRow}><Icon name="plus" size={16} color="#fff" /><Text style={styles.addRowText}>Add Worker Row</Text></TouchableOpacity>
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
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'flex-end' },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#222', padding: spacing.sm, marginBottom: 10 },
  switchLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sheet: { backgroundColor: '#0d0d0d', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '96%', overflow: 'hidden' },
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
