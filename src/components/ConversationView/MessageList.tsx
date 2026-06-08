import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConversationMessage, ConversationUserProfile } from './types';
import styles from './ConversationView.module.css';

const DEFAULT_MESSAGE_WINDOW_SIZE = 60;
const MESSAGE_WINDOW_STEP = 40;
const TOP_LOAD_THRESHOLD = 80;

interface ScrollAnchor {
  scrollHeight: number;
  scrollTop: number;
}

interface MessageListProps {
  messages: ConversationMessage[];
  userProfile?: ConversationUserProfile;
  canApprove?: boolean;
  listKey?: string;
  onApprove?: (requestId: string, decision: string) => void;
}

function shouldShowLabel(role: ConversationMessage['role']) {
  return role === 'system' || role === 'tool' || role === 'approval';
}

function labelFor(
  role: ConversationMessage['role'],
  profile?: ConversationUserProfile,
) {
  return (
    {
      user: profile?.label || '你',
      assistant: 'Codex',
      tool: '输出',
      approval: '审批',
      system: 'System',
    }[role] || role
  );
}

function renderParagraphs(text: string, seed: number) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((block, index) => {
      if (/^#{1,3}\s/.test(block)) {
        return (
          <h3 key={`heading-${seed}-${index}`}>
            {block.replace(/^#{1,3}\s/, '')}
          </h3>
        );
      }
      return <p key={`p-${seed}-${index}`}>{block}</p>;
    });
}

function renderAssistantContent(text: string) {
  const nodes: React.ReactNode[] = [];
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = fence.exec(text)) !== null) {
    nodes.push(...renderParagraphs(text.slice(cursor, match.index), index));
    index += 1;
    nodes.push(
      <div className={styles.codeCard} key={`code-${index}`}>
        <div className={styles.codeLabel}>{match[1]?.trim() || 'text'}</div>
        <pre>{match[2].replace(/\n$/, '')}</pre>
      </div>,
    );
    cursor = match.index + match[0].length;
  }

  nodes.push(...renderParagraphs(text.slice(cursor), index + 1));
  return nodes.length ? nodes : <p />;
}

function MessageContent({
  message,
  canApprove,
  onApprove,
}: {
  message: ConversationMessage;
  canApprove?: boolean;
  onApprove?: (requestId: string, decision: string) => void;
}) {
  if (message.role === 'assistant') {
    return (
      <div className={styles.content}>
        {renderAssistantContent(message.text)}
      </div>
    );
  }

  if (message.role === 'user') {
    return <div className={styles.content}>{message.text}</div>;
  }

  return (
    <div className={styles.content}>
      <pre>{message.text}</pre>
      {message.role === 'approval' &&
        message.requestId &&
        canApprove &&
        !message.decision && (
          <div className={styles.approvalActions}>
            {[
              ['允许', 'accept'],
              ['本会话允许', 'acceptForSession'],
              ['拒绝', 'decline'],
              ['取消', 'cancel'],
            ].map(([label, decision]) => (
              <button
                key={decision}
                type="button"
                onClick={() => onApprove?.(message.requestId!, decision)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      {message.decision && (
        <p className={styles.approvalNote}>已回复：{message.decision}</p>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  userProfile,
  canApprove,
  listKey,
  onApprove,
}: MessageListProps) {
  const listRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const loadingEarlierRef = useRef(false);
  const restoreScrollAnchorRef = useRef<ScrollAnchor | null>(null);
  const [messageWindowSize, setMessageWindowSize] = useState(
    DEFAULT_MESSAGE_WINDOW_SIZE,
  );

  const visibleMessages = useMemo(() => {
    if (messages.length) return messages;
    return [
      {
        id: 'empty',
        role: 'system' as const,
        text: '这个会话暂时没有可展示的消息。',
      },
    ];
  }, [messages]);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    loadingEarlierRef.current = false;
    restoreScrollAnchorRef.current = null;
    setMessageWindowSize(DEFAULT_MESSAGE_WINDOW_SIZE);
  }, [listKey]);

  useEffect(() => {
    if (messageWindowSize === DEFAULT_MESSAGE_WINDOW_SIZE) {
      shouldStickToBottomRef.current = true;
    }
  }, [messageWindowSize, visibleMessages.length]);

  const renderedMessageCount = Math.min(
    messageWindowSize,
    visibleMessages.length,
  );
  const hiddenMessageCount = Math.max(
    visibleMessages.length - renderedMessageCount,
    0,
  );
  const renderedMessages = useMemo(
    () => visibleMessages.slice(hiddenMessageCount),
    [hiddenMessageCount, visibleMessages],
  );

  useLayoutEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    if (messageWindowSize > DEFAULT_MESSAGE_WINDOW_SIZE) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messageWindowSize, renderedMessages]);

  useLayoutEffect(() => {
    const anchor = restoreScrollAnchorRef.current;
    if (!anchor) return;
    restoreScrollAnchorRef.current = null;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop =
      anchor.scrollTop + Math.max(el.scrollHeight - anchor.scrollHeight, 0);
  }, [renderedMessages]);

  const loadMoreMessages = () => {
    if (loadingEarlierRef.current) return;
    const el = listRef.current;
    restoreScrollAnchorRef.current = el
      ? {
          scrollHeight: el.scrollHeight,
          scrollTop: el.scrollTop,
        }
      : null;
    loadingEarlierRef.current = true;
    shouldStickToBottomRef.current = false;
    setMessageWindowSize((value) =>
      Math.min(value + MESSAGE_WINDOW_STEP, visibleMessages.length),
    );
    window.setTimeout(() => {
      loadingEarlierRef.current = false;
    }, 120);
  };

  const handleScroll = () => {
    if (hiddenMessageCount <= 0) return;
    const el = listRef.current;
    if (!el || el.scrollTop > TOP_LOAD_THRESHOLD) return;
    loadMoreMessages();
  };

  return (
    <section
      ref={listRef}
      className={styles.messages}
      aria-live="polite"
      onScroll={handleScroll}
    >
      {hiddenMessageCount > 0 && (
        <div className={styles.messageWindowNotice}>
          已省略更早的 {hiddenMessageCount} 条消息，上滑自动加载
        </div>
      )}
      {renderedMessages.map((message, index) => {
        const sourceIndex = hiddenMessageCount + index;
        return (
          <article
            key={message.id || `${message.role}-${sourceIndex}`}
            className={[
              styles.message,
              styles[`message_${message.role}`],
              message.streaming ? styles.message_streaming : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={message.role === 'user' ? userProfile?.title || '' : ''}
          >
            <div className={styles.bubble}>
              {shouldShowLabel(message.role) && (
                <div className={styles.messageLabel}>
                  {labelFor(message.role, userProfile)}
                </div>
              )}
              <MessageContent
                message={message}
                canApprove={canApprove}
                onApprove={onApprove}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
