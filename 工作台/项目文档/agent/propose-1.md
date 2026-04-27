# Proposal: 启用 AI Agent 并移除占位逻辑

## 概述

当前系统已经实现了完整的 AI agent 架构（orchestrator, claim_extractor, card_generator 等），但默认关闭使用占位逻辑。本变更将启用 agent 并移除所有占位代码。

## 问题陈述

### 当前状态

1. **Agent 被禁用**：`ENTROPY_AGENT=0` 导致使用 `run_deterministic_processor`
2. **占位数据问题**：
   - 标签：`["占位", "phase1"]` 
   - 内容：直接截取 markdown 前 200 字符作为 note body
   - 卡片：生成假的 Q&A（"《xxx》中摘录的主要文本是什么？"）
3. **语言检测采样过大**：`_MAX_SAMPLE_CHARS = 3600` 消耗过多 token
4. **缺少 API 配置**：没有配置 DASHSCOPE_API_KEY

### 用户影响

- 笔记详情页显示原始 markdown 而非结构化知识点
- 复习卡内容质量差，无法有效复习
- 标签暴露了"占位"本质，破坏用户体验

## 解决方案

### 1. 启用 AI Agent

**更新模板文件**：`projects/entropy-zero/backend/.env.example`

```diff
- ENTROPY_AGENT=0
+ ENTROPY_AGENT=1

+ # DashScope API 密钥（必需，用于中文知识处理）
+ # 实际密钥请配置在 .env.local 文件中
+ DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**创建本地配置**：`projects/entropy-zero/backend/.env.local`

```env
# AI Agent 开关
ENTROPY_AGENT=1

# DashScope API 密钥（实际密钥，不要提交到 git）
DASHSCOPE_API_KEY=your_actual_api_key_here
```

**说明**：
- `.env.example` 是模板文件，可以提交到 git
- `.env.local` 包含实际密钥，必须加入 `.gitignore`
- FastAPI 会自动加载 `.env.local` 覆盖 `.env`

### 2. 优化语言检测采样

**修改文件**：`projects/entropy-zero/backend/app/agent/lang_detector.py`

```diff
- _MAX_SAMPLE_CHARS = 3600
- _SLICE_CHARS = 1200
+ _MAX_SAMPLE_CHARS = 300  # 前100 + 中100 + 后100
+ _SLICE_CHARS = 100
```

**理由**：
- 语言检测只需要少量文本即可判断
- 减少 token 消耗（从 ~3600 → ~300，节省 90%）
- 对于中文文档，100 字符足够包含多个完整句子

### 3. 移除占位逻辑

**修改文件**：`projects/entropy-zero/backend/app/services/processor.py`

**选项 A：删除整个文件**
- `run_deterministic_processor` 不再需要
- worker.py 中的条件分支改为直接调用 agent

**选项 B：保留降级逻辑**
- 当 agent 失败时作为 fallback
- 但移除所有 "占位"、"phase1" 标识

**推荐：选项 A**，因为：
- agent 已经有 try-catch 和错误处理
- 保留占位逻辑会让代码混乱
- 如果 agent 失败，应该返回明确错误而非假数据

### 4. 更新 Worker 逻辑

**修改文件**：`projects/entropy-zero/backend/app/worker.py`

```diff
- if get_entropy_agent_enabled():
-     result = run_agent_processor(inp, update_task_progress=update_task_progress)
- else:
-     result = run_deterministic_processor(inp)
+ result = run_agent_processor(inp, update_task_progress=update_task_progress)
```

### 5. 添加环境变量验证

**修改文件**：`projects/entropy-zero/backend/app/main.py`

在启动时检查：
```python
@app.on_event("startup")
async def validate_config():
    if not get_dashscope_api_key():
        log.warning("DASHSCOPE_API_KEY not set - AI agent will fail")
    if not get_entropy_agent_enabled():
        log.warning("ENTROPY_AGENT=0 - using placeholder logic")
```

## 实施计划

### 任务清单

```
[ ] 1. 创建 .env.local 并配置 DASHSCOPE_API_KEY（实际密钥）
[ ] 2. 更新 .env.example（示例格式，不含实际密钥）
[ ] 3. 优化语言检测采样大小
[ ] 4. 删除 processor.py 或移除占位标识
[ ] 5. 简化 worker.py 条件分支
[ ] 6. 添加启动时配置验证
[ ] 7. 测试上传新文档
[ ] 8. 验证生成的笔记和卡片质量
```

### 验收标准

**功能测试**：
1. 上传 `docs/raw/development.md`
2. 处理完成后检查：
   - ✅ 笔记标签不包含 "占位"、"phase1"
   - ✅ 笔记内容是结构化的 claims，不是原始 markdown
   - ✅ 复习卡是真实的 Q&A，不是假问题
   - ✅ 卡片数量 >= 5（development.md 应该生成多个知识点）

**质量标准**：
- 语言检测正确识别中文/英文
- Claims 提取了核心知识点
- 卡片问题清晰，答案准确

## 风险与缓解

| 风险                    | 影响                 | 缓解措施                         |
| ----------------------- | -------------------- | -------------------------------- |
| API 密钥未配置          | agent 启动失败       | 添加启动验证，明确错误提示       |
| .env.local 被提交到 git | 密钥泄露             | 确保 .env.local 在 .gitignore 中 |
| API 调用失败            | 处理任务失败         | 在 orchestrator 中有 try-catch   |
| 语言检测不准确          | 使用错误的 LLM       | fallback 到字符比例检测          |
| 采样过小影响准确性      | 中英混合文档判断错误 | 测试后调整到 200-300 字符        |

## 依赖

### 外部依赖
- **DashScope API**：中文知识处理（必需）
- **OpenAI API**：英文知识处理（可选，可用 DashScope 代替）

### 内部依赖
- 已实现的 agent 模块（orchestrator, claim_extractor, card_generator）
- 数据库模型（Note, Flashcard）
- Redis 队列（如果使用异步 worker）

## 后续工作

本 proposal 完成后，可以考虑：

1. **Proposal 2**：增强 agent 质量
   - 集成 ingest-json-auto skill 的完整流程
   - 实现 quality gates
   - 改进 claim 提取精度

2. **监控和调试**：
   - 添加 agent 处理时长监控
   - 记录 LLM token 使用量
   - 添加 debug 模式输出中间结果

3. **成本优化**：
   - 批量处理多个文档
   - 缓存相似内容的结果
   - 使用更便宜的模型处理简单文档

## 估计工作量

- **开发时间**：2-3 小时
- **测试时间**：1 小时
- **总计**：3-4 小时

## 优先级

**HIGH** - 当前占位逻辑严重影响用户体验，应尽快启用真实 agent。
