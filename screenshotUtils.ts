import html2canvas from 'html2canvas';
import { SUPABASE_CONFIG } from './supabaseConfig';

const CLEANUP_STYLES = `
  * {
    color: #000000 !important;
    background-color: #ffffff !important;
    border-color: #e5e7eb !important;
  }
  .text-feishu-blue { color: #3370FF !important; }
  .text-feishu-text { color: #1F2329 !important; }
  .text-feishu-subtext { color: #646A73 !important; }
  .text-red-500 { color: #ef4444 !important; }
  .text-amber-500 { color: #f59e0b !important; }
  .text-emerald-500 { color: #10b981 !important; }
  .bg-white { background-color: #ffffff !important; }
  .bg-gray-50 { background-color: #f9fafb !important; }
  .bg-blue-50 { background-color: #eff6ff !important; }
  .bg-feishu-blue { background-color: #3370FF !important; }
  .border-feishu-border { border-color: #DEE0E3 !important; }
`;

export const captureScreenshot = async (elementId: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return null;
  }

  try {
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 1, // Lower scale to reduce complexity
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement('style');
        style.textContent = CLEANUP_STYLES;
        clonedDoc.head.appendChild(style);
        
        // Force layout recalculation
        const chartContainer = clonedDoc.querySelector('.recharts-wrapper');
        if (chartContainer) {
            (chartContainer as HTMLElement).style.width = '100%';
            (chartContainer as HTMLElement).style.height = '320px';
        }
      }
    });
    
    const dataUrl = canvas.toDataURL('image/png');
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
