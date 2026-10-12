# ARCHITECTURE — oauth-dingtalk

## 系统概述

单进程、无状态的 HTTP 适配服务，部署在钉钉 API 与第三方系统之间。一套服务通过 URL 路径 `:orgId` 区分多个钉钉组织，为每个组织提供独立的 OAuth2 认证通道。

```
                              ┌─────────────────────────────┐
                              │       oauth-dingtalk         │
                              │        (Hono 服务)            │
                              │                              │
┌──────────────┐  /hfyzb      │  orgMap.get("hfyzb")   ┌─────▼──────────────┐
│  第三方系统A  │──────────────│  ↓                      │  钉钉开放平台       │
│  (Nextcloud) │              │  authorize → token       │  login.dingtalk    │
└──────────────┘              │        → userinfo        │  api.dingtalk      │
                              │                          └──────────────────┘
┌──────────────┐  /hfsz       │  orgMap.get("hfsz")   ┌─────────────────────┐
│  第三方系统B  │──────────────│  ↓                      │  钉钉开放平台       │
│  (Keycloak)  │              │  authorize → token →    │  login.dingtalk    │
└──────────────┘              │        userinfo          │  api.dingtalk      │
                              └─────────────────────────┴────────────────────┘
```

路由模式：`https://<host>/<orgId>/<endpoint>`，`orgId` 由 `config.yml` 中每个组织的 `id` 字段定义。

## 核心模块

| 模块 | 职责 |
|------|------|
| 配置加载 | 启动时从 `config.yml` 读取 `port` 及多组织凭据，构建 `orgMap` |
| `/:orgId/authorize` | 根据 `orgId` 查找组织配置，构造钉钉授权 URL 并 302 重定向 |
| `/:orgId/token` | 根据 `orgId` 查找组织配置，接收 `code`，调用钉钉 `userAccessToken` 接口，返回标准 token 响应 |
| `/:orgId/userinfo` | 从 `Authorization` header 提取 Bearer Token，调用钉钉 `contact/users/me`，返回标准格式的 userinfo |

## 模块关系

- 三个路由彼此独立、无状态共享，各自通过 `:orgId` 查找对应组织配置。
- 数据流为单向透传：第三方系统 → 本服务 → 钉钉 API → 本服务 → 第三方系统。

## 数据流

1. 用户在第三方系统点击「钉钉登录」
2. 第三方系统将用户重定向到本服务的 `/:orgId/authorize`
3. 本服务 302 到钉钉授权页，用户授权后钉钉回调到组织的 `redirectUri`（即第三方系统）
4. 第三方系统用 `code` 调本服务的 `/:orgId/token`，本服务转发给钉钉 API 并返回标准格式
5. 第三方系统用 `access_token` 调本服务的 `/:orgId/userinfo`，本服务转发给钉钉 API 并返回标准格式

## 外部系统

- **钉钉授权页** (`login.dingtalk.com/oauth2/auth`) — 用户授权入口
- **钉钉 Token API** (`api.dingtalk.com/v1.0/oauth2/userAccessToken`) — 授权码换 token
- **钉钉用户 API** (`api.dingtalk.com/v1.0/contact/users/me`) — 获取用户信息

## 重要技术边界

- 无持久化：不存储 token、session 或任何状态
- 无鉴权：本服务本身不验证调用方身份，信任网络层或第三方系统的 client_secret 校验
- 单文件：所有逻辑在 `src/index.ts` 中，不拆分模块
- 纯 YAML 配置：所有配置（端口、组织凭据）集中在 `config.yml`，不依赖 `.env` 或环境变量
