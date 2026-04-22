import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import { useAuthStore } from '../../store/authStore';
import { streamAIResponse, AIChatMessage } from '../../api/ai';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import type { AppStackParamList } from '../../navigation/AppNavigator';

type RouteProps = RouteProp<AppStackParamList, 'AskAI'>;

const ACCENT = colors.primary; // #FF5722

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  content: "Hello! I'm your **MatrixTwin AI** assistant. I can help you with construction project management, site diaries, safety inspections, RFIs, and more.\n\nHow can I help you today?",
  timestamp: new Date().toISOString(),
};

export default function AskAIScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const currentStreamRef = useRef<string>('');

  useEffect(() => {
    const id = generateId();
    setCurrentSessionId(id);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const startNewChat = useCallback(() => {
    // Save current session if it has user messages
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const session: ChatSession = {
        id: currentSessionId,
        title: userMessages[0]?.content?.slice(0, 50) || 'Chat Session',
        messages: [...messages],
        createdAt: new Date().toISOString(),
      };
      setSessions(prev => [session, ...prev.slice(0, 19)]); // keep max 20
    }
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([GREETING]);
    setInputText('');
    setIsStreaming(false);
  }, [messages, currentSessionId]);

  const loadSession = useCallback((session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = generateId();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputText('');
    setIsStreaming(true);
    currentStreamRef.current = '';
    scrollToBottom();

    // Build messages payload for API
    const allMessages = [...messages, userMsg];
    const apiMessages: AIChatMessage[] = allMessages
      .filter(m => m.id !== 'greeting')
      .map(m => ({
        uid: user?.id || 'anonymous',
        type: m.role,
        role: m.role === 'user' ? 'user' : 'assistant',
        roleDescription: m.role === 'user' ? 'Human' : 'AI Assistant',
        text: { body: m.content },
        body: m.content,
        content: m.content,
        timestamp: m.timestamp,
        chatid: currentSessionId,
        projectId,
      }));

    await streamAIResponse(
      currentSessionId,
      projectId,
      apiMessages,
      (chunk) => {
        currentStreamRef.current += chunk;
        const current = currentStreamRef.current;
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, content: current, isStreaming: true } : m
        ));
        scrollToBottom();
      },
      () => {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        ));
        setIsStreaming(false);
        scrollToBottom();
      },
      (err) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: `Sorry, I encountered an error: ${err}. Please try again.`, isStreaming: false }
            : m
        ));
        setIsStreaming(false);
      },
    );
  }, [inputText, isStreaming, messages, currentSessionId, projectId, user?.id, scrollToBottom]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[S.messageRow, isUser ? S.userRow : S.assistantRow]}>
        {!isUser && (
          <View style={S.aiAvatar}>
            <Icon name="brain" size={14} color={ACCENT} />
          </View>
        )}
        <View style={[S.bubble, isUser ? S.userBubble : S.assistantBubble]}>
          {isUser ? (
            <Text style={S.userText}>{item.content}</Text>
          ) : (
            <>
              <Markdown style={markdownStyles}>{item.content}</Markdown>
              {item.isStreaming && (
                <View style={S.streamingDot}>
                  <ActivityIndicator size="small" color={ACCENT} />
                </View>
              )}
            </>
          )}
          <Text style={[S.msgTime, isUser && { color: 'rgba(255,255,255,0.5)' }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && (
          <View style={S.userAvatar}>
            <Icon name="account" size={14} color="#fff" />
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={S.safe}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Icon name="arrow-left" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <View style={S.headerIconWrap}>
            <Icon name="brain" size={18} color={ACCENT} />
          </View>
          <View>
            <Text style={S.headerTitle}>MatrixTwin AI</Text>
            <Text style={S.headerSub}>{projectName}</Text>
          </View>
        </View>
        <View style={S.headerActions}>
          <TouchableOpacity style={S.headerBtn} onPress={() => setShowHistory(true)}>
            <Icon name="history" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={S.headerBtn} onPress={startNewChat}>
            <Icon name="plus-circle-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={renderMessage}
          contentContainerStyle={S.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* Input bar */}
        <View style={S.inputBar}>
          <View style={S.inputWrap}>
            <TextInput
              style={S.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your project..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            style={[S.sendBtn, (!inputText.trim() || isStreaming) && S.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* History Modal */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={S.historyOverlay}>
          <View style={S.historySheet}>
            <View style={S.historyHeader}>
              <Text style={S.historyTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {sessions.length === 0 ? (
              <View style={S.historyEmpty}>
                <Icon name="history" size={40} color={colors.border} />
                <Text style={S.historyEmptyText}>No previous chats</Text>
                <Text style={S.historyEmptySubText}>Start a new conversation to see history here</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {sessions.map(session => (
                  <TouchableOpacity key={session.id} style={S.historyItem} onPress={() => loadSession(session)}>
                    <Icon name="chat-outline" size={16} color={ACCENT} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.historyItemTitle} numberOfLines={1}>{session.title}</Text>
                      <Text style={S.historyItemDate}>
                        {new Date(session.createdAt).toLocaleDateString()} · {session.messages.filter(m => m.role === 'user').length} messages
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={colors.textMuted} />
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
  code_inline: { backgroundColor: colors.surface, color: ACCENT, fontFamily: 'monospace', fontSize: 12, borderRadius: 4, paddingHorizontal: 4 },
  code_block: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: colors.text },
  fence: { backgroundColor: colors.surface, borderRadius: 8, padding: 12 },
  bullet_list: { marginLeft: 8 },
  ordered_list: { marginLeft: 8 },
  list_item: { color: colors.text, fontSize: 14, lineHeight: 21 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: ACCENT, paddingLeft: 8, marginLeft: 0, color: colors.textSecondary },
  link: { color: ACCENT },
  hr: { backgroundColor: colors.border, height: 1 },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  th: { backgroundColor: colors.surface, padding: 8, color: colors.textMuted, fontWeight: '700' as const, fontSize: 12 },
  td: { padding: 8, color: colors.text, fontSize: 13, borderTopWidth: 1, borderTopColor: colors.border },
};

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.xs },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ACCENT + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: ACCENT + '44',
  },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 11 },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  headerBtn: { padding: spacing.xs },
  messageList: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.sm },
  messageRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ACCENT + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: ACCENT + '44',
  },
  userAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
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
  userText: { color: '#fff', fontSize: 14, lineHeight: 21 },
  streamingDot: { marginTop: spacing.xs },
  msgTime: { color: colors.textMuted, fontSize: 10, marginTop: spacing.xs, textAlign: 'right' },
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
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  historyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  historySheet: {
    backgroundColor: '#0d0d0d',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '70%',
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  historyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  historyEmpty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
  historyEmptyText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  historyEmptySubText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.xs,
  },
  historyItemTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  historyItemDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
