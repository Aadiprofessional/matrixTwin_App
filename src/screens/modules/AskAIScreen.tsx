import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  Linking,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import Clipboard from '@react-native-clipboard/clipboard';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { WebView } from 'react-native-webview';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { AIChatMessage, streamAIResponse } from '../../api/ai';
import {
  AIChatSession,
  createAIChatSession,
  deleteAIChatSession,
  insertAIChatMessage,
  listAIChatSessions,
  updateAIChatMessage,
  updateAIChatSession,
} from '../../api/aiChat';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type RouteProps = RouteProp<AppStackParamList, 'AskAI'>;
type AskAINavigation = NativeStackNavigationProp<AppStackParamList, 'AskAI'>;
type LocalRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: LocalRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  messageType?: 'text' | 'search' | 'docx' | 'xlsx';
}

const ACCENT = colors.primary;
const TEMP_CHAT_ID = 'temp';
const runtimeCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;

const createId = () => {
  if (runtimeCrypto?.randomUUID) {
    return runtimeCrypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const randomNibble = Math.floor(Math.random() * 16);
    const v = c === 'x' ? randomNibble : ((randomNibble % 4) + 8);
    return v.toString(16);
  });
};

const extractLinkUrls = (content: string): string[] => {
  const urls: string[] = [];
  const urlRegex = /(https?:\/\/[^\s<>"'`\])}]+)/gi;
  const markdownRegex = /\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi;

  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(content)) !== null) {
    urls.push(match[1].replace(/[),.;!?]+$/g, ''));
  }
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.push(match[1].replace(/[),.;!?]+$/g, ''));
  }

  return Array.from(new Set(urls));
};

const createGreeting = (): Message => ({
  id: 'greeting',
  role: 'assistant',
  content:
    "Hello! I'm your **MatrixTwin AI** assistant. I can help you with construction project management, site diaries, safety inspections, RFIs, and more.\n\nHow can I help you today?",
  timestamp: new Date().toISOString(),
});

const toLocalMessage = (message: AIChatSession['messages'][number]): Message => ({
  id: message.id,
  role: message.sender === 'ai' ? 'assistant' : 'user',
  content: message.content,
  timestamp: message.timestamp,
  isStreaming: !!message.is_streaming,
});

const buildInitialMessages = (session?: AIChatSession | null) => {
  if (!session || session.messages.length === 0) {
    return [createGreeting()];
  }
  return session.messages.map(toLocalMessage);
};

const buildChatTitle = (message: string) => {
  const trimmed = message.trim();
  if (!trimmed) return 'New Chat';
  return trimmed.length > 30 ? `${trimmed.slice(0, 27)}...` : trimmed;
};

type GeneratedFileType =
  | 'xlsx'
  | 'docx'
  | 'pdf'
  | 'image'
  | 'document'
  | 'link';

interface GeneratedFileAttachment {
  url: string;
  fileType: GeneratedFileType;
  fileName: string;
}

interface DiaryRow {
  status: string;
  dateLabel: string;
  title: string;
  id: string;
}

interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

interface FormLinkRow {
  id: string;
  title: string;
  status: string;
  formType: string;
}

const stripLinkUrlBlocks = (content: string): string =>
  content.replace(/```linkurl\s*[\s\S]*?```/gi, '').trim();

const extractTextFromJsonPayload = (payload: unknown): string | null => {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return payload;

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsedNested = JSON.parse(trimmed);
        return extractTextFromJsonPayload(parsedNested);
      } catch {
        return payload;
      }
    }

    return payload;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const extracted = extractTextFromJsonPayload(item);
      if (typeof extracted === 'string' && extracted.trim()) {
        return extracted;
      }
    }
    return null;
  }

  if (payload && typeof payload === 'object') {
    const typedPayload = payload as Record<string, unknown>;
    const keys: Array<'output' | 'response' | 'text' | 'content' | 'message'> = [
      'output',
      'response',
      'text',
      'content',
      'message',
    ];

    for (const key of keys) {
      const extracted = extractTextFromJsonPayload(typedPayload[key]);
      if (typeof extracted === 'string' && extracted.trim()) {
        return extracted;
      }
    }
  }

  return null;
};

const normalizePotentialJsonMessage = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = JSON.parse(trimmed);
    const extracted = extractTextFromJsonPayload(parsed);
    if (typeof extracted === 'string') {
      return extracted;
    }
  } catch {
    return content;
  }

  return content;
};

const normalizeAssistantContent = (content: string): string =>
  normalizePotentialJsonMessage(stripLinkUrlBlocks(content))
    .replace(/^\s*(?:bot\s*reply|assistant\s*reply|assistant|ai)\s*[:-]\s*/i, '')
    .replace(/^\s*continue\s+as\s*[:-]\s*/i, '')
    .replace(/`(https?:\/\/[^`\s]+)`/gi, '[$1]($1)')
    .replace(/<!--FORMS_JSON_START-->([\s\S]*?)<!--FORMS_JSON_END-->/gi, '\n```forms-json\n$1\n```\n')
    .replace(/```\s*chartjs/gi, '\n```chartjs')
    .replace(/([^\n])```/g, '$1\n```');

const TypingDots = () => {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDot(prev => (prev + 1) % 3);
    }, 320);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.typingDotsWrap}>
      {[0, 1, 2].map(index => (
        <View
          key={`typing-dot-${index}`}
          style={[
            styles.typingDot,
            activeDot === index ? styles.typingDotActive : null,
          ]}
        />
      ))}
    </View>
  );
};

