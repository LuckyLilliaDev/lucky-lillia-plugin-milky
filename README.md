# LuckyLillia Milky 插件

`@luckylillia/plugin-milky` 为 LuckyLillia 提供 Milky 协议的 HTTP API、WebSocket / SSE 事件流及 Webhook 上报。实现 Milky 1.3，仅支持 NTQQ 账号。

## 安装与配置

1. 安装并启用 `@luckylillia/plugin-nt-protocol`，完成 QQ 登录。
2. 安装本插件，在插件列表完成信任确认并启用。点击齿轮或侧边栏的「Milky」打开设置。
3. 配置监听地址、端口和 Access Token，再将这些信息填入 Milky 客户端。

默认监听 `127.0.0.1:3010`。HTTP API 位于 `/api/<接口名>`，WebSocket 和 SSE 共用 `/event`；设置路径前缀后，两个路径都加上此前缀。HTTP 请求使用 `Authorization: Bearer <Access Token>`，事件连接也支持 `access_token` 查询参数。监听全部地址时必须设置 Token。

缺少 NTQQ 插件时，插件列表会显示缺少依赖；NTQQ 未登录时，Milky 等待登录服务就绪。停用或更新本插件时关闭监听和事件连接，重新启用后恢复。插件配置、开关和数据按 Bot 实例独立保存。

需要语音转码或生成视频封面时，安装并启用 `lucky-lillia-plugin-ffmpeg`。原有媒体降级行为保留；必须转码但缺少插件时会提示安装。

## 从内置版本迁移

新版 Bot 会把 `builtin:milky` 配置条目迁移为 `@luckylillia/plugin-milky`，保留条目 ID、配置、开关和界面偏好。迁移不会自动信任或下载第三方代码；安装并信任对应插件后继续使用原配置。

## 开发与打包

需要 Node.js 22.15 或以上，CI 使用 Node.js 24。先构建相邻的 NTQQ 插件，再安装本项目锁定的依赖并链接其公共 API：

```sh
cd ../lucky-lillia-plugin-ntqq-protocol
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run build
cd ../lucky-lillia-plugin-milky
npm ci --ignore-scripts --registry=https://registry.npmjs.org
node scripts/use-ntqq.mjs ../lucky-lillia-plugin-ntqq-protocol
npm run check
npm test
npm run build
npm pack --ignore-scripts
```

NTQQ 包提供开发类型和公共工具。构建只打包其无原生加载副作用的 `/api` 入口；运行时通过 Cordis 服务调用已启用的 NTQQ 插件。产物不依赖 Bot 源码目录，不包含 NTQQ 原生模块。

链接脚本只处理开发环境的 `node_modules`，不修改 `package.json` 或锁文件。NTQQ 源码更新后重新构建即可。发布 CI 使用固定的 NTQQ 提交构建公共 API，无需等待其 npm 审核，也不会把源码路径或原生模块带入 Milky 包。升级该依赖时，需同步更新 `.github/workflows/publish.yml` 中的 NTQQ commit。

将打包生成的 `.tgz` 从 Bot「插件 → 本地安装」上传，或把构建好的插件目录放进 Bot 的插件扫描目录。

## 自动发布到 npm

[Publish to npm](.github/workflows/publish.yml) 使用 npm Trusted Publishing（OIDC），无需保存 `NPM_TOKEN`。在 npm 的 `@luckylillia/plugin-milky` 设置中添加 GitHub Actions trusted publisher：组织 `LuckyLilliaDev`，仓库 `lucky-lillia-plugin-milky`，工作流文件 `publish.yml`，Environment 留空。

发布前更新 `package.json` 和 `package-lock.json` 的版本并提交，然后推送与版本完全相同的 `v` 标签，例如版本 `1.0.1` 对应 `v1.0.1`。正式版本发布到 `latest`，预发布版本发布到 `next`。同一个版本不能重复发布。

也可在 GitHub Actions 手动运行工作流，仅允许选择 `main`；默认勾选 `dry_run`，只检查、测试、构建并上传 `.tgz`，不发布。取消勾选后才正式发布当前版本。

构建与发布分属两个 job，只有发布 job 拥有 OIDC 权限。发布使用已校验的构建产物，不重新构建、不运行安装脚本，完成后核对 npm 上的版本、标签与包完整性。如果 npm 接受请求后仍处于审核阶段，工作流会明确报出尚未公开，需要在 npm 的 Staged Packages 中查看状态；不要直接重发同一版本。
