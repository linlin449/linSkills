---
name: explain-knowledge-visually
description: Turn a piece of technical knowledge (course notes, docs, papers, concepts) into a beginner-friendly, picture-rich explanation. Use when the user wants to summarize or teach something so a newcomer can understand it, with clear diagrams; do not use for one-off raw note capture, for writing code, or when the audience is already an expert who wants a terse reference.
metadata:
  short-description: 把知识总结成小白也能懂的图文讲解
  updated: 2026-09-14
  tags:
    - teaching
    - explanation
    - diagram
    - svg
    - knowledge-management
  related:
    - knowledge:courses/gse-2026-nju/04-traceability-jj-agent-vcs
---

# 把知识讲成小白也能懂的图文讲解

把一个技术主题，改写成「没有基础也能看懂、还配了图」的讲解。这里是**方法**，不绑定具体主题——课程、文档、论文、概念都能套用。

## 产出长什么样

一份 Markdown 讲解（带 `title` / `description` / `tags` / `updated` / `status` / `related` frontmatter）+ 同级 `assets/` 目录里的几张 SVG 图。正文按「直觉 → 概念 → 工具/细节 → 未来/行动」推进，每讲一个关键概念就配一张只讲一个对比的图，结尾一定落到"我接下来该怎么做"。

## 什么时候用 / 什么时候不用

**用**：对方是初学者，或被要求"用大白话讲清楚 + 配图"；内容是值得反复讲的概念、原理、设计动机，而不是一次性流水账。

**不用**：只是存档一条原始笔记（直接写 `knowledge/`，别套这套讲解）；受众是专家、要的是精炼速查；或任务是写代码、修 bug、做事实核查。

## 七步

1. **先提炼一句话核心**。逼自己用一句话说清"它到底在解决什么"。写不出这句话，说明还没理解，先回去读原材料，不要急着动笔。
2. **列出 3–7 个关键概念**，按"哪个不懂、后面就全卡住"排序；砍掉一切可以后补的细节。
3. **每个概念 = 一个生活类比 + 一张图**。类比给直觉，图给结构。类比的检验标准：**能被反例推翻的类比才是好类比**（例如"版本控制 = 存档点"能说清"回退"，但说不清"合并"，所以合并要单独讲）。一张图只讲一个对比，别贪多。
4. **按认知顺序排章节**，不要按原材料的目录硬搬：先让人知道"为什么需要它"，再讲"它是什么"，最后讲"怎么用 / 未来会怎样"。
5. **画 SVG 图**（规范见下），放进内容同级 `assets/`，正文用相对路径引用。
6. **结尾落到行动**：讲完必须能回答"所以我明天该怎么做"，否则补一条可执行结论。
7. **自查**：删掉所有"只有讲的人自己懂"的句子；每个名词第一次出现都有类比或例子。

## 画图规范（保持输出统一）

- 用 **SVG**（文字清晰、体积小、可直接写），宽度约 760px，`font-family` 带 `PingFang SC` / `Microsoft YaHei` 兜底。
- 配色统一：主色 `#2563eb`；浅底 `#eef2ff`（蓝）/ `#ecfdf5`（绿）/ `#fef3c7`（黄）/ `#fef2f2`（红）；正文 `#1f2328`，次要文字 `#57606a`。
- **颜色要有含义**：红 = 风险/错误/丢失，绿 = 更优解/结果，蓝 = 普通概念块。
- 字号：标题 20 粗体、块标题 12–13 粗体、正文 13–15。
- 箭头用 `<marker>`，方向明确；"丢失/风险"用红色虚线，"更优解"用绿色实线。
- 文字里避免裸 `&`（写 `&amp;`）和 `<` `>`。

## 常见翻车点

- **图是装饰不是信息**：画图前先问"没有这张图，读者会丢掉哪条信息？"答不上就别画。
- **术语轰炸**：先类比再给术语，术语出现后立刻用一句人话重复一遍。
- **贪多求全**：新手不需要知道所有边界情况；砍到"能跑通主线"为止，细节留成"想深入再看"。
- **只讲热闹不讲落地**：结尾没有行动项 = 白讲。

## 完整示例

第 04 讲笔记（`knowledge:courses/gse-2026-nju/04-traceability-jj-agent-vcs`）是这套方法的一次完整落地：正文是可读讲解，`knowledge/courses/gse-2026-nju/assets/` 里有 5 张遵循上述规范的 SVG——「三个空间」「文件系统 vs 有环的图」「merge vs rebase」「jj 的 change」「乐观 vs 悲观锁」。动笔前先扫一眼它们，对照规范找感觉。

## 质量自查

- 每张图只讲一个对比，箭头和颜色有含义。
- 每个新概念先给类比再给术语。
- 结尾有"明天该怎么做"。
- 读一遍，删掉"没配图就看不懂"和"删掉也不影响理解"的句子。
