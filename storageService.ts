import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabaseConfig';

// 使用 Service Role Key 进行上传（需要有上传权限）
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc3ZpZXNhZmZ6a3NqdXFieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ1NTQzNSwiZXhwIjoyMDgyMDMxNDM1fQ.1cNvqdygZT00Y6YuDmSY_oXoRMVk6IWTk-4cx1zb5Do';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_SERVICE_ROLE_KEY);

/**
 * 上传文件到 Supabase Storage 的 transcripts bucket
 * @param file - 文件对象
 * @param customerName - 客户名称（可选，用于命名）
 * @returns 文件的 public URL
 */
export const uploadTranscriptToStorage = async (
  file: File,
  customerName?: string
): Promise<string> => {
  try {
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[\\/:*?"<>|]/g, '_');
    const customerNameSafe = customerName ? customerName.replace(/[\\/:*?"<>|]/g, '_') : 'unknown';
    
    // 文件命名格式：客户名称_时间戳_原始文件名
    const storagePath = `${customerNameSafe}_${timestamp}_${safeFilename}`;
    
    console.log('📤 Uploading transcript to Storage:', storagePath);
    
    // 使用 Service Role Key 需要有对应的 Edge Function 或者通过服务端上传
    // 这里我们先使用 anon key，需要在 Supabase 中设置 bucket 为 public
    const { data, error } = await supabase
      .storage
      .from('transcripts')
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Storage upload error:', error);
      throw new Error(`上传失败：${error.message}`);
    }
    
    // 生成 public URL
    const { data: urlData } = supabase
      .storage
      .from('transcripts')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData?.publicUrl;
    
    if (!publicUrl) {
      throw new Error('无法生成文件 URL');
    }
    
    console.log('✅ Upload successful:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * 上传 base64 内容到 Supabase Storage
 * @param base64Content - base64 编码的文件内容
 * @param filename - 文件名
 * @param fileType - 文件类型
 * @param customerName - 客户名称（可选）
 * @returns 文件的 public URL
 */
export const uploadBase64ToStorage = async (
  base64Content: string,
  filename: string,
  fileType: 'pdf' | 'text',
  customerName?: string
): Promise<string> => {
  try {
    const timestamp = Date.now();
    
    // 优化文件名处理：保留英文、数字、下划线、点和连字符
    // 中文文件名会被音译或替换，但保留可读性
    const safeFilename = filename
      .replace(/[\\/:*?"<>|]/g, '_')  // 替换特殊字符
      .replace(/\s+/g, '_')           // 空格替换为下划线
      .replace(/[^a-zA-Z0-9._-]/g, '');  // 移除非英文字符（包括中文）
    
    // 如果文件名为空（纯中文），使用默认名称
    const finalFilename = safeFilename || 'document';
    
    const customerNameSafe = customerName 
      ? customerName.replace(/[\\/:*?"<>|]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
      : 'transcript';
    
    // 文件命名格式：客户名称_时间戳_原始文件名
    const storagePath = `${customerNameSafe || 'transcript'}_${timestamp}_${finalFilename}`;
    
    console.log('📤 Uploading base64 content to Storage:', storagePath);
    console.log('   Original filename:', filename);
    console.log('   Safe filename:', finalFilename);
    console.log('   Customer name:', customerNameSafe || 'transcript');
    
    // 解码 base64
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { 
      type: fileType === 'pdf' ? 'application/pdf' : 'text/plain' 
    });
    
    const { data, error } = await supabase
      .storage
      .from('transcripts')
      .upload(storagePath, blob, {
        contentType: fileType === 'pdf' ? 'application/pdf' : 'text/plain',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Storage upload error:', error);
      throw new Error(`上传失败：${error.message}`);
    }
    
    // 生成 public URL
    const { data: urlData } = supabase
      .storage
      .from('transcripts')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData?.publicUrl;
    
    if (!publicUrl) {
      throw new Error('无法生成文件 URL');
    }
    
    console.log('✅ Upload successful:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
