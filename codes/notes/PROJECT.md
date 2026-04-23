# Entropy Zero - 熵减笔记系统

## 项目概述

这是一个基于 **Vite + React + TailwindCSS** 的知识管理前端应用，用于展示和复习结构化的学习笔记与复习卡片。

**核心价值：** 将原始 Markdown 知识文档转换为 JSON 格式后，通过可视化界面进行阅读学习（笔记模式）和主动复习（复习卡模式）。

**设计理念：** 遵循 Karpathy LLM Wiki + 熵减理论，知识在摄入时即完成结构化处理，而非每次查询时重新提取。

**最新进展（2026-04-22）：**

- ✅ 完成笔记详情页双栏布局重构
- ✅ 实现知识语义图谱可视化（彩色图标 + 语义提示）
- ✅ 复习卡页面添加语义关联节点展示
- ✅ 全面通过 Playwright 功能验证

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

- **开卷笔记模式（双栏布局）：**
  - **左栏（主内容区）：**
    - 笔记标题（左侧绿色竖条装饰）
    - 摘要（斜体 + 边框高亮）
    - 核心逻辑拆解（序号 + 主张 + 证据类型标签）
    - 关联复习卡 Q&A 视图（问题 + 参考答案预览）
  - **右栏（辅助信息区）：**
    - 反模式警示（红色 X 标记）
    - 知识语义图谱（彩色图标 + 关系提示 + 目标概念 + 上下文）
- **闭卷复习模式（紧凑卡片样式）：**
  - 进度条（绿色高亮当前卡片）
  - 卡片类型标签（QA/FILL_IN_BLANK/ERROR_CORRECTION）
  - 问题展示（大号粗体）
  - 代码块展示（深色背景 + 等宽字体）
  - 答案展示（绿色答案框 + 解析）
  - 语义关联节点（显示答案后展示对应的知识钩子）
  - 交互：显示/隐藏答案、下一张、重置

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

### ⚠️ 常见陷阱（必读！）

#### 1. constants.js 图标配置错误导致白屏

**错误写法：**

```javascript
export const RELATION_MAP = {
  补充: {
    icon: <GitBranch size={14} />, // ❌ 存储 JSX 元素会导致应用白屏
  },
};
```

**正确写法：**

```javascript
export const RELATION_MAP = {
  补充: {
    Icon: GitBranch, // ✅ 存储组件类
    iconSize: 14, // ✅ 单独存储 size
  },
};

// 在 HookItem.jsx 中使用
const Icon = config.Icon;
return <Icon size={config.iconSize} />;
```

**原因：** JSX 元素不能在模块作用域直接创建并存储，只能在组件渲染时创建。

#### 2. NoteViewer 和 CardPlayer 的 props 传递

**关键点：**

- `NoteViewer` 需要同时接收 `noteData` 和 `cardsData`（用于显示关联复习卡）
- `CardPlayer` 需要同时接收 `cardsData` 和 `noteData`（用于显示语义关联节点）

**正确用法：**

```jsx
// NoteDetailPage.jsx
<NoteViewer noteData={noteData} cardsData={cardsData} />
<CardPlayer cardsData={cardsData} noteData={noteData} />
```

#### 3. 复习卡的 hook_index 字段

每张复习卡的 `hook_index` 字段指向该卡片关联的知识钩子索引，用于在显示答案时展示对应的语义节点。

### 🔄 持续演进规范

**每次修改代码后的必做事项：**

1. **运行 Playwright 验证**
   - 打开浏览器页面
   - 测试所有交互功能
   - 截图保存验证结果

2. **更新文档**
   - `AI-HANDOFF.md`：更新"最后更新"日期和内容
   - `PROJECT.md`：更新"最新进展"、添加新的陷阱/限制
   - 如有新的常见问题，添加到相应章节

3. **提交变更**

   ```bash
   git add .
   git commit -m "feat: [功能描述] - [技术要点]"
   ```

4. **知识传承**
   - 发现的陷阱必须记录到"常见陷阱"章节
   - 最佳实践记录到"重要约定"章节
   - 保留原型文件（`工作台/*.jsx`）作为设计参考

**文档更新检查清单：**

- [ ] 更新了最后修改日期
- [ ] 记录了新增/修改的功能
- [ ] 添加了新发现的陷阱（如有）
- [ ] 更新了常见问题解答（如有）
- [ ] 通过了 Playwright 验证
- [ ] 提交了 git commit

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
**本次更新：** UI重构 - 双栏布局 + 知识语义图谱可视化  
**维护者：** GitHub Copilot (Claude Sonnet 4.5)  
**项目状态：** ✅ 可投入使用  
**验证状态：** ✅ 已通过 Playwright 完整验证

## 📝 更新日志

### 2026-04-22 - UI重构与语义图谱

**新增功能：**

- 笔记详情页双栏布局（左：核心内容；右：辅助信息）
- 知识语义图谱可视化（补充/对立/因果/相似/前提/延伸 6种关系）
- 复习卡语义关联节点展示
- 关联复习卡 Q&A 视图

**修复问题：**

- constants.js 图标配置错误（JSX元素 → 组件类）
- HookItem 组件图标渲染逻辑

**技术要点：**

- 图标必须存储为组件类而非 JSX 元素
- NoteViewer 和 CardPlayer 需要相互传递数据
- 复习卡通过 hook_index 关联知识钩子

**验证方式：** Playwright 自动化测试（6个测试用例全部通过）
