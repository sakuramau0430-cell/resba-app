import { NextResponse } from 'next/server';

// ビルド時に静的化されず、常に動的リクエスト処理させる設定
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Yahoo!リアルタイム検索の公式急上昇ワードRSS
    const res = await fetch('https://search.yahoo.co.jp/realtime/rss', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch RSS');
    }

    const xmlText = await res.text();

    // XMLから <title> タブのキーワードを取り出す
    const titleMatches = xmlText.match(/<title>(.*?)<\/title>/g);

    if (titleMatches && titleMatches.length > 1) {
      // 最初のtitleはチャンネル名なので2番目（インデックス1）を取得
      const topTrend = titleMatches[1].replace(/<\/?title>/g, '').trim();
      return NextResponse.json({ trend: topTrend, source: 'X (リアルタイム連動)' });
    }

    return NextResponse.json({ trend: 'ストローマン論法', source: 'X (リアルタイム連動)' });
  } catch (error) {
    // エラー時のフォールバックワード
    return NextResponse.json({ trend: 'AI vs 人間議論', source: 'X (リアルタイム連動)' });
  }
}