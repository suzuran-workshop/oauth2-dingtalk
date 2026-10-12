# PRD — oauth-dingtalk

## 产品目标

- 提供一个轻量、可独立部署的 HTTP 服务，让任何支持标准 OAuth2 的第三方系统能够通过钉钉账号完成用户登录。

## 用户与使用场景

- 目标用户：运维 / 后端工程师，需要将钉钉身份接入自建系统（如 Nextcloud、Keycloak、Gitea 等）
- 典型场景：企业内部已使用钉钉作为统一身份，自建系统需要复用钉钉账号登录，但自建系统只支持标准 OAuth2 Provider

## 核心问题

- 钉钉的 OAuth2 接口与标准 OAuth2 Provider 存在协议差异（token 请求方式、userinfo header 格式等），第三方系统无法直接配置使用。

## 功能及其意义

| 功能 | 解决什么 | 为什么需要 |
|------|----------|------------|
| `GET /:orgId/authorize` | 将第三方系统的标准 authorize 请求转发到钉钉授权页 | 第三方系统需要一个符合 OAuth2 规范的授权入口 |
| `POST /:orgId/token` | 接收授权码，向钉钉换取 access_token，以标准格式返回 | 第三方系统期望用 `code` 换 `access_token`，不关心钉钉内部 API 细节 |
| `GET /:orgId/userinfo` | 用 Bearer Token 调钉钉接口获取用户信息，以标准格式返回 | 第三方系统期望从 `/userinfo` 拿到 `sub`、`name`、`email` 等标准字段 |
| 多组织路由 | 通过 URL 路径 `:orgId` 区分不同钉钉组织，每个组织使用独立凭据 | 一套服务实例同时为多个钉钉组织提供 OAuth2 适配 |

## 功能之间的关系

- 三个端点构成完整的 OAuth2 Authorization Code Flow：authorize → token → userinfo，按顺序调用。

## 范围与非目标

- 范围内：Authorization Code Flow 的三端点适配、多组织多租户支持
- 范围外：Client Credentials Flow、Refresh Token、钉钉企业内部 API、用户管理
