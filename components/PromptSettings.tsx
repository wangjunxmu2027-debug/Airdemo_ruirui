import React, { useState } from 'react';
import { fetchFeishuDocContent, extractSectionFromContent } from '../feishuService';
import { FeishuConfig } from '../types';

interface Props {
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
  const [mode, setMode] = useState<'default' | 'feishu' | 'manual'>('default');
  const [docUrl, setDocUrl] = useState('https://bytedance.larkoffice.com/wiki/H4fewJUz9i7sg7kAwBkcgPOnnKd');
  const [sectionKeyword, setSectionKeyword] = useState('Pitch复盘提示词');
  const [manualContent, setManualContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string>('');
  const [showFullContent, setShowFullContent] = useState(false);

  // Auto-fill URL from localStorage on mount
  React.useEffect(() => {
    const savedUrl = localStorage.getItem('lastFeishuDocUrl');
    if (savedUrl && mode === 'feishu') {
      setDocUrl(savedUrl);
      console.log("✅ 已从 localStorage 自动填充上次使用的链接:", savedUrl);
    }
  }, [mode]);

  const handleFetch = async () => {
    setDebugLog('');
    
    if (mode === 'manual') {
      if (!manualContent.trim()) {
        setError("请输入文档内容");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        setPreviewText(`已应用手动粘贴的内容：\n\n` + manualContent.slice(0, 200) + "...");
        setDebugLog(`手动粘贴内容长度: ${manualContent.length} 字符`);
        onPromptChange(manualContent);
      } catch (err: any) {
        setError(err.message || "处理失败");
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'feishu') {
      if (!docUrl) {
        setError("请输入文档链接");
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const content = await fetchFeishuDocContent(docUrl);
        setFullContent(content); // Save raw content for debugging
        const section = extractSectionFromContent(content, sectionKeyword);
        
        if (!section || section === content) {
          setPreviewText(`警告：未找到关键词 "${sectionKeyword}"，将使用全文。\n\n` + content.slice(0, 200) + "...");
          setDebugLog(`关键词 "${sectionKeyword}" 未找到，全文长度: ${content.length} 字符`);
          onPromptChange(content);
        } else {
          setPreviewText(`已提取 "${sectionKeyword}" 相关内容：\n\n` + section.slice(0, 200) + "...");
          setDebugLog(`成功提取 "${sectionKeyword}"，提取内容长度: ${section.length} 字符`);
          onPromptChange(section);
        }
      } catch (err: any) {
        setError(err.message || "获取失败");
        setDebugLog(`错误: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
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
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${mode === 'manual' ? 'border-feishu-blue bg-blue-50 text-feishu-blue' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
              >
                手动粘贴内容
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
                   <p className="text-xs text-gray-400 mt-1">请确保文档权限已设置为"互联网上获得链接的任何人可阅读"。</p>
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

                {debugLog && (
                  <div className="mt-4 p-3 bg-gray-900 text-gray-300 text-xs rounded border border-gray-700 whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
                    <div className="text-gray-400 mb-1">调试日志：</div>
                    <div>{debugLog}</div>
                  </div>
                )}

                <button
                  onClick={handleFetch}
                  disabled={isLoading}
                  className="w-full bg-feishu-blue hover:bg-feishu-hover text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? '读取中...' : '读取并应用'}
                </button>

                {previewText && (
                  <div className="mt-4">
                    <div className="p-3 bg-green-50 text-green-800 text-xs rounded border border-green-100 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                      {previewText}
                    </div>
                    
                    {fullContent && (
                      <div className="mt-2 text-right">
                        <button 
                          onClick={() => setShowFullContent(!showFullContent)}
                          className="text-xs text-feishu-blue hover:underline"
                        >
                          {showFullContent ? "收起完整抓取内容" : "查看完整抓取内容 (调试用)"}
                        </button>
                      </div>
                    )}
                    
                    {showFullContent && fullContent && (
                      <div className="mt-2 p-3 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                        <div className="font-bold mb-2">完整抓取内容：</div>
                        {fullContent}
                      </div>
                    )}
                  </div>
                )}
             </div>
           )}

           {mode === 'manual' && (
             <div className="space-y-4 animate-fade-in">
                <div>
                   <label className="block text-xs font-semibold text-feishu-subtext mb-1 uppercase">文档内容</label>
                   <textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="请粘贴飞书文档中的&quot;Pitch复盘提示词&quot;相关内容..."
                      rows={12}
                      className="w-full p-2.5 text-sm border border-feishu-border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-feishu-blue outline-none resize-none"
                   />
                   <p className="text-xs text-gray-400 mt-1">直接粘贴文档内容，无需链接。</p>
                </div>

                {error && <div className="text-red-500 text-xs p-2 bg-red-50 rounded">{error}</div>}

                <button
                  onClick={handleFetch}
                  disabled={isLoading}
                  className="w-full bg-feishu-blue hover:bg-feishu-hover text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? '应用中...' : '应用'}
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
