# AI Agent Next - 智能对话助手平台

基于 Next.js 16、LangChain、LangGraph 和 Ant Design X 构建的现代化 AI 智能体应用,提供流畅的对话体验、会话管理和 RAG(检索增强生成)能力。

## 📋 目录

- [项目介绍](#项目介绍)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
  - [本地开发](#本地开发)
  - [Docker 部署](#docker-部署)
- [配置说明](#配置说明)
- [数据库管理](#数据库管理)
- [开发指南](#开发指南)
- [API 接口](#api-接口)
- [常见问题](#常见问题)

## 🎯 项目介绍

AI Agent Next 是一个功能完善的 AI 智能对话平台,主要特性包括:

### 核心功能

- **智能对话系统**:支持流式输出、多轮对话、上下文理解
- **会话管理**:创建、重命名、删除会话,会话历史持久化
- **RAG 能力**:基于 Chroma 向量数据库的文档检索与问答
- **文件上传**:支持 PDF、图片等文件的上传与解析
- **工具调用**:集成天气查询、位置获取、图像生成等多种工具
- **Markdown 渲染**:支持代码高亮、数学公式、思维导图等富文本展示
- **响应式设计**:完美适配桌面端和移动端

### 应用场景

- AI 客服机器人
- 智能文档问答系统
- 个人知识助手
- 企业级对话平台

## 🛠️ 技术栈

### 前端框架

- **Next.js 16.1.6** - React 全栈框架,支持 SSR 和 SSG
- **React 19.2.3** - 最新版本的 UI 库
- **TypeScript 5** - 类型安全的 JavaScript 超集

### UI 组件库

- **Ant Design 6.1.1** - 企业级 UI 设计语言
- **Ant Design X 2.5.0** - AI 场景专用组件库
  - Bubble - 对话气泡组件
  - Conversations - 会话列表
  - Sender - 消息发送器
  - Prompts - 提示词组件
  - Attachments - 附件上传
  - ThoughtChain - 思维链展示
- **Ant Design X Markdown** - Markdown 渲染组件

### AI 与 LangChain

- **LangChain 1.3.2** - LLM 应用开发框架
- **@langchain/core 1.1.39** - LangChain 核心库
- **@langchain/langgraph 1.2.8** - 工作流编排引擎
- **@langchain/openai 1.4.4** - OpenAI API 集成
- **@langchain/community 1.1.27** - 社区扩展工具
- **@langchain/textsplitters 1.0.1** - 文本分割器

### 数据存储

- **Prisma 7.7.0** - 下一代 ORM
- **MySQL 8.0** - 关系型数据库(会话存储)
- **ChromaDB 3.4.3** - 向量数据库( embeddings 存储)

### 其他依赖

- **pdf-parse 2.4.5** - PDF 文档解析
- **cos-nodejs-sdk-v5** - 腾讯云 COS 对象存储
- **axios 1.15.0** - HTTP 客户端
- **uuid 13.0.0** - UUID 生成
- **zod 4.3.6** - TypeScript 优先的模式验证
- **dayjs 1.11.20** - 轻量级日期处理

### 开发工具

- **ESLint 9** - 代码质量检查
- **Prettier 3.8.3** - 代码格式化
- **Husky 9.1.7** - Git hooks 管理
- **lint-staged 16.4.0** - 暂存文件 lint
- **TailwindCSS 4** - 原子化 CSS 框架

## 📁 项目结构

## 💻 环境要求

- **Node.js** >= 22.12.0
- **pnpm** >= 8.0.0(推荐使用 pnpm)
- **MySQL** 8.0+(或使用 Docker)
- **ChromaDB**(或使用 Docker)

## 🚀 快速开始

### 本地开发

#### 1. 克隆项目

#### 2. 安装依赖

#### 3. 配置环境变量

复制 `.env` 文件并根据实际情况修改配置:

编辑 `.env` 文件,配置以下关键变量:

#### 4. 初始化数据库

#### 5. 启动开发服务器

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

#### 6. 其他常用命令

### Docker 部署

#### 1. 准备环境

确保已安装 Docker 和 Docker Compose。

#### 2. 配置环境变量

编辑 `.env.docker` 文件,配置生产环境变量。

#### 3. 启动服务

服务启动后:

- **Next.js 应用**: http://localhost:3000
- **Nginx 代理**: http://localhost:80
- **MySQL**: localhost:3306
- **ChromaDB**: http://localhost:8100

#### 4. 停止服务

## ⚙️ 配置说明

### 环境变量详解

| 变量名                            | 说明                     | 必填 | 默认值            |
| --------------------------------- | ------------------------ | ---- | ----------------- |
| `CHAT_MODEL_NAME`                 | 聊天模型名称             | 是   | MiniMax-M2.1      |
| `EMBEDDING_MODEL_NAME`            | Embedding 模型名称       | 是   | text-embedding-v1 |
| `DASHSCOPE_API_KEY`               | 阿里云 DashScope API Key | 是   | -                 |
| `OPENAI_API_KEY`                  | OpenAI API Key           | 否   | -                 |
| `MYSQL_HOST`                      | MySQL 主机地址           | 是   | localhost         |
| `MYSQL_PORT`                      | MySQL 端口               | 是   | 3306              |
| `MYSQL_USER`                      | MySQL 用户名             | 是   | root              |
| `MYSQL_PASSWORD`                  | MySQL 密码               | 是   | -                 |
| `MYSQL_DATABASE`                  | MySQL 数据库名           | 是   | ai_agent          |
| `DATABASE_URL`                    | Prisma 数据库连接字符串  | 是   | -                 |
| `CHROMA_HOST`                     | Chroma 主机地址          | 是   | localhost         |
| `CHROMA_PORT`                     | Chroma 端口              | 是   | 8100              |
| `CHROMA_AUTH_TOKEN`               | Chroma 认证 Token        | 是   | admin             |
| `SECRET_ID`                       | 腾讯云 Secret ID         | 否   | -                 |
| `SECRET_KEY`                      | 腾讯云 Secret Key        | 否   | -                 |
| `NEXT_PUBLIC_AXIOS_API_BASE_PATH` | API 基础路径             | 是   | /api/v1           |

### Next.js 配置

在 `next.config.ts` 中:

- **output: 'standalone'** - 生成立式部署包,优化 Docker 部署
- **serverActions.bodySizeLimit: '10mb'** - 服务器操作请求体限制
- 支持自定义 Webpack 配置

## 🗄️ 数据库管理

### Prisma 常用命令

### 数据模型

当前项目使用 PostgreSQL(根据 schema.prisma 配置),主要包含:

- **Sessions** - 会话记录
- **Messages** - 消息记录
- **Users** - 用户信息

详细模型定义请查看 `prisma/schema.prisma`。

## 📖 开发指南

### 添加新的 Agent 工具

1. 在 `src/agent/createagent/tools/` 目录下创建工具文件
2. 导出工具函数,遵循 LangChain 工具规范
3. 在 `src/agent/createagent/index.ts` 中注册工具

示例:

然后在 Agent 中注册:

### 添加新的 API 接口

1. 在 `src/app/api/v1/` 下创建路由文件夹
2. 创建 `route.ts` 文件,实现 GET/POST 等方法
3. 遵循 Next.js App Router API 规范

示例:

### 代码规范

项目使用 ESLint + Prettier + Husky 保证代码质量:

### 调试技巧

1. **查看 Agent 日志**:在 `src/agent/utils/loggerHandler.ts` 中配置日志级别
2. **Prisma 查询日志**:设置 `DEBUG=prisma:client` 环境变量
3. **Next.js 调试**:使用 React DevTools 和 Next.js DevTools

## 🔌 API 接口

## ❓ 常见问题

### 1. 依赖安装失败

**问题**:`pdf-parse` 或 `@napi-rs/canvas` 安装失败

**解决**:

### 2. 数据库连接失败

**问题**:无法连接到 MySQL 或 Chroma

**解决**:

### 3. 流式输出中断

**问题**:SSE 流式响应提前断开

**解决**:

- 检查网络连接稳定性
- 增加超时时间配置
- 查看浏览器控制台错误信息
- 确认后端未抛出异常

### 4. Docker 构建缓慢

**问题**:Docker 镜像构建时间长

**解决**:

## 📝 更新日志

### v0.1.0 (2026-04-17)

- ✨ 初始版本发布
- 🎯 实现基础对话功能
- 💬 支持会话管理
- 📄 集成 RAG 文档检索
- 🛠️ 支持多种 Agent 工具
- 🐳 Docker 部署支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request!

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 📞 联系方式

如有问题或建议,请通过以下方式联系:

- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**Enjoy building with AI! 🚀**
