import './styles/amo.css';
import { Plane, RefreshCw, Info, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi, saveWeatherSnapshot } from './services/apiService';

const CACHE_KEY = 'aviation_weather_cache_v5';

const App: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [specialReports, setSpecialReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>('');
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  /**
   * 한국 시간(KST) 변환 및 포맷팅 함수
   * 서버의 UTC 시간을 브라우저 환경에 맞는 한국 시간으로 정밀하게 변환합니다.
   */
  const formatToKST = (dateInput: any) => {
    if (!dateInput) return "갱신 중...";
    const date = new Date(dateInput);
    
    // 유효하지 않은 날짜인 경우 입력값 그대로 반환
    if (isNaN(date.getTime())) {
      return typeof dateInput === 'string' ? dateInput : "갱신 중...";
    }

    try {
      // Intl API를 사용하여 Asia/Seoul 타임존 강제 적용
      const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul'
      });
      
      const formatted = kstFormatter.format(date);
      // "26. 2. 5. 16:48" 형태를 "26.2.5. 16:48"로 정제
      return formatted.replace(/\s/g, '').replace(/(\d+)\.(\d+)\.(\d+)\./, '$1.$2.$3. ');
    } catch (e) {
      // Intl 미지원 환경 대비 fallback
      const yy = date.getFullYear().toString().slice(-2);
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const dd = date.getDate().toString().padStart(2, '0');
      const hh = date.getHours().toString().padStart(2, '0');
      const min = date.getMinutes().toString().padStart(2, '0');
      return `${yy}.${mm}.${dd}. ${hh}:${min}`;
    }
  };

  /**
   * 데이터 수집 및 상태 업데이트 함수
   */
  const runCollectionModule = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchWeatherFromApi({ force });
      
      if (result && result.data) {
        // API 서비스에서 받은 원본 시간을 한국 시간 문자열로 변환
        const timeStr = formatToKST(result.lastUpdated);
        const finalUpdateStr = `갱신 ${timeStr}`;
        
        setData(result.data);
        setSpecialReports(result.special_reports || []);
        setLastUpdatedStr(finalUpdateStr);

        // 로컬 스토리지 캐시 저장
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: result.data,
          specialReports: result.special_reports || [],
          lastUpdated: finalUpdateStr
        }));

        if (force) {
          setRefreshSuccess(true);
          setTimeout(() => setRefreshSuccess(false), 2000);
          // 데이터가 있을 때만 스냅샷 저장 시도
          if (result.data.length > 0) {
            await saveWeatherSnapshot(result.data).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      console.error("Data Fetch Error:", err);
      setError("데이터를 갱신하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 초기 실행 및 캐시 로드
   */
  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data || []);
        setSpecialReports(parsed.specialReports || []);
        setLastUpdatedStr(parsed.lastUpdated || '');
      } catch (e) {
        console.error("Cache load error:", e);
      }
    }
    runCollectionModule(false);
  }, [runCollectionModule]);

  return (
    <div className="amo-container">
      <header>
        <div className="header-title-group">
          <div className="header-icon">
            <button 
              onClick={() => (window as any).navigateTo?.('/history')} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
            >
              <Plane size={24} fill="currentColor" />
            </button>
          </div>
          <div className="header-info">
            <h1>전국 공항 실시간 기상</h1>
            <span className="update-time">{lastUpdatedStr || "데이터 확인 중..."}</span>
          </div>
        </div>
        <button 
          className="refresh-btn" 
          onClick={() => runCollectionModule(true)} 
          disabled={loading}
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
        <span>최신 기상정보는 해당 공항 클릭 확인, 특보는 기상특보 메뉴 참조</span>
      </div>

      <div className="animate-fade">
        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}
        
        <WeatherTable 
          weatherData={data} 
          specialReports={specialReports} 
          isLoading={loading && data.length === 0} 
        />
      </div>

      <footer style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '40px', color: '#94a3b8', fontSize: '0.75rem' }}>
        © 2026 Aviation Weather Dashboard. Powered by Local Scraper API
      </footer>
    </div>
  );
};

export default App;
