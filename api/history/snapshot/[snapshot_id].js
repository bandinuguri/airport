import { createClient } from '@supabase/supabase-js';

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

  // Vercel: 동적 경로 /api/history/snapshot/123 → query 또는 URL에서 추출
  let snapshot_id = req.query.snapshot_id;
  if (!snapshot_id && req.url) {
    const match = req.url.match(/\/snapshot\/([^/?#]+)/);
    if (match) snapshot_id = match[1];
  }
  if (!snapshot_id) {
    return res.status(400).json({ error: 'snapshot_id required' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(200).json([]);
  }

  try {
    const supabase = createClient(url, key);
    const { data: rows, error } = await supabase
      .from('weather_data')
      .select('data_json')
      .eq('snapshot_id', Number(snapshot_id))
      .order('airport_name');
    if (error) return res.status(200).json([]);
    const list = (rows || []).map((r) => {
      try {
        return JSON.parse(r.data_json);
      } catch {
        return null;
      }
    }).filter(Boolean);
    return res.status(200).json(list);
  } catch (e) {
    return res.status(200).json([]);
  }
}
