'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Home() {
  // モード選択 ('chat': 対戦, 'assist': 代筆参謀)
  const [mode, setMode] = useState<'chat' | 'assist'>('chat');

  // --- 【対戦モード用】 ---
  const [persona, setPersona] = useState('cynical');
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);

  // --- 【参謀（反論生成）モード用】 ---
  const [opponentText, setOpponentText] = useState('');
  const [myStance, setMyStance] = useState('');
  const [replies, setReplies] = useState<{ cynical?: string; logic?: string; provoke?: string } | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // お題の自動生成
  const handleGenerateTopic = async () => {
    setTopicLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'レスバにぴったりな議論を呼ぶお題（例：「きのこの山vsたけのこの里」「猫派vs犬派」「残業は悪か」など）を1つだけ短く提案してください。余計な解説は不要です。' }],
          persona: 'logic',
        }),
      });
      const data = await res.json();
      if (data.result) {
        setTopic(data.result.replace(/^「|」$/g, '').trim());
      }
    } catch (e) {
      alert('お題の取得に失敗しました');
    } finally {
      setTopicLoading(false);
    }
  };

  // 1対1チャット送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    
    // お題が設定されていて最初のメッセージならお題も含める
    const currentMessages: Message[] = [...messages];
    if (messages.length === 0 && topic) {
      currentMessages.push({ role: 'user', content: `【お題：${topic}】\n${userMsg}` });
    } else {
      currentMessages.push({ role: 'user', content: userMsg });
    }

    setMessages(currentMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages, persona }),
      });
      const data = await res.json();
      if (data.result) {
        setMessages([...currentMessages, { role: 'assistant', content: data.result }]);
      } else {
        alert('エラーが発生しました');
      }
    } catch (error) {
      alert('送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 代筆反論生成
  const handleGenerateAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentText.trim() || assistLoading) return;

    setAssistLoading(true);
    setReplies(null);

    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponentText, myStance }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplies(data);
      } else {
        alert('生成に失敗しました');
      }
    } catch (error) {
      alert('通信エラーが発生しました');
    } finally {
      setAssistLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* ヘッダー */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-widest text-gray-200">RESBA ARENA</h1>
          <p className="text-xs text-gray-500">レスバ特訓 & リアルタイム言い返し参謀</p>
        </div>

        {/* モード切り替え */}
        <div className="flex justify-center gap-2 border-b border-gray-800 pb-3">
          <button
            onClick={() => setMode('chat')}
            className={`px-4 py-1.5 rounded text-xs font-bold transition ${
              mode === 'chat'
                ? 'bg-gray-800 text-white border border-gray-600'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            VS AI特訓
          </button>
          <button
            onClick={() => setMode('assist')}
            className={`px-4 py-1.5 rounded text-xs font-bold transition ${
              mode === 'assist'
                ? 'bg-gray-800 text-white border border-gray-600'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            言い返す文を作る（参謀）
          </button>
        </div>

        {/* --- 対戦モード --- */}
        {mode === 'chat' && (
          <div className="space-y-4">
            
            {/* 性格選択 & お題生成ボタン */}
            <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">AIの性格:</span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'cynical', name: '冷笑' },
                    { id: 'logic', name: '論理' },
                    { id: 'provoke', name: '煽り' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      className={`px-2.5 py-1 text-xs rounded transition ${
                        persona === p.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* お題生成エリア */}
              <div className="flex gap-2 items-center pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleGenerateTopic}
                  disabled={topicLoading}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded border border-gray-700 whitespace-nowrap transition"
                >
                  {topicLoading ? '思考中...' : '🎲 お題をAIに決めてもらう'}
                </button>
                {topic && (
                  <div className="text-xs text-amber-400 truncate bg-gray-950 px-2.5 py-1 rounded border border-gray-800 flex-1">
                    お題: {topic}
                  </div>
                )}
              </div>
            </div>

            {/* チャットログ */}
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-[380px] overflow-y-auto space-y-3 text-sm">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                  メッセージまたはお題を設定してスタートしてください
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded px-3.5 py-2 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-gray-800 text-gray-100 border border-gray-700'
                          : 'bg-blue-950/40 text-blue-200 border border-blue-900/50'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="text-xs text-gray-500 animate-pulse">AIが言い返し中...</div>
                </div>
              )}
            </div>

            {/* 入力フォーム */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-4 py-2 rounded border border-gray-700 transition"
              >
                送信
              </button>
            </form>
          </div>
        )}

        {/* --- 参謀モード（言い返し作成） --- */}
        {mode === 'assist' && (
          <div className="space-y-4">
            <form onSubmit={handleGenerateAssist} className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">相手の発言:</label>
                <textarea
                  value={opponentText}
                  onChange={(e) => setOpponentText(e.target.value)}
                  placeholder="相手の言ってきた文章をここに貼り付け"
                  rows={3}
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">こちらのスタンス（任意）:</label>
                <input
                  type="text"
                  value={myStance}
                  onChange={(e) => setMyStance(e.target.value)}
                  placeholder="例: 無知さを突く、矛盾を指摘する"
                  className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={assistLoading}
                className="w-full bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700 text-blue-200 text-xs py-2 rounded transition"
              >
                {assistLoading ? '反論を作成中...' : '反論パターンを生成'}
              </button>
            </form>

            {replies && (
              <div className="space-y-3">
                {[
                  { key: 'cynical', label: '冷笑系', text: replies.cynical },
                  { key: 'logic', label: '論理派', text: replies.logic },
                  { key: 'provoke', label: '煽りマウント', text: replies.provoke },
                ].map(
                  (item) =>
                    item.text && (
                      <div key={item.key} className="bg-gray-900 border border-gray-800 p-3 rounded space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold">{item.label}</span>
                          <button
                            onClick={() => handleCopy(item.text!, item.key)}
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded text-gray-300 border border-gray-700 transition"
                          >
                            {copiedKey === item.key ? 'コピー済み' : 'コピー'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">{item.text}</p>
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}