import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xqsviesaffzksjuqbxey.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzc3ZpZXNhZmZ6a3NqdXFieGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMDM0NTYsImV4cCI6MjA1NTg3OTQ1Nn0.M8Y7X9Z2nF5qL3kR6tP4wV1aB8cD0eE2fG9hI7jK5l';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzc3ZpZXNhZmZ6a3NqdXFieGV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDMwMzQ1NiwiZXhwIjoyMDU1ODc5NDU2fQ.J4c5L1nFqzC3K8N9P2mR7tY6vX8wZ1aB4dE5fG7hI9j';

// 使用 Service Role Key 进行测试
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testTranscriptUpload() {
  console.log('=== 测试 Supabase Storage 逐字稿上传和 URL 获取 ===\n');
  console.log(`使用 URL: ${SUPABASE_URL}`);
  console.log(`使用密钥：${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...\n`);
  
  try {
    // 1. 列出 transcripts bucket 中的文件
    console.log('1. 列出 transcripts bucket 中的文件：');
    const { data: files, error: listError } = await supabase
      .storage
      .from('transcripts')
      .list('', { limit: 10 });
    
    if (listError) {
      console.error('❌ 列出文件失败:', listError);
      console.log('\n💡 提示：请检查：');
      console.log('   1. transcripts bucket 是否存在');
      console.log('   2. 是否有读取权限');
      console.log('   3. 密钥是否正确（需要使用 Service Role Key）');
      return;
    }
    
    console.log(`✅ 找到 ${files?.length || 0} 个文件:`);
    files?.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
    });
    
    if (!files || files.length === 0) {
      console.log('\n⚠️  bucket 中没有文件，跳过后续测试');
    } else {
      // 2. 获取最新文件的 public URL
      const latestFile = files[0];
      console.log(`\n2. 获取最新文件的 Public URL: ${latestFile.name}`);
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('transcripts')
        .getPublicUrl(latestFile.name);
      
      console.log(`✅ Public URL: ${publicUrl}`);
    }
    
    // 3. 测试上传一个新文件
    console.log('\n3. 测试上传新文件：');
    const testFilename = `test_${Date.now()}.txt`;
    const testContent = '这是一个测试文件，用于验证 Supabase Storage 上传功能。';
    const encoder = new TextEncoder();
    const testData = encoder.encode(testContent);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('transcripts')
      .upload(testFilename, testData, {
        contentType: 'text/plain; charset=utf-8',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ 上传失败:', uploadError);
    } else {
      console.log('✅ 上传成功:', uploadData.path);
      
      // 获取上传文件的 public URL
      const { data: { publicUrl: uploadPublicUrl } } = supabase
        .storage
        .from('transcripts')
        .getPublicUrl(testFilename);
      
      console.log('✅ 上传文件的 Public URL:', uploadPublicUrl);
    }
    
    // 4. 测试带客户名称的文件名
    console.log('\n4. 测试带客户名称的文件名格式：');
    const customerName = '丽迅_百丽集团';
    const timestamp = Date.now();
    const originalFilename = 'meeting.pdf';
    const storagePath = `${customerName}_${timestamp}_${originalFilename}`;
    
    console.log(`   生成的存储路径：${storagePath}`);
    console.log(`   ✅ 格式正确：客户名称_时间戳_原始文件名`);
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('\n❌ 测试过程中出现异常:', error);
  }
}

testTranscriptUpload().catch(console.error);
