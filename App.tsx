import React, { useState, useEffect, useCallback } from 'react';
import { Plane, RefreshCw, Info, Check } from 'lucide-react';
import './styles/amo.css';
import WeatherTable from './components/WeatherTable';
import { fetchWeatherFromApi } from './services/apiService';

const CACHE_KEY = 'aviation_weather_cache_v1';

// GitHub 설정 (보안상 실제 서비스에선 환경변수 처리가 좋음)
const GITHUB_CONFIG = {
  token: 'github_pat_11BMNXPVA0h6G0gQ96Ycsw_mOisBf2r026yI72UaN30u6vHOfXvV8yvM8jY3vM8jY3vM8jY3vM8jY3', // 여기에 실제 토큰 입력
  owner: 'bandinuguri',
  repo: 'airport',
  workflow: 'scrape.yml'
};

const App: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [specialReports, setSpecialReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>('갱신 중...');
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  // 날짜 포맷 함수
  const formatToKST = (dateInput: any) => {
    if (!dateInput) return '시간 정보 없음';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const formatter = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Asia/Seoul',
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
  };

  /**
   * GitHub Action을 직접 깨우는 함수
   */
  const triggerGithubAction = async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflow}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
            'Accept': 'application/vnd.github+json',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      );
      return response.ok;
    } catch (err) {
      console.error('GitHub Action 트리거 실패:', err);
      return false;
    }
  };

  /**
   * 데이터를 가져오는 함수 (Supabase 호출)
   */
  const loadData = useCallback(async (isManual: boolean = false) => {
    try {
      setLoading(true);
      const result = await fetchWeatherFromApi({ force: isManual });

      if (result && result.data) {
        const serverTime = result.lastUpdated ?? result.last_updated ?? null;
        const kstTimeLabel = serverTime ? formatToKST(serverTime) : formatToKST(new Date());
        const finalLabel = `갱신: ${kstTimeLabel}`;

        setData(result.data);
        setSpecialReports(result.special_reports || []);
        setLastUpdatedStr(finalLabel);

        // 로컬 캐시 저장
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: result.data,
          specialReports: result.special_reports,
          lastUpdated: finalLabel,
          serverTime: serverTime // 자동 갱신 체크를 위해 원본 시간 저장
        }));

        // 만약 수동 갱신이라면 GitHub Action도 호출
        if (isManual) {
          const triggered = await triggerGithubAction();
          if (triggered) {
            setRefreshSuccess(true);
            setTimeout(() => setRefreshSuccess(false), 2000);
          }
        }
      }
    } catch (err) {
      console.error('데이터 수집 오류:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 및 자동 갱신 로직
  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    let shouldTrigger = false;

    if (saved) {
      const parsed = JSON.parse(saved);
      setData(parsed.data || []);
      setSpecialReports(parsed.specialReports || []);
      setLastUpdatedStr(parsed.lastUpdated || '갱신 중...');

      // 마지막 갱신으로부터 10분이 지났는지 체크
      if (parsed.serverTime) {
        const diff = (new Date().getTime() - new Date(parsed.serverTime).getTime()) / (1000 * 60);
        if (diff >= 10) {
          console.log(`${Math.floor(diff)}분 경과하여 자동 갱신을 트리거합니다.`);
          shouldTrigger = true;
        }
      }
    }

    if (shouldTrigger) {
      triggerGithubAction(); // 백그라운드에서 GitHub Action 실행
    }
    
    loadData(false); // 화면 데이터 로드
  }, [loadData]);

  return (
    <div className="amo-container">
      <header>
        <div className="header-title-group">
          <div className="header-icon">
            <Plane size={24} fill="currentColor" />
          </div>
          <div className="header-info">
            <h1>공항 기상 정보</h1>
            <span className="update-time">
              {lastUpdatedStr}
            </span>
          </div>
        </div>
        <button
          className={`refresh-btn ${loading ? 'loading' : ''}`}
          onClick={() => loadData(true)} // 수동 클릭 시 GitHub Action 호출 포함
          disabled={loading}
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
        사이트 링크 : <a href="https://amo.kma.go.kr/" target="_blank" rel="noreferrer" className="info-link">항공기상청</a>, <a href="https://www.weather.go.kr/" target="_blank" rel="noreferrer" className="info-link">날씨누리</a>, <a href="https://www.weather.go.kr/w/special-report/overall.do" target="_blank" rel="noreferrer" className="info-link">특보</a>
        </span>
      </div>

      <main className="content-area">
        <WeatherTable
          weatherData={data}
          specialReports={specialReports}
          isLoading={loading && data.length === 0}
        />
      </main>
    </div>
  );
};

export default App;
