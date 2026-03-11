import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xqsviesaffzksjuqbxey.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzc3ZpZXNhZmZ6a3NqdXFieGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMDM0NTYsImV4cCI6MjA1NTg3OTQ1Nn0.M8Y7X9Z2nF5qL3kR6tP4wV1aB8cD0eE2fG9hI7jK5l';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpload() {
  console.log('=== 测试 Supabase Storage 上传 ===\n');
  
  // 测试 1: 纯英文文件名
  const testFilename1 = `test_${Date.now()}.txt`;
  const testContent1 = 'Test content';
  
  console.log('测试 1: 纯英文文件名');
  console.log('文件名:', testFilename1);
  
  const { data: data1, error: error1 } = await supabase
    .storage
    .from('transcripts')
    .upload(testFilename1, new TextEncoder().encode(testContent1), {
      contentType: 'text/plain',
      cacheControl: '3600'
    });
  
  if (error1) {
    console.error('❌ 上传失败:', error1);
  } else {
    console.log('✅ 上传成功:', data1.path);
    
    const { data: { publicUrl } } = supabase.storage.from('transcripts').getPublicUrl(testFilename1);
    console.log('📎 Public URL:', publicUrl);
  }
  
  // 测试 2: 包含中文的文件名
  const testFilename2 = `test_${Date.now()}_测试.txt`;
  console.log('\n测试 2: 包含中文的文件名');
  console.log('文件名:', testFilename2);
  
  const { data: data2, error: error2 } = await supabase
    .storage
    .from('transcripts')
    .upload(testFilename2, new TextEncoder().encode(testContent1), {
      contentType: 'text/plain',
      cacheControl: '3600'
    });
  
  if (error2) {
    console.error('❌ 上传失败:', error2);
    console.log('💡 Supabase Storage 可能不支持中文文件名');
  } else {
    console.log('✅ 上传成功:', data2.path);
    
    const { data: { publicUrl } } = supabase.storage.from('transcripts').getPublicUrl(testFilename2);
    console.log('📎 Public URL:', publicUrl);
  }
  
  // 测试 3: URL 编码的文件名
  const testFilename3 = `test_${Date.now()}_encoded.txt`;
  console.log('\n测试 3: 使用 encodeURIComponent 编码');
  console.log('原始文件名:', testFilename2);
  console.log('编码后文件名:', encodeURIComponent(testFilename2));
  
  console.log('\n=== 测试完成 ===');
}

testUpload().catch(console.error);
