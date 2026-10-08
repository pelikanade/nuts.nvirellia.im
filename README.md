# nuts.nvirellia.im

Noa 的数字花园 / 笔记站，域名 [nuts.nvirellia.im](https://nuts.nvirellia.im)。

站点用 Astro + Starlight + [starlight-obsidian](https://github.com/HiDeoo/starlight-obsidian)。笔记不在这个仓库里。Obsidian Sync 库留在本机（Noa 的路径是 `/home/box/nvirellia's nuts`），构建前用符号链接或 `VAULT_PATH` 指过去。

## 本地开发

```sh
bun install

# 把 Sync 库链到 ./vault（路径按自己的机器改）
ln -s "/home/box/nvirellia's nuts" vault

bun run dev
```

库在别的路径时：

```sh
VAULT_PATH="/path/to/nvirellia's nuts" bun run dev
```

`dev` 用 nodemon 监视 `VAULT_PATH`（默认 `./vault`），忽略 `.obsidian/`。

导航里的「关于我」来自库中 slug 为 `aboutme` 的笔记，链上真实库之后才会出现。

`starlight-obsidian` 要求该目录是一个 Obsidian 库：里面要有 `.obsidian/app.json`。没有链接就构建时会报：

`The provided vault path is not a valid Obsidian vault directory and does not include an '.obsidian/app.json' file.`

## 构建

```sh
bun install
ln -s "/path/to/nvirellia's nuts" vault   # 或设置 VAULT_PATH
bun run build
```

产物在 `dist/`。预览：`bun run preview`。

## 部署

构建机上看不到 Sync 库。在 `astro build` / `bun run build` **之前**把 Sync 导出或检出挂载 / 符号链接到 `./vault`，或设置 `VAULT_PATH`。不要把笔记提交进 git。

生成物已忽略，不要提交：

- `src/content/docs/notes/` 与 `src/content/docs/posts/`
- `src/content/docs/en/notes/` 与 `src/content/docs/en/posts/`
- `src/assets/notes/` 与 `src/assets/posts/`
- `public/notes/` 与 `public/posts/`

还没做的部署事项：

- 把 `nuts.nvirellia.im` 的 DNS 指到实际托管（仓库里没有 Vercel / DNS 配置）
- 托管环境要能在构建时读到库；只连 GitHub 仓库、不挂载库的构建会失败

## Giscus

评论插件默认关闭。`pelikanade/nuts.nvirellia.im` 还没有 Discussions 分类，不要手写 ID。

在仓库里打开 Discussions、建好分类后，从 [giscus.app](https://giscus.app) 复制这三个值再构建：

- `GISCUS_REPO_ID`
- `GISCUS_CATEGORY`
- `GISCUS_CATEGORY_ID`

仓库名已经写成 `pelikanade/nuts.nvirellia.im`。三个变量都设置后，`starlight-giscus` 才会启用。
