-- Supabase(Postgres) 스키마
-- Supabase 대시보드 → SQL Editor에서 이 스크립트 실행

-- 최신 기상 데이터 (단일 행, 스크래퍼가 주기적으로 갱신)
CREATE TABLE IF NOT EXISTS weather_latest (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '[]',
  special_reports JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 기존 히스토리용 스냅샷
CREATE TABLE IF NOT EXISTS snapshots (
  id SERIAL PRIMARY KEY,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(timestamp)
);

CREATE TABLE IF NOT EXISTS weather_data (
  id SERIAL PRIMARY KEY,
  snapshot_id INT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  airport_code TEXT NOT NULL,
  airport_name TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weather_data_airport ON weather_data(airport_code);
CREATE INDEX IF NOT EXISTS idx_weather_data_snapshot ON weather_data(snapshot_id);

-- 최초 행 삽입
INSERT INTO weather_latest (id, data, special_reports, updated_at)
VALUES (1, '[]', '[]', NOW())
ON CONFLICT (id) DO NOTHING;
