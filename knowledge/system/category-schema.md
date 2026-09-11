---
title: 知识分类维护约定
description: 定义 Agent 如何用真实目录维护稳定分类，并用标签补充跨分类主题。
tags:
  - information-architecture
  - agents
  - maintenance
updated: 2026-09-11
status: active
related:
  - knowledge:system/architecture
  - knowledge:system/graph-schema
---

# 知识分类维护约定

## 核心规则

真实目录就是分类，网站不维护另一份手工分类表。构建程序会读取文件路径，自动生成可折叠的文件夹导航：

```text
skills/                         Skills
knowledge/
|-- system/                     系统设计与维护
|-- ai/                         AI 相关知识
|-- projects/                   项目经验
`-- uncategorized/              暂时无法归类的内容
```

分类回答“这份内容主要归属哪里”，标签回答“它还涉及哪些跨分类主题”。一份内容只放在一个目录里，但可以有多个标签。

## Agent 维护方式

1. 新建知识时，优先放入已有的最具体目录。
2. 只有同类内容会持续增加时才创建新目录，避免为单篇笔记制造过细分类。
3. 分类通常不超过两层；更细的关系用标签和 `related` 表达。
4. 目录名使用简短、稳定的英文小写连字符形式，例如 `agent-design`。
5. 移动文件等于修改条目 ID。Agent 必须在同一次变更中更新所有 `related` 引用，并运行 `npm run check`。

## 构建输出

每个 `catalog.json` 条目都包含：

- `categoryPath`：从根分类到当前目录的数组，例如 `["knowledge", "system"]`
- `categoryId`：可筛选的稳定路径，例如 `knowledge/system`

网页根据这些字段生成导航。以后新增或移动目录，无需改网页代码。