const getFileNameFromUrl = (url: string): string => {
  const withoutQuery = url.split('?')[0];
  const rawName = withoutQuery.split('/').pop() || '';
  try {
    return decodeURIComponent(rawName) || 'attachment';
  } catch {
    return rawName || 'attachment';
  }
};

const resolveGeneratedFileType = (url: string): GeneratedFileType => {
  const path = url.split('?')[0].split('#')[0].toLowerCase();

  if (path.endsWith('.xlsx') || path.endsWith('.xls') || path.endsWith('.csv')) return 'xlsx';
  if (path.endsWith('.docx') || path.endsWith('.doc') || path.endsWith('.txt')) return 'docx';
  if (path.endsWith('.pdf')) return 'pdf';
  if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.webp')) {
    return 'image';
  }
  if (path.endsWith('.ppt') || path.endsWith('.pptx')) return 'document';
  return 'link';
};

const extractGeneratedFileAttachments = (content: string): GeneratedFileAttachment[] => {
  const urls = extractLinkUrls(content);
  return urls.map(url => ({
    url,
    fileType: resolveGeneratedFileType(url),
    fileName: getFileNameFromUrl(url),
  }));
};

const parseMarkdownTableBlock = (block: string): MarkdownTable | null => {
  const lines = block
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const headers = lines[0]
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean);

  if (headers.length === 0) return null;

  const rows = lines.slice(2).map(line =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim()),
  );

  return { headers, rows };
};

const extractMarkdownTables = (content: string): MarkdownTable[] => {
  const tables: MarkdownTable[] = [];
  const tableRegex = /(?:^|\n)(\|[^\n]*\|\n\|[\s:\-|]+\|\n(?:\|[^\n]*\|\n?)*)/g;

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(content)) !== null) {
    const table = parseMarkdownTableBlock((match[1] || '').trim());
    if (table && table.rows.length > 0) {
      tables.push(table);
    }
  }

  return tables;
};

const stripMarkdownTables = (content: string): string =>
  content.replace(/(?:^|\n)(\|[^\n]*\|\n\|[\s:\-|]+\|\n(?:\|[^\n]*\|\n?)*)/g, '\n').trim();

const normalizeFormRows = (payload: unknown): FormLinkRow[] => {
  if (!payload || typeof payload !== 'object') return [];

  const typedPayload = payload as Record<string, unknown>;
  const forms = Array.isArray(typedPayload.forms) ? typedPayload.forms : [];

  return forms
    .map((form, index): FormLinkRow | null => {
      if (!form || typeof form !== 'object') return null;
      const typedForm = form as Record<string, unknown>;
      const id = String(
        typedForm.id || typedForm.form_id || typedForm.template_id || typedForm.formId || `form-${index + 1}`,
      );
      const title = String(typedForm.title || typedForm.name || typedForm.form_name || `Form ${index + 1}`);
      const status = String(typedForm.status || typedForm.workflow_status || 'available');
      const formType = String(typedForm.type || typedForm.form_type || 'custom');

      return {
        id,
        title,
        status,
        formType,
      };
    })
    .filter((row): row is FormLinkRow => row !== null);
};

const extractFormsJsonRows = (content: string): FormLinkRow[] => {
  const rows: FormLinkRow[] = [];
  const formsCodeRegex = /```forms-json\s*([\s\S]*?)```/gi;

  let match: RegExpExecArray | null;
  while ((match = formsCodeRegex.exec(content)) !== null) {
    const block = (match[1] || '').trim();
    if (!block) continue;

    try {
      rows.push(...normalizeFormRows(JSON.parse(block)));
    } catch {
      // ignore malformed forms-json blocks
    }
  }

  return rows;
};

const stripFormsJsonBlocks = (content: string): string =>
  content.replace(/```forms-json\s*[\s\S]*?```/gi, '').trim();

const removeGeneratedFileUrlsFromText = (content: string): string =>
  content
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s<>"'`]+?\.(?:xlsx|xls|docx|doc|csv|txt|pdf|ppt|pptx|png|jpe?g|webp)(?:\?[^\s<>"'`]*)?(?:#[^\s<>"'`]*)?)\)/gi,
      '$1',
    )
    .replace(
      /`?(https?:\/\/[^\s<>"'`]+?\.(?:xlsx|xls|docx|doc|csv|txt|pdf|ppt|pptx|png|jpe?g|webp)(?:\?[^\s<>"'`]*)?(?:#[^\s<>"'`]*)?)`?/gi,
      '',
    )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractChartConfigs = (content: string): Record<string, any>[] => {
  const chartConfigs: Record<string, any>[] = [];
  const blockRegex = /```chartjs\s*([\s\S]*?)```/gi;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(content)) !== null) {
    const payload = (match[1] || '').trim();
    if (!payload) continue;

    try {
      chartConfigs.push(JSON.parse(payload));
    } catch {
      // ignore malformed chart blocks
    }
  }

  return chartConfigs;
};

