# oauth2-dingtalk

钉钉 OAuth2 适配器 —— 将钉钉登录接口转为标准 OAuth2 端点，供第三方系统以标准 OAuth2 协议对接钉钉身份认证。

## 这是什么？

- 定位：钉钉身份认证的标准 OAuth2 适配层
- 解决的核心问题：第三方系统（Nextcloud Social Login、Keycloak 等）无法直接对接钉钉私有的登录 API，本项目将其包装为标准 OAuth2 端点

## 为什么存在？

- 钉钉开放平台的授权登录接口（`login.dingtalk.com/oauth2/auth` + `api.dingtalk.com/v1.0/oauth2/userAccessToken`）虽然也是 OAuth2 风格，但与标准 OAuth2 Provider 的 `/authorize`、`/token`、`/userinfo` 端点存在差异（如 token 端点用 POST body 而非 `Authorization` header、userinfo 端点用自定义 header `x-acs-dingtalk-access-token` 而非标准 Bearer Token 等）。本项目作为中间层屏蔽这些差异，让任何支持标准 OAuth2 的系统都能无感对接钉钉。

## 如何安装和运行？

- 前置要求：Node.js >= 24 (LTS)、pnpm >= 11
- 安装步骤：

```bash
pnpm install
cp config.example.yml config.yml  # 然后编辑 config.yml 填入钉钉应用凭据
```

- 填写 `config.yml` 中的组织凭据：

  ```yaml
  port: 28081

  orgs:
    - id: my_org           # 组织标识，会出现在 URL 路径中
      corpId: ding...      # 钉钉 CorpID
      clientId: ding...    # 钉钉 AppKey
      clientSecret: ...    # 钉钉 AppSecret
      redirectUri: https://example.com/api/oauth/callback  # 第三方系统的回调地址
  ```

  > 一个 `config.yml` 可配置多个组织，每个组织使用独立的凭据。`id` 会出现在 URL 中（`/<orgId>/authorize`）。
  > 凭据取自钉钉开放平台「企业内部应用」，需在钉钉后台登记回调地址，并开通 Contact.User.Read 权限。

- 配置 OAuth2 客户端（以 Nextcloud Social Login 为例）：

  - Client ID：对应组织的 `clientId`
  - Client Secret：对应组织的 `clientSecret`
  - 授权地址：`https://dingtalk.auth.xrl.im/<orgId>/authorize`
  - 令牌地址：`https://dingtalk.auth.xrl.im/<orgId>/token`
  - 用户信息地址：`https://dingtalk.auth.xrl.im/<orgId>/userinfo`
  - Scopes：openid

- 运行 / 启动：

```bash
pnpm dev    # 开发模式（热重载）
pnpm build  # 编译
pnpm start  # 启动编译产物
```

### 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/:orgId/authorize` | 重定向到钉钉授权页 |
| POST | `/:orgId/token` | 用授权码换取 access_token（表单 `code=...`） |
| GET | `/:orgId/userinfo` | 用 Bearer Token 获取用户信息 |

## 当前状态

- 阶段：稳定（功能完整，可投入使用）
- 已知限制：仅支持 Authorization Code Flow；不支持 Refresh Token 和 Client Credentials Flow。

## 核心技术

- Hono — 轻量高性能 Web 框架
- @hono/node-server — Hono 的 Node.js 适配器
- TypeScript — 类型安全
- 原生 `fetch` — 零外部 HTTP 依赖

详细架构与决策记录见 `docs/`。
