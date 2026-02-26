import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabaseConfig';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export const uploadTranscript = async (
  content: string,
  fileName: string,
  fileType: 'text' | 'pdf'
): Promise<UploadResult> => {
  try {
    console.log('=== Starting transcript upload via Edge Function ===');
    console.log('File name:', fileName);
    console.log('File type:', fileType);
    console.log('Content length:', content.length);

    const { data, error } = await supabase.functions.invoke('feishu-proxy/upload-transcript', {
      body: {
        content: content,
        filename: fileName,
        fileType: fileType
      }
    });

    if (error) {
      console.error('Upload error details:', error);
      throw new Error(`上传失败: ${error.message}`);
    }

    console.log('Upload successful, URL:', data.url);

    return {
      path: data.path,
      publicUrl: data.url
    };
  } catch (error: any) {
    console.error('Upload transcript error:', error?.message || error);
    throw error;
  }
};

export const deleteTranscript = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('transcripts')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete transcript error:', error);
    return false;
  }
};
