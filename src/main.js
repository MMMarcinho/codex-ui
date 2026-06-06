const sessions = [
  {
    id: 'live-codex-ui',
    title: '复刻 Codex App UI',
    mode: 'live',
    meta: '刚刚',
  },
  {
    id: 'conversation-view',
    title: 'ConversationView 抽离',
    mode: 'history',
    meta: '18 分钟前',
  },
  {
    id: 'subagent-visual-check',
    title: '移动端视觉检查',
    mode: 'subagent',
    meta: '子会话',
  },
  {
    id: 'codex-shell',
    title: '窗口壳与输入区',
    mode: 'history',
    meta: '昨天',
  },
];

const sessionMessages = {
  'live-codex-ui': [
    {
      id: 'm1',
      role: 'user',
      text: '参考本地 aima-workspace 里的 ConversationView，把模仿 Codex App 的 UI 复刻到这个仓库。',
    },
    {
      id: 'm2',
      role: 'assistant',
      text: '我会保留源组件的核心布局：顶部轻量工具条、左侧 hover 会话抽屉、中间消息流和底部 prompt bar。当前仓库是空壳，所以先做一个可直接打开的静态 Web demo。\n\n这版会把业务适配器拿掉，只保留 UI 和交互骨架，方便后续接真实 Codex session 数据。',
    },
    {
      id: 'm3',
      role: 'tool',
      text: '读取 src/pages/workspace/cx/components/ConversationView/index.module.less\n读取 MessageList.tsx / Composer.tsx / SessionTabs.tsx',
    },
    {
      id: 'm4',
      role: 'assistant',
      streaming: true,
      text: '关键的 Codex App 气质来自克制：白底、窄消息列、低对比灰、圆润但不过分的输入框，以及工具按钮只在需要时给出反馈。\n\n```css\n.prompt-wrap {\n  width: min(880px, 100%);\n  border-radius: 22px;\n  background: rgba(255, 255, 255, 0.98);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);\n}\n```',
    },
  ],
  'conversation-view': [
    {
      id: 'h1',
      role: 'system',
      text: '这个会话展示从源项目抽离后的只读 UI 状态。',
    },
    {
      id: 'h2',
      role: 'assistant',
      text: '源 `ConversationView` 已经把 UI 切成了 `SessionTabs`、`MessageList` 和 `Composer`，很适合在本仓库里复刻成展示面板。\n\n我保留了同样的滚动节奏、消息宽度和底部输入区尺寸。',
    },
  ],
  'subagent-visual-check': [
    {
      id: 's1',
      role: 'approval',
      text: '需要在桌面和移动宽度下检查文本是否溢出、抽屉是否遮挡输入框。',
      requestId: 'approval-visual-check',
    },
    {
      id: 's2',
      role: 'assistant',
      text: '移动端会收窄全局 padding，消息气泡最大宽度会放宽到 86%，会话抽屉最大宽度保留 28px 的可见边距。',
    },
  ],
  'codex-shell': [
    {
      id: 'c1',
      role: 'user',
      text: '窗口壳需要像桌面 app，但不要抢主要会话 UI 的风头。',
    },
    {
      id: 'c2',
      role: 'assistant',
      text: '已加入 macOS 风格 titlebar 和细边框，主视觉仍然是 conversation surface。标题区域只保留项目名和路径，避免变成营销页。',
    },
  ],
};

const slashCommands = [
  {
    name: 'model',
    usage: '/model <name>',
    description: '切换当前会话模型',
  },
  {
    name: 'clear',
    usage: '/clear',
    description: '清空当前展示消息',
  },
  {
    name: 'review',
    usage: '/review',
    description: '以 code review 视角检查当前改动',
  },
  {
    name: 'status',
    usage: '/status',
    description: '查看当前任务状态',
  },
];

const state = {
  activeSessionId: sessions[0].id,
  drawerOpen: false,
};

const sessionList = document.querySelector('#sessionList');
const messagesEl = document.querySelector('#messages');
const drawer = document.querySelector('#sessionDrawer');
const sessionsButton = document.querySelector('#sessionsButton');
const newSessionButton = document.querySelector('#newSessionButton');
const composerInput = document.querySelector('#composerInput');
const sendButton = document.querySelector('#sendButton');
const slashMenu = document.querySelector('#slashMenu');

let closeTimer = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderAssistantContent(text) {
  const escaped = escapeHtml(text);
  const parts = [];
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match;

  while ((match = fence.exec(escaped))) {
    parts.push(renderParagraphs(escaped.slice(cursor, match.index)));
    parts.push(
      `<div class="code-card"><div class="code-label">${
        match[1].trim() || 'text'
      }</div><pre>${match[2].replace(/\n$/, '')}</pre></div>`,
    );
    cursor = match.index + match[0].length;
  }

  parts.push(renderParagraphs(escaped.slice(cursor)));
  return parts.join('');
}

function renderParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^#{1,3}\s/.test(block)) {
        return `<h3>${block.replace(/^#{1,3}\s/, '')}</h3>`;
      }
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');
}

function labelFor(role) {
  return (
    {
      system: 'System',
      tool: '输出',
      approval: '审批',
    }[role] || ''
  );
}

function renderSessions() {
  sessionList.innerHTML = sessions
    .map((session) => {
      const active = session.id === state.activeSessionId;
      const badge =
        session.mode === 'subagent'
          ? '<span class="session-subagent-badge">子会话</span>'
          : '';
      return `
        <button
          class="session-tab ${active ? 'session-tab-active' : ''}"
          type="button"
          data-session-id="${session.id}"
          title="${escapeHtml(`${session.title}\n${session.meta}`)}"
        >
          <span class="session-title">
            ${badge}
            <span class="session-title-text">${escapeHtml(session.title)}</span>
          </span>
          <small>${escapeHtml(session.meta)}</small>
        </button>
      `;
    })
    .join('');
}

