import type {
  ConversationMessage,
  ConversationSession,
  ConversationSlashCommand,
} from '../components/ConversationView/types';

export const sessions: ConversationSession[] = [
  {
    id: 'live-codex-ui',
    title: '复刻 Codex App UI',
    mode: 'live',
    source: 'demo',
    readOnly: false,
    cwd: '/Users/marco/github/codex-ui',
    updatedAt: '刚刚',
  },
  {
    id: 'conversation-view',
    title: 'ConversationView 抽离',
    mode: 'history',
    source: 'demo',
    readOnly: true,
    cwd: '/Users/marco/Desktop/code/ai/aima-workspace',
    updatedAt: '18 分钟前',
  },
  {
    id: 'subagent-visual-check',
    title: '移动端视觉检查',
    mode: 'subagent',
    source: 'demo',
    readOnly: true,
    subtitle: '子会话',
  },
];

export const messagesBySession: Record<string, ConversationMessage[]> = {
  'live-codex-ui': [
    {
      id: 'm1',
      role: 'user',
      text: '把这个仓库做成一个开箱即用的 React Codex UI 组件库。',
    },
    {
      id: 'm2',
      role: 'assistant',
      text: '我会把源项目里的 ConversationView 拆成可导出的 React 组件，同时保留 demo 入口用于本地预览。\n\n核心库会避免 AIMA 业务依赖，也不要求消费者安装 antd。',
    },
    {
      id: 'm3',
      role: 'tool',
      text: 'migrated: ConversationView / MessageList / Composer / SessionTabs\nadded: CodexWindow shell, Vite library build, TypeScript declarations',
    },
    {
      id: 'm4',
      role: 'assistant',
      streaming: true,
      text: '组件库入口导出 `ConversationView`、`CodexWindow`、类型定义和能力 helpers。\n\n```tsx\nimport { ConversationView, CodexWindow } from \"codex-ui\";\nimport \"codex-ui/style.css\";\n```',
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
      text: '源组件的布局、消息窗口分页、slash command、只读 composer 等行为已经迁移到库组件里。\n\n状态提示和图标改为库内轻量实现，减少外部依赖。',
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
      text: '移动端会收窄全局 padding，消息气泡最大宽度放宽到 86%，会话抽屉最大宽度保留 28px 的可见边距。',
    },
  ],
};

export const slashCommands: ConversationSlashCommand[] = [
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
