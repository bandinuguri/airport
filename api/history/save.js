import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(200).json({ success: false, error: 'Supabase not configured' });
  }

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      body = [];
    }
    if (!Array.isArray(body) || body.length === 0) {
      return res.status(200).json({ success: false, error: 'No weather data provided' });
    }

    const supabase = createClient(url, key);
    const now = new Date();
    const timestamp = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const created_at = now.toISOString();

    const { data: snap, error: snapErr } = await supabase
      .from('snapshots')
      .insert({ timestamp, created_at })
      .select('id')
      .single();

    if (snapErr || !snap) {
      return res.status(200).json({ success: false, error: snapErr?.message || 'Failed to create snapshot' });
    }

    const rows = body.map((item) => ({
      snapshot_id: snap.id,
      airport_code: item.code || item.icao || 'UNKNOWN',
      airport_name: item.name || item.airportName || 'Unknown',
      data_json: JSON.stringify(item),
    }));

    const { error: dataErr } = await supabase.from('weather_data').insert(rows);
    if (dataErr) {
      return res.status(200).json({ success: false, error: dataErr.message });
    }
    return res.status(200).json({ success: true, snapshot_id: snap.id });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e.message) });
  }
}
