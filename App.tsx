import './styles/amo.css';
import { Plane, RefreshCw, Info, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi, saveWeatherSnapshot } from './services/apiService';

const CACHE_KEY = 'aviation_weather_cache_v7';

const App: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [specialReports, setSpecialReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>('');
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  // 한국 시간 포맷 (이미지 형식에 맞춤)
  const formatToKST = (dateInput: any) => {
    if (!dateInput) return "갱신 중...";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      weekday: 'short', hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: 'Asia/Seoul'
    }).format(date).replace('요일', '') + "(KST)";
  };

  const runCollectionModule = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      const result = await fetchWeatherFromApi({ force });
      if (result && result.data) {
        const timeStr = formatToKST(result.lastUpdated);
        setData(result.data);
        setSpecialReports(result.special_reports || []);
        setLastUpdatedStr(`갱신 ${timeStr}`);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: result.data,
          specialReports: result.special_reports,
          lastUpdated: `갱신 ${timeStr}`,
          timestamp: Date.now()
        }));

        if (force) {
          setRefreshSuccess(true);
          setTimeout(() => setRefreshSuccess(false), 2000);
        }
      }
    } catch (err) {
      setError("데이터를 가져오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setData(parsed.data || []);
      setSpecialReports(parsed.specialReports || []);
      setLastUpdatedStr(parsed.lastUpdated || '');
    }
    runCollectionModule(false);
  }, [runCollectionModule]);

  return (
    <div className="amo-container">
      <header>
        <div className="header-title-group">
          <div className="header-icon">
            {/* History 페이지로 이동하는 링크 복구 */}
            <button 
              onClick={() => (window as any).navigateTo?.('/history')} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
            >
              <Plane size={24} fill="currentColor" />
            </button>
          </div>
          <div className="header-info">
            <h1>전국 공항 실시간 기상</h1>
            <span className="update-time">{lastUpdatedStr}</span>
          </div>
        </div>
        <button className="refresh-btn" onClick={() => runCollectionModule(true)} disabled={loading}>
          {loading ? <RefreshCw size={18} className="spin" /> : refreshSuccess ? <Check size={18} /> : <RefreshCw size={18} />}
        </button>
      </header>

      {/* 안내 배너의 링크 텍스트 복구 */}
      <div className="info-banner">
        <Info size={18} />
        <span>
          최신 기상정보는 해당 공항 클릭 확인, 특보는 
          <span 
            onClick={() => (window as any).navigateTo?.('/special-reports')} 
            style={{ color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', margin: '0 4px', textDecoration: 'underline' }}
          >
            기상특보 메뉴
          </span> 
          참조 / 갱신은 10분 마다 사용 가능
        </span>
      </div>

      <div className="animate-fade">
        <WeatherTable weatherData={data} specialReports={specialReports} isLoading={loading && data.length === 0} />
      </div>
    </div>
  );
};

export default App;
