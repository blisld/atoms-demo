## 1. 技术栈（严格遵守）

- Next.js 15 (App Router) + TypeScript

- Tailwind CSS + shadcn/ui + Lucide-react + framer-motion

- LLM：优先 Claude 3.5 Sonnet / Claude 4（通过 API 调用）

- 预览方式：iframe + srcdoc（安全）

- 状态管理：React useState + localStorage（持久化会话）

- 动画：framer-motion（页面切换、消息出现）

- Toast：sonner

## 2. 整体 UI 布局（必须接近 Atoms 感觉）

- 深色主题为主（#0A0A0A 背景）

- 左右分栏（桌面端 38% : 62%）

  - 左侧：聊天面板（带顶部「New Session」按钮 + 会话列表）

  - 右侧：预览面板（Tab：Live Preview | Generated Code | Sessions）

- 顶部导航栏：Logo + 「Atoms Demo」 + GitHub 按钮 + Deployed on Vercel

- 响应式：移动端自动切换为上下布局

## 3. 核心功能模块

### 3.1 聊天系统

- 支持多轮对话，消息气泡区分用户/AI

- 输入框支持 Enter 发送 + 按钮

- 快捷 Prompt 按钮（横向滚动）：Portfolio、SaaS Dashboard、Todo App、Fitness Tracker、E-commerce Landing

- 加载状态：AI 思考时显示「Agent is planning...」+ 进度动画

### 3.2 AI 生成引擎（最核心）

**System Prompt 必须包含以下要求：**

- 你是一个世界级的前端工程师 + AI Agent

- 只返回**一个完整的、独立的 HTML 文件**（从 <!DOCTYPE html> 开始到 </html> 结束）

- 必须使用 Tailwind CSS via CDN（[https://tailwindcss.com/docs/installation/play-cdn](https://tailwindcss.com/docs/installation/play-cdn)）

- 设计必须现代、专业、响应式，参考 Apple / Linear / Vercel 风格

- 必须包含真实交互（按钮、表单、动画、状态管理）

- 禁止返回任何解释文字，只返回纯 HTML 代码

- 如果用户要求修改，就基于上一个 HTML 进行迭代

**调用方式**：使用 Vercel AI SDK 或直接 fetch Claude API（推荐用环境变量）

### 3.3 预览系统

- 使用 `<iframe sandbox="allow-scripts allow-same-origin">` + `srcDoc`

- 支持全屏预览按钮

- 代码 Tab：美化展示生成的 HTML（用 Prism 或 shiki）

### 3.4 高级功能（加分项，必须实现至少 3 个）

- 会话历史记录（可切换、删除、重命名）

- 一键「Export as .html」

- 「Remix」功能（基于当前页面重新生成变体）

- 模板库（点击模板直接填充 Prompt）

- 暗黑/浅色主题切换

- 简单的「Agent 思考过程」可视化（可选）

## 4. 文件结构（必须严格遵守）
app/
├── layout.tsx
├── page.tsx                    # 主页面
├── globals.css
components/
├── chat/
│   ├── ChatInterface.tsx
│   ├── MessageBubble.tsx
│   └── PromptSuggestions.tsx
├── preview/
│   ├── PreviewPanel.tsx
│   ├── CodeViewer.tsx
│   └── SessionList.tsx
lib/
├── prompts.ts                  # 存放所有 System Prompt
├── llm.ts                      # LLM 调用封装
├── htmlGenerator.ts            # HTML 处理工具
└── types.ts

## 5. 环境变量
CLAUDE_API_KEY=sk-...
或 OPENAI_API_KEY


## 6. 质量要求
- 代码必须 TypeScript 严格模式，无 any
- 所有组件必须有良好命名和注释
- 错误处理完善（API 失败时友好提示）
- 性能：生成后立即可交互，无明显卡顿
- 安全：iframe 必须 sandbox，禁止执行危险代码

## 7. 交付物
1. 可直接在 Vercel 部署的完整项目
2. 清晰的 README.md（包含：本地运行、部署步骤、亮点说明、截图）
3. 提交给 HR 的文档中要突出：
   - 多轮迭代能力
   - 现代 UI + 流畅动画
   - 工程化思维（组件拆分、类型安全、Prompt 工程）

**请严格按照本规格书执行，先创建完整文件结构，再逐模块实现。不要跳步。**