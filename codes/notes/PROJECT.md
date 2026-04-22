# Entropy Zero - 熵减笔记系统

## 项目概述

这是一个基于 **Vite + React + TailwindCSS** 的知识管理前端应用，用于展示和复习结构化的学习笔记与复习卡片。

**核心价值：** 将原始 Markdown 知识文档转换为 JSON 格式后，通过可视化界面进行阅读学习（笔记模式）和主动复习（复习卡模式）。

**设计理念：** 遵循 Karpathy LLM Wiki + 熵减理论，知识在摄入时即完成结构化处理，而非每次查询时重新提取。

---

## 技术栈

### 核心依赖

- **Vite 6.0.3** - 构建工具，快速开发体验
- **React 18.3.1** - UI 框架
- **React Router DOM 6.28.0** - 客户端路由
- **Tailwind CSS 3.4.17** - 原子化 CSS（v3，非 v4）
- **lucide-react 0.460.0** - 图标库

### 关键配置点

- **Tailwind v3 语法：** 使用 `dark:` 前缀、透明度语法 `/40`、任意值 `[#hex]`
- **PostCSS + Autoprefixer：** 确保 CSS 兼容性
- **自定义 Vite 中间件：** 将上层 `docs/` 目录作为静态资源服务

---

## 项目结构

```
codes/notes/
├── src/
│   ├── pages/                    # 页面级组件（路由对应）
│   │   ├── NotesPage.jsx        # 笔记库列表页
│   │   ├── NoteDetailPage.jsx   # 单个笔记详情页（含笔记/复习卡切换）
│   │   └── CardsPage.jsx        # 复习卡库列表页
│   ├── components/               # UI 组件（纯展示）
│   │   ├── NoteViewer.jsx       # 笔记内容展示组件
│   │   ├── CardPlayer.jsx       # 复习卡练习组件
│   │   └── HookItem.jsx         # 知识钩子展示组件
│   ├── layouts/                  # 布局组件
│   │   └── MainLayout.jsx       # 主布局（顶部导航 + 暗黑模式切换）
│   ├── services/                 # 数据服务层
│   │   └── dataService.js       # 统一管理 JSON 数据加载
│   ├── contexts/                 # 全局状态管理
│   │   └── AppContext.jsx       # 应用级状态（暗黑模式）
│   ├── utils/                    # 工具函数
│   │   └── constants.js         # 常量（关系图标配置）
│   ├── App.jsx                   # 根组件（路由配置）
│   ├── main.jsx                  # 入口文件
│   └── index.css                 # 全局样式（Tailwind 指令）
├── vite.config.js                # Vite 配置（关键：自定义中间件）
├── tailwind.config.js            # Tailwind v3 配置
├── postcss.config.js             # PostCSS 配置
├── package.json                  # 依赖管理
└── index.html                    # HTML 入口

数据来源（上层目录）：
../../docs/
├── notes/                        # 笔记 JSON 文件
│   ├── index.json               # 笔记索引
│   └── *.json                   # 单个笔记文件
└── note-cards/                   # 复习卡 JSON 文件
    └── *.json                   # 单个笔记对应的复习卡
```

---

## 核心功能

### 1. 笔记库（NotesPage）

- 加载并展示所有笔记的卡片列表
- 显示标题、摘要、标签、创建时间
- 点击卡片进入笔记详情页

### 2. 笔记详情（NoteDetailPage）

- **开卷笔记模式：**
  - 显示笔记标题、ID、摘要
  - 展示核心主张（claim + evidence + source_lines）
  - 展示反模式警示（anti_patterns）
  - 展示知识钩子（hooks，含语义化关系图标）
- **闭卷复习模式：**
  - 显示该笔记对应的复习卡
  - 支持问答题、填空题、找错题三种类型
  - 交互：显示/隐藏答案、下一张、进度显示

### 3. 复习卡库（CardsPage）

- 展示所有复习卡组的列表
- 显示每组卡片的标题和卡片数量
- 点击进入对应笔记的复习模式

### 4. 全局功能

