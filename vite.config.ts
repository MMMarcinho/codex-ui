import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const MAX_DEMO_SESSIONS = 6;
const MAX_LOOKUP_INDEX = 18;
const MAX_MESSAGE_CHARS = 6000;
const MAX_TOOL_CHARS = 1400;

function codexSessionDemoPlugin(): Plugin {
  return {
    name: 'codex-session-demo-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/codex-sessions', (_req, res) => {
        try {
          const data = loadLocalCodexSessions();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (error) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : 'unknown error',
            }),
          );
        }
      });
    },
  };
}

interface IndexEntry {
  id: string;
  thread_name?: string;
  updated_at?: string;
}

interface ParsedMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
}

interface ParsedSession {
  session: {
    id: string;
    title: string;
    subtitle?: string;
    cwd?: string;
    mode: 'live' | 'history' | 'subagent';
    source: 'local-codex';
    readOnly: boolean;
    updatedAt?: string;
  };
  messages: ParsedMessage[];
}

function loadLocalCodexSessions() {
  const codexHome = join(homedir(), '.codex');
  const indexPath = join(codexHome, 'session_index.jsonl');
  const sessionsRoot = join(codexHome, 'sessions');
  if (!existsSync(indexPath) || !existsSync(sessionsRoot)) {
    return { sessions: [], messagesBySession: {} };
  }

  const sessionFiles = new Map<string, string>();
  collectSessionFiles(sessionsRoot, sessionFiles);

  const indexEntries = readJsonLines<IndexEntry>(indexPath)
    .filter((entry) => entry.id)
    .slice(-MAX_LOOKUP_INDEX)
    .reverse();

  const parsed: ParsedSession[] = [];
  for (const entry of indexEntries) {
    const filePath = sessionFiles.get(entry.id);
    if (!filePath) continue;
    const item = parseCodexSessionFile(filePath, entry);
    if (!item) continue;
    parsed.push(item);
    if (parsed.length >= MAX_DEMO_SESSIONS) break;
  }

  return {
    sessions: parsed.map((item) => item.session),
    messagesBySession: Object.fromEntries(
      parsed.map((item) => [item.session.id, item.messages]),
    ),
  };
}

function collectSessionFiles(dir: string, result: Map<string, string>) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSessionFiles(path, result);
      continue;
    }
    if (!entry.name.endsWith('.jsonl')) continue;
    const match = entry.name.match(
      /rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-(.+)\.jsonl$/,
    );
    if (match?.[1]) result.set(match[1], path);
  }
}

function readJsonLines<T>(filePath: string): T[] {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as T];
      } catch {
        return [];
      }
    });
}

function parseCodexSessionFile(
  filePath: string,
  indexEntry: IndexEntry,
): ParsedSession | null {
  const rows = readJsonLines<Record<string, any>>(filePath);
  const meta = rows.find((row) => row.type === 'session_meta')?.payload || {};
  if (meta.thread_source === 'subagent' || meta.source?.subagent) return null;

  const messages = rows
    .flatMap((row, index) => rowToMessage(row, index))
    .filter((message) => message.text.trim())
    .slice(-80);

  if (!messages.length) return null;

  return {
    session: {
      id: indexEntry.id,
      title: indexEntry.thread_name || shortSessionId(indexEntry.id),
      subtitle: formatUpdatedAt(indexEntry.updated_at),
      cwd: meta.cwd,
      mode: 'history',
      source: 'local-codex',
      readOnly: true,
      updatedAt: formatUpdatedAt(indexEntry.updated_at),
    },
    messages,
  };
}

function rowToMessage(row: Record<string, any>, index: number): ParsedMessage[] {
  const payload = row.payload || {};
  if (row.type === 'response_item' && payload.type === 'message') {
    const role = payload.role;
    if (role !== 'user' && role !== 'assistant') return [];
    const text = contentToText(payload.content);
    return [
      {
        id: `${row.timestamp || 'message'}-${index}`,
        role,
        text: trimMessage(text),
      },
    ];
  }

  if (row.type === 'response_item' && payload.type === 'function_call') {
    return [
      {
        id: `${row.timestamp || 'tool-call'}-${index}`,
        role: 'tool',
        text: trimToolMessage(
          [payload.name, payload.arguments]
            .filter(Boolean)
            .join('\n'),
        ),
      },
    ];
  }

  if (row.type === 'response_item' && payload.type === 'function_call_output') {
    return [
      {
        id: `${row.timestamp || 'tool-output'}-${index}`,
        role: 'tool',
        text: trimToolMessage(String(payload.output || '')),
      },
    ];
  }

  return [];
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const record = item as Record<string, unknown>;
      return String(
        record.text ||
          record.input_text ||
          record.output_text ||
          record.markdown ||
          '',
      );
    })
    .filter(Boolean)
    .join('\n');
}

function trimMessage(text: string) {
  const value = text.trim();
  if (value.length <= MAX_MESSAGE_CHARS) return value;
  return `${value.slice(0, MAX_MESSAGE_CHARS)}\n\n...内容已截断`;
}

function trimToolMessage(text: string) {
  const value = text.trim();
  if (value.length <= MAX_TOOL_CHARS) return value;
  return `${value.slice(0, MAX_TOOL_CHARS)}\n\n...工具输出已截断`;
}

function shortSessionId(sessionId: string) {
  return sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
}

function formatUpdatedAt(value?: string) {
  if (!value) return '最近';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default defineConfig({
  plugins: [react(), codexSessionDemoPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CodexUI',
      fileName: 'codex-ui',
      cssFileName: 'style',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
        },
      },
    },
  },
});
