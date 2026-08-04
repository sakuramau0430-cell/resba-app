import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Yahoo!リアルタイム検索のトレンド一覧ページを取得
    const res = await fetch('https://search.yahoo.co.jp/realtime', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const html = await res.text();

    // HTMLからトレンドキーワードを取り出す正規表現
    // Yahoo!のクラス名変更に柔軟に対応するため、aタグのクエリ文字列(p=...)から抽出
    const matches = html.match(/\/realtime\/search\?p=([^&"']+)/g);

    if (matches && matches.length > 0) {
      // 最初の検索リンクからキーワードを取得してデコード
      const rawKeyword = matches[0].replace('/realtime/search?p=', '');
      const topTrend = decodeURIComponent(rawKeyword);

      if (topTrend && topTrend !== 'undefined') {
        return NextResponse.json({ trend: topTrend, source: 'X (リアルタイム連動)' });
      }
    }

    throw new Error('Trend not found');
  } catch (error) {
    // 万が一失敗した場合のフォールバック
    return NextResponse.json({ trend: 'トレンド取得エラー', source: 'X (リアルタイム連動)' });
  }
}