'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  likes: number;
  reposts: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  views: number;
  quoteContent?: string;
};

type JudgeResult = {
  winner: string;
  playerScore: number;
  aiScore: number;
  reason: string;
};

type Persona = 'cynical' | 'logic' | 'provoke' | 'default';

type Stats = {
  wins: number;
  losses: number;
  draws: number;
  personaWins: Record<Persona, number>;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<Message | null>(null);

  // セットアップ状態
  const [isStarted, setIsStarted] = useState(false);
  const [persona, setPersona] = useState<Persona>('cynical');
  const [topicType, setTopicType] = useState<'custom' | 'ai'>('custom');
  const [topicInput, setTopicInput] = useState('');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);

  // 戦績データ（localStorage連携）
  const [stats, setStats] = useState<Stats>({
    wins: 0,
    losses: 0,
    draws: 0,
    personaWins: { cynical: 0, logic: 0, provoke: 0, default: 0 },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初回読み込み時にlocalStorageから戦績を復元
  useEffect(() => {
    const savedStats = localStorage.getItem('resba_stats');
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, judgeResult, loading]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // AIにお題を生成させる
  const generateAITopic = async () => {
    setIsGeneratingTopic(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTopicGenerate: true }),
      });
      const data = await res.json();
      if (data.topic) {
        setTopicInput(data.topic);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  // レスバ開始処理
  const startBattle = async () => {
    if (!topicInput.trim()) return;

    setIsStarted(true);
    const initialUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: topicInput,
      likes: Math.floor(Math.random() * 30),
      reposts: Math.floor(Math.random() * 10),
      views: Math.floor(Math.random() * 100) + 50,
    };

    setMessages([initialUserMessage]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: topicInput }],
          isJudge: false,
          persona: persona,
        }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages([
          initialUserMessage,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.reply,
            likes: Math.floor(Math.random() * 20),
            reposts: Math.floor(Math.random() * 5),
            views: Math.floor(Math.random() * 200) + 100,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      likes: 0,
      reposts: 0,
      views: Math.floor(Math.random() * 50) + 10,
      quoteContent: quoteTarget ? quoteTarget.content : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setQuoteTarget(null);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          isJudge: false,
          persona: persona,
        }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages([
          ...newMessages,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.reply,
            likes: Math.floor(Math.random() * 20),
            reposts: Math.floor(Math.random() * 5),
            views: Math.floor(Math.random() * 200) + 100,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 審判判定＆勝率の保存
  const getJudge = async () => {
    if (messages.length === 0 || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          isJudge: true,
        }),
      });
      const data: JudgeResult = await res.json();
      setJudgeResult(data);

      // 戦績の更新
      const newStats = { ...stats };
      if (data.winner === 'あなた') {
        newStats.wins += 1;
        newStats.personaWins[persona] = (newStats.personaWins[persona] || 0) + 1;
      } else if (data.winner === 'AI') {
        newStats.losses += 1;
      } else {
        newStats.draws += 1;
      }
      setStats(newStats);
      localStorage.setItem('resba_stats', JSON.stringify(newStats));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setJudgeResult(null);
    setInput('');
    setQuoteTarget(null);
    setIsStarted(false);
    setTopicInput('');
  };

  const toggleLike = (id: string) => {
    setMessages(
      messages.map((m) => {
        if (m.id === id) {
          const isLiked = !m.isLiked;
          return { ...m, isLiked, likes: isLiked ? m.likes + 1 : m.likes - 1 };
        }
        return m;
      })
    );
  };

  const toggleRepost = (id: string) => {
    setMessages(
      messages.map((m) => {
        if (m.id === id) {
          const isReposted = !m.isReposted;
          return { ...m, isReposted, reposts: isReposted ? m.reposts + 1 : m.reposts - 1 };
        }
        return m;
      })
    );
    setActiveMenuId(null);
  };

  const handleQuote = (message: Message) => {
    setQuoteTarget(message);
    setActiveMenuId(null);
    inputRef.current?.focus();
  };

  const toggleBookmark = (id: string) => {
    setMessages(
      messages.map((m) => {
        if (m.id === id) {
          return { ...m, isBookmarked: !m.isBookmarked };
        }
        return m;
      })
    );
  };

  // 通算試合数と勝率計算
  const totalBattles = stats.wins + stats.losses + stats.draws;
  const winRate = totalBattles > 0 ? Math.round((stats.wins / totalBattles) * 100) : 0;

  return (
    <div className="flex justify-center min-h-screen bg-black text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      <div className="flex w-full max-w-7xl">
        {/* ================= 左サイドバー（ナビゲーション ＆ 通算統計） ================= */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-zinc-800 p-4 sticky top-0 h-screen justify-between shrink-0">
          <div className="space-y-6">
            {/* ロゴ */}
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-xl text-white">
                𝕏
              </div>
              <div>
                <h1 className="font-extrabold text-base leading-tight">レスバ・アリーナ</h1>
                <p className="text-xs text-zinc-500">@resba_arena</p>
              </div>
            </div>

            {/* 新規バトルボタン */}
            {isStarted && (
              <button
                onClick={resetChat}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-extrabold py-3 rounded-full text-sm transition-all shadow-lg shadow-sky-500/20"
              >
                新規バトルを開始
              </button>
            )}

            {/* 通算戦績サマリー */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏆</span> 通算バトル統計
              </h3>

              <div className="flex items-baseline justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs text-zinc-400">通算勝率</span>
                <span className="text-2xl font-black text-amber-400">{winRate}%</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-black/50 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">勝利</div>
                  <div className="text-sm font-bold text-emerald-400">{stats.wins}</div>
                </div>
                <div className="bg-black/50 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">敗北</div>
                  <div className="text-sm font-bold text-rose-400">{stats.losses}</div>
                </div>
                <div className="bg-black/50 p-2 rounded-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">引分</div>
                  <div className="text-sm font-bold text-zinc-400">{stats.draws}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-600 px-3">
            © 2026 Resba Arena AI • Llama 3.3
          </div>
        </aside>

        {/* ================= 中央メインエリア（タイムライン） ================= */}
        <main className="flex-1 max-w-2xl border-x border-zinc-800 flex flex-col min-h-screen">
          {/* ヘッダー */}
          <header className="border-b border-zinc-800 bg-black/80 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <div>
              <h1 className="text-base font-bold leading-tight">ポスト</h1>
              <p className="text-xs text-zinc-500">リプライバトル・タイムライン</p>
            </div>
            {isStarted && (
              <button
                onClick={resetChat}
                className="lg:hidden text-xs font-bold bg-white hover:bg-zinc-200 text-black px-3.5 py-1.5 rounded-full transition-all"
              >
                新規
              </button>
            )}
          </header>

          {/* 1. スタートモーダル */}
          {!isStarted ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-zinc-950/50">
              <div className="max-w-md w-full bg-black border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl mx-auto mb-2">
                    ⚔️
                  </div>
                  <h2 className="text-xl font-black text-white">レスバの設定</h2>
                  <p className="text-xs text-zinc-500">AIの性格とお題を設定して勝負を開始しよう</p>
                </div>

                {/* 性格選択 */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">1. AIの性格を選択</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cynical', name: '😏 うおｗ冷笑系', desc: '「うおｗ」「どわーｗ」「〜で草」' },
                      { id: 'logic', name: '🤓 論理破綻キラー', desc: '淡々とロジックで追い詰める' },
                      { id: 'provoke', name: '🔥 煽りマウント', desc: '煽りとマウント全開' },
                      { id: 'default', name: '💬 標準AI', desc: 'バランスの取れたレスバ' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersona(p.id as Persona)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          persona === p.id
                            ? 'bg-sky-500/10 border-sky-500 text-white'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-xs mb-1">{p.name}</div>
                        <div className="text-[10px] text-zinc-500 line-clamp-1">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* お題選択 */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400">2. お題の決定方法</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTopicType('custom');
                        setTopicInput('');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        topicType === 'custom'
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      自分で入力
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTopicType('ai');
                        generateAITopic();
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        topicType === 'ai'
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      🤖 AIに決めさせる
                    </button>
                  </div>

                  <div className="mt-3">
                    {topicType === 'custom' ? (
                      <textarea
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        placeholder="主張やお題を入力（例：猫は犬よりも優れています。）"
                        rows={3}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <div className="relative">
                        <textarea
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          placeholder={isGeneratingTopic ? 'お題を生成中...' : '生成されたお題...'}
                          rows={3}
                          disabled={isGeneratingTopic}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-sky-500 pr-10"
                        />
                        <button
                          onClick={generateAITopic}
                          disabled={isGeneratingTopic}
                          className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                          title="別のお題を生成"
                        >
                          🔄
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={startBattle}
                  disabled={!topicInput.trim() || isGeneratingTopic}
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-extrabold py-3.5 rounded-full text-sm disabled:opacity-40 transition-all shadow-lg shadow-sky-500/20"
                >
                  レスバを開始する ⚔️
                </button>
              </div>
            </div>
          ) : (
            /* 2. タイムライン表示 */
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <article key={m.id} className="p-4 hover:bg-zinc-950/20 transition-colors relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isUser ? 'bg-sky-500 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isUser ? 'YOU' : 'AI'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">
                          {isUser ? 'あなた' : 'レスバAI'}
                        </span>
                        <span className="text-zinc-500 text-xs">
                          {isUser ? '@you' : '@resba_ai'}
                        </span>
                      </div>
                    </div>

                    <p className="text-base text-zinc-100 leading-relaxed whitespace-pre-wrap break-words mb-3">
                      {m.content}
                    </p>

                    {m.quoteContent && (
                      <div className="mb-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-400">
                        <div className="font-bold text-zinc-300 mb-1">引用されたポスト</div>
                        <p className="line-clamp-2">{m.quoteContent}</p>
                      </div>
                    )}

                    <div className="text-xs text-zinc-500 border-t border-zinc-800/60 pt-3 pb-2 flex items-center gap-1.5">
                      <span>午後5:58</span>
                      <span>·</span>
                      <span>2026年8月4日</span>
                      <span>·</span>
                      <span className="font-bold text-zinc-200">{m.views}</span>
                      <span>件の表示</span>
                    </div>

                    {/* アクションバー */}
                    <div className="border-y border-zinc-800 py-1.5 flex justify-around items-center text-zinc-500 text-xs select-none relative">
                      <button
                        onClick={() => inputRef.current?.focus()}
                        className="hover:text-sky-400 flex items-center gap-1.5 group transition-colors px-2 py-1"
                      >
                        <div className="p-1 rounded-full group-hover:bg-sky-500/10">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M1.751 10c0-4.42 3.584-8 8-8h4.5c4.416 0 8 3.58 8 8 0 4.42-3.584 8-8 8h-1.427l-4.22 3.618A1 1 0 017 20.865V18H9.75c3.314 0 6-2.686 6-6s-2.686-6-6-6h-4.5c-3.314 0-6 2.686-6 6 0 2.22 1.206 4.16 3.001 5.188l-.75 2.5C2.868 18.23 1.751 14.422 1.751 10z" />
                          </svg>
                        </div>
                        {i > 0 && <span>{i}</span>}
                      </button>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === m.id ? null : m.id);
                          }}
                          className={`flex items-center gap-1.5 group transition-colors px-2 py-1 ${
                            m.isReposted ? 'text-green-500' : 'hover:text-green-500'
                          }`}
                        >
                          <div className="p-1 rounded-full group-hover:bg-green-500/10">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
                            </svg>
                          </div>
                          {m.reposts > 0 && <span>{m.reposts}</span>}
                        </button>

                        {activeMenuId === m.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-20"
                          >
                            <button
                              onClick={() => toggleRepost(m.id)}
                              className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4 fill-current text-zinc-300" viewBox="0 0 24 24">
                                <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 20.12l-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14z" />
                              </svg>
                              {m.isReposted ? 'リポスト取消' : 'リポスト'}
                            </button>
                            <button
                              onClick={() => handleQuote(m)}
                              className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors border-t border-zinc-800"
                            >
                              <svg className="w-4 h-4 fill-current text-zinc-300" viewBox="0 0 24 24">
                                <path d="M14.25 2.5a.75.75 0 00-.75.75v3.75H3.75A1.75 1.75 0 002 8.75v10.5c0 .966.784 1.75 1.75 1.75h10.5A1.75 1.75 0 0016 19.25V15.5h3.75a.75.75 0 00.75-.75V3.25a.75.75 0 00-.75-.75h-5.5z" />
                              </svg>
                              引用する
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => toggleLike(m.id)}
                        className={`flex items-center gap-1.5 group transition-colors px-2 py-1 ${
                          m.isLiked ? 'text-pink-600' : 'hover:text-pink-600'
                        }`}
                      >
                        <div className="p-1 rounded-full group-hover:bg-pink-500/10">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            {m.isLiked ? (
                              <path d="M12 21.638h-.014C9.403 21.59 1.95 14.851 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z" />
                            ) : (
                              <path d="M16.697 2.25c-2.29 0-3.83 1.58-4.646 2.73-.814-1.15-2.355-2.73-4.645-2.73-2.878 0-5.404 2.69-5.404 5.755 0 6.376 7.454 13.11 10.037 13.157H12c2.583-.047 10.037-6.781 10.037-13.157 0-3.065-2.526-5.755-5.34-5.755zm-4.697 17.28C9.492 17.45 3.95 12.01 3.95 8.005c0-2.02 1.63-3.755 3.454-3.755 1.77 0 3.09 1.48 3.596 2.21l1.002 1.44 1.002-1.44c.505-.73 1.825-2.21 3.595-2.21 1.824 0 3.455 1.735 3.455 3.755 0 4.005-5.542 9.446-8.055 11.525z" />
                            )}
                          </svg>
                        </div>
                        {m.likes > 0 && <span>{m.likes}</span>}
                      </button>

                      <button
                        onClick={() => toggleBookmark(m.id)}
                        className={`hover:text-sky-400 group transition-colors px-2 py-1 ${
                          m.isBookmarked ? 'text-sky-500' : ''
                        }`}
                      >
                        <div className="p-1 rounded-full group-hover:bg-sky-500/10">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M4 4.5C4 3.12 5.12 2 6.5 2h11C18.88 2 20 3.12 20 4.5v16.78l-7.22-4.82a1.25 1.25 0 00-1.56 0L4 21.28V4.5z" />
                          </svg>
                        </div>
                      </button>

                      <button className="hover:text-sky-400 group transition-colors px-2 py-1">
                        <div className="p-1 rounded-full group-hover:bg-sky-500/10">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41L7.71 9.71 6.3 8.29 12 2.59zM21 15v5c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-5h2v5h14v-5h2z" />
                          </svg>
                        </div>
                      </button>
                    </div>
                  </article>
                );
              })}

              {loading && !judgeResult && (
                <article className="p-4 flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-rose-950 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-sm text-zinc-300">レスバAI</span>
                      <span className="text-xs text-zinc-500">入力中...</span>
                    </div>
                    <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-zinc-800 rounded w-1/2" />
                  </div>
                </article>
              )}

              {/* 審判判定 */}
              {judgeResult && (
                <div className="p-4 bg-zinc-900/90 border-y border-amber-500/50 my-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-3">
                    <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
                      ⚖️ 審判AIによる判定結果
                    </span>
                  </div>

                  <div className="bg-black/80 rounded-xl p-4 border border-zinc-800">
                    <div className="text-center font-extrabold text-base text-white mb-3">
                      勝者: <span className="text-amber-400">{judgeResult.winner}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center mb-3">
                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-xs text-zinc-400 mb-1">YOU</div>
                        <div className="text-xl font-black text-sky-400">{judgeResult.playerScore} pt</div>
                      </div>
                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-xs text-zinc-400 mb-1">AI</div>
                        <div className="text-xl font-black text-rose-400">{judgeResult.aiScore} pt</div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed border-t border-zinc-800 pt-3">
                      {judgeResult.reason}
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* フッター入力エリア */}
          {isStarted && (
            <footer className="border-t border-zinc-800 bg-black p-3 sticky bottom-0 z-10 shrink-0">
              <div className="space-y-2">
                {quoteTarget && (
                  <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-800">
                    <span className="truncate">引用元: "{quoteTarget.content}"</span>
                    <button
                      onClick={() => setQuoteTarget(null)}
                      className="text-zinc-500 hover:text-white font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={quoteTarget ? '引用コメントを追加...' : '@resba_ai に返信...'}
                    disabled={loading || !!judgeResult}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim() || !!judgeResult}
                    className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-5 py-2 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                  >
                    返信
                  </button>
                </form>

                {messages.length > 1 && !judgeResult && (
                  <button
                    onClick={getJudge}
                    disabled={loading}
                    className="w-full bg-zinc-900 hover:bg-amber-950/30 border border-amber-500/40 text-amber-400 text-xs font-bold py-2 rounded-full transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>⚖️</span> 参った！審判に判定させる
                  </button>
                )}
              </div>
            </footer>
          )}
        </main>

        {/* ================= 右サイドバー（詳細スタッツ ＆ 対戦状態） ================= */}
        <aside className="hidden xl:flex flex-col w-80 border-l border-zinc-800 p-4 sticky top-0 h-screen space-y-4 shrink-0 overflow-y-auto">
          {/* 対戦中カード */}
          {isStarted ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
                  LIVE BATTLE
                </span>
                <span className="text-xs text-zinc-500 font-bold">{messages.length} ターン経過</span>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 mb-0.5">対戦相手の性格</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  {persona === 'cynical' && '😏 冷笑系（うおｗ）'}
                  {persona === 'logic' && '🤓 論理破綻キラー'}
                  {persona === 'provoke' && '🔥 煽りマウント'}
                  {persona === 'default' && '💬 標準AI'}
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-2">
                <div className="text-[10px] text-zinc-500 mb-1">現在のお題</div>
                <p className="text-xs text-zinc-300 font-medium line-clamp-3 bg-black/40 p-2.5 rounded-xl border border-zinc-800/50">
                  {messages[0]?.content || '設定中...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 text-center text-xs text-zinc-500">
              対戦を開始すると、ここにリアルタイムの戦況が表示されます ⚔️
            </div>
          )}

          {/* 性格別勝ち星（攻略率） */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span> 性格別・撃破（勝利）数
            </h3>

            <div className="space-y-2.5">
              {[
                { id: 'cynical', name: '😏 冷笑系', count: stats.personaWins.cynical || 0 },
                { id: 'logic', name: '🤓 論理破綻キラー', count: stats.personaWins.logic || 0 },
                { id: 'provoke', name: '🔥 煽りマウント', count: stats.personaWins.provoke || 0 },
                { id: 'default', name: '💬 標準AI', count: stats.personaWins.default || 0 },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                  <span className="font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {item.count} 撃破
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* おすすめトレンド風お題情報 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              🔥 人気のレスバテーマ
            </h3>
            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="hover:text-sky-400 cursor-pointer transition-colors">
                ・「きのこの山」VS「たけのこの里」
              </li>
              <li className="hover:text-sky-400 cursor-pointer transition-colors">
                ・「プログラミングに数学は必要か」
              </li>
              <li className="hover:text-sky-400 cursor-pointer transition-colors">
                ・「猫と犬、どちらが優れたペットか」
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}