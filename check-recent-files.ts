import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xqsviesaffzksjuqbxey.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc3ZpZXNhZmZ6a3NqdXFieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ1NTQzNSwiZXhwIjoyMDgyMDMxNDM1fQ.1cNvqdygZT00Y6YuDmSY_oXoRMVk6IWTk-4cx1zb5Do';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRecentFiles() {
  console.log('=== 检查最近上传的文件 ===\n');
  
  const { data: files, error } = await supabase
    .storage
    .from('transcripts')
    .list('', { 
      limit: 20,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });
  
  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }
  
  console.log(`✅ 找到 ${files?.length || 0} 个文件:\n`);
  
  // 查找最近 5 分钟上传的文件
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  const recentFiles = files?.filter(file => {
    const fileTime = new Date(file.created_at).getTime();
    return fileTime > fiveMinutesAgo;
  });
  
  if (recentFiles && recentFiles.length > 0) {
    console.log('📦 最近 5 分钟上传的文件：\n');
    recentFiles.forEach((file, index) => {
      const { data: { publicUrl } } = supabase.storage.from('transcripts').getPublicUrl(file.name);
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   大小：${file.metadata?.size || file.size} bytes`);
      console.log(`   时间：${file.created_at}`);
      console.log(`   URL: ${publicUrl}\n`);
    });
  } else {
    console.log('⚠️  最近 5 分钟没有新文件上传\n');
  }
  
  // 显示所有文件
  console.log('📋 所有文件列表（最新 20 个）：');
  files?.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} (${file.metadata?.size || file.size} bytes)`);
  });
}

checkRecentFiles().catch(console.error);
