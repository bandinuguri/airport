// Vercel에서는 Playwright를 사용할 수 없으므로 빈 배열 반환
// 상세 예보는 GitHub Actions 스크래퍼에서 수집하지 않음 (선택 사항)

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.status(200).json([]);
}
