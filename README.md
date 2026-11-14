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

需要 Node.js 22.15 或以上：

```sh
npm install
npm run check
npm test
npm run build
npm pack
```

联调 NTQQ 源码时，先构建并打包相邻的 NTQQ 插件，再安装其产物（更新本地 NTQQ 源码后也执行一次）：

```sh
cd ../lucky-lillia-plugin-ntqq-protocol
npm run build
npm pack --ignore-scripts
cd ../lucky-lillia-plugin-milky
npm install --no-save --package-lock=false --ignore-scripts ../lucky-lillia-plugin-ntqq-protocol/luckylillia-plugin-nt-protocol-1.0.0.tgz
npm run check
npm test
npm run build
npm pack
```

NTQQ 包提供开发类型和公共工具。构建只打包其无原生加载副作用的 `/api` 入口；运行时通过 Cordis 服务调用已启用的 NTQQ 插件。产物不依赖 Bot 源码目录，不包含 NTQQ 原生模块。

将打包生成的 `.tgz` 从 Bot「插件 → 本地安装」上传，或把构建好的插件目录放进 Bot 的插件扫描目录。市场安装和发布分别由 Bot 插件市场及 npm 管理，本工程不会自行下载或发布。
