import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // 创建 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 新的路由：上传截图
    if (path === "/feishu-proxy/upload-screenshot" && req.method === "POST") {
      try {
        const body = await req.json();
        const { image, filename } = body; 

        if (!image) {
             return new Response(JSON.stringify({ error: "No image data" }), { status: 400, headers: corsHeaders });
        }

        const binary = decode(image);
        
        // Use Service Role Key for upload to ensure permission
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const adminSupabase = createClient(supabaseUrl, serviceKey);

        const safeFilename = filename || `screenshot_${Date.now()}.png`;

        // Upload to 'screenshots' bucket
        const { data, error } = await adminSupabase
            .storage
            .from('screenshots')
            .upload(safeFilename, binary, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) {
            console.error("Storage upload error:", error);
            return new Response(JSON.stringify({ error: "Upload failed: " + error.message }), { status: 500, headers: corsHeaders });
        }

        const { data: { publicUrl } } = adminSupabase
            .storage
            .from('screenshots')
            .getPublicUrl(safeFilename);

        return new Response(JSON.stringify({ url: publicUrl }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
         console.error("Upload handler error:", e);
         return new Response(JSON.stringify({ error: "Processing failed: " + e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 新的路由：保存报告并触发 Webhook
    if (path === "/feishu-proxy/save-and-webhook" && req.method === "POST") {
      const body = await req.json();
      const { webhookUrl, reportData, originalData, appUrl } = body;

      if (!reportData || !webhookUrl) {
        return new Response(JSON.stringify({ error: "Missing reportData or webhookUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. 保存到 Supabase 数据库
      // 优先使用 originalData (前端展示用)，如果没有则回退到 reportData
      const dataToSave = originalData || reportData;
      
      const { data: savedReport, error: dbError } = await supabase
        .from('reports')
        .insert({
          title: reportData['标题'] || '未命名报告',
          data: dataToSave
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        return new Response(JSON.stringify({ error: "Failed to save report" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reportId = savedReport.id;
      // 生成短链接 (假设前端路由是 /r/:id)
      // 如果没有提供 appUrl，默认用 localhost (仅供测试)
      const baseUrl = appUrl || "http://localhost:8080"; 
      // 移除末尾斜杠
      const cleanBaseUrl = baseUrl.replace(/\/$/, "");
      const shortLink = `${cleanBaseUrl}/r/${reportId}`;

      console.log("Generated Short Link:", shortLink);

      // 2. 更新 reportData 中的链接字段
      const webhookPayload = {
        ...reportData,
        "报告链接": shortLink,
        "AI复盘截屏": shortLink // 将报告链接填入截图字段
      };

      // 3. 发送 Webhook
      console.log("Forwarding to Webhook:", webhookUrl);
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        return new Response(JSON.stringify({ error: `Webhook failed: ${webhookResponse.status} ${errorText}` }), {
          status: webhookResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, reportId, shortLink }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 获取报告接口
    if (path === "/feishu-proxy/get-report" && req.method === "GET") {
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Report not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 保留旧的 Webhook 转发逻辑（为了兼容性）
    if (path === "/feishu-proxy/webhook" && req.method === "POST") {
      const body = await req.json();
      const { webhookUrl, data } = body;
      // ... (原有逻辑简化，直接转发)
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return new Response(JSON.stringify({ success: response.ok }), {
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
