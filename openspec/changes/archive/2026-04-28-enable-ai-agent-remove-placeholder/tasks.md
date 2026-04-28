## 1. 配置与安全基线

- [x] 1.1 更新 `projects/entropy-zero/backend/.env.example`，默认启用 Agent 并补充 `DASHSCOPE_API_KEY` 示例说明
- [x] 1.2 创建并验证 `projects/entropy-zero/backend/.env.local` 本地覆盖约定，确保被 `.gitignore` 忽略且不泄露密钥
- [x] 1.3 在后端启动流程加入关键配置校验与告警日志（Agent 开关、DashScope key）

## 2. Worker 与处理链路切换

- [x] 2.1 调整 `projects/entropy-zero/backend/app/worker.py`，将默认处理分支切换为 `run_agent_processor`
- [x] 2.2 重构 `projects/entropy-zero/backend/app/services/processor.py`，移除占位输出语义並保留受控后备策略
- [x] 2.3 确认失败路径统一返回结构化错误並正确更新 `raw_knowledge.status`

## 3. 语言路由与成本优化

- [x] 3.1 修改 `projects/entropy-zero/backend/app/agent/lang_detector.py` 采样参数为轻量三段采样
- [x] 3.2 校验中英与混合文本路由决策，补充回退判别与日志字段
- [x] 3.3 回归验证 token 消耗下降与语言判别准确率不退化

## 4. 数据质量与验收

- [x] 4.1 以真实文档执行端到端处理，验证 notes 不再写入“占位/phase1”标签与原文截断正文
- [x] 4.2 验证 flashcards 为真实问答并与 claims 对齐，确保可用于复习
- [x] 4.3 补充或更新测试/检查项，覆盖 Agent 成功路径、失败路径与后备路径约束
