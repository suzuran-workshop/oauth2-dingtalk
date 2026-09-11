import { serve } from "@hono/node-server";
import { Hono } from "hono";

const CONFIG = {
  CORP_ID: process.env.CORP_ID ?? "",
  CLIENT_ID: process.env.CLIENT_ID ?? "",
  CLIENT_SECRET: process.env.CLIENT_SECRET ?? "",
  REDIRECT_URI: process.env.REDIRECT_URI ?? "",
  LOCAL_LISTEN_PORT: Number(process.env.LOCAL_LISTEN_PORT ?? 28081),
};

const app = new Hono();

// GET /oauth/authorize — 重定向到钉钉授权页
app.get("/oauth/authorize", (c) => {
  const state = c.req.query("state") ?? "";
  const url = new URL("https://login.dingtalk.com/oauth2/auth");
  url.searchParams.append("redirect_uri", CONFIG.REDIRECT_URI);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", CONFIG.CLIENT_ID);
  url.searchParams.append("scope", "openid");
  url.searchParams.append("prompt", "consent");
  url.searchParams.append("state", state);
  return c.redirect(url.toString());
});

// POST /oauth/token — 用授权码换取 access_token
app.post("/oauth/token", async (c) => {
  const body = await c.req.parseBody<{ code: string }>();
  const code = body.code;

  if (!code || typeof code !== "string") {
    return c.json({ error: "invalid_request", error_description: "code is required" }, 400);
  }
  const tokenResp = await fetch(
    "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: CONFIG.CLIENT_ID,
        clientSecret: CONFIG.CLIENT_SECRET,
        code,
        grantType: "authorization_code",
      }),
    },
  );

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    console.error("TOKEN 错误:", err);
    return c.json({ error: "token failed" }, 400);
  }

  const data = (await tokenResp.json()) as {
    accessToken: string;
    expireIn: number;
  };
  return c.json({
    access_token: data.accessToken,
    token_type: "bearer",
    expires_in: data.expireIn,
  });
});

// GET /oauth/userinfo — 获取用户信息
app.get("/oauth/userinfo", async (c) => {
  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.text("unauthorized", 401);
  }
  const token = auth.slice("Bearer ".length);

  const userResp = await fetch("https://api.dingtalk.com/v1.0/contact/users/me", {
    headers: { "x-acs-dingtalk-access-token": token },
  });

  if (!userResp.ok) {
    const err = await userResp.text();
    console.error("USERINFO 错误:", err);
    return c.text("unauthorized", 401);
  }

  const data = (await userResp.json()) as {
    openId: string;
    nick: string;
    avatarUrl?: string;
  };
  return c.json({
    sub: data.openId,
    name: data.nick,
    email: `${data.openId}@dingtalk.internal`,
    picture: data.avatarUrl ?? "",
  });
});

serve({ fetch: app.fetch, port: CONFIG.LOCAL_LISTEN_PORT }, (info) => {
  console.log(`适配器运行在 ${info.port} 端口。`);
});
