import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'レスバ・アリーナ X | AIと戦うレスバ特訓＆反論自動生成アプリ',
  description: 'AIとの1on1レスバ特訓、相手の煽り文句やスクショ画像からの反論作成、AI同士の議論観戦ができるレスバ支援ツール。',
  keywords: ['レスバ', 'AI', '反論作成', '議論', '論理的思考', 'ひろゆき構文'],
  openGraph: {
    title: 'レスバ・アリーナ X | AIレスバ特訓＆反論作成',
    description: 'AIとの1on1レスバ特訓やスクショ画像からの反論作成ができるアプリ。',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}