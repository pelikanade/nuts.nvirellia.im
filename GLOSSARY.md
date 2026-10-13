# nuts.nvirellia.im

把本机的 Obsidian 库（Vault）忠实呈现成一个网站：文件树与 URL 都由库自己的结构决定，站点不添加库以外的内容。

## Language

**Vault**:
本机的 Obsidian 库，站点唯一的呈现对象。
_Avoid_: 仓库（repo）、站点（site）、内容源（source）

**Site**:
本仓库构建出的网站——Vault 的忠实呈现，本身不拥有内容。
_Avoid_: 内容源、CMS、应用

**Note**:
库中的一篇 Markdown 文档，站点的基本内容单位。
_Avoid_: 页面（page）、文档（doc）、文件（file）

**Published**:
库中在 frontmatter 里声明为可公开的笔记；没有声明的笔记保持私有，站点上不留任何痕迹。
_Avoid_: 公开（public）、已上传（uploaded）、已导出（exported）

**Unlisted**:
已发布但不进任何列表的笔记：从文件树、搜索、图谱与反向链接里全部消失，只有直链可达。
_Avoid_: Hidden in navigation、未列出、私有（private）

**Attachment**:
随笔记一起进入站点的非 Markdown 文件（图片、PDF、音视频）。它不受 `Published` 判定影响，只按忽略清单排除。
_Avoid_: 资源（asset）、媒体文件（media file）、静态文件

**Homepage**:
库中呈现于站点根 URL 的那一篇笔记。
_Avoid_: 首页文件、欢迎页

**Title wikilink**:
笔记之间形如 `[[笔记名|文字]]` 的互链。指向已发布笔记时解析成目标的真实地址，指向未发布笔记的只保留文字。
_Avoid_: 内部链接、wiki 链接、双链