const stripChartBlocks = (content: string): string =>
  content.replace(/```chartjs\s*[\s\S]*?```/gi, '').trim();

const extractDiaryRows = (content: string): DiaryRow[] => {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const rows: DiaryRow[] = [];
  let status = '';
  let dateLabel = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^(pending|completed|in[-\s]?progress)\b/i.test(line) && /\d{4}/.test(line)) {
      const parts = line.split(/\s+/);
      status = parts[0];
      dateLabel = parts.slice(1).join(' ');
      continue;
    }

    const diaryMatch = line.match(/^Diary Entry\s*[–-]\s*(.+)$/i);
    if (!diaryMatch) continue;

    let diaryId = '';
    const nextLine = lines[index + 1] || '';
    const idMatch = nextLine.match(/^ID:\s*(.+)$/i);
    if (idMatch) {
      diaryId = idMatch[1].trim();
    }

    rows.push({
      status: status || 'pending',
      dateLabel,
      title: diaryMatch[1].trim(),
      id: diaryId,
    });
  }

  return rows;
};

const getAttachmentIcon = (fileType: GeneratedFileType) => {
  switch (fileType) {
    case 'xlsx':
      return 'file-excel-outline';
    case 'docx':
      return 'file-word-outline';
    case 'pdf':
      return 'file-pdf-box';
    case 'image':
      return 'file-image-outline';
    case 'document':
      return 'file-document-outline';
    default:
      return 'link-variant';
  }
};

const chartPalette = ['#4CC9F0', '#F72585', '#4895EF', '#F8961E', '#43AA8B', '#9D4EDD'];

