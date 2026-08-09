'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

type Message = { role: 'user' | 'assistant'; content: string };
type WatchMessage = { speaker: '冷笑系AI' | '論理派AI' | '煽りマウントAI'; content: string };
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

  // --- 【音声入力・読み上げ】 ---
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef<any>(null);

  // --- 【反論参謀 & OCR】 ---
  const [opponentText, setOpponentText] = useState('');
  const [myStance, setMyStance] = useState('');
  const [replies, setReplies] = useState<{ cynical?: string; logic?: string; provoke?: string } | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // --- 【AI vs AI 観戦】 ---
  const [watchTopic, setWatchTopic] = useState('猫派vs犬派');
  const [watchLogs, setWatchLogs] = useState<WatchMessage[]>([]);
  const [watching, setWatching] = useState(false);
  const [watchJudgeResult, setWatchJudgeResult] = useState<JudgeResult | null>(null);
  const [watchJudgeLoading, setWatchJudgeLoading] = useState(false);

  // --- 【Xリアルタイムトレンド】 ---
  const [liveTrend, setLiveTrend] = useState<string>('取得中...');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  if (typeof window !== 'undefined') {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = true; // 途中経過も取得して応答性を上げる
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('マイクの使用許可が拒否されています。ブラウザのアドレスバー左側の鍵アイコンからマイクを許可してください。');
        } else if (event.error === 'no-speech') {
          // 音声が検出されなかった場合
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }
}, []);

  // 音声読み上げヘルパー
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // 前の読み上げを停止
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'ja-JP';
    uttr.rate = 1.1; // やや早口で煽り感を出す
    window.speechSynthesis.speak(uttr);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // 音声入力の初期化
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('お使いのブラウザは音声認識に対応していません（Chrome等をご利用ください）');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // リアルタイムトレンドの取得
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await fetch('/api/trend');
        const data = await res.json();
        if (data.trend) setLiveTrend(data.trend);
      } catch (e) {
        setLiveTrend('ストローマン論法');
      }
    };
    fetchTrend();
  }, []);

  // 会話リセット
  const handleResetChat = () => {
    stopSpeech();
    if (messages.length > 0 && !confirm('現在の会話履歴をリセットしますか？')) return;
    setMessages([]);
    setJudgeResult(null);
    setTopic('');
    setInput('');
    setWatchLogs([]);
    setWatchJudgeResult(null);
    setMode('chat');
  };

  // 画像ファイル処理
  const processImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

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
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          break;
        }
      }
    }
  };

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
      if (data.result) {
        setMessages([...newMessages, { role: 'assistant', content: data.result }]);
        if (autoSpeak) speakText(data.result);
      }
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
        if (autoSpeak) speakText(data.content);
      }
    } catch (e) {
      alert('観戦レスバの生成に失敗しました');
    } finally {
      setWatching(false);
    }
  };

  // AI vs AI 観戦の審判判定
  const handleWatchJudge = async () => {
    if (watchLogs.length === 0) return alert('まずはレスバを発生させてから判定を押してください');
    setWatchJudgeLoading(true);
    try {
      const mappedMessages = watchLogs.map((log) => ({
        role: (log.speaker.includes('冷笑') ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `[${log.speaker}] ${log.content}`,
      }));

      const res = await fetch('/api/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'judge', payload: { messages: mappedMessages } }),
      });
      const data = await res.json();
      setWatchJudgeResult(data);
    } catch (e) {
      alert('観戦レスバの判定に失敗しました');
    } finally {
      setWatchJudgeLoading(false);
    }
  };

  const getAISpeakerStyle = (speaker: string) => {
    if (speaker.includes('冷笑')) {
      return {
        border: 'border-blue-900/60 bg-blue-950/20',
        text: 'text-blue-400',
        badge: 'bg-blue-900/50 text-blue-300 border-blue-700',
        icon: '🧊',
      };
    } else if (speaker.includes('論理')) {
      return {
        border: 'border-emerald-900/60 bg-emerald-950/20',
        text: 'text-emerald-400',
        badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
        icon: '🤓',
      };
    } else {
      return {
        border: 'border-rose-900/60 bg-rose-950/20',
        text: 'text-rose-400',
        badge: 'bg-rose-900/50 text-rose-300 border-rose-700',
        icon: '🤬',
      };
    }
  };

  return (
    <main className="min-h-screen bg-black text-gray-100 flex justify-center font-sans">
      <div className="w-full max-w-[1200px] flex">
        
        {/* 左サイドバー */}
        <aside className="hidden md:flex flex-col w-64 p-4 border-r border-gray-800 h-screen sticky top-0 justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <span className="text-2xl font-black text-white tracking-wider">レスバ.AI</span>
            </div>

            <button
              onClick={handleResetChat}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
            >
              <span>✨</span> 新規レスバを開始
            </button>
            
            <nav className="space-y-1">
              {[
                { id: 'chat', label: '🥊 VS AI 特訓', desc: '1on1の対戦' },
                { id: 'assist', label: '🛡️ 反論参謀', desc: 'レスバの自動作成' },
                { id: 'watch', label: '🍿 AI観戦TV', desc: '自動対戦を鑑賞' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id as Mode)}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    mode === item.id ? 'bg-gray-800 font-bold text-white' : 'hover:bg-gray-900 text-gray-400'
                  }`}
                >
                  <div className="text-sm">{item.label}</div>
                  <div className="text-[10px] text-gray-500">{item.desc}</div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-bold">🔊 自動読み上げ</span>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="toggle cursor-pointer"
              />
            </div>
            <p className="text-gray-500 text-[11px]">AIのレスを音声で自動再生します。</p>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 max-w-[600px] border-r border-gray-800 flex flex-col min-h-screen">
          
          <header className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
            <div className="px-4 py-3 flex justify-between items-center">
              <h1 className="text-lg font-bold">レスバ・アリーナ X</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    autoSpeak ? 'bg-blue-950 border-blue-700 text-blue-300' : 'bg-gray-900 border-gray-800 text-gray-500'
                  }`}
                >
                  {autoSpeak ? '🔊 ON' : '🔇 OFF'}
                </button>
                <button
                  onClick={handleResetChat}
                  className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1"
                >
                  <span>🔄</span> リセット
                </button>
              </div>
            </div>
            
            <div className="flex md:hidden w-full border-b border-gray-800">
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

          {/* モード 1: VS AI 特訓 */}
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

                <div className="flex gap-2 items-center flex-wrap">
                  <button onClick={handleGenerateTopic} disabled={topicLoading} className="bg-blue-500 hover:bg-blue-600 text-xs px-3 py-1.5 rounded-full font-bold text-white transition">
                    🎲 お題自動生成
                  </button>
                  <button onClick={handleJudge} disabled={judgeLoading} className="bg-purple-600 hover:bg-purple-700 text-xs px-3 py-1.5 rounded-full font-bold text-white transition">
                    ⚖️ 審判に採点してもらう
                  </button>
                </div>

                {topic && <div className="text-xs text-amber-400 bg-gray-900 p-2 rounded">お題: {topic}</div>}

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

              {/* 対話ログ */}
              <div className="flex-1 overflow-y-auto bg-black p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-600 text-xs py-10">メッセージを入力するか「お題自動生成」を押して開始！</div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs shrink-0">
                        {m.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="flex-1 text-sm bg-gray-900 p-3 rounded-xl border border-gray-800 whitespace-pre-wrap relative group">
                        {m.content}
                        <button
                          onClick={() => speakText(m.content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-white transition"
                          title="読み上げ"
                        >
                          🔊
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 flex gap-2 items-center">
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`p-2 rounded-full border transition shrink-0 ${
                    isListening ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                  }`}
                  title="音声入力"
                >
                  🎙️
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? '音声聞き取り中...' : '主張を入力...'}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none"
                />
                <button type="submit" disabled={loading} className="bg-blue-500 text-xs px-5 py-2.5 rounded-full font-bold text-white shrink-0">
                  送信
                </button>
              </form>
            </div>
          )}

          {/* モード 2: 反論参謀 */}
          {mode === 'assist' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-950/30' : 'border-gray-800 bg-gray-950'
                }`}
              >
                <p className="text-xs text-gray-400 mb-2">
                  📷 画像をここにドラッグ＆ドロップ または <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-200">Ctrl + V</kbd> で貼り付け
                </p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-gray-400" />
                {ocrLoading && <div className="text-xs text-blue-400 animate-pulse mt-2">画像から文字を読み取り中...</div>}
              </div>

              <form onSubmit={handleGenerateAssist} className="space-y-3">
                <textarea
                  value={opponentText}
                  onChange={(e) => setOpponentText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="相手の発言を入力（スクショのドラッグ＆ドロップ・貼り付けにも対応）"
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
                    <div key={i} className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-1 relative group">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-blue-400">{item.label}</div>
                        {item.text && (
                          <button onClick={() => speakText(item.text!)} className="text-xs text-gray-400 hover:text-white">
                            🔊 読み上げ
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* モード 3: AI vs AI 観戦 */}
          {mode === 'watch' && (
            <div className="flex-1 flex flex-col p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={watchTopic}
                    onChange={(e) => setWatchTopic(e.target.value)}
                    placeholder="観戦する議論テーマ"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button onClick={handleNextWatchStep} disabled={watching} className="bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded-full text-xs font-bold text-white transition">
                    {watching ? 'レスバ中...' : '次のレスを観戦 🍿'}
                  </button>
                </div>

                {watchLogs.length > 1 && (
                  <button
                    onClick={handleWatchJudge}
                    disabled={watchJudgeLoading}
                    className="w-full bg-purple-700 hover:bg-purple-600 text-xs py-2 rounded-xl font-bold text-white transition flex items-center justify-center gap-1"
                  >
                    ⚖️ レスバ勝敗を判定する
                  </button>
                )}
              </div>

              {watchJudgeResult && (
                <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-purple-300 text-sm">🏆 勝者: {watchJudgeResult.winner}</div>
                  <div className="text-gray-300">{watchJudgeResult.userAdvice}</div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 bg-black">
                {watchLogs.length === 0 ? (
                  <div className="text-center text-gray-600 text-xs py-10">「次のレスを観戦」を押してAI同士のレスバを開始</div>
                ) : (
                  watchLogs.map((log, idx) => {
                    const style = getAISpeakerStyle(log.speaker);
                    return (
                      <div key={idx} className={`border ${style.border} p-3.5 rounded-2xl space-y-1.5 transition-all relative group`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${style.text} flex items-center gap-1`}>
                            <span>{style.icon}</span> {log.speaker}
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => speakText(log.content)} className="text-xs text-gray-400 hover:text-white">
                              🔊
                            </button>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${style.badge}`}>
                              AI対戦
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">{log.content}</p>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

        </div>

        {/* 右サイドバー */}
        <aside className="hidden lg:flex flex-col w-80 p-4 space-y-4 h-screen sticky top-0 overflow-y-auto">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-sm text-white flex items-center justify-between">
              <span>🔥 トレンドのレスバ</span>
              <span className="text-[10px] font-normal bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            </h2>

            <div className="space-y-2.5">
              <div
                onClick={() => {
                  setTopic(liveTrend);
                  setMode('chat');
                }}
                className="text-xs cursor-pointer bg-blue-950/30 border border-blue-900/50 hover:bg-blue-900/40 p-2 rounded-xl transition space-y-0.5"
              >
                <div className="text-blue-400 text-[10px] font-bold flex justify-between">
                  <span>X (Twitter) 最新トレンド</span>
                  <span className="text-gray-500">クリックでお題にセット</span>
                </div>
                <div className="font-bold text-white text-sm">#{liveTrend}</div>
              </div>

              {[
                { tag: 'ストローマン論法', count: '1,240ポスト' },
                { tag: 'AI vs 人間議論', count: '850ポスト' },
                { tag: 'きのこの山 vs たけのこの里', count: '3,120ポスト' },
                { tag: 'ひろゆき構文', count: '540ポスト' },
              ].map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setTopic(t.tag);
                    setMode('chat');
                  }}
                  className="text-xs cursor-pointer hover:bg-gray-900 p-1.5 rounded-lg transition"
                >
                  <div className="text-gray-500 text-[10px]">日本のトレンド</div>
                  <div className="font-bold text-gray-200">#{t.tag}</div>
                  <div className="text-gray-500 text-[10px]">{t.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-sm text-white">🏆 本日の論破王AI</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-gray-900 p-2 rounded-lg">
                <span className="font-bold text-amber-400">1位 🤓 論理派AI</span>
                <span className="text-gray-400">勝率 88%</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900 p-2 rounded-lg">
                <span className="font-bold text-gray-300">2位 😏 冷笑系AI</span>
                <span className="text-gray-400">勝率 74%</span>
              </div>
              <div className="flex justify-between items-center bg-gray-900 p-2 rounded-lg">
                <span className="font-bold text-amber-700">3位 🤬 煽りマウントAI</span>
                <span className="text-gray-400">勝率 51%</span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}