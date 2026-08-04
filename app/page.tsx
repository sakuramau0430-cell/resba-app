'use client';

import { useState, useRef, useEffect } from 'react';

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- 【参謀（反論生成）モード用】 ---
  const [opponentText, setOpponentText] = useState('');
  const [myStance, setMyStance] = useState('');
  const [replies, setReplies] = useState<{ cynical?: string; logic?: string; provoke?: string } | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // オートスクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // お題の自動生成
  const handleGenerateTopic = async () => {
    setTopicLoading(true);
    setTopic('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'レスバ用の議論を呼ぶ短めのお題（例：「きのこvsたけのこ」「残業は悪か」）を1つ提案して。解説不要。' }],
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
    
    let contentToSend = userMsg;
    if (messages.length === 0 && topic) {
      contentToSend = `【お題：${topic}】\n${userMsg}`;
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: contentToSend }];
    setMessages(newMessages);
    setLoading(true);

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

  // アイコン描画用
  const BotIcon = () => (
    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl">🤖</div>
  );
  const UserIcon = () => (
    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xl text-white font-bold">👤</div>
  );

  return (
    // X風ダークモード背景
    <main className="min-h-screen bg-black text-gray-100 flex justify-center font-sans antialiased">
      {/* メインコンテナ（Xのタイムライン幅） */}
      <div className="w-full max-w-[600px] border-x border-gray-800 flex flex-col">
        
        {/* ヘッダー（固定） */}
        <header className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold tracking-tight">レスバ・アリーナ X</h1>
          </div>
          
          {/* X風モード切り替えタブ */}
          <div className="flex w-full border-b border-gray-800">
            <button onClick={() => setMode('chat')} className="flex-1 flex justify-center hover:bg-gray-900 transition">
              <div className={`py-3.5 px-2 text-sm font-bold relative ${mode === 'chat' ? 'text-white' : 'text-gray-500'}`}>
                VS AI 特訓
                {mode === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></div>}
              </div>
            </button>
            <button onClick={() => setMode('assist')} className="flex-1 flex justify-center hover:bg-gray-900 transition">
              <div className={`py-3.5 px-2 text-sm font-bold relative ${mode === 'assist' ? 'text-white' : 'text-gray-500'}`}>
                反論参謀（代筆）
                {mode === 'assist' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></div>}
              </div>
            </button>
          </div>
        </header>

        {/* --- 【VS AI 特訓モード】 --- */}
        {mode === 'chat' && (
          <div className="flex-1 flex flex-col">
            {/* 設定エリア（ポスト入力欄風） */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-300">AIの性格を選択:</span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'cynical', name: '冷笑' },
                    { id: 'logic', name: '論理' },
                    { id: 'provoke', name: '煽り' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      className={`px-4 py-1 text-xs rounded-full font-bold transition border ${
                        persona === p.id
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-gray-600 hover:bg-gray-900'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-2 items-center">
                <BotIcon />
                <button
                  onClick={handleGenerateTopic}
                  disabled={topicLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-50 transition"
                >
                  {topicLoading ? '思考中...' : '🎲 お題をAIに決めてもらう'}
                </button>
                {topic && (
                  <div className="flex-1 text-sm text-amber-400 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 truncate">
                    お題: {topic}
                  </div>
                )}
              </div>
            </div>

            {/* チャットタイムライン */}
            <div className="flex-1 overflow-y-auto bg-black">
              {messages.length === 0 ? (
                <div className="p-10 text-center text-gray-600 text-sm">
                  メッセージまたはお題を設定してレスバを開始
                </div>
              ) : (
                messages.map((m, idx) => (
                  // Xのポスト風レイアウト
                  <div key={idx} className="flex gap-3 p-4 border-b border-gray-800 hover:bg-gray-950/50 transition">
                    {m.role === 'user' ? <UserIcon /> : <BotIcon />}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {m.role === 'user' ? 'あなた' : `レスバAI (${
                            persona === 'cynical' ? '冷笑' : persona === 'logic' ? '論理' : '煽り'
                          })`}
                        </span>
                        <span className="text-xs text-gray-600">@{m.role}</span>
                      </div>
                      <p className="text-[15px] leading-normal text-gray-100 whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-3 p-4 border-b border-gray-800 animate-pulse">
                  <BotIcon />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 入力フォーム（下部固定） */}
            <form onSubmit={handleSendMessage} className="sticky bottom-0 bg-black border-t border-gray-800 p-3 flex gap-2 z-10">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="返信をツイート (主張を入力)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white text-sm font-bold px-5 py-2 rounded-full transition disabled:opacity-60"
              >
                Refly
              </button>
            </form>
          </div>
        )}

        {/* --- 【参謀モード（反論生成）】 --- */}
        {mode === 'assist' && (
          <div className="flex-1 overflow-y-auto bg-black p-4 space-y-6">
            {/* 入力フォーム（ポスト投稿風） */}
            <form onSubmit={handleGenerateAssist} className="flex gap-3">
              <UserIcon />
              <div className="flex-1 space-y-4">
                <textarea
                  value={opponentText}
                  onChange={(e) => setOpponentText(e.target.value)}
                  placeholder="相手のポスト（発言）をここに貼り付け..."
                  rows={4}
                  className="w-full bg-transparent text-lg text-white placeholder-gray-600 resize-none focus:outline-none"
                  required
                />
                <div className="border-t border-gray-800 pt-3">
                  <input
                    type="text"
                    value={myStance}
                    onChange={(e) => setMyStance(e.target.value)}
                    placeholder="こちらのスタンス（任意。例: 論理的矛盾を突く）"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={assistLoading || !opponentText.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-full disabled:opacity-50 transition"
                  >
                    {assistLoading ? '生成中...' : '反論パターンを生成'}
                  </button>
                </div>
              </div>
            </form>

            {/* 生成結果（リプライチェーン風） */}
            {replies && (
              <div className="border-t border-gray-800 pt-5 space-y-5">
                <h2 className="text-sm font-bold text-gray-500 px-2">【AI参謀による反論案】</h2>
                
                {[
                  { key: 'cynical', label: '😏 冷笑系', text: replies.cynical, handle: '@cynical_bot' },
                  { key: 'logic', label: '🤓 論理派', text: replies.logic, handle: '@logic_bot' },
                  { key: 'provoke', label: '🤬 煽りマウント', text: replies.provoke, handle: '@mad_bot' },
                ].map(
                  (item) =>
                    item.text && (
                      <div key={item.key} className="flex gap-3 p-4 bg-gray-950/50 rounded-2xl border border-gray-800 hover:border-gray-700 transition">
                        <BotIcon />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{item.label}</span>
                              <span className="text-xs text-gray-600">{item.handle}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(item.text!, item.key)}
                              className={`px-3 py-1 text-xs rounded-full font-bold transition ${
                                copiedKey === item.key
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-black hover:bg-gray-200'
                              }`}
                            >
                              {copiedKey === item.key ? '✅ コピーした' : '📋 コピー'}
                            </button>
                          </div>
                          <p className="text-[15px] leading-normal text-gray-100 whitespace-pre-wrap">{item.text}</p>
                        </div>
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