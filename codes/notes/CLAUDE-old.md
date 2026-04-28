# CLAUDE.md — codes/notes

> AI 编码辅助配置文件。适用范围：`codes/notes/` 目录。

## 项目概述

"Entropy Zero（熵减笔记）" 的前端展示层。读取 `docs/` 目录中的结构化 JSON 笔记和复习卡，渲染为可浏览的 SPA。

**技术栈**：React 18 + Vite 6 + Tailwind CSS v3 + React Router v6

## 开发命令

```bash
# 在 codes/notes/ 目录下执行
npm run dev      # 启动开发服务器（默认 http://localhost:3000）
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 目录结构

```
src/
├── App.jsx               # 路由根（BrowserRouter + Routes）
├── main.jsx              # 入口，挂载 AppProvider
├── index.css             # Tailwind 指令 + 全局滚动条样式
├── components/
│   ├── CardPlayer.jsx    # 单篇笔记内的复习卡播放器（翻转交互）
│   ├── HookItem.jsx      # 笔记 hooks 关联关系渲染
│   ├── MarkdownContent.jsx # markdown-it 渲染组件（含代码高亮）
│   └── NoteViewer.jsx    # 笔记详情渲染（core_claims + 关联卡）
├── contexts/
│   └── AppContext.jsx    # 全局状态：darkMode 切换
├── layouts/
│   └── MainLayout.jsx    # 顶部导航 + 主内容区滚动容器
├── pages/
│   ├── NotesPage.jsx     # 路由 /       笔记卡片列表
│   ├── NoteDetailPage.jsx# 路由 /notes/:slug  笔记详情+复习
│   └── CardsPage.jsx     # 路由 /cards  全站复习卡库
├── services/
│   └── dataService.js    # 数据获取层（fetch /docs/ JSON）
└── utils/
    └── constants.js      # RELATION_MAP（hooks 关系类型配置）
```

## 数据来源

数据**不在**本目录内，位于仓库根目录 `docs/`：

| URL 路径                           | 对应文件                                      |
| ---------------------------------- | --------------------------------------------- |
| `GET /docs/notes/index.json`       | 动态生成（Vite 插件扫描 `docs/notes/*.json`） |
| `GET /docs/notes/{slug}.json`      | `docs/notes/{slug}.json`                      |
| `GET /docs/note-cards/{slug}.json` | `docs/note-cards/{slug}.json`                 |

> `index.json` **不存在于磁盘**，由 `vite.config.js` 中的自定义插件实时生成。

### 笔记 JSON Schema（`docs/notes/*.json`）

```json
{
  "id": "note_js_xxx",
  "title": "标题",
  "metadata": { "created_at": "...", "domain": "javascript" },
  "content": {
    "core_claims": [
      {
        "claim": "核心论断（Markdown 字符串）",
        "evidence": { "description": "佐证说明（Markdown 字符串）" }
      }
    ],
    "refinement": { "anti_patterns": ["..."] },
    "hooks": [
      {
        "relation": "因果|补充|对立|相似|前提|延伸",
        "target_concept": "...",
        "context": "..."
      }
    ]
  }
}
```

### 复习卡 JSON Schema（`docs/note-cards/*.json`）

```json
{
  "note_id": "note_js_xxx",
  "cards": [
    {
      "card_id": "card_0",
      "type": "qa",
      "question": "...",
      "answer": "...",
      "explanation": "..."
    }
  ]
}
```

## 样式规范

### 颜色系统

**主品牌色**：`#2B8F80`（不要替换为 `teal-*` Tailwind 预设色）

| 用途                 | 亮色                    | 暗色                  |
| -------------------- | ----------------------- | --------------------- |
| 页面背景             | `#F6F8F4`               | `#0B1213`             |
| 卡片/区块背景        | `bg-white`              | `#0F1A1A`             |
| 边框/分割线          | `#E6ECE6` / `slate-200` | `#163033` / `#2A4144` |
| 主文字               | `#0F2A26`               | `#E6F0EE`             |
| 次级强调色（复习卡） | `#5A5FB5`               | —                     |

> 颜色直接写 hex（如 `text-[#2B8F80]`），不使用 `primary` token。

### Dark Mode

- 策略：`darkMode: 'class'`（在 `<html>` 上切换 `.dark`）
- 通过 `AppContext.toggleDarkMode()` 控制，**不要直接操作 DOM**
- 组件中同时写亮色和暗色类：`bg-white dark:bg-[#0F1A1A]`

### 布局约定

- `html / body / #root`：`height: 100vh; overflow: hidden`（全局无滚动）
- 滚动仅发生在 `MainLayout` 的 `<main>` 区域（`overflow-y-auto [scrollbar-gutter:stable]`）
- 内容最大宽度：笔记列表用 `max-w-[1200px]`，笔记详情用 `max-w-[1400px]`，居中 `mx-auto`

## 路径别名

`@/` → `src/`（由 `vite.config.js` 配置）

```js
// 正确
import { useApp } from '@/contexts/AppContext';
// 错误
import { useApp } from '../../contexts/AppContext';
```

## 组件编写规范

1. **函数组件**，无 class 组件
2. **Markdown 渲染**：使用 `<MarkdownContent content={str} className="prose prose-sm dark:prose-invert max-w-none" />`，**不要自行调用 markdown-it**
3. **图标**：仅使用 `lucide-react`，不引入其他图标库
4. **Hook 关系类型**：仅用 `utils/constants.js` 中的 `RELATION_MAP` 键值（`补充 | 对立 | 因果 | 相似 | 前提 | 延伸`）
5. **加载态**：spinner 用 `animate-spin rounded-full border-4 border-slate-300 border-t-[#2B8F80]`
6. **错误态**：`text-rose-500` + 重试按钮（`bg-[#2B8F80] text-white`）

## 常见陷阱

- **不要**修改 `docs/` 目录中的 JSON 文件（由独立的 ingest 流程生成）
- **不要**在 `body` 或 `#root` 上添加滚动，会破坏布局
- `MarkdownContent` 使用 `dangerouslySetInnerHTML`，仅渲染来自 `docs/` 的受信 JSON 内容
- `index.json` 由 Vite 插件动态生成，增减 `docs/notes/` 文件后**无需**手动维护
