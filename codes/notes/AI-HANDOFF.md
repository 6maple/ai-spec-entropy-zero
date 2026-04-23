# AI 接手指南 - Entropy Zero 笔记系统

你正在接手一个**知识管理前端应用**，用于展示和复习结构化的学习笔记。

## 核心信息速览

**技术栈：** Vite 6 + React 18 + React Router 6 + Tailwind CSS v3 + lucide-react  
**项目位置：** `codes/notes/`  
**数据来源：** `../../docs/notes/` (笔记JSON) 和 `../../docs/note-cards/` (复习卡JSON)  
**启动命令：** `cd codes/notes && npm run dev`  
**访问地址：** http://localhost:3000/  
**最后更新：** 2026-04-22 - UI重构完成（双栏布局 + 语义图谱）

## 项目结构一句话

```
src/
├── pages/        # 路由页面（NotesPage、NoteDetailPage、CardsPage）
├── components/   # UI组件（NoteViewer、CardPlayer、HookItem）
│   └── NoteViewer.jsx    # ✨ 双栏布局（左：核心逻辑+复习卡；右：反模式+语义图谱）
│   └── CardPlayer.jsx    # ✨ 紧凑样式 + 语义关联节点展示
│   └── HookItem.jsx      # ✨ 带彩色图标的知识钩子组件
├── layouts/      # MainLayout（导航栏+暗黑模式）
├── services/     # dataService.js（统一JSON加载）
├── contexts/     # AppContext（全局状态）
└── utils/        # constants.js（关系图标配置 - 重要：存储组件类而非JSX）
```

## 核心功能

1. **笔记库** (`/`) - 展示所有笔记的卡片列表
2. **笔记详情** (`/notes/:slug`) - 显示笔记内容或复习卡（可切换）
3. **复习卡库** (`/cards`) - 展示所有复习卡组的列表
4. **暗黑模式** - 全局切换

## 关键设计点

### 1. 数据加载机制（重要！）

**问题：** 前端在 `codes/notes/`，数据在上层 `../../docs/`

**解决：** Vite 自定义中间件拦截 `/docs/*` 请求并返回上层目录的文件

```javascript
// vite.config.js 中的关键代码
{
  name: 'serve-docs',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/docs/')) {
        // 读取上层 docs 目录的 JSON 文件并返回
      }
    })
  }
}
```

### 2. 数据流

```
页面组件 → dataService.js → fetch('/docs/...') → Vite中间件 → 返回JSON
```

**所有数据加载必须通过 `dataService.js`，页面组件不直接 fetch！**

### 3. Tailwind 版本（注意！）

- 使用 **Tailwind CSS v3**，不是 v4
- 配置文件用 `module.exports`，不是 `export default`
- `darkMode: 'class'`，不是 `'selector'`

## JSON 数据结构速查

### 笔记 JSON (`docs/notes/*.json`)

```json
{
  "id": "note_xxxxx_20260422",
  "title": "标题",
  "abstract": "一句话摘要",
  "content": {
    "core_claims": [...],      // 核心主张
    "refinement": {
      "anti_patterns": [...]   // 反模式
    },
    "hooks": [...]             // 知识钩子
  },
  "metadata": {...}
}
```

### 复习卡 JSON (`docs/note-cards/*.json`)

```json
{
  "note_id": "note_xxxxx_20260422",
  "cards": [
    {
      "type": "qa | fill_in_blank | error_correction",
      "question": "问题",
      "answer": "答案",
      "explanation": "解析"
    }
  ]
}
```

## 常见任务快速指南

### 修改笔记展示样式

→ 编辑 `src/components/NoteViewer.jsx`

### 修改复习卡交互

→ 编辑 `src/components/CardPlayer.jsx`

### 添加新路由页面

1. 在 `src/pages/` 创建新组件
2. 在 `src/App.jsx` 添加路由配置

### 调整导航栏

→ 编辑 `src/layouts/MainLayout.jsx`

### 修改关系图标配置

→ 编辑 `src/utils/constants.js` 中的 `RELATION_MAP`

### 添加新的数据 API

→ 在 `src/services/dataService.js` 添加新函数

