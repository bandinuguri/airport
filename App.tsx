import './styles/amo.css';
import { Plane, RefreshCw, Info, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi, saveWeatherSnapshot } from './services/apiService';
import { AirportWeather } from './types';

const CACHE_KEY = 'aviation_weather_cache_v3';

interface CacheData {
  timestamp: number;
  data: AirportWeather[];
  specialReports: any[];
  lastUpdated: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<AirportWeather[]>([]);
  const [specialReports, setSpecialReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>('');
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  // 날짜 포맷팅 함수 (초기 로딩 시 사용)
  const formatUpdateTimestamp = (dateInput: any) => {
    if (!dateInput) return "갱신 중...";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return typeof dateInput === 'string' ? dateInput : "갱신 중...";
    }
    const yy = date.getFullYear().toString().slice(-2);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${yy}.${m}.${d}. ${hh}:${mm}`;
  };

  const runCollectionModule = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      setRefreshSuccess(false);

      // 1. API 호출 (force 옵션 전달)
      const result = await fetchWeatherFromApi({ force });
      
      if (result.data && result.data.length > 0) {
        // 2. DB에서 넘어온 원본 시간을 포맷팅
        const newUpdateStr = formatUpdateTimestamp(result.lastUpdated);
        
        // 3. 상태 업데이트 (이 부분이 실행되어야 화면 시간이 바뀝니다)
        setData(result.data);
        setSpecialReports(result.special_reports || []);
        setLastUpdatedStr(`갱신 ${newUpdateStr}`);

        // 4. 로컬 스토리지 캐시 갱신
        const cacheObject: CacheData = {
          timestamp: Date.now(),
          data: result.data,
          specialReports: result.special_reports || [],
          lastUpdated: `갱신 ${newUpdateStr}`
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));

        if (force) {
          setRefreshSuccess(true);
          setTimeout(() => setRefreshSuccess(false), 2000);
          // 스냅샷 저장 (선택 사항)
          await saveWeatherSnapshot(result.data).catch(e => console.warn(e));
        }
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("데이터를 갱신할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드: 캐시 확인 후 API 호출
  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CacheData;
        setData(parsed.data);
        setSpecialReports(parsed.specialReports || []);
        setLastUpdatedStr(parsed.lastUpdated);
      } catch (e) {
        console.error("Cache load error");
      }
    }
    // 캐시가 있더라도 최신 데이터를 위해 호출 (새로고침 버튼 누른 것과 같은 효과)
    runCollectionModule(false); 
  }, [runCollectionModule]);

  return (
    <div className="amo-container">
      <header>
        <div className="header-title-group">
          <div className="header-icon">
             <Plane size={24} fill="currentColor" onClick={() => (window as any).navigateTo('/history')} style={{cursor:'pointer'}}/>
          </div>
          <div className="header-info">
            <h1>전국 공항 실시간 기상</h1>
            {/* 실시간 갱신된 시간 표시 */}
            <span>{lastUpdatedStr}</span>
          </div>
        </div>
        <button
          className="refresh-btn"
          onClick={() => runCollectionModule(true)}
          disabled={loading}
        >
          {loading ? <RefreshCw size={18} className="spin" /> : refreshSuccess ? <Check size={18} /> : <RefreshCw size={18} />}
        </button>
      </header>

      <div className="info-banner">
        <Info size={18} />
        <span>최신 기상정보는 해당 공항 클릭 확인, 특보는 기상특보 클릭 / 갱신은 10분 마다 사용 가능</span>
      </div>

      <div className="animate-fade">
        {error && <div className="error-msg">{error}</div>}
        <WeatherTable 
          weatherData={data} 
          specialReports={specialReports} 
          isLoading={loading && data.length === 0} 
        />
      </div>
    </div>
  );
};

export default App;
