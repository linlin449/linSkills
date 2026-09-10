---
title: 个人知识库架构决策
description: 说明为什么以 GitHub 中的 Markdown 为核心，同时面向人和 Agent 提供不同入口。
tags:
  - architecture
  - knowledge-base
  - agents
updated: 2026-09-10
status: active
---

# 个人知识库架构决策

## 目标

建立一个长期可维护的个人知识库。当前最重要的内容是可复用的 Agent skills；以后可以逐步加入决策记录、方法、项目经验和领域知识。

这个系统服务两个读者：

1. **人**需要清晰的目录、搜索、标签和舒适的阅读体验。
2. **Agent**需要稳定、直接、低噪音的原始文件和机器索引。

## 决策

采用 **GitHub 仓库作为内容源，GitHub Pages 作为只读展示层**。

```text
Markdown / files
      |
      +--> Git history：版本、review、回滚
      +--> Agent：SKILL.md、catalog.json、llms.txt
      `--> Static build：搜索与阅读网页
```

网页不拥有内容，也不要求单独的数据库。即使未来替换网站框架，`skills/` 和 `knowledge/` 仍然可以原样保留。

## 内容模型

### Skills

每个 skill 是一个独立目录，入口固定为 `SKILL.md`：

```text
skills/example-skill/
|-- SKILL.md
|-- agents/openai.yaml       可选
|-- references/              可选，只放按需读取的细节
|-- scripts/                 可选，只放值得重复执行的逻辑
`-- assets/                  可选，只放生成结果所需的资源
```

skill 的 `name` 和 `description` 决定 Agent 是否应该加载它，所以要短、准确、有区分度。正文只保留会改变 Agent 决策或提高结果质量的说明。

### Knowledge

普通知识使用 Markdown 和统一 frontmatter：

- `title`：标题
- `description`：一句话摘要
- `tags`：用于检索的标签
- `updated`：最后一次有意义更新的日期
- `status`：`draft`、`active` 或 `archived`

先把不成熟的想法保存为 knowledge。只有流程已经重复出现、输入输出相对稳定、并且让 Agent 自动执行确实有价值时，才升级为 skill。

## 访问方式

### 人类入口

GitHub Pages 提供全文搜索、类型筛选、标签和 Markdown 阅读。首版是纯静态站点，不需要服务器和登录。

### Agent 入口

优先顺序取决于运行环境：

1. 已克隆仓库：直接读取相关 `SKILL.md`，最完整可靠。
2. 已安装 skill：从本机 Codex skills 目录加载。
3. 只有网络访问：先读 `catalog.json` 或 `llms.txt`，再获取具体原始文件。

机器索引用于发现，不替代 skill 自身的入口文件。

## 安全边界

GitHub Pages 发布的内容应视为公开信息。首版不支持私人内容；敏感信息要留在私有存储中。以后如果确实需要公开和私有内容共存，应拆成两个仓库或引入带身份验证的服务，而不是依赖前端隐藏。

## 演进路线

### 现在：可用的最小版本

- Markdown 内容仓库
- skill 结构校验
- 本机安装脚本
- 静态检索和阅读
- GitHub Actions 自动发布

### 内容变多以后

- 增加内容关系和反向链接
- 给 skill 增加真实使用案例和质量状态
- 以 GitHub Release 发布经过验证的 skill 版本
- 自动检查失效链接、重复主题和过期内容

### 出现明确需求以后

- 私有内容分层
- 浏览器内编辑和提交 PR
- 语义搜索或向量检索
- 多 Agent/多工具格式适配

这些能力现在不加入，因为静态全文搜索和 Git 版本管理已经能支撑早期使用；等真实痛点出现再扩展，能避免过早引入数据库、鉴权和运维负担。

## 成功标准

- 新增一个 skill 不需要改网页代码。
- 推送 Markdown 后网站自动更新。
- Agent 能在不解析页面布局的情况下发现并读取 skill。
- 内容格式不依赖某一家网页托管服务。