## 重要约定

1. **UI 组件保持纯净**：`NoteViewer` 和 `CardPlayer` 只接收 props，不做数据加载
2. **数据服务单一职责**：所有 fetch 操作必须在 `dataService.js`
3. **不要升级 Tailwind 到 v4**：当前代码基于 v3 语法
4. **暗黑模式**：通过 Context 管理，切换 `<html>` 的 `dark` class
5. **⚠️ constants.js 陷阱**：图标必须存储为组件类（`Icon: GitBranch`），不能存储 JSX 元素（`icon: <GitBranch />`），否则会导致应用白屏
6. **🔄 持续演进规范**：每次功能修改后，必须更新 `AI-HANDOFF.md` 和 `PROJECT.md`，记录变更内容和新增陷阱

## 快速定位问题

### 页面显示 "Unexpected token '<'"

→ 检查 `vite.config.js` 中间件配置，确保正确拦截 `/docs/*` 请求

### Tailwind 样式不生效

→ 检查 `tailwind.config.js` 是否为 v3 配置（`module.exports`）

### 复习卡加载失败

→ 检查 `docs/note-cards/` 目录下是否有对应的 JSON 文件

### 路由跳转后白屏

→ 检查浏览器控制台错误，通常是组件渲染错误或数据格式不匹配

### 应用完全白屏，控制台无报错

→ 检查 `constants.js`，图标配置必须是 `Icon: GitBranch`（组件类），不能是 `icon: <GitBranch />`（JSX元素）

### 知识钩子图标不显示

→ 检查 `HookItem.jsx` 是否正确使用 `const Icon = config.Icon; <Icon size={config.iconSize} />`

## 扩展方向建议

**短期：**

- 添加搜索功能（按标题/标签筛选）
- 复习卡添加"标记为难点"功能
- 添加键盘快捷键（空格键翻卡）

**中期：**

- 引入 SWR/React Query 做数据缓存
- 学习进度追踪（LocalStorage）
- 笔记关系图谱可视化

## 详细文档

完整的项目说明请参阅：[PROJECT.md](./PROJECT.md)

---

**开始开发：**

```bash
cd codes/notes
npm install
npm run dev
```

**验证功能：**

<important>你需要自己通过playwright工具验证修改后的功能和界面</important>

**验证清单（必须全部通过）：**

1. ✅ 访问 http://localhost:3000/，确认笔记库正常显示
2. ✅ 点击任意笔记卡片查看详情，验证双栏布局
3. ✅ 检查知识语义图谱的图标和颜色是否正确显示
4. ✅ 切换到"闭卷复习"模式，验证复习卡样式
5. ✅ 点击"显示答案与语义关联"，确认语义节点显示
6. ✅ 切换暗黑模式，验证所有组件颜色适配
7. ✅ 点击顶部"复习卡库"查看所有复习卡

**验证工具使用：**

```javascript
// 打开页面
await open_browser_page({ url: 'http://localhost:3000/' });

// 截图验证
await screenshot_page({ pageId });

// 点击测试
await click_element({ pageId, element: '描述', ref: 'xxx' });
```

---

## 🔄 持续演进规范

**每次修改后必须执行：**

1. **功能验证**：使用 Playwright 工具验证所有功能正常
2. **更新文档**：
   - 在 `AI-HANDOFF.md` 的"核心信息速览"更新最后修改日期和内容
   - 在 `PROJECT.md` 的"技术债务与注意事项"记录新增限制
   - 如有新的常见问题，添加到"快速定位问题"章节
3. **提交记录**：
   ```bash
   git add .
   git commit -m "feat: [简述修改内容]"
   ```
4. **传承知识**：
   - 如发现新的陷阱/最佳实践，必须记录到文档
   - 原型文件（如 `工作台/*.jsx`）保留作为参考

**文档更新模板：**

```markdown
## 核心信息速览

**最后更新：** YYYY-MM-DD - [修改简述]

## 重要约定

[新增约定序号]. **[约定标题]**：[详细说明]

## 快速定位问题

### [问题描述]

→ [解决方案]
```

**准备就绪！开始你的工作吧！** 🚀
