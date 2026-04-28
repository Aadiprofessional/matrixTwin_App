const AI_ENDPOINT = 'https://n8n.matrixaiserver.com/webhook/MatrixTwin/aisearch';

type ReaderLike = {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
};

type DecoderLike = {
  decode: (input?: ArrayBuffer | Uint8Array, options?: { stream?: boolean }) => string;
};

const decodeBytes = (value: Uint8Array): string => {
  const decoderCtor = (globalThis as { TextDecoder?: new () => DecoderLike }).TextDecoder;
  if (decoderCtor) {
    const decoder = new decoderCtor();
    return decoder.decode(value, { stream: true });
  }

  return String.fromCharCode(...value);
};

const extractTopLevelJsonBlocks = (input: string): string[] => {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        blocks.push(input.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return blocks;
};

const emitChunkFromString = (raw: string, onChunk: (chunk: string) => void): boolean => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '[DONE]' || trimmed === 'data: [DONE]') {
    return false;
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return emitChunkFromPayload(JSON.parse(trimmed), onChunk);
    } catch {
      // fall through to resilient block parsing
    }
  }

  const jsonBlocks = extractTopLevelJsonBlocks(trimmed);
  if (jsonBlocks.length > 0) {
    let emitted = false;
    for (const block of jsonBlocks) {
      try {
        emitted = emitChunkFromPayload(JSON.parse(block), onChunk) || emitted;
      } catch {
        // ignore malformed sub-blocks
      }
    }
    if (emitted) {
      return true;
    }
  }

  onChunk(raw);
  return true;
};

const emitChunkFromPayload = (
  payload: unknown,
  onChunk: (chunk: string) => void,
): boolean => {
  if (typeof payload === 'string') {
    return emitChunkFromString(payload, onChunk);
  }

  if (Array.isArray(payload)) {
    let emitted = false;
    for (const item of payload) {
      emitted = emitChunkFromPayload(item, onChunk) || emitted;
    }
    return emitted;
  }

  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const typedPayload = payload as Record<string, unknown>;

  if (typedPayload.type === 'begin' || typedPayload.type === 'end') {
    return false;
  }

  if (typedPayload.type === 'item' && typeof typedPayload.content === 'string') {
    onChunk(typedPayload.content);
    return true;
  }

  const keys: Array<'content' | 'text' | 'response' | 'output' | 'message'> = [
    'content',
    'text',
    'response',
    'output',
    'message',
  ];

  for (const key of keys) {
    const value = typedPayload[key];
    if (typeof value === 'string' && value.trim()) {
      onChunk(value);
      return true;
    }
    if (value && typeof value === 'object') {
      const emitted = emitChunkFromPayload(value, onChunk);
      if (emitted) {
        return true;
      }
    }
  }

  return false;
};

export interface AIChatMessage {
  uid: string;
  type: 'text' | 'search' | 'docx' | 'xlsx' | 'user' | 'assistant';
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

    const reader = (response as unknown as { body?: { getReader?: () => ReaderLike } }).body?.getReader?.();
    if (!reader) {
      const fallback = (await response.text()).trim();
      if (!fallback) {
        onError('No response body');
        return;
      }

      let emitted = false;
      try {
        emitted = emitChunkFromPayload(JSON.parse(fallback), onChunk);
      } catch {
        emitted = emitChunkFromString(fallback, onChunk);
      }

      if (!emitted) {
        onError('Unable to parse AI response');
        return;
      }

      onDone();
      return;
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const remaining = buffer.trim();
        if (remaining && remaining !== 'data: [DONE]') {
          const dataMatch = remaining.match(/^data:\s?(.*)$/);
          const jsonStr = dataMatch ? dataMatch[1] : remaining;
          try {
            emitChunkFromPayload(JSON.parse(jsonStr), onChunk);
          } catch {
            emitChunkFromString(jsonStr, onChunk);
          }
        }
        onDone();
        break;
      }

      buffer += decodeBytes(value || new Uint8Array());
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === 'data: [DONE]') continue;
        if (line.startsWith('event:') || line.startsWith('id:') || line.startsWith('retry:')) {
          continue;
        }

        const dataMatch = line.match(/^data:\s?(.*)$/);
        const jsonStr = dataMatch ? dataMatch[1] : line;
        try {
          emitChunkFromPayload(JSON.parse(jsonStr), onChunk);
        } catch {
          if (jsonStr.length > 0) {
            emitChunkFromString(jsonStr, onChunk);
          }
        }
      }
    }
  } catch (e: any) {
    onError(e?.message || 'Network error');
  }
}
