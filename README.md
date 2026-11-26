# GAAC 技术支持（GAAC Support）

智能体大奖赛的参赛技术支持与阅读资料站。技术支持、赛程推演、动手笔记由 React 渲染；其余阅读板块通过旧版入口继续使用。

## 本地开发与构建

使用 Node.js 24 和 pnpm 10。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`dist/` 是静态产物，直接交给静态文件服务器即可。部署到子路径时，构建和服务器必须使用相同的前缀：

```sh
GAAC_BASE=/gaac-support/ pnpm build
python3 tools/check-links.py --directory dist --base /gaac-support/ --files-only --strict
```

默认前缀是 `/`。React Router 使用构建前缀作为 basename。构建会为每个固定路由写入 `index.html`，因此普通静态服务器可以直接打开各板块入口。动手笔记的三篇文章也有独立入口。其余带参数的详情页通过服务器的 404 回退（`dist/404.html`）启动应用；GitHub Pages 也能使用它。若所用服务器无法指定 404 页面，请为实际的详情地址生成静态入口。当前没有启用 GitHub Pages。

## 路由

| 路由 | 内容 | 当前实现 |
| --- | --- | --- |
| `/` | 技术支持首页与街景 | React |
| `/tasks`、`/model`、`/search`、`/eval` | 比赛任务、统一模型、搜索服务、测评服务 | React |
| `/data`、`/tools`、`/notices`、`/status`、`/desk` | 数据集、工具应用、公告与答疑、运行状态、本队任务台 | React，保留原来的占位内容 |
| `/sandbox` | 组委会赛程推演 | React，仅浅色，保留原推演规则 |
| `/blog`、`/blog/:slug` | 动手笔记 | React。文章路径：`install-agentx`、`mock-server`、`393-traces` |
| `/infra`、`/infra/:slug` | 推理基础设施 | `legacy/infra/` |
| `/prep`、`/prep/:slug` | DeepSeek 推理读本 | `legacy/prep/` |
| `/bench/deep-research/*` | 深度研究评测与原有子结构 | `legacy/agent-bench/deep-research/site/` |

「资料」保留各阅读板块的入口；页脚「推演」打开 React 沙盘。构建为已迁移板块的旧 URL 生成跳转页。

## 板块与协作约定

1. 每个板块在 `src/sections/<section>/` 下维护自己的 `routes.ts`、页面、组件、样式和内容数据。
2. 已注册板块迁移时只修改自己目录下的 `routes.ts`，将 `legacy` 换成页面的 `load`。新增板块在 `src/sections/index.ts` 注册一项。
3. 路由以 `/` 开头，保留 `label`、所属导航分组和 `navigation`。静态资源通过 `publicUrl` 加前缀，站内 React 路由使用 `SiteLink`。
4. 通用页面外壳、`PageHeader`、Markdown `Article` 与 `Figure` 在 `src/components/`。共用设计变量在 `src/styles/theme.css`，板块样式限定在板块容器内。
5. 转换脚本放在各自板块或 `tools/`，输出可重现的 JSON 或 Markdown；图像和 SVG 原样迁移。正文不要依赖原页面注入脚本。
6. 旧版输入在 `public/legacy/<section>/`，某板块迁移且验收后删除对应旧目录。Vite 为旧沙盘、博客和手册入口生成兼容链接。
7. 同步上游时先 `git fetch upstream`，对照变更手动更新对应内容数据与素材，重跑转换和检查；不把旧静态目录整批覆盖到应用中。

`tools/convert-support.py` 从历史提交或 `--source` 指定的 HTML 目录提取十页正文。街景的 `street.js` 保留原文件，在独立 frame 中运行，导航离开后由浏览器销毁该 frame。旧版赛程推演中的日期都是推演假设，正式规则以参赛手册为准。

`node tools/convert-phase-two.mjs` 从第一阶段合并提交提取沙盘结构、博客正文，以及原始图表代码。正文保存为结构化数据并由 React 渲染。沙盘、博客的图表适配层在各自页面内挂载与清理。沙盘取消了深色模式，页面始终显示「推演假设，非正式赛程」。

沙盘引擎测试对照原始脚本，覆盖默认情景、每个一键情景和全部可注入风险。
