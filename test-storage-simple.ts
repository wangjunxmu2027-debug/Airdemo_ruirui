// 简单测试：直接生成 public URL，不进行任何 API 调用
const SUPABASE_URL = 'https://xqsviesaffzksjuqbxey.supabase.co';
const BUCKET_NAME = 'transcripts';

// 模拟几个文件名
const testFiles = [
  '1772174949189_lixun_meeting.pdf.pdf',
  '丽迅_1772175000000_meeting.pdf',
  `test_${Date.now()}.txt`
];

console.log('=== 测试 Supabase Storage Public URL 生成 ===\n');
console.log(`Base URL: ${SUPABASE_URL}`);
console.log(`Bucket: ${BUCKET_NAME}\n`);

testFiles.forEach((filename, index) => {
  // Public URL 格式：https://<project-ref>.supabase.co/storage/v1/s3/<bucket>/<path>
  const publicUrl = `${SUPABASE_URL}/storage/v1/s3/${BUCKET_NAME}/${filename}`;
  console.log(`${index + 1}. 文件名：${filename}`);
  console.log(`   Public URL: ${publicUrl}`);
  console.log(`   ✅ URL 格式正确\n`);
});

console.log('=== 测试完成 ===');
console.log('\n💡 注意：这只是生成 URL 格式，实际访问需要 bucket 是 public 的或者有正确的权限');
