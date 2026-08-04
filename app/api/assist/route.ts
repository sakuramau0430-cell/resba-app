import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { opponentText, myStance } = await req.json();

    const prompt = `
あなたはレスバのプロ参謀です。
ユーザーがSNSやチャットで「相手」と言い争っています。
相手の発言を叩き潰し、言い返すための反論文章を3パターン作成してください。

【相手の発言】
"${opponentText}"

【こちらの希望するスタンス・言い分】
"${myStance || '相手の論理破綻を突いて煽り返す'}"

【出力フォーマット】
以下のJSONフォーマットのみで出力してください。余計な解説や装飾は一切不要です。

{
  "cynical": "冷笑系パターン（うおｗ/〜で草 などを交えた短文脱力系反論）",
  "logic": "論理派パターン（相手の前提の矛盾や知識不足を鋭く詰める反論）",
  "provoke": "煽りマウントパターン（強気にレスバの主導権を握る煽り反論）"
}
`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: '生成に失敗しました' }, { status: 500 });
  }
}