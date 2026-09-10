# 个人知识库

这是一个 GitHub-native 的个人知识库。`skills/` 中的文件是 Agent 可以直接使用的技能源文件，`knowledge/` 保存普通知识，网页只是两者的浏览、检索和复制界面。

## 为什么这样设计

- 内容不锁在数据库或某个网页产品中：Markdown 和文件夹才是唯一真相。
- 人和 Agent 使用同一份内容：人通过 GitHub Pages 阅读和查看知识图谱，Agent 读取并维护仓库、`catalog.json`、`graph.json`、`llms.txt` 或原始 Markdown。
- 从第一天就有版本历史：每次改动都能 review、回滚和比较。
- 以后可以换网页框架，而无需迁移知识内容。

完整设计见 [knowledge/system/architecture.md](knowledge/system/architecture.md)。

## 目录

```text
skills/<skill-name>/SKILL.md    可复用的 Agent 技能
knowledge/<topic>.md            普通知识、决策和笔记
templates/                      新内容模板
site/                           静态网页界面
scripts/                        构建、校验和安装工具
dist/                           构建产物，不提交 Git
```

## 本地使用

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。修改内容后，重新运行 `npm run dev` 即可重建。

提交前执行：

```bash
npm run check
```

## 添加内容

新技能从 `templates/skill-template/` 复制，目录名和 frontmatter 中的 `name` 必须一致。普通知识从 `templates/note-template.md` 开始。Agent 通过 `related` 维护条目关系，具体约定见 [knowledge/system/graph-schema.md](knowledge/system/graph-schema.md)。不要把尚未稳定的随手笔记过早变成 skill；先记录为 knowledge，实际复用后再固化。

## 安装 skill 给本机 Codex

安装一个技能：

```bash
node scripts/install-skill.mjs capture-reusable-workflow
```

安装全部技能：

```bash
node scripts/install-skill.mjs --all
```

默认复制到 `$CODEX_HOME/skills`；未设置 `CODEX_HOME` 时复制到用户目录下的 `.codex/skills`。目标已存在时脚本会停止，只有显式添加 `--force` 才会先备份旧版本再安装。

## 发布到 GitHub Pages

1. 在 GitHub 新建仓库并推送此项目。
2. 打开仓库的 **Settings → Pages**。
3. 将 **Build and deployment / Source** 设为 **GitHub Actions**。
4. 推送到 `main` 后，`.github/workflows/pages.yml` 会校验、构建并发布网站。

发布地址通常是 `https://<用户名>.github.io/<仓库名>/`。

> GitHub Pages 是公开网页。不要在此仓库或生成的网站中保存密码、token、私人身份信息或不希望公开的内容。

## 给其他 Agent 的入口

- 克隆仓库：读取 `AGENTS.md` 和相关 `skills/<name>/SKILL.md`。
- 网页索引：构建后访问 `catalog.json`。
- 知识关系：构建后访问 `graph.json`。
- 轻量文本入口：构建后访问 `llms.txt`。
- 全文入口：构建后访问 `llms-full.txt`。

未来如果需要跨设备自动同步安装，可以在这个基础上增加版本发布和远程安装器，不必改变内容格式。
