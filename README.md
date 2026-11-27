# GAAC 技术支持（GAAC Support）

智能体大奖赛的参赛技术支持站。技术支持、队伍管理和赛程推演由 React 渲染。

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
python3 tools/check-links.py --directory dist --base /gaac-support/ --strict
```

默认前缀是 `/`。React Router 使用构建前缀作为 basename。构建会为每个固定路由写入 `index.html`，因此普通静态服务器可以直接打开各板块入口。未知地址使用应用的 404 页面。静态服务器可将 `dist/404.html` 配置为回退页。

生产环境需将同源 `/api/v1/` 转发给队伍 API。所有队伍入口都是空应用壳，团队和账号数据只在浏览器运行时加载。服务器将 `/join/*` 内部重写到 `/join/index.html`，保留浏览器地址中的邀请令牌。

## 路由

| 路由 | 内容 | 当前实现 |
| --- | --- | --- |
| `/` | 技术支持首页与街景 | React |
| `/search/` | 搜索服务 | 接入指南、示例和排查 |
| `/tasks/`、`/model/`、`/eval/`、`/data/`、`/tools/`、`/notices/`、`/status/` | 比赛板块 | 筹备中 |
| `/login/`、`/signup/`、`/account/` | 登录、注册、账号 | 运行时请求 |
| `/team/`、`/join/<token>`、`/admin/` | 队伍、邀请、组委会管理 | 运行时请求 |
| `/desk/` | 旧队伍入口 | 跳转到 `/team/` |
| `/sandbox` | 组委会赛程推演 | React，仅浅色，保留原推演规则 |

首页和页脚的「赛程沙盘」打开 React 沙盘。

## 板块与内容编辑

- 技术支持首页和搜索页在 `src/sections/support/pages/`，筹备中的板块共用占位布局。
- 队伍服务位于 `src/sections/team/`。开发服务器默认启用内存模拟接口，刷新后恢复演示数据。用 `VITE_TEAM_MOCK=0 pnpm dev` 可关闭模拟。
- 演示账号使用 `captain@example.test`、`member@example.test`、`ready@example.test`（可建队）、`solo@example.test`（可兑换）、`organizer@example.test`，密码均为 `demo-password-2026`。模拟注册邀请码为 `DEMO-CAPTAIN`，邀请入口为 `/join/demo-join`。
- 沙盘的交互状态由 React 管理。规则和默认假设保留在 `engine.js` 和 `scenario.js`，时间轴用 SVG。沙盘使用浅色主题，并显示「推演假设，非正式赛程」。
- 每个板块维护自己的路由和样式，通用布局及设计变量放在 `src/components/` 和 `src/styles/`。
- 街景在 iframe 里绘制。运行 `python3 tools/check-artwork.py` 核对街景脚本仅调整了颜色值。
- 旧沙盘入口仍可跳转；同步上游时对照差异手动更新对应数据。

沙盘引擎测试覆盖默认情景、每个一键情景和全部可注入风险。正式赛程以参赛手册为准。
