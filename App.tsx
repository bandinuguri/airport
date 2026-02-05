import './styles/amo.css';
import { Plane, RefreshCw, Info, Loader2, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi, saveWeatherSnapshot } from './services/apiService';
import { AirportWeather } from './types';

const CACHE_KEY = 'aviation_weather_cache_v3'; // 캐시 키 업데이트

interface CacheData {
  timestamp: number;
  data: AirportWeather[];
  specialReports: any[]; // 특보 데이터 추가
  lastUpdated: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<AirportWeather[]>([]);
  const [specialReports, setSpecialReports] = useState<any[]>([]); // 특보 상태 추가
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
      const reports = result.special_reports || []; // 결과에서 특보 추출

      if (weatherData && weatherData.length > 0) {
        const updateStr = result.lastUpdated
          ? formatUpdateTimestamp(new Date(result.lastUpdated))
          : formatUpdateTimestamp();
        
        setData(weatherData);
        setSpecialReports(reports); // 특보 데이터 저장
        setLastUpdatedStr(updateStr);

        const cacheObject: CacheData = {
          timestamp: Date.now(),
          data: weatherData,
          specialReports: reports,
          lastUpdated: updateStr
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));

        if (force && result.cached === false) {
          try {
            await saveWeatherSnapshot(weatherData);
          } catch (err) {
            console.warn('Failed to save snapshot:', err);
          }
        }

        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);

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
          setSpecialReports(parsed.specialReports || []);
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
        setSpecialReports(parsed.specialReports || []);
        setLastUpdatedStr(parsed.lastUpdated);
      } catch (e) {}
    }
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
          {loading ? <RefreshCw size={18} className="spin" /> : refreshSuccess ? <Check size={18} /> : <RefreshCw size={18} />}
        </button>
      </header>

      <div className="info-banner">
        <Info size={18} />
        <span>
          최신 기상정보는 해당 공항 클릭 확인, 특보는 <a href="https://www.weather.go.kr/w/special-report/overall.do" target="_blank" rel="noreferrer" className="info-link">기상특보</a> 클릭 / 갱신은 10분 마다 사용 가능
        </span>
      </div>

      <div className="animate-fade">
        {error && (
          <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '16px', color: '#b91c1c', marginBottom: '24px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        
        {/* WeatherTable에 specialReports 전달 */}
        <WeatherTable 
          weatherData={data} 
          specialReports={specialReports} 
          isLoading={loading && data.length === 0} 
        />
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '40px', color: '#94a3b8', fontSize: '0.75rem' }}>
        © 2026 Aviation Weather Dashboard. Powered by Local Scraper API
      </div>
    </div>
  );
};

export default App;