const hexToRgba = (hex: string, opacity: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return `rgba(255,255,255,${opacity})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const renderChartCard = (config: Record<string, any>, width: number, index: number) => {
  const data = config?.data || {};
  const labels: string[] = Array.isArray(data.labels) ? data.labels : [];
  const datasets: Array<{ data?: number[]; backgroundColor?: string[] }> = Array.isArray(data.datasets)
    ? data.datasets
    : [];

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: '3', strokeWidth: '1', stroke: ACCENT },
  };

  const chartType = (config?.type || 'bar').toString().toLowerCase();
  const safeWidth = Math.max(240, width - 24);
  const minDynamicWidth = Math.max(safeWidth, labels.length * 64);
  const chartTitle = config?.options?.plugins?.title?.text;
  const longestLabelLength = labels.reduce((max, label) => Math.max(max, String(label).length), 0);
  const labelHeightAllowance = Math.min(80, Math.max(0, (longestLabelLength - 6) * 3));
  const dynamicChartHeight = Math.max(230, 220 + labelHeightAllowance + (labels.length > 4 ? 18 : 0));

  if (chartType === 'pie' || chartType === 'doughnut') {
    const firstDataset = datasets[0]?.data || [];
    if (firstDataset.length === 0) return null;

    const pieData = firstDataset.map((value, itemIndex) => ({
      name: labels[itemIndex] || `Item ${itemIndex + 1}`,
      population: Number(value) || 0,
      color: datasets[0]?.backgroundColor?.[itemIndex] || `${ACCENT}CC`,
      legendFontColor: colors.text,
      legendFontSize: 11,
    }));

    return (
      <View key={`pie-${index}`} style={styles.chartCard}>
        {typeof chartTitle === 'string' && chartTitle.trim() ? (
          <Text style={styles.chartTitle}>{chartTitle}</Text>
        ) : null}
        <PieChart
          data={pieData}
          width={safeWidth}
          height={230}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="8"
          absolute
        />
      </View>
    );
  }

  if (datasets.length === 0) return null;

  const safeData = {
    labels: labels.length > 0 ? labels : ['A', 'B', 'C'],
    datasets: datasets.map((dataset, datasetIndex) => ({
      data: Array.isArray(dataset.data) && dataset.data.length > 0 ? dataset.data : [0],
      color: (opacity = 1) => hexToRgba(chartPalette[datasetIndex % chartPalette.length], opacity),
      strokeWidth: 2,
    })),
    legend: datasets.map((_, datasetIndex) => `Series ${datasetIndex + 1}`),
  };

  if (chartType === 'line') {
    return (
      <View key={`line-${index}`} style={styles.chartCard}>
        {typeof chartTitle === 'string' && chartTitle.trim() ? (
          <Text style={styles.chartTitle}>{chartTitle}</Text>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroller}>
          <LineChart
            data={safeData}
            width={minDynamicWidth}
            height={dynamicChartHeight}
            chartConfig={chartConfig}
            verticalLabelRotation={labels.length > 4 ? 18 : 0}
            bezier
            style={styles.chartSurface}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View key={`bar-${index}`} style={styles.chartCard}>
      {typeof chartTitle === 'string' && chartTitle.trim() ? (
        <Text style={styles.chartTitle}>{chartTitle}</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroller}>
        <BarChart
          data={safeData}
          width={minDynamicWidth}
          height={dynamicChartHeight}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          style={styles.chartSurface}
          verticalLabelRotation={labels.length > 3 ? 22 : 0}
          fromZero
        />
      </ScrollView>
    </View>
  );
};

export default function AskAIScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<AskAINavigation>();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();
  const { width: screenWidth } = useWindowDimensions();

  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(TEMP_CHAT_ID);
  const [messages, setMessages] = useState<Message[]>([createGreeting()]);
  const [inputText, setInputText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'text' | 'search' | 'docx' | 'xlsx'>('text');
  const [activeLinksMessageId, setActiveLinksMessageId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<GeneratedFileAttachment | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const currentStreamRef = useRef('');

  const projectSessions = useMemo(
    () => sessions.filter(session => session.projectId === projectId),
    [projectId, sessions],
  );

  const syncSessionMessages = useCallback((sessionId: string, nextMessages: Message[]) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: nextMessages
                .filter(message => message.id !== 'greeting')
                .map(message => ({
                  id: message.id,
                  content: message.content,
                  sender: message.role === 'assistant' ? 'ai' : 'user',
                  timestamp: message.timestamp,
                  is_streaming: message.isStreaming ?? false,
                })),
              lastUpdatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
  }, []);

  const openAttachment = useCallback((attachment: GeneratedFileAttachment) => {
    if (attachment.fileType === 'xlsx' || attachment.fileType === 'docx') {
      setPreviewAttachment(attachment);
      return;
    }

    Linking.openURL(attachment.url).catch(error => {
      console.error('Failed to open attachment URL:', error);
    });
  }, []);

  const openFormsModule = useCallback(() => {
    navigation.navigate('Forms', { projectId, projectName });
  }, [navigation, projectId, projectName]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const hydrateProjectChats = useCallback(async () => {
    if (!user?.id) {
      setLoadingHistory(false);
      return;
    }

    try {
      setLoadingHistory(true);
      const allSessions = await listAIChatSessions(user.id);
      setSessions(allSessions);

      const latestProjectSession = allSessions
        .filter(session => session.projectId === projectId)
        .sort(
          (a, b) =>
            new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime(),
        )[0];

      if (latestProjectSession) {
        setCurrentSessionId(latestProjectSession.id);
        setMessages(buildInitialMessages(latestProjectSession));
      } else {
        setCurrentSessionId(TEMP_CHAT_ID);
        setMessages([createGreeting()]);
      }
    } catch (error) {
      console.error('Failed to load AI chat history:', error);
      setCurrentSessionId(TEMP_CHAT_ID);
      setMessages([createGreeting()]);
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    hydrateProjectChats();
  }, [hydrateProjectChats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const switchToSession = useCallback(
    (session: AIChatSession) => {
      setCurrentSessionId(session.id);
      setMessages(buildInitialMessages(session));
      setShowHistory(false);
      setSelectedMode('text');
    },
    [],
  );

  const startNewChat = useCallback(() => {
    setCurrentSessionId(TEMP_CHAT_ID);
    setMessages([createGreeting()]);
    setInputText('');
    setIsStreaming(false);
    setShowHistory(false);
    setSelectedMode('text');
    setActiveLinksMessageId(null);
  }, []);

  const handleShareMessage = useCallback(async (content: string) => {
    try {
      await Share.share({ message: content });
    } catch (error) {
      console.error('Failed to share message:', error);
    }
  }, []);

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      Clipboard.setString(content);
      Alert.alert('Copied', 'Message copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, []);

  const ensureChatSession = useCallback(
    async (firstUserMessage: string) => {
      if (!user?.id) {
        throw new Error('User not found.');
      }

      if (currentSessionId !== TEMP_CHAT_ID) {
        return currentSessionId;
      }

      const createdAt = new Date().toISOString();
      const newSessionId = createId();
      const title = buildChatTitle(firstUserMessage);
      const greeting = messages[0] ?? createGreeting();

      await createAIChatSession({
        id: newSessionId,
        userId: user.id,
        projectId,
        title,
        createdAt,
      });

      await insertAIChatMessage({
        id: createId(),
        sessionId: newSessionId,
        content: greeting.content,
        sender: 'ai',
        timestamp: greeting.timestamp,
      });

      const newSession: AIChatSession = {
        id: newSessionId,
        userId: user.id,
        projectId,
        title,
        createdAt,
        lastUpdatedAt: createdAt,
        messages: [
          {
            id: greeting.id,
            content: greeting.content,
            sender: 'ai',
            timestamp: greeting.timestamp,
            is_streaming: false,
          },
        ],
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);

      return newSessionId;
    },
    [currentSessionId, messages, projectId, user?.id],
  );

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !user?.id || isStreaming) {
      return;
    }
    const modeAtSend = selectedMode;

    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      messageType: selectedMode,
    };

    const assistantMessageId = createId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setInputText('');
    setIsStreaming(true);
    setSelectedMode('text');
    currentStreamRef.current = '';

    try {
      const sessionId = await ensureChatSession(text);
      const nextMessages = [...messages, userMessage, assistantMessage];
      const existingUserMessages = messages.filter(message => message.role === 'user').length;

      setMessages(nextMessages);
      syncSessionMessages(sessionId, nextMessages);

      await insertAIChatMessage({
        id: userMessage.id,
        sessionId,
        content: userMessage.content,
        sender: 'user',
        timestamp: userMessage.timestamp,
      });

      await insertAIChatMessage({
        id: assistantMessage.id,
        sessionId,
        content: '',
        sender: 'ai',
        timestamp: assistantMessage.timestamp,
        isStreaming: true,
      });

      if (existingUserMessages === 0) {
        await updateAIChatSession(sessionId, {
          title: buildChatTitle(text),
          last_updated_at: new Date().toISOString(),
        });
      }

      const apiMessages: AIChatMessage[] = [
        {
          uid: user.id,
          type: modeAtSend,
          role: 'user',
          roleDescription: 'user',
          text: { body: text },
          body: text,
          content: text,
          timestamp: new Date().toLocaleString(),
          chatid: sessionId,
          projectId,
        },
      ];

      await streamAIResponse(
        sessionId,
        projectId,
        apiMessages,
        chunk => {
          currentStreamRef.current += chunk;
          setMessages(prev => {
            const updated = prev.map(message =>
              message.id === assistantMessageId
                ? { ...message, content: currentStreamRef.current, isStreaming: true }
                : message,
            );
            syncSessionMessages(sessionId, updated);
            return updated;
          });
        },
        async () => {
          setMessages(prev => {
            const updated = prev.map(message =>
              message.id === assistantMessageId
                ? { ...message, isStreaming: false }
                : message,
            );
            syncSessionMessages(sessionId, updated);
            return updated;
          });
          setIsStreaming(false);
          await updateAIChatMessage(assistantMessageId, {
            content: currentStreamRef.current,
            is_streaming: false,
          });
          await updateAIChatSession(sessionId, {
            last_updated_at: new Date().toISOString(),
          });
        },
        async err => {
          const errorMessage = `Sorry, I encountered an error: ${err}. Please try again.`;
          setMessages(prev => {
            const updated = prev.map(message =>
              message.id === assistantMessageId
                ? { ...message, content: errorMessage, isStreaming: false }
                : message,
            );
            syncSessionMessages(sessionId, updated);
            return updated;
          });
          setIsStreaming(false);
          await updateAIChatMessage(assistantMessageId, {
            content: errorMessage,
            is_streaming: false,
          });
          await updateAIChatSession(sessionId, {
            last_updated_at: new Date().toISOString(),
          });
        },
      );
    } catch (error) {
      console.error('Failed to send AI message:', error);
      setIsStreaming(false);
      Alert.alert('Ask AI', 'Unable to send your message right now.');
    }
  }, [
    ensureChatSession,
    inputText,
    isStreaming,
    messages,
    selectedMode,
    projectId,
    syncSessionMessages,
    user?.id,
  ]);

  const handleDeleteSession = useCallback(
    async (session: AIChatSession) => {
      if (!user?.id) {
        return;
      }

      setDeletingSessionId(session.id);
      try {
        await deleteAIChatSession(session.id, user.id);
        const remaining = sessions.filter(item => item.id !== session.id);
        setSessions(remaining);

        if (currentSessionId === session.id) {
          const nextSession = remaining
            .filter(item => item.projectId === projectId)
            .sort(
              (a, b) =>
                new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime(),
            )[0];

          if (nextSession) {
            setCurrentSessionId(nextSession.id);
            setMessages(buildInitialMessages(nextSession));
          } else {
            startNewChat();
          }
        }
      } catch (error) {
        console.error('Failed to delete AI chat:', error);
        Alert.alert('Ask AI', 'Unable to delete this chat.');
      } finally {
        setDeletingSessionId(null);
      }
    },
    [currentSessionId, projectId, sessions, startNewChat, user?.id],
  );

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const links = !isUser ? extractLinkUrls(item.content) : [];
    const isLinksOpen = activeLinksMessageId === item.id;
    const normalizedContent = !isUser ? normalizeAssistantContent(item.content) : item.content;
    const chartConfigs = !isUser ? extractChartConfigs(normalizedContent) : [];
    const diaryRows = !isUser ? extractDiaryRows(normalizedContent) : [];
    const attachments = !isUser ? extractGeneratedFileAttachments(normalizedContent) : [];
    const tables = !isUser ? extractMarkdownTables(normalizedContent) : [];
    const formsRows = !isUser ? extractFormsJsonRows(normalizedContent) : [];
    const markdownContent = !isUser
      ? removeGeneratedFileUrlsFromText(
          stripMarkdownTables(stripFormsJsonBlocks(stripChartBlocks(normalizedContent))),
        )
      : item.content;

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={styles.messageStack}>
          <View style={isUser ? styles.userBubble : [styles.bubble, styles.assistantBubble]}>
            {isUser ? (
              <Text style={styles.userText}>{item.content}</Text>
            ) : (
              <>
                <Markdown style={markdownStyles}>{markdownContent || ' '}</Markdown>
                {chartConfigs.map((config, index) =>
                  renderChartCard(config, Math.max(260, screenWidth * 0.72), index),
                )}
                {attachments.length > 0 ? (
                  <View style={styles.attachmentList}>
                    {attachments.map(attachment => (
                      <TouchableOpacity
                        key={`${item.id}-${attachment.url}`}
                        style={styles.attachmentCard}
                        onPress={() => openAttachment(attachment)}>
                        <View style={styles.attachmentLeft}>
                          <Icon
                            name={getAttachmentIcon(attachment.fileType)}
                            size={16}
                            color={ACCENT}
                          />
                          <Text style={styles.attachmentName} numberOfLines={1}>
                            {attachment.fileName}
                          </Text>
                        </View>
                        <Icon name="open-in-new" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                {tables.length > 0 ? (
                  <View style={styles.tableList}>
                    {tables.map((table, tableIndex) => (
                      <View key={`${item.id}-table-${tableIndex}`} style={styles.tableCard}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View>
                            <View style={[styles.tableRow, styles.tableHeaderRow]}>
                              {table.headers.map((header, headerIndex) => (
                                <View key={`${item.id}-th-${tableIndex}-${headerIndex}`} style={styles.tableCell}>
                                  <Text style={styles.tableHeaderText}>{header}</Text>
                                </View>
                              ))}
                            </View>
                            {table.rows.map((row, rowIndex) => (
                              <View
                                key={`${item.id}-tr-${tableIndex}-${rowIndex}`}
                                style={[styles.tableRow, rowIndex % 2 === 0 ? styles.tableAltRow : null]}>
                                {row.map((cell, cellIndex) => (
                                  <View
                                    key={`${item.id}-td-${tableIndex}-${rowIndex}-${cellIndex}`}
                                    style={styles.tableCell}>
                                    <Text style={styles.tableCellText}>{cell || '-'}</Text>
                                  </View>
                                ))}
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    ))}
                  </View>
                ) : null}
                {formsRows.length > 0 ? (
                  <View style={styles.formsList}>
                    {formsRows.map((form, formIndex) => (
                      <TouchableOpacity
                        key={`${item.id}-form-${form.id}-${formIndex}`}
                        style={styles.formCard}
                        onPress={openFormsModule}>
                        <View style={styles.formCardTop}>
                          <Text style={styles.formStatus}>{form.status.toUpperCase()}</Text>
                          <Text style={styles.formType}>{form.formType}</Text>
                        </View>
                        <Text style={styles.formTitle} numberOfLines={2}>
                          {form.title}
                        </Text>
                        <Text style={styles.formId}>ID: {form.id}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                {diaryRows.length > 0 ? (
                  <View style={styles.diaryList}>
                    {diaryRows.map((row, index) => (
                      <View key={`${item.id}-diary-${index}`} style={styles.diaryCard}>
                        <View style={styles.diaryCardTop}>
                          <Text style={styles.diaryStatus}>{row.status.toUpperCase()}</Text>
                          <Text style={styles.diaryDate} numberOfLines={1}>
                            {row.dateLabel || 'Latest'}
                          </Text>
                        </View>
                        <Text style={styles.diaryTitle} numberOfLines={2}>
                          {row.title}
                        </Text>
                        {row.id ? <Text style={styles.diaryId}>ID: {row.id}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}
                {item.isStreaming ? <TypingDots /> : null}
              </>
            )}
          </View>
          <View style={[styles.messageMeta, isUser ? styles.userMessageMeta : styles.assistantMessageMeta]}>
            {!isUser ? (
              <View style={styles.messageActions}>
                {links.length > 0 ? (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isLinksOpen ? styles.actionBtnActive : null,
                    ]}
                    onPress={() => setActiveLinksMessageId(isLinksOpen ? null : item.id)}>
                    <Icon
                      name="link-variant"
                      size={13}
                      color={isLinksOpen ? ACCENT : colors.textMuted}
                    />
                  </TouchableOpacity>
                ) : null}
                {!item.isStreaming ? (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleCopyMessage(item.content)}>
                      <Icon name="content-copy" size={13} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleShareMessage(item.content)}>
                      <Icon name="share-variant-outline" size={13} color={colors.textMuted} />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}
            <Text style={[styles.msgTime, isUser ? styles.userMsgTime : null]}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isUser ? (
              <View style={[styles.messageActions, styles.userMessageActions]}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleCopyMessage(item.content)}>
                  <Icon name="content-copy" size={13} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleShareMessage(item.content)}>
                  <Icon name="share-variant-outline" size={13} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          {!isUser && links.length > 0 && isLinksOpen ? (
            <View style={styles.linksPanel}>
              {links.map(url => (
                <TouchableOpacity
                  key={`${item.id}-${url}`}
                  onPress={() => Linking.openURL(url)}>
                  <Text style={styles.linkText}>{url}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  }, [
    activeLinksMessageId,
    handleCopyMessage,
    handleShareMessage,
    openAttachment,
    openFormsModule,
    screenWidth,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconWrap}>
            <Icon name="brain" size={18} color={ACCENT} />
          </View>
          <View>
            <Text style={styles.headerTitle}>MatrixTwin AI</Text>
            <Text style={styles.headerSub}>{projectName}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowHistory(true)}>
            <Icon name="history" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={startNewChat}>
            <Icon name="plus-circle-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}>
        {loadingHistory ? (
          <View style={styles.loadingState}>
            <SkeletonPlaceholder
              backgroundColor={colors.surface}
              highlightColor={colors.surfaceElevated}>
              <View style={styles.skeletonContainer}>
                <View style={styles.skeletonRowLeft} />
                <View style={styles.skeletonRowRight} />
                <View style={styles.skeletonRowLeftWide} />
                <View style={styles.skeletonRowRightSmall} />
              </View>
            </SkeletonPlaceholder>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          />
        )}

        <View style={styles.modeBar}>
          <TouchableOpacity
            style={[styles.modeBtn, selectedMode === 'docx' ? styles.modeBtnActive : null]}
            onPress={() => setSelectedMode('docx')}>
            <Text style={[styles.modeBtnText, selectedMode === 'docx' ? styles.modeBtnTextActive : null]}>
              Generate DOCX
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, selectedMode === 'xlsx' ? styles.modeBtnActive : null]}
            onPress={() => setSelectedMode('xlsx')}>
            <Text style={[styles.modeBtnText, selectedMode === 'xlsx' ? styles.modeBtnTextActive : null]}>
              Generate XLSX
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your project..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.inlineSearchBtn, selectedMode === 'search' ? styles.inlineSearchBtnActive : null]}
              onPress={() => setSelectedMode(prev => (prev === 'search' ? 'text' : 'search'))}>
              <Icon
                name="earth"
                size={16}
                color={selectedMode === 'search' ? ACCENT : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isStreaming || loadingHistory) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isStreaming || loadingHistory}>
            {isStreaming ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showHistory} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.historyOverlay} 
          activeOpacity={1}
          onPress={() => setShowHistory(false)}>
          <TouchableOpacity 
            style={styles.historyOverlayInner} 
            activeOpacity={1}
            onPress={e => e.stopPropagation()}>
            <SafeAreaView style={styles.historySheet} edges={['top', 'bottom', 'left', 'right']}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Chat History</Text>
                <TouchableOpacity onPress={() => setShowHistory(false)}>
                  <Icon name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {projectSessions.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Icon name="history" size={40} color={colors.border} />
                  <Text style={styles.historyEmptyText}>No previous chats</Text>
                  <Text style={styles.historyEmptySubText}>
                    Start a new conversation to save project-specific history.
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {projectSessions.map(session => (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.historyItem,
                        currentSessionId === session.id ? styles.historyItemActive : null,
                      ]}
                      onPress={() => switchToSession(session)}>
                      <View style={styles.historyIconWrap}>
                        <Icon name="chat-outline" size={16} color={ACCENT} />
                      </View>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyItemTitle} numberOfLines={1}>
                          {session.title}
                        </Text>
                        <Text style={styles.historyItemDate}>
                          {new Date(session.lastUpdatedAt).toLocaleDateString()} ·{' '}
                          {new Date(session.lastUpdatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} ·{' '}
                          {session.messages.filter(message => message.sender === 'user').length} messages
                        </Text>
                      </View>
                      <TouchableOpacity
                        disabled={deletingSessionId === session.id}
                        onPress={() =>
                          Alert.alert('Delete Chat', 'Remove this saved chat history?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => handleDeleteSession(session),
                            },
                          ])
                        }
                        style={styles.historyDeleteBtn}>
                        {deletingSessionId === session.id ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Icon name="delete-outline" size={18} color={colors.error} />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </SafeAreaView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={Boolean(previewAttachment)} animationType="slide">
        <SafeAreaView style={styles.previewRoot}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewAttachment(null)} style={styles.previewBackBtn}>
              <Icon name="arrow-left" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.previewHeaderMeta}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewAttachment?.fileType === 'xlsx' ? 'Excel Preview' : 'Word Preview'}
              </Text>
              <Text style={styles.previewSubtitle} numberOfLines={1}>
                {previewAttachment?.fileName || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewOpenBtn}
              onPress={() =>
                previewAttachment
                  ? Linking.openURL(previewAttachment.url).catch(error => {
                      console.error('Failed to open original file URL:', error);
                    })
                  : undefined
              }>
              <Icon name="open-in-new" size={16} color={ACCENT} />
            </TouchableOpacity>
          </View>

          {previewAttachment ? (
            <View style={styles.previewWebWrap}>
              <WebView
                source={{
                  uri: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewAttachment.url)}`,
                }}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.previewLoader}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={styles.previewLoaderText}>Loading document preview...</Text>
                  </View>
                )}
              />
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  heading1: { color: colors.text, fontWeight: '700' as const, fontSize: 18, marginBottom: 8 },
  heading2: { color: colors.text, fontWeight: '700' as const, fontSize: 16, marginBottom: 6 },
  heading3: { color: colors.text, fontWeight: '600' as const, fontSize: 14, marginBottom: 4 },
  strong: { color: colors.text, fontWeight: '700' as const },
  em: { color: colors.textSecondary, fontStyle: 'italic' as const },
  code_inline: {
    backgroundColor: colors.surface,
    color: ACCENT,
    fontFamily: 'monospace',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text,
  },
  fence: { backgroundColor: colors.surface, borderRadius: 8, padding: 12 },
  bullet_list: { marginLeft: 8 },
  ordered_list: { marginLeft: 8 },
  list_item: { color: colors.text, fontSize: 14, lineHeight: 21 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    paddingLeft: 8,
    marginLeft: 0,
    color: colors.textSecondary,
  },
  link: { color: ACCENT },
  hr: { backgroundColor: colors.border, height: 1 },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  th: {
    backgroundColor: colors.surface,
    padding: 8,
    color: colors.textMuted,
    fontWeight: '700' as const,
    fontSize: 12,
  },
  td: {
    padding: 8,
    color: colors.text,
    fontSize: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardWrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: { padding: spacing.xs },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${ACCENT}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${ACCENT}44`,
  },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 11 },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  headerBtn: { padding: spacing.xs },
  loadingState: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  skeletonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  skeletonRowLeft: {
    width: '72%',
    height: 78,
    borderRadius: radius.lg,
  },
  skeletonRowRight: {
    width: '62%',
    height: 60,
    borderRadius: radius.lg,
    alignSelf: 'flex-end',
  },
  skeletonRowLeftWide: {
    width: '86%',
    height: 88,
    borderRadius: radius.lg,
  },
  skeletonRowRightSmall: {
    width: '54%',
    height: 54,
    borderRadius: radius.lg,
    alignSelf: 'flex-end',
  },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    width: '100%',
  },
  messageRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  messageStack: { flex: 1 },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${ACCENT}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${ACCENT}44`,
    marginTop: spacing.xs,
  },
  bubble: { maxWidth: '95%', borderRadius: radius.lg, padding: spacing.md },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    padding: spacing.xs,
  },
  assistantBubble: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomLeftRadius: 4,
    width: '95%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  userText: { color: colors.white, fontSize: 14, lineHeight: 21 },
  messageMeta: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assistantMessageMeta: {
    justifyContent: 'flex-start',
  },
  userMessageMeta: {
    justifyContent: 'flex-end',
  },
  typingDotsWrap: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${ACCENT}55`,
  },
  typingDotActive: {
    backgroundColor: ACCENT,
    transform: [{ scale: 1.18 }],
  },
  msgTime: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'right',
  },
  userMsgTime: { color: colors.textMuted },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userMessageActions: { justifyContent: 'flex-end' },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  actionBtnActive: {
    borderColor: `${ACCENT}66`,
    backgroundColor: `${ACCENT}14`,
  },
  linksPanel: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: 6,
  },
  linkText: {
    color: ACCENT,
    fontSize: 11,
  },
  chartCard: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    overflow: 'visible',
  },
  chartTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  chartScroller: {
    paddingHorizontal: spacing.xs,
  },
  chartSurface: {
    borderRadius: radius.lg,
  },
  attachmentList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  attachmentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attachmentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentName: {
    color: colors.text,
    fontSize: 12,
    flex: 1,
  },
  tableList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tableCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderRow: {
    backgroundColor: `${ACCENT}14`,
  },
  tableAltRow: {
    backgroundColor: '#121928',
  },
  tableCell: {
    minWidth: 132,
    maxWidth: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tableHeaderText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCellText: {
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 19,
  },
  formsList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  formCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formStatus: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
  },
  formType: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  formTitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  formId: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  diaryList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  diaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  diaryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  diaryStatus: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
  },
  diaryDate: {
    color: colors.textMuted,
    fontSize: 10,
    flex: 1,
    textAlign: 'right',
  },
  diaryTitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  diaryId: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  modeBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  modeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  modeBtnActive: {
    borderColor: `${ACCENT}66`,
    backgroundColor: `${ACCENT}1A`,
  },
  modeBtnText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: ACCENT,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    maxHeight: 120,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'center',
    paddingVertical: 10,
  },
  inlineSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSearchBtnActive: {
    backgroundColor: `${ACCENT}1A`,
    borderWidth: 1,
    borderColor: `${ACCENT}55`,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  historyOverlayInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  historySheet: {
    backgroundColor: '#0d0d0d',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
    height: '100%',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  historyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  historyEmpty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  historyEmptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  historyEmptySubText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  historyItemActive: { borderColor: `${ACCENT}66`, backgroundColor: `${ACCENT}12` },
  historyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${ACCENT}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMeta: { flex: 1 },
  historyItemTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  historyItemDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  historyDeleteBtn: { padding: 4 },
  previewRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  previewBackBtn: {
    padding: spacing.xs,
  },
  previewHeaderMeta: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  previewSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
  previewOpenBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: `${ACCENT}44`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${ACCENT}14`,
  },
  previewWebWrap: {
    flex: 1,
  },
  previewLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  previewLoaderText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
