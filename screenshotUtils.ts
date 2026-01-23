import * as htmlToImage from 'html-to-image';
import { SUPABASE_CONFIG } from './supabaseConfig';

export const captureScreenshot = async (elementId: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return null;
  }

  try {
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use html-to-image which has better modern CSS support
    // Cast to any to bypass strict TS check for specific library options
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      fontEmbedCss: false, // Disable web font embedding
      style: {
        transform: 'none',
      },
      onclone: (clonedDoc) => {
        // Aggressively override fonts to system fonts to avoid fetching Google Fonts
        const style = clonedDoc.createElement('style');
        style.textContent = `
          body, div, span, p, h1, h2, h3, h4, h5, h6 {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-weight: normal !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      }
    } as any);
    
    return dataUrl.split(',')[1];
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
