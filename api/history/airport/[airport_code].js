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

  // Vercel: 동적 경로 /api/history/airport/RKSI → query 또는 URL에서 추출
  let airport_code = req.query.airport_code;
  if (!airport_code && req.url) {
    const match = req.url.match(/\/airport\/([^/?#]+)/);
    if (match) airport_code = decodeURIComponent(match[1]);
  }
  if (!airport_code) {
    return res.status(400).json({ error: 'airport_code required' });
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
      .select('snapshot_id, data_json, snapshots(timestamp, created_at)')
      .eq('airport_code', airport_code)
      .order('snapshot_id', { ascending: false });
    if (error) return res.status(200).json([]);

    const history = (rows || []).map((r) => {
      try {
        const data = JSON.parse(r.data_json);
        const snap = r.snapshots || {};
        data.snapshot_timestamp = snap.timestamp;
        data.snapshot_created_at = snap.created_at;
        return data;
      } catch {
        return null;
      }
    }).filter(Boolean);
    return res.status(200).json(history);
  } catch (e) {
    return res.status(200).json([]);
  }
}
