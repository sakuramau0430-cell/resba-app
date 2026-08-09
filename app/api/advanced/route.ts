import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    if (action === 'judge') {
      const messages = payload.messages || [];
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

      // LLMによる判定呼び出し...（既存の判定コード）
      // 例として判定結果が以下のようになったとします
      const judgeResult = {
        winner: 'ユーザー',
        userScore: 85,
        aiScore: 60,
        userAdvice: '説得力のある論理展開でした。',
        fallacies: []
      };

      // ユーザーのスコアが80点以上なら「学習データ」として保存
      if (judgeResult.userScore >= 80 && lastUserMsg) {
        await supabase.from('learned_responses').insert([
          { content: lastUserMsg, score: judgeResult.userScore }
        ]);
      }

      return NextResponse.json(judgeResult);
    }

    // 観戦モード等その他の処理...
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}