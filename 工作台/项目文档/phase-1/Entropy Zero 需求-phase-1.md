Entropy Zero (熵减笔记) 需求文档初稿 (Phase 1)

1.1 项目背景

在信息爆炸时代，学习者常面临“录入即忘”的困境。Entropy Zero 旨在通过 AI 技术实现信息的“熵减”，将冗长的原始笔记转化为高密度的原子化知识点与复习卡片，并通过结构化视觉呈现提高知识内化效率。

1.2 Phase 1 核心目标

- 支持用户手动录入 Markdown 笔记。
- 利用 AI 对录入内容进行逻辑解构，生成索引化笔记（摘要、精炼、知识点）。
- 自动生成配套的 Q&A 复习卡片。
- 实现基于类 Anki (FSRS) 算法的间隔复习流程。

2. 业务流程与逻辑

2.1 核心工作流

2.1.1. 输入阶段： 用户上传知识文件 (.md)，系统将知识存放于原始知识库。

2.1.2. 处理阶段 (Entropy Engine)：- AI 解析知识文件内容 (markdown)。- 提取原子知识点 (笔记)。- 生成复习问答对 (复习卡)。

2.1.3. 呈现阶段： 系统渲染“笔记详情页”，包含侧边栏导航、复习卡片模块。

2.1.4. 复习阶段： 用户进入“闭卷复习模式”，针对 复习卡 进行自我测试，系统记录反馈并调度下次复习。

2.2 熵减引擎逻辑 (Entropy Engine)

Phase 1 虽然不含 AI 直接对话生成，但包含对手动录入内容的处理：

- 原子化知识提取：手动录入内容作为未经梳理的知识，模拟人做笔记的过程，按照知识点生成对应的笔记。
- 复习卡生成：基于生成的笔记再生成复习卡，便于用户后续复习时测验是否已记忆。

3. 功能模块详细说明

3.1 知识录入模块 (Manual Entry)

- 文件上传： 直接上传原始的知识文档（.md），可设置为上传后自动进入知识梳理步骤，默认不自动进入。
- 知识入库： 按上传的文件为单位，将其归入原始知识库（raw），用户可以管理和查看。
- 知识梳理任务： 用户可选择按条件搜索批量处理原始知识库中的知识，且可以查看处理进度。

3.2 知识详情展示页 (Knowledge View)

- 查看笔记和复习卡：知识梳理完成后，用户可以查看生成的笔记详情页和对应的复习卡。
- 笔记详情：在笔记详情页中，用户可以查看该笔记包含了哪些知识点，进行学习。也可以看到这个笔记关联了多少复习卡。还可以在右侧侧边栏直接点击进入该笔记的复习卡模块复习知识，复习时默认只显示当天需要复习的。
- 查看原始知识和生成内容的关系：用户可以在原始知识库中查看每条原始知识对应生成的笔记和复习卡，了解梳理结果。也可以在笔记详情页中查看该笔记对应的原始知识内容，了解生成依据。

3.3 闭卷复习模块 (Retention Layer)
- 触发逻辑： 点击侧边栏“进入闭卷复习”或顶部导航“复习计划”。
- 全部复习卡：用户可以从一个全局的入口直接开始复习所有知识生成的复习卡，默认只显示当天需要复习的，用户可筛选。
- 交互形式：
  - 初始态： 页面所有 Q&A 模块答案隐藏。
  - 自测： 用户阅读问题 -> 心中作答 -> 点击“显示答案”。
  - 反馈评分： 参照 Anki 提供四个维度：
    - 忘记 (Again)： 完全不记得，1分钟内再次复习。
    - 困难 (Hard)： 勉强想起，间隔极短。
    - 良好 (Good)： 正确想起，按算法推后。
    - 简单 (Easy)： 瞬间想起，间隔大幅延长。
- 算法集成： 采用 FSRS 或简单版时间间隔算法存储每个卡片的 next_review_date。

3.4 增强型代码块 (CodeBlock)

- 视觉： 类 Mac 窗口装饰（红黄绿点）。
- 交互： 支持一键复制，带 Check 反馈动画。
- 高亮： 支持主流编程语言语法高亮。


4. 非功能性需求与 UI 规范

4.1 视觉参数 (Design Tokens)

