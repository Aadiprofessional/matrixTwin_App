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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
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
type LocalRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: LocalRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

const ACCENT = colors.primary;
const TEMP_CHAT_ID = 'temp';

const createId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

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

export default function AskAIScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(TEMP_CHAT_ID);
  const [messages, setMessages] = useState<Message[]>([createGreeting()]);
  const [inputText, setInputText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

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
    },
    [],
  );

  const startNewChat = useCallback(() => {
    setCurrentSessionId(TEMP_CHAT_ID);
    setMessages([createGreeting()]);
    setInputText('');
    setIsStreaming(false);
    setShowHistory(false);
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

    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
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

      const apiMessages: AIChatMessage[] = nextMessages
        .filter(message => message.id !== 'greeting')
        .map(message => ({
          uid: user.id,
          type: message.role,
          role: message.role === 'user' ? 'user' : 'assistant',
          roleDescription: message.role === 'user' ? 'Human' : 'AI Assistant',
          text: { body: message.content },
          body: message.content,
          content: message.content,
          timestamp: message.timestamp,
          chatid: sessionId,
          projectId,
        }));

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
  }, [ensureChatSession, inputText, isStreaming, messages, projectId, syncSessionMessages, user?.id]);

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

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser ? (
          <View style={styles.aiAvatar}>
            <Icon name="brain" size={14} color={ACCENT} />
          </View>
        ) : null}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {isUser ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : (
            <>
              <Markdown style={markdownStyles}>{item.content || ' '}</Markdown>
              {item.isStreaming ? (
                <View style={styles.streamingDot}>
                  <ActivityIndicator size="small" color={ACCENT} />
                </View>
              ) : null}
            </>
          )}
          <Text style={[styles.msgTime, isUser ? styles.userMsgTime : null]}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {isUser ? (
          <View style={styles.userAvatar}>
            <Icon name="account" size={14} color={colors.white} />
          </View>
        ) : null}
      </View>
    );
  }, []);

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
            <ActivityIndicator color={ACCENT} />
            <Text style={styles.loadingText}>Loading chat history...</Text>
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

      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={styles.historyOverlay}>
          <View style={styles.historySheet}>
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
              <ScrollView showsVerticalScrollIndicator={false}>
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
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  messageRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
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
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, padding: spacing.md },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  userText: { color: colors.white, fontSize: 14, lineHeight: 21 },
  streamingDot: { marginTop: spacing.xs },
  msgTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  userMsgTime: { color: 'rgba(255,255,255,0.6)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
  },
  textInput: { color: colors.text, fontSize: 14, lineHeight: 20 },
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
  },
  historySheet: {
    backgroundColor: '#0d0d0d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '72%',
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
});
