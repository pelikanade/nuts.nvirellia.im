# 用 Quartz v5 替代 Astro + Starlight 作为呈现层

图谱、反向链接、悬停预览、堆叠页、标签页与「已发布但不上树」在 Astro/Starlight 上要自研三项以上，标签页还得先升级框架；换成 Quartz v5 后这些全部现成，定制限于 YAML 与 CSS。代价：中文搜索退化为逐字索引、`permalink` 只能生成跳转页而无法改内容 URL、非 md 附件必须靠构建前的暂存白名单兜住、构建需要 Node ≥ 22 且首次要联网安装社区插件。
