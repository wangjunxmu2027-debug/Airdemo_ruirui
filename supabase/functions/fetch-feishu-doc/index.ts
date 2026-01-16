import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Config from feishuConfig.ts
const APP_ID = 'cli_a9c0f8b111f91bc7';
const APP_SECRET = 'XaMgD0puOz7jwWgtT7krkejeWQKHEBts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Fetching document: ${url}`);

    // 1. Get Tenant Access Token
    const tokenRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0) {
      throw new Error(`Failed to get access token: ${tokenData.msg}`);
    }
    const accessToken = tokenData.tenant_access_token;

    // 2. Parse URL to get token
    // Example: https://bytedance.larkoffice.com/wiki/CSlQworFGicLDQkoJvQcVJajnwd
    let docToken = "";
    let docType = "docx"; // default

    const wikiMatch = url.match(/\/wiki\/([a-zA-Z0-9]+)/);
    const docxMatch = url.match(/\/docx\/([a-zA-Z0-9]+)/);

    if (wikiMatch) {
      const wikiToken = wikiMatch[1];
      console.log(`Detected Wiki Token: ${wikiToken}`);
      
      // Get Wiki Node Info to find the real docx token
      const wikiRes = await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=${wikiToken}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const wikiData = await wikiRes.json();
      
      if (wikiData.code === 0 && wikiData.data?.node?.obj_token) {
        docToken = wikiData.data.node.obj_token;
        docType = wikiData.data.node.obj_type; // should be 'docx'
        console.log(`Resolved Wiki to ${docType}: ${docToken}`);
      } else {
        console.warn("Wiki API failed or node not found, falling back to Jina", wikiData);
        // If Wiki API fails (maybe permission issue), we can't proceed with API
        // Fallback to Jina Reader logic below
      }
    } else if (docxMatch) {
      docToken = docxMatch[1];
      console.log(`Detected Docx Token: ${docToken}`);
    }

    let content = "";

    // 3. Fetch Content via API if we have a token
    if (docToken && docType === 'docx') {
      const contentRes = await fetch(`https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/raw_content`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const contentData = await contentRes.json();
      
      if (contentData.code === 0) {
        content = contentData.data.content;
        console.log("Successfully fetched content via Feishu API");
      } else {
        console.warn("Docx API failed:", contentData);
      }
    }

    // 4. Fallback to Jina Reader if API failed or no token found
    if (!content) {
      console.log("Falling back to Jina Reader...");
      const jinaRes = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
         headers: { 'X-Return-Format': 'markdown' }
      });
      if (jinaRes.ok) {
        content = await jinaRes.text();
        console.log("Successfully fetched content via Jina Reader");
      } else {
        throw new Error(`Jina Reader failed: ${jinaRes.status}`);
      }
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
