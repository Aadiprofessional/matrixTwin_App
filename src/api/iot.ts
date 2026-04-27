import client from './client';

export interface IoTSensor {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'pressure' | 'motion' | 'air_quality' | 'noise' | 'vibration' | 'light';
  location: string;
  projectId: string;
  status: 'active' | 'inactive' | 'error';
  lastReading?: number;
  lastReadingTime?: string;
  unit?: string;
  batteryLevel?: number;
  serialNumber?: string;
  installDate?: string;
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  timestamp: string;
  unit?: string;
  quality?: 'good' | 'fair' | 'poor';
}

export interface IoTDashboardData {
  projectId: string;
  sensors: IoTSensor[];
  latestReadings: Record<string, SensorReading>;
  alerts: Array<{ sensorId: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: string }>;
  trends: Record<string, Array<{ timestamp: string; value: number }>>;
}

export interface SensorAlert {
  id: string;
  sensorId: string;
  sensorName: string;
  type: 'threshold_exceeded' | 'sensor_offline' | 'battery_low' | 'anomaly_detected';
  message: string;
  severity: 'low' | 'medium' | 'high';
  value?: number;
  threshold?: number;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface SensorConfiguration {
  sensorId: string;
  thresholdHigh?: number;
  thresholdLow?: number;
  alertEnabled: boolean;
  readingInterval: number;
  calibration?: Record<string, number>;
}

// GET /iot/sensors
export const getSensors = (projectId: string): Promise<IoTSensor[]> =>
  client.get('/iot/sensors', { params: { projectId } }).then(r => r.data);

// GET /iot/sensors/:sensorId
export const getSensorById = (sensorId: string): Promise<IoTSensor> =>
  client.get(`/iot/sensors/${sensorId}`).then(r => r.data);

// POST /iot/sensors
export const createSensor = (payload: Omit<IoTSensor, 'id' | 'lastReading' | 'lastReadingTime'>): Promise<IoTSensor> =>
  client.post('/iot/sensors', payload).then(r => r.data);

// PUT /iot/sensors/:sensorId
export const updateSensor = (sensorId: string, payload: Partial<IoTSensor>): Promise<IoTSensor> =>
  client.put(`/iot/sensors/${sensorId}`, payload).then(r => r.data);

// DELETE /iot/sensors/:sensorId
export const deleteSensor = (sensorId: string): Promise<any> =>
  client.delete(`/iot/sensors/${sensorId}`).then(r => r.data);

// GET /iot/sensors/:sensorId/readings
export const getSensorReadings = (sensorId: string, limit: number = 100, hours: number = 24): Promise<SensorReading[]> =>
  client.get(`/iot/sensors/${sensorId}/readings`, { params: { limit, hours } }).then(r => r.data);

// GET /iot/dashboard
export const getIoTDashboard = (projectId: string): Promise<IoTDashboardData> =>
  client.get('/iot/dashboard', { params: { projectId } }).then(r => r.data);

// GET /iot/alerts
export const getSensorAlerts = (projectId: string, limit: number = 50): Promise<SensorAlert[]> =>
  client.get('/iot/alerts', { params: { projectId, limit } }).then(r => r.data);

// PUT /iot/alerts/:alertId/acknowledge
export const acknowledgeSensorAlert = (alertId: string): Promise<SensorAlert> =>
  client.put(`/iot/alerts/${alertId}/acknowledge`, {}).then(r => r.data);

// DELETE /iot/alerts/:alertId
export const dismissSensorAlert = (alertId: string): Promise<any> =>
  client.delete(`/iot/alerts/${alertId}`).then(r => r.data);

// GET /iot/sensors/:sensorId/configuration
export const getSensorConfiguration = (sensorId: string): Promise<SensorConfiguration> =>
  client.get(`/iot/sensors/${sensorId}/configuration`).then(r => r.data);

// PUT /iot/sensors/:sensorId/configuration
export const updateSensorConfiguration = (sensorId: string, payload: SensorConfiguration): Promise<SensorConfiguration> =>
  client.put(`/iot/sensors/${sensorId}/configuration`, payload).then(r => r.data);

// GET /iot/sensors/:sensorId/calibrate
export const calibrateSensor = (sensorId: string): Promise<any> =>
  client.post(`/iot/sensors/${sensorId}/calibrate`, {}).then(r => r.data);

// GET /iot/analytics
export const getIoTAnalytics = (projectId: string, startDate?: string, endDate?: string): Promise<any> =>
  client.get('/iot/analytics', { params: { projectId, startDate, endDate } }).then(r => r.data);

// POST /iot/export
export const exportSensorData = (projectId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> =>
  client.post('/iot/export', { projectId, format }, { responseType: 'blob' }).then(r => r.data);
