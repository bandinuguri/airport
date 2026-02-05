import './styles/amo.css';
import { Plane, RefreshCw, Info, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi, saveWeatherSnapshot } from './services/apiService';
import { AirportWeather } from './types';

const CACHE_KEY = 'aviation_weather_cache_v5';

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

  /**
   * [필독] 한국 시간(KST) 변환 함수
   * Intl.DateTimeFormat을 사용하여 브라우저 타임존 문제를 완전히 해결합니다.
   */
  const formatToKST = (dateInput: any) => {
    if (!dateInput) return "갱신 중...";
    const date = new Date(dateInput);
    
    // 날짜 객체 생성 실패 시
    if (isNaN(date.getTime())) {
      return typeof dateInput === 'string' ? dateInput : "갱신 중...";
    }

    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul'
      }).format(date).replace(/\s/g, '').replace(/(\d+)\.(\d+)\.(\d+)\./, '$1.$2.$3. ');
    } catch (e) {
      // Intl 미지원 브라우저 대비 수동 포맷팅
      const yy = date.getFullYear().toString().slice(-2);
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      return `${yy}.${m}.${d}. ${hh}:${mm}`;
    }
  };

  const runCollectionModule = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchWeatherFromApi({ force });
      
      if (result.data && result.data.length > 0) {
        // [수정] 서버 원본 시간을 한국 시간으로 변환
        const timeStr = formatToKST(result.lastUpdated);
        const finalUpdateStr = `갱신 ${timeStr}`;
        
        setData(result.data);
        setSpecialReports(result.special_reports);
        setLastUpdatedStr(finalUpdateStr);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: result.data,
          specialReports: result.special_reports,
          lastUpdated: finalUpdateStr
        }));

        if (force) {
          setRefreshSuccess(true);
          setTimeout(() => setRefreshSuccess(false), 2000);
          await saveWeatherSnapshot(result.data).catch(() => {});
        }
      } else {
        throw new Error("데이터를 수집할 수 없습니다.");
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("실시간 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CacheData;
        setData(parsed.data);
        setSpecialReports(parsed.specialReports);
        setLastUpdatedStr(parsed.lastUpdated);
      } catch (e) {
        console.error("Cache error");
      }
    }
    runCollectionModule(false);
  }, [runCollectionModule]);

  return (
    <div className="amo-container">
      <header>
        <div className="header-title-group">
          <div className="header-icon">
            <button onClick={() => (window as any).navigateTo('/history')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <Plane size={24} fill="currentColor" />
            </button>
          </div>
          <div className="header-info">
            <h1>전국 공항 실시간 기상</h1>
            <span>{lastUpdatedStr || "연결 중..."}</span>
          </div>
        </div>
        <button className="refresh-btn" onClick={() => runCollectionModule(true)} disabled={loading}>
          {loading ? <RefreshCw size={18} className="spin" /> : refreshSuccess ? <Check size={18} /> : <RefreshCw size={18} />}
        </button>
      </header>

      <div className="info-banner">
        <Info size={18} />
        <span>최신 기상정보는 해당 공항 클릭 확인, 특보는 기상특보 메뉴 참조</span>
      </div>

      <div className="animate-fade">
        {error && <div className="error-banner">{error}</div>}
        <WeatherTable 
          weatherData={data} 
          specialReports={specialReports} 
          isLoading={loading && data.length === 0} 
        />
      </div>
      
      <footer style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '40px', color: '#94a3b8', fontSize: '0.75rem' }}>
        © 2026 Aviation Weather Dashboard.
      </footer>
    </div>
  );
};

export default App;
