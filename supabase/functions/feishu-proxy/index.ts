import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, X-Requested-With",
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

    // 新的路由：上传逐字稿
    if (path === "/feishu-proxy/upload-transcript" && req.method === "POST") {
      try {
        const body = await req.json();
        const { content, filename, fileType } = body; 

        if (!content) {
             return new Response(JSON.stringify({ error: "No content data" }), { status: 400, headers: corsHeaders });
        }

        // Use Service Role Key for upload to ensure permission
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const adminSupabase = createClient(supabaseUrl, serviceKey);

        const timestamp = Date.now();
        const safeFilename = (filename || 'transcript').replace(/[\\/:*?"<>|]/g, '_');
        const extension = fileType === 'pdf' ? 'pdf' : 'txt';
        const storagePath = `${timestamp}_${safeFilename}.${extension}`;

        let binaryData: Uint8Array;
        let contentType: string;

        if (fileType === 'pdf') {
          // PDF content is base64 encoded
          binaryData = decode(content);
          contentType = 'application/pdf';
        } else {
          // Text content
          const encoder = new TextEncoder();
          binaryData = encoder.encode(content);
          contentType = 'text/plain; charset=utf-8';
        }

        // Upload to 'transcripts' bucket
        const { data, error } = await adminSupabase
            .storage
            .from('transcripts')
            .upload(storagePath, binaryData, {
                contentType: contentType,
                upsert: false
            });

        if (error) {
            console.error("Transcript upload error:", error);
            return new Response(JSON.stringify({ error: "Upload failed: " + error.message }), { status: 500, headers: corsHeaders });
        }

        const { data: { publicUrl } } = adminSupabase
            .storage
            .from('transcripts')
            .getPublicUrl(storagePath);

        console.log("Transcript uploaded successfully:", publicUrl);

        return new Response(JSON.stringify({ url: publicUrl, path: storagePath }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
         console.error("Transcript upload handler error:", e);
         return new Response(JSON.stringify({ error: "Processing failed: " + e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 新的路由：保存报告并触发 Webhook
    if (path === "/feishu-proxy/save-and-webhook" && req.method === "POST") {
      const body = await req.json();
      const { webhookUrl, reportData, originalData, appUrl, transcriptPayload, customerName } = body;

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
          title: reportData['客户名称'] || '未命名报告',
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
      // 注意：Vercel 部署环境通常会自动设置 VITE_APP_URL，但 Edge Function 是独立环境
      // 如果 body 中没有 appUrl，则尝试使用 Supabase 的默认域名或 localhost
      const baseUrl = appUrl || "http://localhost:8080"; 
      // 移除末尾斜杠
      const cleanBaseUrl = baseUrl.replace(/\/$/, "");
      const shortLink = `${cleanBaseUrl}/r/${reportId}`;

      console.log("Generated Short Link:", shortLink);

      // 获取逐字稿链接
      let transcriptLink = "";
      
      console.log("Checking transcriptPayload:", !!transcriptPayload, "content exists:", !!transcriptPayload?.content);
      
      if (transcriptPayload?.content) {
        console.log("Uploading transcript...");
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const adminSupabase = createClient(supabaseUrl, serviceKey);
        const timestamp = Date.now();
        
        // 使用客户名称作为文件名前缀，确保文件与客户关联
        const customerNameSafe = customerName ? customerName.replace(/[\\/:*?"<>|]/g, '_') : 'unknown_customer';
        const originalFilename = (transcriptPayload.filename || 'transcript').replace(/[\\/:*?"<>|]/g, '_');
        const extension = transcriptPayload.fileType === 'pdf' ? 'pdf' : 'txt';
        
        // 文件命名格式：客户名称_时间戳_原始文件名。扩展名
        const storagePath = `${customerNameSafe}_${timestamp}_${originalFilename}.${extension}`;
        console.log("Storage path:", storagePath);

        let binaryData: Uint8Array;
        let contentType: string;

        if (transcriptPayload.fileType === 'pdf') {
          binaryData = decode(transcriptPayload.content);
          contentType = 'application/pdf';
          console.log("PDF content size:", binaryData.length, "bytes");
        } else {
          const encoder = new TextEncoder();
          binaryData = encoder.encode(transcriptPayload.content);
          contentType = 'text/plain; charset=utf-8';
          console.log("Text content size:", binaryData.length, "bytes");
        }

        const { error: uploadError } = await adminSupabase
          .storage
          .from('transcripts')
          .upload(storagePath, binaryData, {
            contentType: contentType,
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error("Transcript upload error:", uploadError);
          // 上传失败不影响整体流程，只是逐字稿链接为空
        } else {
          // 使用 getPublicUrl 方法生成正确的 URL
          const { data: urlData } = adminSupabase
            .storage
            .from('transcripts')
            .getPublicUrl(storagePath);
          
          const publicUrl = urlData?.publicUrl || `${supabaseUrl}/storage/v1/s3/transcripts/${storagePath}`;
          
          transcriptLink = publicUrl;
          console.log("✅ Transcript uploaded:", storagePath);
          console.log("✅ Public URL:", publicUrl);
        }
      } else {
        console.log("⚠️ No transcript payload provided");
      }

      // 2. 构造 webhook payload - 只包含用户需要的字段
      const webhookPayload = {
        [reportData['客户名称'] ? '客户名称' : '客户名称']: reportData['客户名称'] || '',
        [reportData['汇报人'] ? '汇报人' : '汇报人']: reportData['汇报人'] || '',
        [reportData['汇报日期'] ? '汇报日期' : '汇报日期']: reportData['汇报日期'] || '',
        [reportData['给谁汇报了什么'] ? '给谁汇报了什么' : '给谁汇报了什么']: reportData['给谁汇报了什么'] || '',
        [reportData['AI 复盘截屏'] ? 'AI 复盘截屏' : 'AI 复盘截屏']: shortLink,
        [reportData['汇报评分'] ? '汇报评分' : '汇报评分']: reportData['汇报评分'] || 0,
        [reportData['逐字稿原稿'] ? '逐字稿原稿' : '逐字稿原稿']: transcriptLink || ""
      };

      // 3. 发送 Webhook
      console.log("Forwarding to Webhook:", webhookUrl);
      console.log("Webhook Payload:", JSON.stringify(webhookPayload, null, 2));
      
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
