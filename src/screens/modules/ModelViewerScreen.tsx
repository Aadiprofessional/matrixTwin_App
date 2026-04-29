import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { getViewerToken, getDigitalTwinModel, getProjectModels, getAllModels } from '../../api/digitalTwins';
import { getFreshViewToken } from '../../utils/bimfaceTokenApi';

type ModelViewerScreenProps = NativeStackScreenProps<AppStackParamList, 'ModelViewer'>;

const DEFAULT_BIMFACE_FILE_ID = '10000371337177';

// Sensor data interface
interface Sensor {
  id: string;
  name: string;
  type: string;
  location: string;
  floor: number;
  value: number;
  unit: string;
  status: 'online' | 'warning' | 'critical' | 'offline';
  lastUpdated: string;
  battery?: number;
}

// CCTV Camera interface
interface CCTVCamera {
  id: string;
  name: string;
  location: string;
  floor: number;
  status: 'online' | 'offline' | 'recording' | 'maintenance';
  isRecording: boolean;
  lastActivity: string;
  resolution: string;
  viewAngle: string;
}

// Mock sensor data
const mockSensors: Sensor[] = [
  {
    id: 's1',
    name: 'Temp Sensor 1',
    type: 'temperature',
    location: 'Conference Room',
    floor: 1,
    value: 22.5,
    unit: '°C',
    status: 'online',
    lastUpdated: '2025-04-30T19:22:31',
    battery: 85,
  },
  {
    id: 's2',
    name: 'Temp Sensor 2',
    type: 'temperature',
    location: 'Main Office',
    floor: 1,
    value: 23.1,
    unit: '°C',
    status: 'online',
    lastUpdated: '2025-04-30T19:24:12',
    battery: 90,
  },
  {
    id: 's3',
    name: 'Humidity 1',
    type: 'humidity',
    location: 'Server Room',
    floor: 2,
    value: 35,
    unit: '%',
    status: 'warning',
    lastUpdated: '2025-04-30T19:20:45',
    battery: 75,
  },
  {
    id: 's4',
    name: 'Occupancy 1',
    type: 'occupancy',
    location: 'Lobby',
    floor: 1,
    value: 12,
    unit: 'people',
    status: 'online',
    lastUpdated: '2025-04-30T19:25:02',
    battery: 100,
  },
  {
    id: 's5',
    name: 'Energy Meter',
    type: 'energy',
    location: 'Main Supply',
    floor: 0,
    value: 42.7,
    unit: 'kWh',
    status: 'online',
    lastUpdated: '2025-04-30T19:15:33',
    battery: 95,
  },
  {
    id: 's6',
    name: 'Water Sensor',
    type: 'water',
    location: 'Restroom',
    floor: 2,
    value: 0.5,
    unit: 'm³/h',
    status: 'online',
    lastUpdated: '2025-04-30T19:18:19',
    battery: 80,
  },
  {
    id: 's7',
    name: 'Door Sensor',
    type: 'security',
    location: 'Main Entrance',
    floor: 1,
    value: 1,
    unit: 'status',
    status: 'online',
    lastUpdated: '2025-04-30T19:26:50',
    battery: 100,
  },
  {
    id: 's8',
    name: 'Air Quality',
    type: 'air',
    location: 'Open Space',
    floor: 3,
    value: 850,
    unit: 'ppm CO2',
    status: 'critical',
    lastUpdated: '2025-04-30T19:10:27',
    battery: 70,
  },
];

// Mock CCTV data
const mockCCTVCameras: CCTVCamera[] = [
  {
    id: 'cam001',
    name: 'Main Entrance',
    location: 'Front Door',
    floor: 1,
    status: 'recording',
    isRecording: true,
    lastActivity: '2 minutes ago',
    resolution: '4K',
    viewAngle: '120°',
  },
  {
    id: 'cam002',
    name: 'Parking Lot',
    location: 'Outdoor Parking',
    floor: 0,
    status: 'online',
    isRecording: false,
    lastActivity: '10 minutes ago',
    resolution: '1080p',
    viewAngle: '90°',
  },
  {
    id: 'cam003',
    name: 'Conference Room',
    location: 'Meeting Room A',
    floor: 2,
    status: 'online',
    isRecording: false,
    lastActivity: '1 hour ago',
    resolution: '1080p',
    viewAngle: '110°',
  },
  {
    id: 'cam004',
    name: 'Server Room',
    location: 'IT Infrastructure',
    floor: 2,
    status: 'recording',
    isRecording: true,
    lastActivity: 'Live',
    resolution: '4K',
    viewAngle: '180°',
  },
];

