'use client';

import { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';

type Message = { role: 'user' | 'assistant'; content: string };
type WatchMessage = { speaker: '冷笑系AI' | '論理派AI'; content: string };
type Mode = 'chat' | 'assist' | 'watch';

type JudgeResult = {
  winner?: string;
  userScore?: number;
  aiScore?: number;
  userAdvice?: string;
  fallacies?: string[];
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('chat');

  // --- 【VS AI 特訓 & 審判】 ---
  const [persona, setPersona] = useState('cynical');
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);

  // --- 【反論参謀 & OCR】 ---
  const [opponentText, setOpponentText] = useState('');
  const [myStance, setMyStance] = useState('');
  const [replies, setReplies] = useState<{ cynical?: string; logic?: string; provoke?: string } | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // --- 【AI vs AI 観戦】 ---
  const [watchTopic, setWatchTopic] = useState('猫派vs犬派');
  const [watchLogs, setWatchLogs] = useState<WatchMessage[]>([]);
  const [watching, setWatching] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, watchLogs]);

  // お題生成
  const handleGenerateTopic = async () => {
    setTopicLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'レスバ用のお題を1つ短く提案して（解説不要）。' }],
          persona: 'logic',
        }),
      });
      const data = await res.json();
      if (data.result) setTopic(data.result.replace(/^「|」$/g, '').trim());
    } catch (e) {
      alert('お題の取得に失敗しました');
    } finally {
      setTopicLoading(false);
    }
  };

  // チャット送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    let contentToSend = userMsg;
    if (messages.length === 0 && topic) contentToSend = `【お題：${topic}】\n${userMsg}`;

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
      if (data.result) setMessages([...newMessages, { role: 'assistant', content: data.result }]);
    } catch (e) {
      alert('送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 審判判定
  const handleJudge = async () => {
    if (messages.length === 0) return alert('まずはレスバをしてから判定を押してください');
    setJudgeLoading(true);
    try {
      const res = await fetch('/api/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'judge', payload: { messages } }),
      });
      const data = await res.json();
      setJudgeResult(data);
    } catch (e) {
      alert('判定に失敗しました');
    } finally {
      setJudgeLoading(false);
    }
  };

  // スクショ画像から文字読み取り（OCR）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      const worker = await createWorker('jpn');
      const ret = await worker.recognize(file);
      setOpponentText(ret.data.text.replace(/\s+/g, ' '));
      await worker.terminate();
    } catch (err) {
      alert('画像の読み取りに失敗しました');
    } finally {
      setOcrLoading(false);
    }
  };

  // 反論生成
  const handleGenerateAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentText.trim() || assistLoading) return;
    setAssistLoading(true);
    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponentText, myStance }),
      });
      const data = await res.json();
      setReplies(data);
    } catch (e) {
      alert('生成に失敗しました');
    } finally {
      setAssistLoading(false);
    }
  };

  // AI vs AI 観戦ステップ進行
  const handleNextWatchStep = async () => {
    setWatching(true);
    try {
      const res = await fetch('/api/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'watch', payload: { topic: watchTopic, history: watchLogs } }),
      });
      const data = await res.json();
      if (data.speaker && data.content) {
        setWatchLogs((prev) => [...prev, data]);
      }
    } catch (e) {
      alert('観戦レスバの生成に失敗しました');
    } finally {
      setWatching(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-gray-100 flex justify-center font-sans">
      <div className="w-full max-w-[600px] border-x border-gray-800 flex flex-col">
        
        {/* ヘッダー */}
        <header className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
          <div className="px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold">レスバ・アリーナ X</h1>
          </div>
          
          {/* タブ切り替え */}
          <div className="flex w-full border-b border-gray-800">
            {(['chat', 'assist', 'watch'] as Mode[]).map((tab) => (
              <button key={tab} onClick={() => setMode(tab)} className="flex-1 hover:bg-gray-900 transition">
                <div className={`py-3 text-xs font-bold relative ${mode === tab ? 'text-white' : 'text-gray-500'}`}>
                  {tab === 'chat' ? 'VS AI 特訓' : tab === 'assist' ? '反論参謀' : 'AI観戦TV'}
                  {mode === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </header>

        {/* --- 1. VS AI 特訓 モード --- */}
        {mode === 'chat' && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">AI性格:</span>
                <div className="flex gap-1.5">
                  {['cynical', 'logic', 'provoke'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPersona(p)}
                      className={`px-3 py-1 text-xs rounded-full font-bold border ${
                        persona === p ? 'bg-white text-black' : 'bg-black text-white border-gray-700'
                      }`}
                    >
                      {p === 'cynical' ? '冷笑' : p === 'logic' ? '論理' : '煽り'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <button onClick={handleGenerateTopic} disabled={topicLoading} className="bg-blue-500 text-xs px-3 py-1.5 rounded-full font-bold text-white">
                  🎲 お題自動生成
                </button>
                <button onClick={handleJudge} disabled={judgeLoading} className="bg-purple-600 text-xs px-3 py-1.5 rounded-full font-bold text-white">
                  ⚖️ 審判に採点してもらう
                </button>
              </div>

              {topic && <div className="text-xs text-amber-400 bg-gray-900 p-2 rounded">お題: {topic}</div>}

              {/* 審判結果表示 */}
              {judgeResult && (
                <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-purple-300">⚖️ 判定結果: {judgeResult.winner}</div>
                  <div>スコア - あなた: {judgeResult.userScore}点 | AI: {judgeResult.aiScore}点</div>
                  <div className="text-gray-300">{judgeResult.userAdvice}</div>
                  {judgeResult.fallacies && judgeResult.fallacies.length > 0 && (
                    <div className="text-red-400">検出された詭弁: {judgeResult.fallacies.join(', ')}</div>
                  )}
                </div>
              )}
            </div>

            {/* チャット対戦ログ */}
            <div className="flex-1 overflow-y-auto bg-black p-4 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">
                    {m.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="flex-1 text-sm bg-gray-900 p-3 rounded-xl border border-gray-800 whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="主張を入力..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none"
              />
              <button type="submit" disabled={loading} className="bg-blue-500 text-xs px-5 py-2 rounded-full font-bold text-white">
                送信
              </button>
            </form>
          </div>
        )}

        {/* --- 2. 反論参謀 & スクショ読み込み --- */}
        {mode === 'assist' && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 block">📷 スクショ（画像）から文字を自動読み込み:</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-gray-400" />
              {ocrLoading && <div className="text-xs text-blue-400 animate-pulse">画像から文字を読み取り中...</div>}
            </div>

            <form onSubmit={handleGenerateAssist} className="space-y-3">
              <textarea
                value={opponentText}
                onChange={(e) => setOpponentText(e.target.value)}
                placeholder="相手の発言を入力（またはスクショ読み込み）"
                rows={4}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white focus:outline-none"
                required
              />
              <input
                type="text"
                value={myStance}
                onChange={(e) => setMyStance(e.target.value)}
                placeholder="こちらのスタンス（任意）"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
              <button type="submit" disabled={assistLoading} className="w-full bg-blue-500 py-2.5 rounded-full text-xs font-bold text-white">
                {assistLoading ? '生成中...' : '反論＆詭弁分析を生成'}
              </button>
            </form>

            {replies && (
              <div className="space-y-3 pt-2">
                {[
                  { label: '😏 冷笑系', text: replies.cynical },
                  { label: '🤓 論理派', text: replies.logic },
                  { label: '🤬 煽りマウント', text: replies.provoke },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-1">
                    <div className="text-xs font-bold text-blue-400">{item.label}</div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 3. AI vs AI 観戦モード --- */}
        {mode === 'watch' && (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={watchTopic}
                onChange={(e) => setWatchTopic(e.target.value)}
                placeholder="観戦する議論テーマ"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <button onClick={handleNextWatchStep} disabled={watching} className="bg-red-600 px-4 py-1.5 rounded-full text-xs font-bold text-white">
                {watching ? 'レスバ中...' : '次のレスを観戦 🍿'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 bg-black">
              {watchLogs.length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-10">「次のレスを観戦」を押してAI同士のレスバを開始</div>
              ) : (
                watchLogs.map((log, idx) => (
                  <div key={idx} className="bg-gray-950 border border-gray-800 p-3 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-amber-400">{log.speaker}</div>
                    <p className="text-sm text-gray-200">{log.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}