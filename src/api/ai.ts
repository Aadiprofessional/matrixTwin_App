const AI_ENDPOINT = 'https://n8n.matrixaiserver.com/webhook/MatrixTwin/aisearch';

export interface AIChatMessage {
  uid: string;
  type: 'user' | 'assistant';
  role: string;
  roleDescription: string;
  text: { body: string };
  body: string;
  content: string;
  timestamp: string;
  chatid: string;
  projectId: string;
}

export async function streamAIResponse(
  chatId: string,
  projectId: string,
  messages: AIChatMessage[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'openrequest',
        stream: true,
        chatid: chatId,
        projectId,
        messages,
      }),
    });

    if (!response.ok) {
      onError(`Server error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) { onDone(); break; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === 'data: [DONE]') continue;
        const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'item' && typeof parsed.content === 'string') {
            onChunk(parsed.content);
          } else if (typeof parsed.content === 'string') {
            onChunk(parsed.content);
          } else if (typeof parsed.text === 'string') {
            onChunk(parsed.text);
          }
        } catch (_) {
          if (jsonStr.length > 0) onChunk(jsonStr);
        }
      }
    }
  } catch (e: any) {
    onError(e?.message || 'Network error');
  }
}
