import { getSupabaseClient } from '../lib/supabase';

export interface StoredAIChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  image_url?: string | null;
  is_streaming?: boolean | null;
}

export interface AIChatSession {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  createdAt: string;
  lastUpdatedAt: string;
  messages: StoredAIChatMessage[];
}

type ChatSessionRow = {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  created_at: string;
  last_updated_at: string;
  chat_messages?: StoredAIChatMessage[];
};

const sortMessages = (messages: StoredAIChatMessage[] = []) =>
  [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

const mapSession = (session: ChatSessionRow): AIChatSession => ({
  id: session.id,
  userId: session.user_id,
  projectId: session.project_id ?? null,
  title: session.title,
  createdAt: session.created_at,
  lastUpdatedAt: session.last_updated_at,
  messages: sortMessages(session.chat_messages),
});

export const listAIChatSessions = async (userId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*, chat_messages (*)')
    .eq('user_id', userId)
    .order('last_updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as ChatSessionRow[]).map(mapSession);
};

export const createAIChatSession = async (payload: {
  id: string;
  userId: string;
  projectId?: string | null;
  title: string;
  createdAt: string;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('chat_sessions').insert({
    id: payload.id,
    user_id: payload.userId,
    project_id: payload.projectId ?? null,
    title: payload.title,
    created_at: payload.createdAt,
    last_updated_at: payload.createdAt,
  });

  if (error) {
    throw error;
  }
};

export const insertAIChatMessage = async (payload: {
  id: string;
  sessionId: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  imageUrl?: string | null;
  isStreaming?: boolean;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('chat_messages').insert({
    id: payload.id,
    session_id: payload.sessionId,
    content: payload.content,
    sender: payload.sender,
    image_url: payload.imageUrl ?? null,
    timestamp: payload.timestamp,
    is_streaming: payload.isStreaming ?? false,
  });

  if (error) {
    throw error;
  }
};

export const updateAIChatMessage = async (messageId: string, updates: {
  content?: string;
  is_streaming?: boolean;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('chat_messages')
    .update(updates)
    .eq('id', messageId);

  if (error) {
    throw error;
  }
};

export const updateAIChatSession = async (sessionId: string, updates: {
  title?: string;
  last_updated_at?: string;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) {
    throw error;
  }
};

export const deleteAIChatSession = async (sessionId: string, userId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
};