- **暗黑模式切换：** 通过 Context 管理，切换 `dark` class
- **响应式布局：** 基于 Tailwind 的响应式断点
- **路由导航：** 笔记库 `/`、复习卡库 `/cards`、笔记详情 `/notes/:slug`

---

## 数据流设计

```
用户操作
    ↓
页面组件（NotesPage / NoteDetailPage / CardsPage）
    ↓
调用 dataService API
    ↓
fetch('/docs/notes/*.json') 或 fetch('/docs/note-cards/*.json')
    ↓  (Vite 自定义中间件拦截并返回上层 docs 目录的文件)
返回数据到页面组件
    ↓
传递 props 给 UI 组件（NoteViewer / CardPlayer）
    ↓
渲染界面
```

### 关键数据服务 API

```javascript
// src/services/dataService.js

getNoteIndex(); // 获取所有笔记的索引列表
getNoteBySlug(slug); // 根据 slug 获取单个笔记详情
getCardsBySlug(slug); // 根据 slug 获取对应的复习卡
getAllCards(); // 获取所有复习卡（用于复习卡库页面）
```

---

## JSON 数据结构

### 笔记文件（docs/notes/\*.json）

```json
{
  "id": "note_xxxxx_20260422",
  "title": "笔记标题",
  "abstract": "一句话摘要",
  "source": {
    "input_path": "docs/raw/xxx.md",
    "line_range": [1, 100]
  },
  "content": {
    "core_claims": [
      {
        "claim": "核心主张文本",
        "evidence": {
          "type": "reasoning | code_example | data | api | analogy",
          "description": "证据描述"
        },
        "source_lines": [10, 20]
      }
    ],
    "refinement": {
      "summary": "实践要点总结",
      "anti_patterns": ["反模式1", "反模式2"]
    },
    "hooks": [
      {
        "relation": "supplement | contradiction | causation | extension | analogy",
        "target_concept": "关联概念名称",
        "context": "为什么关联"
      }
    ]
  },
  "metadata": {
    "created_at": "2026-04-22T10:00:00Z",
    "domain": ["领域1", "领域2"],
    "confidence": 0.95
  }
}
```

### 复习卡文件（docs/note-cards/\*.json）

```json
{
  "note_id": "note_xxxxx_20260422",
  "note_title": "对应笔记标题",
  "cards": [
    {
      "card_id": "card_a1q_20260422",
      "type": "qa | fill_in_blank | error_correction",
      "question": "问题文本",
      "answer": "答案文本",
      "explanation": "解析文本",
      "source_lines": [10, 20]
    }
  ]
}
```

---

## 关键设计决策

### 1. 为什么使用自定义 Vite 中间件？

**问题：** 前端工程在 `codes/notes/`，数据在上层 `docs/`，Vite 默认不允许访问上层目录。

**解决方案：** 在 `vite.config.js` 中添加自定义中间件，拦截 `/docs/*` 请求并返回上层目录的 JSON 文件。

```javascript
// vite.config.js
{
  name: 'serve-docs',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/docs/')) {
        const relativePath = req.url.replace('/docs/', '')
        const filePath = path.join(__dirname, '..', '..', 'docs', relativePath)
        // ... 读取并返回文件
      }
      next()
    })
  }
}
```

### 2. 为什么使用 Context 而非状态管理库？

**原因：** 当前只有暗黑模式一个全局状态，使用 Context 足够简单且轻量。如果未来需要管理更多全局状态（如用户偏好、学习进度），再考虑引入 Zustand/Jotai。

### 3. 为什么 UI 组件（NoteViewer/CardPlayer）是纯展示组件？

**设计原则：** 数据获取逻辑在页面组件，UI 组件只负责渲染。这样便于：

- 复用 UI 组件
- 测试 UI 组件（只需传 mock 数据）
- 数据加载逻辑集中管理

---

## 开发指南

### 启动开发服务器

```bash
cd codes/notes
npm install  # 首次运行
npm run dev  # 启动开发服务器
```

访问：http://localhost:3000/

### 构建生产版本

```bash
npm run build   # 构建到 dist/
npm run preview # 预览生产构建
```

### 代码规范

