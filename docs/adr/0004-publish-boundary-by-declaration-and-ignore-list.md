# 发布边界靠笔记声明与忽略清单，不写构建前处理

哪些笔记公开由笔记自己在 frontmatter 里声明（Quartz 的 ExplicitPublish），附件与私有目录靠 `ignorePatterns` 的忽略清单排除；仓库里不为此维护任何暂存脚本。理由：仓库里不写自有代码，笔记层因此是 fail-closed（没声明就不发布）。代价是附件层只有黑名单：在库里新建一个私有文件夹或私有附件，如果忘了加进 `ignorePatterns`，它会被原样公开。
