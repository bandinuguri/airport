import './styles/amo.css';
import { Plane, RefreshCw, Info, Loader2, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi, saveWeatherSnapshot } from './services/apiService';
import { AirportWeather } from './types';

const CACHE_KEY = 'aviation_weather_cache_v2';

interface CacheData {
  timestamp: number;
  data: AirportWeather[];
  lastUpdated: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<AirportWeather[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>('');
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  const formatUpdateTimestamp = (date: Date = new Date()) => {
    const yy = date.getFullYear().toString().slice(-2);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `갱신 ${yy}.${m}.${d}. ${hh}:${mm}`;
  };

  const runCollectionModule = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      setRefreshSuccess(false);

      const result = await fetchWeatherFromApi({ force });
      const weatherData = result.data;

      if (weatherData && weatherData.length > 0) {
        const updateStr = result.lastUpdated
          ? formatUpdateTimestamp(new Date(result.lastUpdated))
          : formatUpdateTimestamp();
        setData(weatherData);
        setLastUpdatedStr(updateStr);

        const cacheObject: CacheData = {
          timestamp: Date.now(),
          data: weatherData,
          lastUpdated: updateStr
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));

        // Auto-save to history only when server actually refreshed (not cached)
        if (force && result.cached === false) {
          try {
            await saveWeatherSnapshot(weatherData);
            console.log('Weather snapshot saved to history');
          } catch (err) {
            console.warn('Failed to save snapshot:', err);
          }
        }

        // Show success feedback
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);

        // If server returned a warning (e.g., refresh throttled), surface it as a soft error banner
        if (result.warning) setError(result.warning);
      } else {
        throw new Error("데이터를 수집하지 못했습니다.");
      }
    } catch (err: any) {
      console.error("API Call Error:", err);
      setError(err.message || "기상 정보를 가져오는 중 오류가 발생했습니다.");

      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CacheData;
        if (data.length === 0) {
          setData(parsed.data);
          setLastUpdatedStr(parsed.lastUpdated);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [data.length]);

  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CacheData;
        setData(parsed.data);
        setLastUpdatedStr(parsed.lastUpdated);
      } catch (e) {
        // ignore parse error
      }
    }
    // Always ask server for the shared latest value on load
    runCollectionModule(false);
  }, []);

  return (
    <div className="amo-container">
      <header>
        <div className="header-title-group">
          <div className="header-icon">
            <a onClick={() => (window as any).navigateTo('/history')} style={{ cursor: 'pointer' }} title="히스토리 조회">
              <Plane size={24} fill="currentColor" />
            </a>
          </div>
          <div className="header-info">
            <h1>전국 공항 실시간 기상</h1>
            <span>{lastUpdatedStr || formatUpdateTimestamp()}</span>
          </div>
        </div>
        <button
          className="refresh-btn"
          onClick={() => runCollectionModule(true)}
          disabled={loading}
          title="새로고침"
          style={{
            backgroundColor: refreshSuccess ? '#10b981' : undefined,
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? (
            <RefreshCw size={18} className="spin" />
          ) : refreshSuccess ? (
            <Check size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </header>

      <div className="info-banner">
        <Info size={18} />
        <span>
          최신 기상정보는 해당 공항 클릭하여 확인, 특보는 <a href="https://www.weather.go.kr/w/special-report/overall.do" target="_blank" rel="noreferrer" className="info-link">기상특보</a> 클릭 (<a href="https://amo.kma.go.kr/" target="_blank" rel="noreferrer" className="info-link">항공기상청</a>, <a href="https://www.weather.go.kr/" target="_blank" rel="noreferrer" className="info-link">날씨 누리</a>) / 갱신은 10분 마다 사용 가능
        </span>
      </div>

      <div className="animate-fade">
        {error && (
          <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '16px', color: '#b91c1c', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        <WeatherTable weatherData={data} isLoading={loading && data.length === 0} />
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '40px', color: '#94a3b8', fontSize: '0.75rem' }}>
        © 2026 Aviation Weather Dashboard. Powered by Local Scraper API
      </div>
    </div>
  );
};

export default App;
