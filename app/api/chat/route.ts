import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages = [], isJudge = false, isTopicGenerate = false, persona = 'cynical' } = body;

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('API Error: GROQ_API_KEYが設定されていません。');
      return NextResponse.json(
        { error: 'GROQ_API_KEYが設定されていません。.env.local を確認してください。' },
        { status: 500 }
      );
    }

    // 1. AIにお題を生成させる処理
    if (isTopicGenerate) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'SNS（X）で激しいレスバが発生しそうな、物議を醸すお題・主張を1つだけ考えて出力してください。説明や前置きは一切不要で、お題のテキスト（20〜40文字程度）のみを出力してください。',
            },
            {
              role: 'user',
              content: 'レスバのお題を1つ生成してください。',
            },
          ],
          temperature: 0.9,
        }),
      });

      const data = await response.json();
      const topic = data.choices?.[0]?.message?.content?.trim() || 'きのこの山はたけのこの里の完全上位互換である';
      return NextResponse.json({ topic });
    }

    // 2. 性格ごとのシステムプロンプトを設定
    let personaInstruction = '';

    // 全性格共通のレスバ対立ルール
    const stanceRule = `
【最重要：レスバの立ち位置ルール】
- ユーザーの主張・感情・好みの**「真逆（反対の立場）」**に立ち、対立軸を明確にしてください。
  - 例：ユーザーが「猫が好き」なら、AIは「猫より犬派/猫の短所を突く」立場。
  - 例：ユーザーが「歴史はおもんない」なら、AIは「歴史はめちゃくちゃ面白い/歴史を知らない愚かさ」を主張する立場。
- 相手の発言（ユーザー）の立場を絶対に横取り・同意しないでください。
- 「なぜ相手の主張が間違っているのか（なぜ自分の立場が正しいのか）」の**明確な理由や根拠**を1つ入れて反論してください。
`;

    if (persona === 'cynical') {
      personaInstruction = `
あなたはネット（Xや5ちゃんねる等）の「真の冷笑系レスバター」です。
${stanceRule}
【口調・スタイル】
- 「うおｗ」「どわーｗ」「〜で草」「〇〇なの笑う」「ワロタ」などのネットスラングを1〜2回適度に使用する。
- ユーザーの主張の真逆の立場から、「うおｗ 〜とか言ってるの浅すぎて草」「どわーｗ 〜の面白さ分からんとか人生損しててワロタ」のように脱力感たっぷりに冷笑・煽り倒す。
- 文字数は1〜3文程度の短文。
`;
    } else if (persona === 'logic') {
      personaInstruction = `
あなたは「論理破綻キラーレスバAI」です。
${stanceRule}
【口調・スタイル】
- ユーザーの主張と真逆の立場を徹底的に論理防衛し、ユーザーの主張の矛盾や知識不足を淡々と詰めてください。
`;
    } else if (persona === 'provoke') {
      personaInstruction = `
あなたは「煽り・マウント特化レスバAI」です。
${stanceRule}
【口調・スタイル】
- ユーザーの主張と真逆の立場から、「〜の良さも分からないの雑魚すぎて草」「思考停止してて草」とマウントを取って煽り倒してください。
`;
    } else {
      personaInstruction = `
あなたはSNSのレスバ対話AIです。
${stanceRule}
ユーザーの主張と真逆の立場に立ち、鋭く反論してください。
`;
    }

    const systemInstruction = isJudge
      ? `あなたは辛口で非常に厳格なレスバ審判AIです。
これまでの対話履歴を分析し、どちらの主張がより論理的・説得力があったか、または相手を言い負かしていたかを判定してください。

【判定の絶対ルール】
1. 「引き分け」は原則禁止です。微小な差（1点差など）であっても、必ず「あなた」か「AI」のどちらかを勝者（winner）に選んでください。
2. 判定基準：
   - 主張の一貫性と論理性
   - 相手の論点の崩し方・手返しの鋭さ
   - 煽りに屈せずロジックを通せたか、または煽りで相手を完全に論破したか
3. スコアは僅差（例：51 pt vs 49 pt や 65 pt vs 60 pt）で厳格につけてください。

返答は以下のJSONフォーマットのみで出力してください。余計な解説やコードブロックは一切含めないでください。

{"winner": "あなた" | "AI", "playerScore": 0から100の数値, "aiScore": 0から100の数値, "reason": "どちらのどの発言が勝敗を分けたのか、辛口かつ具体的に判定した理由（100文字程度）"}`
      : personaInstruction;

    // 過去の対話履歴を整形
    const formattedMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: formattedMessages,
        response_format: isJudge ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API Error Response:', data);
      return NextResponse.json({ error: data.error?.message || 'Groq APIエラーが発生しました。' }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || '';

    if (isJudge) {
      const judgeData = JSON.parse(text);
      return NextResponse.json(judgeData);
    } else {
      return NextResponse.json({ reply: text });
    }
  } catch (e) {
    console.error('Server Internal Error:', e);
    return NextResponse.json({ error: 'サーバー内部エラーが発生しました。' }, { status: 500 });
  }
}