---
title: 生成式软件工程（NJU 2026）课程笔记总览
description: 面向大一学生的七篇入门知识笔记：从使用 AI，到保存项目、说明需求和组织系统；配有图解、例子与动手练习。
tags:
  - generative-software-engineering
  - course-notes
  - ai
  - software-engineering
  - agent
updated: 2026-10-01
status: active
related:
  - knowledge:courses/gse-2026-nju/01-welcome-to-the-future
  - knowledge:courses/gse-2026-nju/02-prompt-engineering
  - knowledge:courses/gse-2026-nju/03-software-repository-management
  - knowledge:courses/gse-2026-nju/04-traceability-jj-agent-vcs
  - knowledge:courses/gse-2026-nju/05-software-engineering-origins
  - knowledge:courses/gse-2026-nju/06-requirements-architecture-1
  - knowledge:courses/gse-2026-nju/07-requirements-architecture-2
---

# 生成式软件工程（NJU 2026）课程笔记总览

> **这是一组给大一学生读的知识笔记，不是课堂逐句记录。** 先用例子理解问题，再认识名词；不需要先学机器学习、数据库或前端框架。

- 课程：南京大学《生成式软件工程》，主讲蒋炎岩。
- [课程网站与官方讲义](https://jyywiki.cn/GSE/2026/)
- [课程视频合集](https://space.bilibili.com/202224425/lists?sid=8942017)

## 这门课解决什么问题

你告诉 AI“帮我写一个程序”，它很快交出了代码。接下来怎么办？

- 怎么知道它是不是你想要的？
- 怎么检查它不是只在一个例子上成功？
- 代码改坏了怎么找回？
- 两个人或两个 AI 一起做，怎么接起来？
- 新需求来了，怎么不用全部推倒重来？

**生成式软件工程，就是研究怎样让 AI 参与开发，而项目仍然有清楚的目标、可靠的检查和可持续修改的结构。**

## 七篇分别读什么

| 篇 | 主题 | 主要回答 |
| --- | --- | --- |
| 01 | 欢迎来到未来 | AI 助手怎样行动？为什么演示成功不等于完成需求？ |
| 02 | 提示词与上下文工程 | 怎样说明任务、提供材料、设置检查？ |
| 03 | 软件仓库管理 | 怎样用 Git 留存档、比较变化、保留退路？ |
| 04 | 可追踪性与 jj | 怎样连起需求、代码、测试？多个助手怎样配合？ |
| 05 | 软件工程的来龙去脉 | 为什么需要流程、契约与模型？怎样让问题早点暴露？ |
| 06 | 需求和架构（1） | 怎样分工、保存历史，并让变化有地方可去？ |
| 07 | 需求和架构（2） | 怎样从事实计算结果，而不靠到处手改来保持一致？ |

## 第一次怎么读

1. **按顺序读 01—03。** 先理解 AI 协作与项目存档，代码命令可以在练习目录试。
2. **读 04—05 时多看例子。** 先理解联系、协作和约定，再记英文名词。
3. **06—07 可以分两次读。** 第一遍只看例子与图，第二遍再认识 CQRS、DDD、MVC 等名称。
4. **每篇做一次小练习。** 能自己解释一个例子，比觉得整篇“看着很懂”更重要。

不认识的词可以让 AI 举最小例子，但要回到原文、计算或程序结果核对。AI 是学习伙伴，不是所有问题的最终裁判。

## 先认识这几个常用词

| 名词 | 大白话 |
| --- | --- |
| Agent，智能体 | 能使用工具、实际执行操作的 AI 助手 |
| Prompt，提示词 | 你给 AI 的任务说明 |
| Context，上下文 | AI 当前拿到的目标、材料、规则和结果 |
| 验证器 | 检查某些要求有没有满足的方法 |
| 需求 | 使用者需要什么行为、有什么限制 |
| 实现 | 用代码把要求做出来 |
| 快照 | 某时刻文件状态的存档 |
| 架构 | 谁负责什么、数据怎样传、变化改哪里 |

其他名词都在相应正文里结合例子解释，不需要先背完整词汇表。

## 七篇笔记入口

- [01 欢迎来到未来](#/item/knowledge:courses/gse-2026-nju/01-welcome-to-the-future)
- [02 提示词与上下文工程](#/item/knowledge:courses/gse-2026-nju/02-prompt-engineering)
- [03 软件仓库管理](#/item/knowledge:courses/gse-2026-nju/03-software-repository-management)
- [04 软件仓库管理（2）：Traceability 与 jj](#/item/knowledge:courses/gse-2026-nju/04-traceability-jj-agent-vcs)
- [05 软件工程的来龙去脉](#/item/knowledge:courses/gse-2026-nju/05-software-engineering-origins)
- [06 需求和架构（1）](#/item/knowledge:courses/gse-2026-nju/06-requirements-architecture-1)
- [07 需求和架构（2）](#/item/knowledge:courses/gse-2026-nju/07-requirements-architecture-2)

## 来源说明

本系列依据官方讲义与已有笔记，重新组织为面向初学者的知识讲解。每篇末尾列出官方来源；例子、图解和练习为学习整理，不是课程原文复制。原课程材料权利归作者，课程网站标注 CC BY-NC 4.0。核对日期：2026-10-01。
