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
    await new Promise(resolve => setTimeout(resolve, 500));

    // html2canvas configuration to bypass unsupported CSS features like oklch
    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2, // Better quality
      logging: false,
      backgroundColor: '#ffffff', // Ensure white background
      onclone: (clonedDoc) => {
         // Helper to convert modern colors to RGB if possible, or just fallback
         // Note: html2canvas runs in the browser context, but clonedDoc is a detached DOM
         // We can try to force sRGB color profile or modify styles if needed
         // For now, let's try to remove potentially problematic CSS variables if they are the root cause
         // or just rely on the fact that we are not using oklch explicitly in our custom CSS
      },
      ignoreElements: (element) => {
          // Ignore any elements that might cause issues if they are not visible/essential
          return false;
      }
    });
    
    // Convert to base64 (remove prefix)
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    return base64;
  } catch (error) {
    console.error('Screenshot failed:', error);
    // Return null so the caller knows screenshot failed but can proceed
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
