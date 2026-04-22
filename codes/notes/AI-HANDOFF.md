# AI 接手指南 - Entropy Zero 笔记系统

你正在接手一个**知识管理前端应用**，用于展示和复习结构化的学习笔记。

## 核心信息速览

**技术栈：** Vite 6 + React 18 + React Router 6 + Tailwind CSS v3 + lucide-react  
**项目位置：** `codes/notes/`  
**数据来源：** `../../docs/notes/` (笔记JSON) 和 `../../docs/note-cards/` (复习卡JSON)  
**启动命令：** `cd codes/notes && npm run dev`  
**访问地址：** http://localhost:3000/

## 项目结构一句话

```
src/
├── pages/        # 路由页面（NotesPage、NoteDetailPage、CardsPage）
├── components/   # UI组件（NoteViewer、CardPlayer、HookItem）
├── layouts/      # MainLayout（导航栏+暗黑模式）
├── services/     # dataService.js（统一JSON加载）
├── contexts/     # AppContext（全局状态）
└── utils/        # constants.js（关系图标配置）
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

## 快速定位问题

### 页面显示 "Unexpected token '<'"

→ 检查 `vite.config.js` 中间件配置，确保正确拦截 `/docs/*` 请求

### Tailwind 样式不生效

→ 检查 `tailwind.config.js` 是否为 v3 配置（`module.exports`）

### 复习卡加载失败

→ 检查 `docs/note-cards/` 目录下是否有对应的 JSON 文件

### 路由跳转后白屏

→ 检查浏览器控制台错误，通常是组件渲染错误或数据格式不匹配

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

1. 访问 http://localhost:3000/
2. 点击任意笔记卡片查看详情
3. 切换到"闭卷复习"模式测试复习卡
4. 点击顶部"复习卡库"查看所有复习卡

**准备就绪！开始你的工作吧！** 🚀
