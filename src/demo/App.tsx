import { useMemo, useState } from 'react';
import { CodexWindow } from '../components/CodexWindow/CodexWindow';
import { ConversationView } from '../components/ConversationView/ConversationView';
import type { ConversationMessage, ConversationSession } from '../index';
import { messagesBySession, sessions as seedSessions, slashCommands } from './data';

export function App() {
  const [sessions, setSessions] = useState(seedSessions);
  const [activeSessionId, setActiveSessionId] = useState(seedSessions[0].id);
  const [messages, setMessages] = useState(messagesBySession);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );
  const activeMessages = messages[activeSessionId] || [];

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
      cwd: '/Users/marco/github/codex-ui',
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
        projectPath="/Users/marco/github/codex-ui"
      >
        <ConversationView
          mode={activeSession?.mode || 'live'}
          ready
          status="connected"
          statusKind="ok"
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