- **组件命名：** PascalCase（如 `NoteViewer.jsx`）
- **文件组织：** 按功能分层（pages/components/services）
- **Props 传递：** 明确解构，避免 props drilling
- **错误处理：** 页面组件统一 try-catch，UI 组件展示错误状态

---

## 常见问题与解决方案

### Q1: 为什么加载笔记时显示 "Unexpected token '<'"？

**原因：** Vite 中间件配置错误，返回的是 HTML 而非 JSON。

**检查：**

1. `vite.config.js` 中的自定义中间件是否正确配置
2. `req.url.startsWith('/docs/')` 是否匹配
3. 文件路径拼接是否正确

### Q2: 为什么 Tailwind 样式不生效？

**原因：** 可能是 Tailwind v4 配置被误用。

**检查：**

1. `tailwind.config.js` 使用 `module.exports`（v3）而非 `export default`（v4）
2. `darkMode: 'class'`（v3）而非 `'selector'`（v4）
3. `src/index.css` 包含 `@tailwind` 指令

### Q3: 为什么复习卡的 slug 提取失败？

**原因：** `note_id` 格式为 `note_<6char>_<YYYYMMDD>`，提取 slug 时需要特殊处理。

**解决：** 参考 SKILL.md 中的 slug 生成规则，从 `source_trace.input_path` 或笔记 JSON 文件名提取。

---

## 与 SKILL.md 的对接

本项目的数据来源于 `.claude/skills/ingest-json/SKILL.md` 定义的摄入流程：

1. **Stage 1-2：** 原始 Markdown (`docs/raw/*.md`) → 结构化笔记 JSON (`docs/notes/*.json`)
2. **Stage 3：** 生成复习卡 JSON (`docs/note-cards/*.json`)
3. **本项目：** 读取并可视化展示这些 JSON 数据

**关键联系点：**

- 笔记 JSON 的 `id` / `title` / `abstract` / `content` 结构
- 复习卡 JSON 的 `type` / `question` / `answer` 结构
- 知识钩子的 `relation` 类型（补充/对立/因果/相似/前提/延伸）

---

## 扩展方向

### 短期优化

- [ ] 添加搜索功能（按标题/标签筛选）
- [ ] 复习卡添加"标记为难点"功能
- [ ] 笔记详情页添加目录导航
- [ ] 添加键盘快捷键（如空格键翻卡）

### 中期扩展

- [ ] 引入 SWR/React Query 做数据缓存
- [ ] 添加学习进度追踪（LocalStorage）
- [ ] 支持笔记之间的关系图谱可视化
- [ ] 导出学习报告

### 长期规划

- [ ] 支持用户自定义笔记（编辑/新增）
- [ ] 集成 AI 辅助（如自动生成复习卡）
- [ ] 多用户协作与云端同步
- [ ] 移动端适配优化

---

## 技术债务与注意事项

### 已知限制

1. **Slug 提取逻辑脆弱：** 当前从 `note_id` 提取 slug 的方式不够健壮，建议在笔记 JSON 中直接包含 `slug` 字段。
2. **无离线支持：** 依赖开发服务器的中间件，生产环境需要调整为静态资源或 API 服务。
3. **无加载状态缓存：** 每次进入页面都重新 fetch，可引入 SWR 优化。

### 重要约定

- **不要升级到 Tailwind v4：** 当前代码基于 v3 语法，升级会导致配置文件和某些类名不兼容。
- **保持数据服务单一职责：** 所有 JSON 加载逻辑必须通过 `dataService.js`，页面组件不得直接 fetch。
- **UI 组件保持纯净：** `NoteViewer` 和 `CardPlayer` 不应包含数据加载逻辑，只接收 props 渲染。

---

## 交接清单

- [x] 项目结构清晰，分层合理
- [x] 所有核心功能已实现并验证
- [x] 代码规范一致，注释完整
- [x] 依赖版本明确，无冲突
- [x] 开发环境可正常启动
- [x] 与上游数据格式（SKILL.md）对齐
- [x] 提供完整的项目文档

---

**最后更新：** 2026-04-22  
**维护者：** GitHub Copilot (Claude Sonnet 4.5)  
**项目状态：** ✅ 可投入使用
