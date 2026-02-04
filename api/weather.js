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
    return res.status(200).json({ data: [], error: 'Supabase not configured', cached: false, last_updated: null });
  }

  try {
    const supabase = createClient(url, key);
    const { data: row, error } = await supabase
      .from('weather_latest')
      .select('data, special_reports, updated_at')
      .eq('id', 1)
      .single();

    if (error || !row) {
      return res.status(200).json({ data: [], error: error?.message || 'No data', cached: false, last_updated: null });
    }

    const data = Array.isArray(row.data) ? row.data : [];
    const lastUpdated = row.updated_at ? new Date(row.updated_at).toISOString() : null;
    return res.status(200).json({
      data,
      special_reports: row.special_reports || [],
      error: null,
      cached: true,
      last_updated: lastUpdated,
    });
  } catch (e) {
    return res.status(200).json({ data: [], error: String(e.message), cached: false, last_updated: null });
  }
}
