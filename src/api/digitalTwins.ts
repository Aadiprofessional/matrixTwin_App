import client from './client';

export interface DigitalTwinModel {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  viewerUrl?: string;
  viewerToken?: string;
  coverImageUrl?: string;
  status: 'processing' | 'ready' | 'error';
  uploadedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DigitalTwinAnnotation {
  id: string;
  modelId: string;
  type: 'marker' | 'comment' | 'measurement' | 'hazard';
  position: { x: number; y: number; z: number };
  content: string;
  createdBy: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ModelMetadata {
  modelId: string;
  dimensions: { width: number; height: number; depth: number };
  boundingBox: Record<string, number>;
  vertexCount: number;
  triangleCount: number;
  textureCount: number;
  materialCount: number;
  lastModified: string;
}

export interface DigitalTwinAnalytics {
  modelId: string;
  viewCount: number;
  lastViewed: string;
  viewers: Array<{ userId: string; userName: string; viewCount: number; lastViewAt: string }>;
  annotationCount: number;
  measurementCount: number;
}

// POST /digital-twins/upload
export const uploadDigitalTwinModel = (payload: FormData): Promise<DigitalTwinModel> =>
  client.post('/digital-twins/upload', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

// GET /digital-twins/project/:projectId
export const getProjectModels = (projectId: string): Promise<DigitalTwinModel[]> =>
  client.get(`/digital-twins/project/${projectId}`).then(r => r.data);

// GET /digital-twins/:modelId
export const getDigitalTwinModel = (modelId: string): Promise<DigitalTwinModel> =>
  client.get(`/digital-twins/${modelId}`).then(r => r.data);

// GET /digital-twins/:modelId/metadata
export const getModelMetadata = (modelId: string): Promise<ModelMetadata> =>
  client.get(`/digital-twins/${modelId}/metadata`).then(r => r.data);

// PUT /digital-twins/:modelId
export const updateDigitalTwinModel = (modelId: string, payload: Partial<DigitalTwinModel>): Promise<DigitalTwinModel> =>
  client.put(`/digital-twins/${modelId}`, payload).then(r => r.data);

// DELETE /digital-twins/:modelId
export const deleteDigitalTwinModel = (modelId: string): Promise<any> =>
  client.delete(`/digital-twins/${modelId}`).then(r => r.data);

// GET /digital-twins/:modelId/viewer-token
export const getViewerToken = (modelId: string): Promise<{ token: string; expiresIn: number }> =>
  client.get(`/digital-twins/${modelId}/viewer-token`).then(r => r.data);

// POST /digital-twins/:modelId/annotations
export const createAnnotation = (modelId: string, payload: Omit<DigitalTwinAnnotation, 'id' | 'createdAt' | 'createdBy'>): Promise<DigitalTwinAnnotation> =>
  client.post(`/digital-twins/${modelId}/annotations`, payload).then(r => r.data);

// GET /digital-twins/:modelId/annotations
export const getModelAnnotations = (modelId: string): Promise<DigitalTwinAnnotation[]> =>
  client.get(`/digital-twins/${modelId}/annotations`).then(r => r.data);

// PUT /digital-twins/:modelId/annotations/:annotationId
export const updateAnnotation = (modelId: string, annotationId: string, payload: Partial<DigitalTwinAnnotation>): Promise<DigitalTwinAnnotation> =>
  client.put(`/digital-twins/${modelId}/annotations/${annotationId}`, payload).then(r => r.data);

// DELETE /digital-twins/:modelId/annotations/:annotationId
export const deleteAnnotation = (modelId: string, annotationId: string): Promise<any> =>
  client.delete(`/digital-twins/${modelId}/annotations/${annotationId}`).then(r => r.data);

// GET /digital-twins/:modelId/analytics
export const getModelAnalytics = (modelId: string): Promise<DigitalTwinAnalytics> =>
  client.get(`/digital-twins/${modelId}/analytics`).then(r => r.data);

// POST /digital-twins/:modelId/export
export const exportModel = (modelId: string, format: 'gltf' | 'obj' | 'fbx' | 'step'): Promise<Blob> =>
  client.post(`/digital-twins/${modelId}/export`, { format }, { responseType: 'blob' }).then(r => r.data);
