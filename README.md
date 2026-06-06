# codex-ui

用于在 Web 侧展示接近 Codex App 的会话 UI 效果。

当前版本参考了本地 `~/Desktop/code/ai/aima-workspace` 中
`src/pages/workspace/cx/components/ConversationView` 的布局与样式：

- 顶部轻量会话工具条与状态 pill
- hover/click 展开的左侧会话抽屉
- 居中消息流、用户气泡、系统/工具输出块、代码块样式
- 底部 Codex 风格 prompt bar、发送按钮和 slash command 菜单

## 预览

这个仓库目前是零依赖静态页面，直接打开 `index.html` 即可预览。

也可以用任意静态服务器运行，例如：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。