function renderMessages() {
  const messages = sessionMessages[state.activeSessionId] || [];
  messagesEl.innerHTML = messages
    .map((message) => {
      const showLabel = ['system', 'tool', 'approval'].includes(message.role);
      const body =
        message.role === 'assistant'
          ? renderAssistantContent(message.text)
          : message.role === 'user'
            ? escapeHtml(message.text)
            : `<pre>${escapeHtml(message.text)}</pre>${renderApprovalActions(
                message,
              )}`;

      return `
        <article class="message message-${message.role} ${
          message.streaming ? 'message-streaming' : ''
        }">
          <div class="bubble">
            ${showLabel ? `<div class="message-label">${labelFor(message.role)}</div>` : ''}
            <div class="content">${body}</div>
          </div>
        </article>
      `;
    })
    .join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderApprovalActions(message) {
  if (!message.requestId || message.decision) return '';
  return `
    <div class="approval-actions">
      <button type="button">允许</button>
      <button type="button">本会话允许</button>
      <button type="button">拒绝</button>
      <button type="button">取消</button>
    </div>
  `;
}

function setDrawerOpen(open) {
  state.drawerOpen = open;
  drawer.classList.toggle('session-drawer-wrap-open', open);
  sessionsButton.classList.toggle('view-button-active', open);
  sessionsButton.setAttribute('aria-pressed', String(open));
  sessionsButton.setAttribute(
    'aria-label',
    open ? '隐藏会话列表' : '显示会话列表',
  );
}

function clearCloseTimer() {
  if (!closeTimer) return;
  window.clearTimeout(closeTimer);
  closeTimer = 0;
}

function scheduleDrawerClose() {
  clearCloseTimer();
  closeTimer = window.setTimeout(() => setDrawerOpen(false), 500);
}

function resizeComposer() {
  const lineHeight = 28;
  const maxHeight = lineHeight * 3;
  composerInput.style.height = 'auto';
  const nextHeight = Math.min(composerInput.scrollHeight, maxHeight);
  composerInput.style.height = `${Math.max(lineHeight, nextHeight)}px`;
  composerInput.style.overflowY =
    composerInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function getVisibleCommands(value) {
  const text = value.trimStart();
  if (!text.startsWith('/') || text.includes('\n')) return [];
  const query = text.slice(1).toLowerCase();
  return slashCommands
    .filter((command) =>
      `${command.name} ${command.usage} ${command.description}`
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 9);
}

function renderSlashMenu() {
  const commands = getVisibleCommands(composerInput.value);
  slashMenu.hidden = !commands.length || document.activeElement !== composerInput;
  slashMenu.innerHTML = commands
    .map(
      (command) => `
        <button class="slash-option" type="button" data-command="${command.name}">
          <span>${escapeHtml(command.usage)}</span>
          <small>${escapeHtml(command.description)}</small>
        </button>
      `,
    )
    .join('');
}

function submitMessage() {
  const text = composerInput.value.trim();
  if (!text) return;
  sessionMessages[state.activeSessionId].push({
    id: `user-${Date.now()}`,
    role: 'user',
    text,
  });
  sessionMessages[state.activeSessionId].push({
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    text: '收到。我会按当前 UI 约束继续保持 Codex App 的简洁会话体验。',
  });
  composerInput.value = '';
  sendButton.disabled = true;
  resizeComposer();
  renderSlashMenu();
  renderMessages();
}

sessionList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-session-id]');
  if (!button) return;
  state.activeSessionId = button.dataset.sessionId;
  renderSessions();
  renderMessages();
  setDrawerOpen(false);
});

sessionsButton.addEventListener('mouseenter', () => {
  clearCloseTimer();
  setDrawerOpen(true);
});
sessionsButton.addEventListener('mouseleave', scheduleDrawerClose);
sessionsButton.addEventListener('click', () => setDrawerOpen(!state.drawerOpen));
drawer.addEventListener('mouseenter', () => {
  clearCloseTimer();
  setDrawerOpen(true);
});
drawer.addEventListener('mouseleave', scheduleDrawerClose);

newSessionButton.addEventListener('click', () => {
  const id = `session-${Date.now()}`;
  sessions.unshift({
    id,
    title: '新的 Codex 会话',
    mode: 'live',
    meta: '刚刚',
  });
  sessionMessages[id] = [
    {
      id: `system-${id}`,
      role: 'system',
      text: '新会话已创建。',
    },
  ];
  state.activeSessionId = id;
  renderSessions();
  renderMessages();
});

composerInput.addEventListener('input', () => {
  sendButton.disabled = !composerInput.value.trim();
  resizeComposer();
  renderSlashMenu();
});
composerInput.addEventListener('focus', renderSlashMenu);
composerInput.addEventListener('blur', () => {
  window.setTimeout(renderSlashMenu, 120);
});
composerInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  submitMessage();
});
sendButton.addEventListener('click', submitMessage);
slashMenu.addEventListener('mousedown', (event) => {
  const button = event.target.closest('[data-command]');
  if (!button) return;
  event.preventDefault();
  const command = slashCommands.find((item) => item.name === button.dataset.command);
  composerInput.value = `/${command.name}${command.usage.includes('<') ? ' ' : ''}`;
  composerInput.focus();
  sendButton.disabled = !composerInput.value.trim();
  resizeComposer();
  renderSlashMenu();
});

renderSessions();
renderMessages();
resizeComposer();