- 主色调： Emerald 600 (#059669) 用于行动点。
- 背景色： Slate 50 (#F8FAFC) 作为全局底色。
- 字体： 正文 Inter/系统无衬线，代码 JetBrains Mono。
- 动效： 复习模式下的 Brain 图标需具备“呼吸感”缩放效果。

详细视觉设计参考：./design-ui.md
前端界面实现参考：./design-ui.jsx

4.2 性能与兼容性

- 响应式：必须完美适配手机端，移动端下侧边栏收纳至抽屉或置于底部。
- 后端：Phase 1 仅考虑在线使用，数据应存入后端数据库。

1. Phase 1 数据结构定义 (JSON 示例)

- 原始知识: 
```json
{
  "raw_id": "uuid", // [PK] 主键
  "user_id": "uuid", // [FK] 关联用户，用于数据隔离索引
  "file_name": "string", // 文件名 (max: 255)
  "content": "text", // 原始 Markdown 全文
  "status": "string", // 状态枚举: pending, processing, processed, failed
  "created_at": "datetime", // 上传时间
  "updated_at": "datetime" // 最后修改时间
}
```

- 笔记：
```json
{
  "note_id": "uuid", // [PK] 主键
  "user_id": "uuid", // [FK] 关联用户，建立复合索引 (user_id, created_at)
  "raw_id": "uuid", // [FK] 关联原始知识
  "title": "string", // 笔记标题
  "abstract": "text", // AI 生成的 50-100 字摘要
  "tags": "jsonb", // 字符串数组，如 ["Python", "Backend"]，使用 JSONB 方便后期 GIN 索引
  "content_json": "jsonb", // [核心] 存储原子知识点 Points 列表
  /* content_json 内部结构示例:
     [
       {
         "p_id": "uuid", 
         "title": "知识点标题",
         "body": "Markdown 内容 包含代码块",
       }
     ]
  */
  "created_at": "datetime",
}
```

- 复习卡：
```json
{
  "card_id": "uuid", // [PK] 主键
  "user_id": "uuid", // [FK] 用户 ID，用于全局复习计划筛选
  "note_id": "uuid", // [FK] 所属笔记，物理外键约束级联删除
  "point_id": "string", // 对应 content_json 里的 p_id，逻辑关联
  "question": "text", // 问题正文
  "answer": "text", // 答案正文
  "fsrs_state": "jsonb", // [核心] 存储 FSRS 算法状态。包含稳定性稳定性 stability, 难度 difficulty, reps 等
  "next_review": "datetime", // [Index] 下次复习时间，必须独立出来作为索引字段，用于查询今日任务
  "last_review": "datetime", // 上次复习时间
  "created_at": "datetime"
}
```

- 复习流水日志：
```json
{
  "log_id": "bigint", // [PK] 自增 ID
  "card_id": "uuid", // [FK] 关联卡片
  "user_id": "uuid", // [FK] 关联用户
  "rating": "smallint", // 评分 (1-4)
  "elapsed_days": "integer", // 本次复习实际间隔天数
  "scheduled_days": "integer", // 本次复习原定间隔天数
  "review_at": "datetime" // 记录产生时间
}
```

- 任务处理状态：
```json
{
  "task_id": "uuid", // 主键
  "raw_id": "uuid", // 对应的原始知识 ID
  "task_type": "entropy_deconstruction", // 任务类型标识
  "current_step": "string", // 当前步骤描述（如：正在提取知识点...）
  "progress_percent": "number", // 进度百分比 0-100
  "error_msg": "string | null", // 若失败，记录详细错误堆栈或原因
  "created_at": "datetime" // 任务启动时间
}
```



6. 用户认证与权限需求 (Auth System)

6.1 用户注册 (Sign Up)

注册方式： Phase 1 仅支持邮箱注册，需要校验邮箱是否有效。

校验规则： 邮箱需符合标准格式；密码长度不少于 8 位，必须包含字母与数字。

数据处理： 后端需对密码进行加盐哈希存储（建议使用 passlib + bcrypt）。

6.2 用户登录 (Sign In)

认证模式： 采用 OAuth2 密码模式。

凭证发放： 登录成功后发放 JWT (JSON Web Token)，包含 user_id 和过期时间。

过期策略： Access Token 有效期 24 小时；暂不引入 Refresh Token 以简化 Phase 1 逻辑。

6.3 权限校验 (Authorization)

中间件校验： FastAPI 后端需实现依赖注入（Depends）机制，在所有涉及数据的 API 入口处检查 Header 中的 Bearer Token。

数据隔离约束：

读权限： 用户只能查询 user_id 等于其 Token ID 的 Raw Knowledge、Notes 和 Flashcards。

写权限： 所有的增删改操作必须校验资源所属权，防止横向越权攻击。

未认证处理： 若 Token 无效或缺失，统一返回 401 Unauthorized 响应，前端自动跳转至登录页。

6.4 用户信息维护

基础资料： 用户可修改昵称、头像。

账户安全： 提供修改密码功能，需通过邮箱进行二次验证。