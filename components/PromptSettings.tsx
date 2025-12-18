
import React, { useState } from 'react';
import { fetchFeishuDocContent, extractSectionFromContent } from '../feishuService';
import { FeishuConfig } from '../types';

interface Props {
  // feishuConfig is no longer needed here, but kept in props to avoid breaking parent quickly (optional) or we can ignore it.
  // Ideally, we refactor parent too, but for minimal change, we ignore it here.
  feishuConfig?: FeishuConfig; 
  onConfigChange?: (config: FeishuConfig) => void;
  currentPrompt: string | null;
  onPromptChange: (prompt: string | null) => void;
  onClose: () => void;
}

const PromptSettings: React.FC<Props> = ({ 
  currentPrompt, 
  onPromptChange,
  onClose 
}) => {
  const [mode, setMode] = useState<'default' | 'feishu'>('default');
  const [docUrl, setDocUrl] = useState('https://bytedance.larkoffice.com/wiki/H4fewJUz9i7sg7kAwBkcgPOnnKd');
  const [sectionKeyword, setSectionKeyword] = useState('Pitch复盘提示词');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!docUrl) {
      setError("请输入文档链接");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const content = await fetchFeishuDocContent(docUrl);
      const section = extractSectionFromContent(content, sectionKeyword);
      
      if (!section || section === content) {
        setPreviewText(`警告：未找到关键词 "${sectionKeyword}"，将使用全文。\n\n` + content.slice(0, 200) + "...");
        onPromptChange(content);
      } else {
        setPreviewText(`已提取 "${sectionKeyword}" 相关内容：\n\n` + section.slice(0, 200) + "...");
        onPromptChange(section);
      }
    } catch (err: any) {
      setError(err.message || "获取失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDefault = () => {
    setMode('default');
    onPromptChange(null);
    setPreviewText(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h3 className="text-lg font-bold text-feishu-text">复盘标准配置</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
           </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
           <div className="flex gap-4 mb-6">
              <button
                onClick={handleUseDefault}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${mode === 'default' ? 'border-feishu-blue bg-blue-50 text-feishu-blue' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
              >
                使用系统默认标准
              </button>
              <button
                onClick={() => setMode('feishu')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${mode === 'feishu' ? 'border-feishu-blue bg-blue-50 text-feishu-blue' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
              >
                从飞书文档读取
              </button>
           </div>

           {mode === 'feishu' && (
             <div className="space-y-4 animate-fade-in">
                <div>
                   <label className="block text-xs font-semibold text-feishu-subtext mb-1 uppercase">文档链接 (Wiki/DocX)</label>
                   <input 
                      type="text" 
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 text-sm border border-feishu-border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-feishu-blue outline-none"
                   />
                   <p className="text-xs text-gray-400 mt-1">请确保文档权限已设置为“互联网上获得链接的任何人可阅读”。</p>
                </div>
                
                <div>
                   <label className="block text-xs font-semibold text-feishu-subtext mb-1 uppercase">提取章节关键词</label>
                   <div className="flex gap-2">
                     <input 
                        type="text" 
                        value={sectionKeyword}
                        onChange={(e) => setSectionKeyword(e.target.value)}
                        placeholder="例如：Pitch复盘提示词"
                        className="flex-1 p-2.5 text-sm border border-feishu-border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-feishu-blue outline-none"
                     />
                   </div>
                   <p className="text-xs text-gray-400 mt-1">留空则使用全文。系统将从该关键词开始提取内容。</p>
                </div>

                {error && <div className="text-red-500 text-xs p-2 bg-red-50 rounded">{error}</div>}

                <button
                  onClick={handleFetch}
                  disabled={isLoading}
                  className="w-full bg-feishu-blue hover:bg-feishu-hover text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? '读取中...' : '读取并应用'}
                </button>

                {previewText && (
                  <div className="mt-4 p-3 bg-green-50 text-green-800 text-xs rounded border border-green-100 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                    {previewText}
                  </div>
                )}
             </div>
           )}

           {mode === 'default' && (
             <div className="text-sm text-feishu-subtext text-center py-8">
                已应用内置的 "SaaS 售前五维金标准" (Pitch 复盘) 提示词。
             </div>
           )}
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
           <button onClick={onClose} className="bg-white border border-gray-300 text-feishu-text px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
             完成
           </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSettings;
