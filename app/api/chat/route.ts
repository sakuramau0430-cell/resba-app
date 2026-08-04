import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, persona } = body;

    // messagesが配列でない場合の安全策
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    }

    // 性格ごとのシステムプロンプト
    let systemPrompt = "あなたはレスバのプロです。相手の主張を煽りつつ論破してください。";
    if (persona === 'cynical') {
      systemPrompt = "あなたは冷笑系のレスバプレイヤーです。「〜で草」「うおｗ」などを使い、相手を冷ややかに見下して短い文章で煽ってください。";
    } else if (persona === 'logic') {
      systemPrompt = "あなたは論理派のレスバプレイヤーです。相手の論理的破綻や矛盾を鋭く突いて説教するように詰め寄ってください。";
    } else if (persona === 'provoke') {
      systemPrompt = "あなたは超強気な煽りマウント系のレスバプレイヤーです。相手の知識不足や頭の悪さを強烈に煽り倒してください。";
    }

    // APIへ送るメッセージ配列を作成
    const formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: String(m.content),
      })),
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: formattedMessages,
    });

    const result = response.choices[0]?.message?.content || '返信の生成に失敗しました';
    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}