const { width, height } = Dimensions.get('window');

export default function ModelViewerScreen({ route, navigation }: ModelViewerScreenProps) {
  const { modelId: initialModelId, viewToken: initialViewToken, projectId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>(mockSensors);
  const [cctvCameras, setCctvCameras] = useState<CCTVCamera[]>(mockCCTVCameras);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(null);
  const [viewToken, setViewToken] = useState<string | null>(initialViewToken || null);
  const [workingModelId, setWorkingModelId] = useState<string | null>(initialModelId || null);
  const [fallbackFileId, setFallbackFileId] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(!initialModelId); // Load models if no modelId provided
  const [hasTriedFallbackToken, setHasTriedFallbackToken] = useState(false);
  const [isFetchingFallbackToken, setIsFetchingFallbackToken] = useState(false);

  // Load available models if no modelId is provided (similar to website implementation)
  useEffect(() => {
    const loadAvailableModels = async () => {
      if (initialModelId) {
        // If modelId was provided in route params, use it directly
        console.log('Using provided modelId from route params:', initialModelId);
        setWorkingModelId(initialModelId);
        setIsLoadingModels(false);
        return;
      }

      try {
        let availableModels: any[] = [];

        // First try to get models by project if projectId is available
        if (projectId) {
          console.log('No modelId provided, loading available models for projectId:', projectId);
          try {
            availableModels = await getProjectModels(projectId);
          } catch (projectError) {
            console.warn('Failed to load models by projectId, falling back to getAllModels:', projectError);
            // Fall through to getAllModels
          }
        }

        // If no models found by project ID, fetch all models
        if (!availableModels || availableModels.length === 0) {
          console.log('Fetching all available models...');
          availableModels = await getAllModels();
        }
        
        if (availableModels && availableModels.length > 0) {
          const firstModel = availableModels[0];
          const modelIdToUse = firstModel.id;
          console.log(`Using first available model with id: ${modelIdToUse}`);
          setWorkingModelId(modelIdToUse);

          const firstModelFileId =
            firstModel.fileId ||
            firstModel.file_id ||
            firstModel.file_id_value ||
            firstModel.file_id_number;

          if (firstModelFileId) {
            setFallbackFileId(String(firstModelFileId));
          }
        } else {
          console.warn('No models available from API, falling back to default BIMFACE fileId:', DEFAULT_BIMFACE_FILE_ID);
          setFallbackFileId(DEFAULT_BIMFACE_FILE_ID);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading available models:', err);
        console.warn('Falling back to default BIMFACE fileId due to model loading error:', DEFAULT_BIMFACE_FILE_ID);
        setFallbackFileId(DEFAULT_BIMFACE_FILE_ID);
        setError(null);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadAvailableModels();
  }, [initialModelId, projectId]);

  // Fetch view token using local API
  // Use workingModelId to fetch view token from backend
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ['viewer-token', workingModelId],
    queryFn: () => getViewerToken(workingModelId!),
    enabled: !!workingModelId && !initialViewToken && !isLoadingModels,
  });

  // Update viewToken when data is available
  useEffect(() => {
    if (tokenData?.token) {
      console.log('View token received:', tokenData.token.substring(0, 20) + '...');
      setViewToken(tokenData.token);
    }
  }, [tokenData]);

  useEffect(() => {
    if (viewToken) {
      setLoading(true);
    }
  }, [viewToken]);

  // Fallback: if backend viewer-token endpoint doesn't return a token
  // try fetching a fresh view token using the fileId via the MatrixBIM endpoint
  useEffect(() => {
    const tryFreshToken = async () => {
      if (viewToken || initialViewToken) return;
      if (tokenLoading) return;
      if (tokenData && tokenData.token) return;
      if (hasTriedFallbackToken) return;

      setHasTriedFallbackToken(true);
      setIsFetchingFallbackToken(true);

      try {
        let fileIdToUse = fallbackFileId;

        // Attempt to fetch model metadata to find fileId (some APIs return file_id)
        if (!fileIdToUse && workingModelId) {
          const model = await getDigitalTwinModel(workingModelId);
          const fileIdFromModel =
            (model as any).fileId ||
            (model as any).file_id ||
            (model as any).file_id_value ||
            (model as any).file_id_number;

          if (fileIdFromModel) {
            fileIdToUse = String(fileIdFromModel);
          }
        }

        if (!fileIdToUse) {
          console.warn('No fileId found from model/API; using default BIMFACE fileId fallback:', DEFAULT_BIMFACE_FILE_ID);
          fileIdToUse = DEFAULT_BIMFACE_FILE_ID;
        }

        console.log('Attempting fallback fresh token fetch using fileId:', fileIdToUse);
        const data = await getFreshViewToken(fileIdToUse);

        if (data && data.viewToken) {
          const token = data.viewToken;
          console.log('Fallback fresh view token fetched:', String(token).substring(0, 20) + '...');
          setViewToken(token);
          setError(null);
        } else {
          console.warn('Fallback fresh token response did not contain token', data);
        }
      } catch (e) {
        console.warn('Error trying fallback fresh token fetch:', e);
      } finally {
        setIsFetchingFallbackToken(false);
      }
    };

    tryFreshToken();
  }, [workingModelId, tokenLoading, tokenData, initialViewToken, viewToken, fallbackFileId, hasTriedFallbackToken]);

  // Handle token error only when all token attempts are exhausted
  useEffect(() => {
    if (tokenError && !viewToken && hasTriedFallbackToken && !isFetchingFallbackToken) {
      setError(tokenError instanceof Error ? tokenError.message : 'Failed to fetch viewer token');
      setLoading(false);
    }
  }, [tokenError, viewToken, hasTriedFallbackToken, isFetchingFallbackToken]);
  
  // Panel visibility
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [assetPanelVisible, setAssetPanelVisible] = useState(false);

  // Toggle panels with auto-close behavior
  const toggleLeftPanel = () => {
    setLeftPanelVisible(!leftPanelVisible);
    if (!leftPanelVisible) {
      setRightPanelVisible(false);
    }
  };

  const isResolvingToken =
    !viewToken &&
    !error &&
    (isLoadingModels || tokenLoading || isFetchingFallbackToken || !hasTriedFallbackToken);

  const toggleRightPanel = () => {
    setRightPanelVisible(!rightPanelVisible);
    if (!rightPanelVisible) {
      setLeftPanelVisible(false);
    }
  };
  
  // Panel positions for dragging
  const leftPanelX = useSharedValue(0);
  const leftPanelY = useSharedValue(0);
  const rightPanelX = useSharedValue(width - 350);
  const rightPanelY = useSharedValue(0);
  
  // Modal states
  const [sensorModalVisible, setSensorModalVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Digital Twin Viewer',
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.surface,
      },
      headerTintColor: colors.text,
    });
  }, [navigation]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'critical':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  // Get icon for sensor type
  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature':
        return 'thermometer';
      case 'humidity':
        return 'water';
      case 'occupancy':
        return 'people';
      case 'energy':
        return 'flash';
      case 'water':
        return 'water-outline';
      case 'security':
        return 'lock-closed';
      case 'air':
        return 'leaf';
      default:
        return 'pulse';
    }
  };

  // BIMFACE WebView HTML - matching reference implementation
  const getBimfaceHTML = (token: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #0a0a0a;
        }
        #viewer-container {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          background: #0a0a0a;
        }
      </style>
      <script src="https://static.bimface.com/api/BimfaceSDKLoader/BimfaceSDKLoader@latest-release.js"></script>
    </head>
    <body>
      <div id="viewer-container"></div>
      <script>
        console.log('Starting BIMFACE viewer initialization...');
        console.log('View token: ${token ? token.substring(0, 20) + '...' : 'null'}');
        
        var uniqueContainerId = 'bimface-container-' + Date.now();
        var container = document.getElementById('viewer-container');
        container.id = uniqueContainerId;
        
        console.log('Container ID: ' + uniqueContainerId);
        
        var loaderConfig = new BimfaceSDKLoaderConfig();
        loaderConfig.viewToken = '${token}';
        loaderConfig.language = 'en_GB';
        
        console.log('Loading BIMFACE SDK with config...');
        
        BimfaceSDKLoader.load(loaderConfig, 
          function successCallback(viewMetaData) {
            console.log('BIMFACE SDK loaded successfully');
            console.log('View metadata:', viewMetaData);
            
            if (viewMetaData.viewType === '3DView') {
              console.log('Initializing 3D viewer...');
              
              setTimeout(function() {
                var domShow = document.getElementById(uniqueContainerId);
                if (!domShow) {
                  console.error('Container element not found: ' + uniqueContainerId);
                  window.ReactNativeWebView.postMessage('ERROR: Container element not found');
                  return;
                }
                
                console.log('Container found, creating WebApplication3D...');
                domShow.style.width = window.innerWidth + 'px';
                domShow.style.height = window.innerHeight + 'px';
                console.log('Container dimensions:', domShow.clientWidth + 'x' + domShow.clientHeight);
                
                var webAppConfig = new Glodon.Bimface.Application.WebApplication3DConfig();
                webAppConfig.domElement = domShow;
                webAppConfig.globalUnit = Glodon.Bimface.Common.Units.LengthUnits.Millimeter;
                
                var app = new Glodon.Bimface.Application.WebApplication3D(webAppConfig);
                app.addView('${token}');
                
                var viewer = app.getViewer();

                window.addEventListener('resize', function() {
                  try {
                    domShow.style.width = window.innerWidth + 'px';
                    domShow.style.height = window.innerHeight + 'px';
                    if (viewer && viewer.resize) viewer.resize();
                    if (viewer) viewer.render();
                  } catch (resizeError) {
                    console.warn('Resize handling failed:', resizeError);
                  }
                });
                
                viewer.addEventListener(Glodon.Bimface.Viewer.Viewer3DEvent.ViewAdded, function() {
                  console.log('View added successfully!');
                  setTimeout(function() {
                    try {
                      if (viewer && viewer.fitView) viewer.fitView();
                      if (viewer && viewer.resize) viewer.resize();
                      if (viewer) viewer.render();
                    } catch (renderError) {
                      console.warn('Render stabilization failed:', renderError);
                    }
                    window.ReactNativeWebView.postMessage('VIEW_LOADED');
                  }, 300);
                });
                
                viewer.addEventListener(Glodon.Bimface.Viewer.Viewer3DEvent.ViewLoadFailed, function(error) {
                  console.error('View load failed:', error);
                  window.ReactNativeWebView.postMessage('ERROR: View load failed - ' + JSON.stringify(error));
                });
              }, 100);
            } else {
              console.error('Invalid view type: ' + viewMetaData.viewType);
              window.ReactNativeWebView.postMessage('ERROR: Invalid view type - ' + viewMetaData.viewType);
            }
          },
          function failureCallback(error) {
            console.error('Failed to load BIMFACE SDK:', error);
            window.ReactNativeWebView.postMessage('ERROR: SDK load failed - ' + JSON.stringify(error));
          }
        );
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    const message = event.nativeEvent.data;
    console.log('WebView message:', message);
    if (message === 'VIEW_LOADED') {
      setLoading(false);
    } else if (message.startsWith('ERROR: SDK load failed')) {
      setError(message.replace('ERROR: SDK load failed - ', ''));
      setLoading(false);
    } else if (message.startsWith('ERROR: View load failed')) {
      setError(message.replace('ERROR: View load failed - ', ''));
      setLoading(false);
    } else if (message.startsWith('ERROR: Container')) {
      setError(message.replace('ERROR: ', ''));
      setLoading(false);
    } else if (message.startsWith('ERROR: Invalid view type')) {
      setError(message.replace('ERROR: ', ''));
      setLoading(false);
    } else if (message.startsWith('LOG:')) {
      console.log('WebView console:', message);
    } else if (message.startsWith('WARN:')) {
      console.warn('WebView warning:', message);
    } else if (message.startsWith('ERROR:')) {
      console.error('WebView error:', message);
    }
  };

  // Sensor item component
  const SensorItem = ({ sensor, onPress }: { sensor: Sensor; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.sensorItem, { borderLeftColor: getStatusColor(sensor.status) }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.sensorIconContainer}>
        <Ionicons name={getSensorIcon(sensor.type) as any} size={24} color={getStatusColor(sensor.status)} />
      </View>
      <View style={styles.sensorInfo}>
        <Text style={styles.sensorName}>{sensor.name}</Text>
        <Text style={styles.sensorLocation}>{sensor.location} - Floor {sensor.floor}</Text>
      </View>
      <View style={styles.sensorValueContainer}>
        <Text style={styles.sensorValue}>{sensor.value} {sensor.unit}</Text>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensor.status) }]} />
      </View>
    </TouchableOpacity>
  );

  // Camera item component
  const CameraItem = ({ camera, onPress }: { camera: CCTVCamera; onPress: () => void }) => (
    <TouchableOpacity
      style={styles.cameraItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cameraIconContainer}>
        <Ionicons name="videocam" size={24} color={camera.isRecording ? colors.error : colors.success} />
      </View>
      <View style={styles.cameraInfo}>
        <Text style={styles.cameraName}>{camera.name}</Text>
        <Text style={styles.cameraLocation}>{camera.location}</Text>
      </View>
      <View style={styles.cameraStatusContainer}>
        {camera.isRecording && <View style={styles.recordingIndicator} />}
        <Text style={styles.cameraStatus}>{camera.status.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* BIMFACE WebView */}
        <View style={styles.viewerContainer}>
          {viewToken ? (
            <WebView
              key={viewToken}
              source={{ html: getBimfaceHTML(viewToken) }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              mixedContentMode="compatibility"
              allowsFullscreenVideo={true}
              allowFileAccess={true}
              originWhitelist={['*']}
              injectedJavaScript={`
                (function() {
                  const originalLog = console.log;
                  const originalError = console.error;
                  const originalWarn = console.warn;
                  
                  console.log = function(...args) {
                    originalLog.apply(console, args);
                    window.ReactNativeWebView.postMessage('LOG: ' + JSON.stringify(args));
                  };
                  
                  console.error = function(...args) {
                    originalError.apply(console, args);
                    window.ReactNativeWebView.postMessage('ERROR: ' + JSON.stringify(args));
                  };
                  
                  console.warn = function(...args) {
                    originalWarn.apply(console, args);
                    window.ReactNativeWebView.postMessage('WARN: ' + JSON.stringify(args));
                  };
                })();
              `}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error: ', nativeEvent);
                setError(`WebView error: ${nativeEvent.description}`);
                setLoading(false);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView HTTP error: ', nativeEvent);
                setError(`HTTP error: ${nativeEvent.statusCode}`);
                setLoading(false);
              }}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading 3D Model...</Text>
                </View>
              )}
              style={styles.webview}
            />
          ) : isResolvingToken ? (
            <View style={styles.loadingContainerSolid}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching view token...</Text>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.placeholderText}>No view token provided</Text>
              <Text style={styles.placeholderSubtext}>Please provide a valid view token</Text>
              <Text style={styles.placeholderSubtext}>Model ID: {workingModelId || 'None'}</Text>
              <Text style={styles.placeholderSubtext}>Token Loading: {tokenLoading ? 'Yes' : 'No'}</Text>
              <Text style={styles.placeholderSubtext}>Token Error: {tokenError ? 'Yes' : 'No'}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setLoading(true);
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Left Panel - Sensors */}
        {leftPanelVisible && (
          <Animated.View style={[styles.leftPanel, { transform: [{ translateX: leftPanelX }] }]}>
            <SafeAreaView style={styles.panelSafeArea}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Sensors</Text>
                <TouchableOpacity onPress={toggleLeftPanel}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.panelContent}>
                {sensors.map(sensor => (
                  <SensorItem
                    key={sensor.id}
                    sensor={sensor}
                    onPress={() => {
                      setSelectedSensor(sensor);
                      setSensorModalVisible(true);
                    }}
                  />
                ))}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        )}

        {/* Right Panel - CCTV */}
        {rightPanelVisible && (
          <Animated.View style={[styles.rightPanel, { transform: [{ translateX: rightPanelX }] }]}>
            <SafeAreaView style={styles.panelSafeArea}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>CCTV Cameras</Text>
                <TouchableOpacity onPress={toggleRightPanel}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.panelContent}>
                {cctvCameras.map(camera => (
                  <CameraItem
                    key={camera.id}
                    camera={camera}
                    onPress={() => {
                      setSelectedCamera(camera);
                      setCameraModalVisible(true);
                    }}
                  />
                ))}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        )}

        {/* Asset Panel */}
        {assetPanelVisible && (
          <Animated.View style={[styles.rightPanel, { transform: [{ translateX: rightPanelX }] }]}>
            <SafeAreaView style={styles.panelSafeArea}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Asset Information</Text>
                <TouchableOpacity onPress={() => setAssetPanelVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.panelContent}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search assets..."
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.assetCategory}>
                  <Text style={styles.assetCategoryTitle}>General</Text>
                  <Text style={styles.assetCategoryDesc}>Building systems and infrastructure</Text>
                </View>
                <View style={styles.assetCategory}>
                  <Text style={styles.assetCategoryTitle}>Documentations</Text>
                  <Text style={styles.assetCategoryDesc}>Technical manuals and specifications</Text>
                </View>
              </View>
            </SafeAreaView>
          </Animated.View>
        )}
      </View>

      {/* Bottom Controls Bar */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleLeftPanel}
        >
          <Ionicons name="list" size={20} color={colors.white} />
          <Text style={styles.toggleButtonText}>Sensors</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleRightPanel}
        >
          <Ionicons name="videocam" size={20} color={colors.white} />
          <Text style={styles.toggleButtonText}>CCTV</Text>
        </TouchableOpacity>
      </View>

      {/* Sensor Detail Modal */}
      <Modal
        visible={sensorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSensorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sensor Details</Text>
              <TouchableOpacity onPress={() => setSensorModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedSensor && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Floor:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.floor}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Value:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.value} {selectedSensor.unit}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedSensor.status) }]}>
                    <Text style={styles.statusBadgeText}>{selectedSensor.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Battery:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.battery}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Updated:</Text>
                  <Text style={styles.detailValue}>{selectedSensor.lastUpdated}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Camera Detail Modal */}
      <Modal
        visible={cameraModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Camera Details</Text>
              <TouchableOpacity onPress={() => setCameraModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedCamera && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Floor:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.floor}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.status.toUpperCase()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Resolution:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.resolution}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>View Angle:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.viewAngle}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recording:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.isRecording ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Activity:</Text>
                  <Text style={styles.detailValue}>{selectedCamera.lastActivity}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.white,
  },
  loadingContainerSolid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderText: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholderSubtext: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  leftPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 10,
  },
  panelSafeArea: {
    flex: 1,
  },
  rightPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    zIndex: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  panelContent: {
    flex: 1,
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
  },
  sensorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sensorLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sensorValueContainer: {
    alignItems: 'flex-end',
  },
  sensorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  cameraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cameraIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cameraLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cameraStatusContainer: {
    alignItems: 'flex-end',
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginBottom: 4,
  },
  cameraStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleButtons: {
    display: 'none',
  },
  toggleButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
    zIndex: 30,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.text,
  },
  assetCategory: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  assetCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  assetCategoryDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
