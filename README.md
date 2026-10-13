# nuts.nvirellia.im

Noa 的 Obsidian 库，忠实呈现成一个网站：<https://nuts.nvirellia.im>。

仓库里没有内容——内容就是库本身。站点用 [Quartz v5](https://quartz.jzhao.xyz) 构建，只负责呈现，不引入任何库以外的页面、文案或数据。相关决策见 `docs/adr/`，术语见 `GLOSSARY.md`。

## 仓库结构

- `content` → `vault` 的符号链接（提交在仓库里），`vault` 指向本机的 Obsidian 库（不提交）
- `quartz/`、`quartz.ts`、`quartz.config.yaml`：Quartz 本体与站点配置
- `quartz/styles/custom.scss`：站点自己的 CSS
- `docs/adr/`、`GLOSSARY.md`：决策记录与术语表

## 本地开发

需要 Node ≥ 22。

```sh
# 把库链进来（路径按自己的机器改）
ln -s "/home/box/nvirellia's nuts" vault

npm install
npm run dev      # http://localhost:8080，监视库的变化
```

首次构建会联网安装社区插件（`prebuild` 会跑 `npm run install-plugins`）。构建产物在 `public/`：

```sh
npm run build
```

## 发布规则

**哪些笔记公开**：笔记自己在 frontmatter 里写 `publish: true`。没写的保持私有，既不出现在树上也不会被构建。

```yaml
---
publish: true
---
```

**不上树**：写 `unlisted: true`。笔记照常生成、可以用直链打开，但从文件树、搜索、图谱和反向链接里全部消失。

**附件**：非 Markdown 文件不受 `publish` 影响，只按 `quartz.config.yaml` 里的 `ignorePatterns` 排除。这份清单是黑名单——**在库里新建私有文件夹或私有附件之后，必须把它加进 `ignorePatterns`**，否则会被原样公开。

**首页**：库根目录的 `index.md`。

**地址**：由笔记在库中的路径决定；`permalink` 只生成跳转页。改名或移动笔记之后，在笔记里写 `aliases` 让旧地址跳过来。

## 主题与字体

`quartz.config.yaml` 里通过 `@quartz-themes/core` 应用 Obsidian 的 [Nord 主题](https://github.com/insanum/obsidian_nord)（主题名 `obsidian-nord`），明暗两套齐全。

字体全部走读者自己的系统，不请求任何字体 CDN：中文用系统自带的中文字体渲染。

已知残留：

- 数学公式的 KaTeX 样式表来自 jsDelivr
- 站内搜索是 Quartz 自带的逐字符索引，没有中文分词，能搜但不精确

## 构建时怎么拿到库

`content → vault` 那一层不变，只要让 `vault` 是个有内容的目录即可。两种办法：

### A. 挂载或符号链接（本机开发用这个）

```sh
ln -s "/home/box/nvirellia's nuts" vault
```

### B. 构建时用 Obsidian Sync 拉一份

官方有 headless 客户端 [obsidianmd/obsidian-headless](https://github.com/obsidianmd/obsidian-headless)，不用装桌面版：

```sh
npm install -g obsidian-headless@latest      # 要求 Node ≥ 22，命令是 ob

export OBSIDIAN_AUTH_TOKEN=...               # 见下面的「认证」
ob sync-setup --vault "<远端库名>" --path ./vault --password "$SYNC_E2E_PASSWORD" --json
ob sync-config --path ./vault --mode pull-only --configs "" --json
ob sync --path ./vault                       # 每次构建前拉一次
npm run build
```

- **认证**：`ob login` 把令牌写进 `$XDG_CONFIG_HOME/obsidian-headless/auth_token`（Linux 默认 `~/.config/obsidian-headless/auth_token`，其他平台 `~/.obsidian-headless/auth_token`）。CI 里不用交互式登录——在任一机器上 `ob login` 一次，把那份 `auth_token` 当 secret 用，或直接设环境变量 `OBSIDIAN_AUTH_TOKEN`：客户端取令牌时优先读这个变量。
- **必须把模式设成 `pull-only`（或 `mirror-remote`）**。默认是 `bidirectional`，构建机上任何差异都会往回写进你的库。
- 远端库是端到端加密时，`sync-setup` 要 `--password`（带 `--json` 时不会弹密码提示）；若是托管加密则不需要。
- `--configs ""` 不同步 Obsidian 的插件与外观设置；`--excluded-folders`、`--file-types` 还能进一步少拉东西——被排除的私有目录与大附件根本不会落到构建机上，这比只靠 `ignorePatterns` 兜底更稳（那份清单仍是黑名单）。

没实测的部分：我没有你的账号凭据，只核实了命令面、`OBSIDIAN_AUTH_TOKEN` 的优先级与配置目录路径，没真跑过登录与同步。工具本身还是 0.x（<2 个月前的版本，`prebuild-install` 依赖已废弃告警），介意的话用 A。

其他可行路线（都要额外基础设施，不用 account）：[obsidian-livesync](https://github.com/vrtmrz/obsidian-livesync) 的 CLI 配自建 CouchDB，或 obsidian-git 推到私有仓库再在构建机 `git pull`。

## 部署

构建机必须能看到库：构建之前把库挂载或符号链接到仓库根的 `vault`，或按上面 B 用 Sync 拉一份。不要把笔记提交进 git（`vault` 已在 `.gitignore` 里）。

`nuts.nvirellia.im` 的 DNS 尚未指向任何托管，仓库里也没有托管配置。
