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
    const { data, error } = await supabase
      .from('snapshots')
      .select('id, timestamp, created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(200).json([]);
    return res.status(200).json(data || []);
  } catch (e) {
    return res.status(200).json([]);
  }
}
