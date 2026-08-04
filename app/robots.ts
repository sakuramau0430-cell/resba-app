import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://resba-app.vercel.app/', // ★ご自身のアプリURLに変更してください
  };
}