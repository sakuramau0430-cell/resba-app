import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    // 1. AIレスバ審判（判定・採点）
    if (action === 'judge') {
      const { messages } = payload;
      const prompt = `
以下のレスバのログを判定・採点してください。
ログ: ${JSON.stringify(messages)}

JSON形式のみで出力してください（解説やバックティック等は一切不要）：
{
  "winner": "ユーザー" または "AI" または "引き分け",
  "userScore": 85,
  "aiScore": 80,
  "userAdvice": "ユーザーへのアドバイスや良かった点",
  "fallacies": ["検出された詭弁（例: ストローマン論法、人身攻撃など）"]
}`;

      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = res.choices[0]?.message?.content || '{}';
      return NextResponse.json(JSON.parse(content));
    }

    // 2. AI vs AI 観戦（レスバ進行）
    if (action === 'watch') {
      const { topic, history } = payload;
      const prompt = `
お題: "${topic}"
これまでの議論ログ:
${history.map((h: { speaker: string; content: string }) => `${h.speaker}: ${h.content}`).join('\n')}

次に発言するAI（冷笑派 または 論理派）の返信を生成してください。
相手の矛盾を突きつつ、短くレスバしてください。

JSON形式のみで出力してください：
{
  "speaker": "冷笑系AI" または "論理派AI",
  "content": "発言内容"
}`;

      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = res.choices[0]?.message?.content || '{}';
      return NextResponse.json(JSON.parse(content));
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Advanced API Error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}