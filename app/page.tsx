'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Home() {
  // モード切り替え ('chat' = 対戦モード, 'assist' = 代筆参謀モード)
  const [activeTab, setActiveTab] = useState<'chat' | 'assist'>('chat');

  // --- 【対戦モード用ステート】 ---
  const [persona, setPersona] = useState('cynical');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // --- 【代筆（参謀）モード用ステート】 ---
  const [opponentText, setOpponentText] = useState('');
  const [myStance, setMyStance] = useState('');
  const [replies, setReplies] = useState<{ cynical?: string; logic?: string; provoke?: string } | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1対1チャット送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, persona }),
      });
      const data = await res.json();
      if (data.result) {
        setMessages([...newMessages, { role: 'assistant', content: data.result }]);
      } else {
        alert('エラーが発生しました');
      }
    } catch (error) {
      console.error(error);
      alert('送信に失敗しました');
    } finally {
      setChatLoading(false);
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
      console.error(error);
      alert('通信エラーが発生しました');
    } finally {
      setAssistLoading(false);
    }
  };

  // テキストコピー機能
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-red-500 flex items-center justify-center gap-2">
            🔥 レスバ・アリーナ 🔥
          </h1>
          <p className="text-sm text-slate-400">
            レスバAIとの特訓、または実戦で使える最強反論ジェネレーター
          </p>
        </header>

        {/* タブ切り替え */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🥊 AIと対戦特訓
          </button>
          <button
            onClick={() => setActiveTab('assist')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'assist'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🛡️ リアルタイム反論生成（参謀）
          </button>
        </div>

        {/* TAB 1: AIと対戦モード */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            {/* 性格選択 */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
              <label className="text-xs font-bold text-slate-400 block">AIの性格を選択:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cynical', name: '😏 冷笑系' },
                  { id: 'logic', name: '🤓 論理派' },
                  { id: 'provoke', name: '🤬 煽りマウント' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`py-2 px-3 rounded-lg text-xs md:text-sm font-bold border transition ${
                      persona === p.id
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* チャット履歴 */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-[400px] overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  煽り文や主張を入力してレスバを開始してください
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-red-600 text-white rounded-br-none'
                          : 'bg-slate-700 text-slate-100 rounded-bl-none border border-slate-600'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-400 text-xs px-4 py-2 rounded-2xl animate-pulse">
                    レスバAIが煽り文を思考中...
                  </div>
                </div>
              )}
            </div>

            {/* 入力フォーム */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="主張や発言を入力... (例: 猫が好き)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 text-white placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
              >
                送信
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: 代筆参謀モード */}
        {activeTab === 'assist' && (
          <div className="space-y-6">
            <form onSubmit={handleGenerateAssist} className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  1. 相手の発言（SNSのレスや対戦相手の主張を入力） <span className="text-red-400">*必須</span>
                </label>
                <textarea
                  value={opponentText}
                  onChange={(e) => setOpponentText(e.target.value)}
                  placeholder="例: 歴史なんて過去のことだし学ぶ意味なくね？"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  2. あなたの立場・言い返したい方向性（任意）
                </label>
                <input
                  type="text"
                  value={myStance}
                  onChange={(e) => setMyStance(e.target.value)}
                  placeholder="例: 歴史を知らない無知さを突く / 過去の失敗から学ぶ重要性を語る"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={assistLoading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg"
              >
                {assistLoading ? '最強の言い返し文を生成中...' : '⚡ 反論の弾幕を生成する'}
              </button>
            </form>

            {/* 生成結果の表示 */}
            {replies && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400">【生成された反論案】（タップでコピー）</h2>
                
                {[
                  { key: 'cynical', label: '😏 冷笑系パターン', text: replies.cynical },
                  { key: 'logic', label: '🤓 論理論破パターン', text: replies.logic },
                  { key: 'provoke', label: '🤬 煽りマウントパターン', text: replies.provoke },
                ].map(
                  (item) =>
                    item.text && (
                      <div
                        key={item.key}
                        className="bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 transition space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-red-400">{item.label}</span>
                          <button
                            onClick={() => handleCopy(item.text!, item.key)}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md text-slate-200 transition"
                          >
                            {copiedKey === item.key ? '✅ コピー完了！' : '📋 コピー'}
                          </button>
                        </div>
                        <p className="text-sm text-slate-100 whitespace-pre-wrap">{item.text}</p>
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