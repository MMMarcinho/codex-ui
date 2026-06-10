import { useEffect, useMemo, useState } from 'react';
import { CodexWindow } from '../components/CodexWindow/CodexWindow';
import { ConversationView } from '../components/ConversationView/ConversationView';
import type { ConversationMessage, ConversationSession } from '../index';
import { messagesBySession, sessions as seedSessions, slashCommands } from './data';

interface LocalCodexPayload {
  sessions: ConversationSession[];
  messagesBySession: Record<string, ConversationMessage[]>;
}

export function App() {
  const [sessions, setSessions] = useState(seedSessions);
  const [activeSessionId, setActiveSessionId] = useState(seedSessions[0].id);
  const [messages, setMessages] = useState(messagesBySession);
  const [usingLocalData, setUsingLocalData] = useState(false);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );
  const activeMessages = messages[activeSessionId] || [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') === 'seed' || params.get('demo') === 'seed') {
      setUsingLocalData(false);
      return;
    }

    let cancelled = false;

    fetch('/api/codex-sessions')
      .then((response) => {
        if (!response.ok) throw new Error('local Codex sessions unavailable');
        return response.json() as Promise<LocalCodexPayload>;
      })
      .then((payload) => {
        if (cancelled || !payload.sessions.length) return;
        setSessions(payload.sessions);
        setMessages(payload.messagesBySession);
        setActiveSessionId(payload.sessions[0].id);
        setUsingLocalData(true);
      })
      .catch(() => {
        if (!cancelled) setUsingLocalData(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const appendMessages = (
    sessionId: string,
    nextMessages: ConversationMessage[],
  ) => {
    setMessages((value) => ({
      ...value,
      [sessionId]: [...(value[sessionId] || []), ...nextMessages],
    }));
  };

  const createSession = () => {
    const id = `session-${Date.now()}`;
    const session: ConversationSession = {
      id,
      title: '新的 Codex 会话',
      mode: 'live',
      source: 'demo',
      readOnly: false,
      cwd: '/workspace/codex-ui',
      updatedAt: '刚刚',
    };
    setSessions((value) => [session, ...value]);
    setMessages((value) => ({
      ...value,
      [id]: [
        {
          id: `system-${id}`,
          role: 'system',
          text: '新会话已创建。',
        },
      ],
    }));
    setActiveSessionId(id);
  };

  return (
    <main className="demoApp" aria-label="Codex UI library preview">
      <CodexWindow
        projectName="codex-ui"
        projectPath="/workspace/codex-ui"
      >
        <ConversationView
          mode={activeSession?.mode || 'live'}
          ready
          status={usingLocalData ? 'local Codex sessions' : 'connected'}
          statusKind={usingLocalData ? 'pending' : 'ok'}
          sessions={sessions}
          activeSessionId={activeSessionId}
          messages={activeMessages}
          workspacePath={activeSession?.cwd}
          slashCommands={slashCommands}
          userProfile={{ label: '你', title: '本地开发者' }}
          onNewSession={createSession}
          onSelectSession={(sessionId) => setActiveSessionId(sessionId)}
          onSendMessage={(text) => {
            appendMessages(activeSessionId, [
              {
                id: `user-${Date.now()}`,
                role: 'user',
                text,
              },
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                text: '收到。我会按当前 UI 约束继续保持 Codex App 的简洁会话体验。',
              },
            ]);
          }}
          onApprove={(requestId, decision) => {
            appendMessages(activeSessionId, [
              {
                id: `approval-${Date.now()}`,
                role: 'system',
                text: `${requestId} 已回复：${decision}`,
              },
            ]);
          }}
        />
      </CodexWindow>
    </main>
  );
}
