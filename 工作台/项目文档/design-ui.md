Entropy Zero (熵减笔记) 前端展示层详细设计规范 (V1.1)

1. 项目概述

项目名称：Entropy Zero (熵减笔记) - 笔记详情展示页
核心目标：通过高秩序感的 UI 设计、沉浸式的阅读排版和交互式的 Q&A 模块，将无序的笔记内容转化为有序的知识资产。
目标人群：程序员、研究员、重度学习者。

2. 视觉风格与全局参数 (Design Tokens)

2.1 基础色调 (Color Palette)

变量名

色值

用途说明

bg-page

#F8FAFC (Slate 50)

页面全局背景

bg-surface

#FFFFFF

卡片、容器背景

brand-primary

#059669 (Emerald 600)

品牌主色、主按钮、激活状态

text-main

#0F172A (Slate 900)

标题、正文、重点内容

text-muted

#64748B (Slate 500)

辅助文本、元数据、面包屑

border-light

#E2E8F0 (Slate 200)

边框、分割线

bg-code

#1E1E2E

代码块深色背景

2.2 圆角与投影 (Radius & Shadows)

2xl (16px): 用于侧边栏卡片、主内容区域卡片。

xl (12px): 用于代码块、Q&A 折叠面板。

lg (8px): 用于 Logo、徽章、按钮。

Shadow-sm: box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); (默认状态)。

Shadow-md: box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); (悬停状态)。

3. 页面布局架构 (Layout Structure)

3.1 顶部导航栏 (Sticky Header)

高度: 56px (h-14)。

样式: 背景色 rgba(255, 255, 255, 0.8)，具备 backdrop-blur-md 模糊效果。

左侧: Logo 区（绿色方块图标 + Entropy Zero 文本）。

中间: 面包屑式导航。

右侧: 搜索图标、通知图标、用户头像。

3.2 响应式双栏容器

容器宽: max-w-[1400px]，水平居中。

主内容区 (Main):

宽度控制: max-w-[850px]，保证每行阅读字数在 60-80 字符之间。

内边距: 移动端 16px，桌面端 32px。

侧边栏 (Sidebar):

宽度: 固定 280px。

定位模式: Sticky 定位，top: 96px。

溢出处理: 设置 max-h-[calc(100vh-120px)] 且 overflow-y-auto，隐藏滚动条。

4. 核心组件功能说明 (Component Specs)

4.1 知识点卡片 (PointCard)

结构: 序号徽标 + 标题 + 正文 + (可选) 代码块。

视觉特征:

右上角显示透明度 5% 的超大序号数字（如 01）作为视觉水印。

鼠标悬浮时，边框颜色从 Slate 200 渐变为 Emerald 200。

4.2 交互式 Q&A 模块 (QACard)

交互逻辑:

闭卷态: 仅展示问题标题，图标为向下箭头。

点击: 切换展开/折叠。

展示态: 背景色微变，平滑显示答案内容，支持代码高亮。

动画: 使用 transition-all 和 max-height 模拟折叠展开效果。

4.3 增强型代码块 (CodeBlock)

视觉: 模拟 macOS 窗口，左上角有红黄绿三色装饰点。

语言标识: 顶部居中显示当前语言（如 JAVASCRIPT）。

复制功能:

右上角悬浮显示复制图标。

点击后调用 navigator.clipboard。

反馈：图标从 Copy 切换为 Check 并变为绿色，2秒后恢复。

4.4 目录导航树 (Table of Contents)

功能: 提取文章标题 H2/H3 生成链接。

激活态 (Active):

文字加粗且颜色变为 Emerald 600。

左侧显示 2px 宽的绿色垂直指示条。

5. 特殊交互逻辑

5.1 闭卷复习模式 (Review Mode)

入口: 侧边栏最上方宽幅按钮。

视觉强调: 背景色 Emerald 600，文字白色，加粗。

动效: Brain 图标具备呼吸灯效果（Scale 1.0 -> 1.05 循环）。

联动: 点击后，页面所有 Q&A 模块强制进入“隐藏答案”状态。

5.2 独立滚动 (Independent Scroll)

当左侧主内容区内容极长产生滚动时，右侧边栏保持吸顶。

如果右侧内容（如目录树）本身过长，支持侧边栏内部独立滚动，互不干扰。

6. 开发实现参考 (Implementation Details)

6.1 技术栈建议

UI 框架: React 18+。

样式解决方案: Tailwind CSS (JIT Mode)。

图标库: Lucide React (尺寸统一为 18px 或 20px)。

字体:

正文: Inter 或 系统默认无衬线字体。

代码: JetBrains Mono 或 Fira Code。

6.2 关键 CSS 类名示例

侧边栏隐藏滚动条: .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar::-webkit-scrollbar { display: none; }

主色过渡: transition-all duration-300 ease-in-out

7. 异常处理与兼容性

空状态: 若无 Q&A，该模块不渲染。

低端设备: 禁用 backdrop-blur 以保证滑动帧率。

复制失败: 若浏览器禁用了剪贴板权限，弹出自定义 Toast 提示“手动选择复制”。
