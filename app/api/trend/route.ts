import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Yahoo!リアルタイム検索のトレンド一覧を取得
    const res = await fetch('https://search.yahoo.co.jp/realtime', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 300 }, // 5分間キャッシュ
    });

    const html = await res.text();
    
    // トレンドワード抽出（簡易正規表現）
    const matches = html.match(/class="[^"]*Ranking_title__[^"]*"[^>]*>([^<]+)</g);

    if (matches && matches.length > 0) {
      // 最初のトレンドワードを取得して整形
      const topTrend = matches[0].replace(/<[^>]+>/g, '').trim();
      return NextResponse.json({ trend: topTrend, source: 'X (リアルタイム連動)' });
    }

    return NextResponse.json({ trend: '最新トレンド取得中', source: 'X (リアルタイム連動)' });
  } catch (error) {
    return NextResponse.json({ trend: 'AI vs 人間議論', source: 'X (リアルタイム連動)' });
  }
}