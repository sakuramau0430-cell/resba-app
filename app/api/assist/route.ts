import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages, persona } = await req.json();

    // 性格ごとのシステムプロンプト
    let systemPrompt = "あなたはレスバのプロです。相手の主張を煽りつつ論破してください。";
    if (persona === 'cynical') {
      systemPrompt = "あなたは冷笑系のレスバプレイヤーです。「〜で草」「うおｗ」などを使い、相手を冷ややかに見下して短い文章で煽ってください。";
    } else if (persona === 'logic') {
      systemPrompt = "あなたは論理派のレスバプレイヤーです。相手の論理的破綻や矛盾を鋭く突いて説教するように詰め寄ってください。";
    } else if (persona === 'provoke') {
      systemPrompt = "あなたは超強気な煽りマウント系のレスバプレイヤーです。相手の知識不足や頭の悪さを強烈に煽り倒してください。";
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // ←ここがこの文字列になっているか確認！
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    });

    const result = response.choices[0]?.message?.content || '返信の生成に失敗しました';
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}