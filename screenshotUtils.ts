import html2canvas from 'html2canvas';
import { SUPABASE_CONFIG } from './supabaseConfig';

export const captureScreenshot = async (elementId: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return null;
  }

  try {
    // Wait for a moment to ensure rendering is complete if needed
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2, // Better quality
      logging: false,
      backgroundColor: '#ffffff', // Ensure white background
    });
    
    // Convert to base64 (remove prefix)
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    return base64;
  } catch (error) {
    console.error('Screenshot failed:', error);
    return null;
  }
};

export const uploadScreenshot = async (base64Image: string): Promise<string> => {
    const filename = `screenshot_${Date.now()}.png`;
    
    const response = await fetch(`${SUPABASE_CONFIG.edgeFunctionUrl}/feishu-proxy/upload-screenshot`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image: base64Image,
            filename: filename
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Upload failed: ${err}`);
    }

    const data = await response.json();
    return data.url;
};
