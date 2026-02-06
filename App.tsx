import React, { useState, useEffect, useCallback } from 'react';

import { Plane, RefreshCw, Info, Check } from 'lucide-react';

import './styles/amo.css';

import WeatherTable from './components/WeatherTable';

import { fetchWeatherFromApi } from './services/apiService';



const CACHE_KEY = 'aviation_weather_cache_v1';



const App: React.FC = () => {

  const [data, setData] = useState<any[]>([]);

  const [specialReports, setSpecialReports] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const [lastUpdatedStr, setLastUpdatedStr] = useState<string>('갱신 중...');

  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);



  /**

   * 서버에서 온 날짜 문자열을 한국 시간(KST) 포맷으로 변환합니다.

   * 원하는 형식: 2026-02-05 18:57

   */

  const formatToKST = (dateInput: any) => {

    if (!dateInput) return '시간 정보 없음';



    const date = new Date(dateInput); // ISO 문자열 그대로 파싱

    if (isNaN(date.getTime())) return String(dateInput);



    const formatter = new Intl.DateTimeFormat('ko-KR', {

      year: 'numeric',

      month: '2-digit',

      day: '2-digit',

      hour: '2-digit',

      minute: '2-digit',

      hour12: false,

      timeZone: 'Asia/Seoul',

    });



    const parts = formatter.formatToParts(date);

    const get = (type: string) =>

      parts.find((p) => p.type === type)?.value ?? '';



    // 예: 2026-02-05 18:57

    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;

  };



  /**

   * API로부터 데이터를 수집하고 상태를 업데이트합니다.

   */

  const runCollectionModule = useCallback(async (force: boolean = false) => {

    try {

      setLoading(true);

      const result = await fetchWeatherFromApi({ force });



      if (result && result.data) {

        const serverTime = result.lastUpdated ?? result.last_updated ?? null;

        const kstTimeLabel = serverTime ? formatToKST(serverTime) : formatToKST(new Date().toISOString());

        const finalLabel = `갱신 ${kstTimeLabel}`;



        setData(result.data);

        setSpecialReports(result.special_reports || []);

        setLastUpdatedStr(finalLabel);



        // 로컬 캐시 저장

        localStorage.setItem(CACHE_KEY, JSON.stringify({

          data: result.data,

          specialReports: result.special_reports,

          lastUpdated: finalLabel,

          timestamp: Date.now(),

        }));



        if (force) {

          setRefreshSuccess(true);

          setTimeout(() => setRefreshSuccess(false), 2000);

        }

      }

    } catch (err) {

      console.error('데이터 수집 오류:', err);

    } finally {

      setLoading(false);

    }

  }, []);



  // 초기 로드 시 캐시 확인 및 데이터 호출

  useEffect(() => {

    const saved = localStorage.getItem(CACHE_KEY);

    if (saved) {

      try {

        const parsed = JSON.parse(saved);

        setData(parsed.data || []);

        setSpecialReports(parsed.specialReports || []);

        setLastUpdatedStr('갱신 중...');

      } catch (e) {

        console.error('캐시 파싱 오류');

      }

    }

    runCollectionModule(false);

  }, [runCollectionModule]);



  return (

    <div className="amo-container">

      <header>

        <div className="header-title-group">

          <div className="header-icon">

            <Plane size={24} fill="currentColor" />

          </div>

          <div className="header-info">

            <h1>전국 공항 실시간 기상</h1>

            <span className="update-time">

              {lastUpdatedStr}

            </span>

          </div>

        </div>

        <button

          className={`refresh-btn ${loading ? 'loading' : ''}`}

          onClick={() => runCollectionModule(true)}

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

        최신 정보는 해당 공항 클릭, 특보는 <a href="https://www.weather.go.kr/w/special-report/overall.do" target="_blank" rel="noreferrer" className="info-link">기상특보</a> 클릭 (<a href="https://amo.kma.go.kr/" target="_blank" rel="noreferrer" className="info-link">항공기상청</a>, <a href="https://www.weather.go.kr/" target="_blank" rel="noreferrer" className="info-link">날씨 누리</a>) / 갱신주기 : 30분

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
