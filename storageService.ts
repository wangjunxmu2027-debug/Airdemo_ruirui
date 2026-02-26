import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabaseConfig';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

const BUCKET_NAME = 'transcripts';

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
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    const filePath = `transcripts/${timestamp}_${safeFileName}`;

    let fileData: Blob;
    let contentType: string;

    if (fileType === 'pdf') {
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = new Blob([bytes], { type: 'application/pdf' });
      contentType = 'application/pdf';
    } else {
      fileData = new Blob([content], { type: 'text/plain; charset=utf-8' });
      contentType = 'text/plain';
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileData, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`上传失败: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Upload transcript error:', error);
    throw error;
  }
};

export const deleteTranscript = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
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
