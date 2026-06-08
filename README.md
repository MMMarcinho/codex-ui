# codex-ui

开箱即用的 Codex 风格 React UI 组件库。

当前版本参考本地 `~/Desktop/code/ai/aima-workspace` 的
`src/pages/workspace/cx/components/ConversationView`，把会话 UI 迁移成可复用
React 组件，并提供 Vite demo 预览。

## 组件

- `ConversationView`: Codex 风格会话主体，包含工具条、会话抽屉、消息流、输入框和 slash command 菜单。
- `CodexWindow`: 桌面 app 风格窗口壳，可用于高保真预览。
- 类型与 helper: `ConversationMessage`、`ConversationSession`、`conversationCapabilities`、`composerPlaceholder` 等。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 使用

```tsx
import { CodexWindow, ConversationView } from 'codex-ui';
import 'codex-ui/style.css';

export function App() {
  return (
    <CodexWindow projectName="my-codex">
      <ConversationView
        mode="live"
        ready
        status="connected"
        statusKind="ok"
        sessions={sessions}
        activeSessionId={activeSessionId}
        messages={messages}
        onSendMessage={sendMessage}
      />
    </CodexWindow>
  );
}
```
