import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { messages, persona } = await req.json();

    // DBから高得点だった過去のプレイヤー発言を上位5件取得
    const { data: learnedData } = await supabase
      .from('learned_responses')
      .select('content')
      .order('score', { ascending: false })
      .limit(5);

    const learnedPhrases = learnedData && learnedData.length > 0
      ? learnedData.map(d => `- "${d.content}"`).join('\n')
      : '（まだ学習データが少ないため、通常の論理で対戦せよ）';

    const systemInstruction = `
あなたはレスバ専門の強靭なAIです。
【重要：過去の対戦結果からの学習データ】
以下は、過去の人間プレイヤーが使用して審判から高評価を得た効果的なレスバフレーズ・論理展開です。
これらの言い回しや煽り構造、返し技を学習・分析し、より逃げ道のない強力なレスバを展開してください。

--- 学習したプレイヤーの技 ---
${learnedPhrases}
------------------------------

現在のペルソナ（性格）: ${persona}
`;

    // この systemInstruction を含めて Gemini / OpenAI 等の API を呼び出す処理...

    return NextResponse.json({ result: "AIのレスポンス..." });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}