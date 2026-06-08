import { useEffect, useRef, useState } from 'react';
import { composerPlaceholder } from './capabilities';
import { ArrowUpIcon } from './icons';
import type {
  ConversationCapabilities,
  ConversationSlashCommand,
} from './types';
import styles from './ConversationView.module.css';

interface ComposerProps {
  ready: boolean;
  capabilities: ConversationCapabilities;
  slashCommands?: ConversationSlashCommand[];
  onSend?: (text: string) => void;
  onSlashCommandSelect?: (command: ConversationSlashCommand) => void;
}

function getVisibleCommands(
  value: string,
  commands: ConversationSlashCommand[],
) {
  const text = value.trimStart();
  if (!text.startsWith('/') || text.includes('\n')) return [];
  const query = text.slice(1).toLowerCase();
  return commands
    .filter((command) =>
      `${command.name} ${command.usage || ''} ${command.description || ''}`
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 9);
}

function needsArgument(usage = '') {
  return usage.includes('<') || usage.includes('[');
}

function resizeComposerTextarea(textarea: HTMLTextAreaElement) {
  const style = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight) || 28;
  const minHeight = lineHeight;
  const maxHeight = lineHeight * 3;
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${Math.max(minHeight, nextHeight)}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

export function Composer({
  ready,
  capabilities,
  slashCommands = [],
  onSend,
  onSlashCommandSelect,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const readOnly = capabilities.readOnly;
  const disabled = !ready || readOnly || !capabilities.canSendMessage;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    resizeComposerTextarea(textarea);
  }, [value]);

  const filteredCommands = getVisibleCommands(value, slashCommands);
  const showSlashMenu =
    focused &&
    !disabled &&
    value.trimStart().startsWith('/') &&
    filteredCommands.length > 0;

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend?.(text);
    setValue('');
  };

  if (readOnly) {
    return (
      <section className={styles.composer}>
        <div className={styles.readOnlyComposer}>
          {composerPlaceholder(capabilities)}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.composer}>
      <div className={styles.promptWrap}>
        {showSlashMenu && (
          <div className={styles.slashMenu}>
            {filteredCommands.map((command) => (
              <button
                key={command.name}
                type="button"
                className={styles.slashOption}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setValue(
                    `/${command.name}${
                      needsArgument(command.usage) ? ' ' : ''
                    }`,
                  );
                  textareaRef.current?.focus();
                  onSlashCommandSelect?.(command);
                }}
              >
                <span>{command.usage || `/${command.name}`}</span>
                <small>{command.description || ''}</small>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={composerPlaceholder(capabilities)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            submit();
          }}
        />
        <button
          className={styles.sendButton}
          type="button"
          title="发送"
          disabled={disabled || !value.trim()}
          onClick={submit}
        >
          <ArrowUpIcon />
        </button>
      </div>
    </section>
  );
}
