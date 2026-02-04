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

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(200).json([]);
  }

  try {
    const supabase = createClient(url, key);
    const { data: row } = await supabase.from('weather_latest').select('special_reports').eq('id', 1).single();
    const list = Array.isArray(row?.special_reports) ? row.special_reports : [];
    return res.status(200).json(list);
  } catch (e) {
    return res.status(200).json([]);
  }
}
