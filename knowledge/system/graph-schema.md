---
title: 知识图谱维护约定
description: 定义 Agent 如何通过 Markdown frontmatter 维护条目关系，以及网站如何生成可视化图谱。
tags:
  - knowledge-graph
  - agents
  - maintenance
updated: 2026-09-10
status: active
related:
  - knowledge:system/architecture
  - knowledge:system/category-schema
  - skill:capture-reusable-workflow
---

# 知识图谱维护约定

## 维护方式

知识图谱由 Agent 随内容一起维护。知识笔记在顶层 frontmatter 中声明 `related`：

```yaml
related:
  - skill:capture-reusable-workflow
  - knowledge:system/architecture
```

skill 的 frontmatter 结构更严格，因此关系放在 `metadata.related`：

```yaml
metadata:
  related:
    - knowledge:system/architecture
```

条目 ID 由目录自动决定：

- skill：`skill:<skill-folder>`
- knowledge：`knowledge:<knowledge 下的路径，不含 .md>`

## 建立关系的标准

只连接读完当前内容后很可能继续阅读、共同完成一个任务，或存在明确依赖的条目。不要仅因为两个条目共享宽泛标签就建立关系。

关系按无向连接展示。一侧声明即可；双方都声明也不会产生重复连线。删除或重命名条目时必须同步更新引用。

## 自动校验

构建程序读取所有 `related` 字段，生成 `graph.json`。如果引用不存在，构建会失败，从而阻止失效关系发布。

网页中的图谱只负责展示。用户点击节点即可打开对应内容，不需要手工维护坐标、连线或单独的图数据库。
