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

  // /api/forecast/RKSI → ICAO 코드 추출
  let icao = req.query.icao;
  if (!icao && req.url) {
    const match = req.url.match(/\/forecast\/([^/?#]+)/);
    if (match) icao = decodeURIComponent(match[1]);
  }
  if (!icao) {
    return res.status(400).json({ error: 'icao required' });
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('airport_forecast_3day')
      .select('data')
      .eq('airport_code', icao)
      .single();

    if (error || !data) {
      // 해당 공항 데이터가 없으면 빈 배열
      return res.status(200).json([]);
    }

    // scripts/run_scraper_to_db.py 에서 json.dumps(forecast_data)로 넣은 그대로가 data.data 에 저장돼 있음
    const forecasts = Array.isArray(data.data) ? data.data : [];
    return res.status(200).json(forecasts);
  } catch (e) {
    console.error('forecast API error:', e);
    return res.status(200).json([]);
  }
}
