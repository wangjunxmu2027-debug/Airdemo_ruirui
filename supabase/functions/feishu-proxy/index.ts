import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const APP_ID = "cli_a9c0f8b111f91bc7";
const APP_SECRET = "XaMgD0puOz7jwWgtT7krkejeWQKHEBts";
const APP_TOKEN = "FQaXbQuFya8kp0sUk3EcsG2Sn5f";
const TABLE_ID = "tblr3ehSpZdxnoNZ";

let accessToken: string | null = null;
let tokenExpireTime: number = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken;
  }

  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
    }),
  });

  const data = await response.json();
  console.log("飞书 API Token 响应:", JSON.stringify(data));

  if (data.code !== 0) {
    throw new Error(`获取 Access Token 失败: ${data.msg} (code: ${data.code})`);
  }

  accessToken = data.tenant_access_token;
  tokenExpireTime = Date.now() + (data.expire - 60) * 1000;

  return accessToken;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/feishu-proxy/token") {
      const token = await getAccessToken();
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/feishu-proxy/webhook" && req.method === "POST") {
      const body = await req.json();
      const { webhookUrl, data } = body;

      if (!webhookUrl) {
        return new Response(JSON.stringify({ error: "Missing webhookUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Forwarding to Webhook:", webhookUrl);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // 飞书 Webhook 即使成功也可能不返回 JSON，或者返回特定的 JSON
      // 我们只检查状态码
      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `Webhook failed: ${response.status} ${errorText}` }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 尝试解析 JSON，如果失败则返回文本
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { message: "Webhook executed successfully" };
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/feishu-proxy/create-record" && req.method === "POST") {
      const body = await req.json();
      const { recordData } = body;

      console.log("创建记录请求:", JSON.stringify(recordData));

      const token = await getAccessToken();

      const response = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(recordData),
        }
      );

      const data = await response.json();
      console.log("飞书 API 创建记录响应:", JSON.stringify(data));

      if (data.code !== 0) {
        return new Response(JSON.stringify({ 
          error: data.msg,
          feishuCode: data.code,
          feishuData: data
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const recordId = data.data.record.record_id;

      return new Response(JSON.stringify({ recordId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/feishu-proxy/update-record" && req.method === "POST") {
      const body = await req.json();
      const { recordId, fields } = body;

      const token = await getAccessToken();

      const response = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ fields }),
        }
      );

      const data = await response.json();

      if (data.code !== 0) {
        return new Response(JSON.stringify({ error: data.msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/feishu-proxy/get-record" && req.method === "GET") {
      const recordId = url.searchParams.get("recordId");

      if (!recordId) {
        return new Response(JSON.stringify({ error: "缺少 recordId 参数" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await getAccessToken();

      const response = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.code !== 0) {
        return new Response(JSON.stringify({ error: data.msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ record: data.data.record }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
