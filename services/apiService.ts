import { AirportWeather, ForecastItem } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// 1. 기상 상태 -> 아이콘 코드 변환 헬퍼
const mapConditionToIconCode = (condition: string): string => {
  if (!condition) return 'sunny';
  const text = condition.trim();
  if (text.includes('맑음')) return 'sunny';
  if (text.includes('흐림') || text.includes('구름') || text.includes('점차')) return 'cloudy';
  if (text.includes('비')) return 'rain';
  if (text.includes('눈')) return 'snow';
  if (text.includes('박무') || text.includes('안개')) return 'mist';
  if (text.includes('낙뢰') || text.includes('번개')) return 'thunderstorm';
  return 'sunny';
};

// 2. 3일 예보 문자열 처리 헬퍼
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
  if (!forecastStr || forecastStr === "-" || forecastStr.trim() === "") {
    return [
      { time: "4h", iconCode: "sunny" },
      { time: "8h", iconCode: "sunny" },
      { time: "12h", iconCode: "sunny" }
    ];
  }
  // 공백 제거 로직 포함
  const conditions = forecastStr.split('>').map(s => s.trim());
  return [
    { time: "4h", iconCode: mapConditionToIconCode(conditions[0] || "") },
    { time: "8h", iconCode: mapConditionToIconCode(conditions[1] || "") },
    { time: "12h", iconCode: mapConditionToIconCode(conditions[2] || "") }
  ];
};

// 3. 메인 날씨 데이터 Fetch
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
  data: AirportWeather[]; 
  cached?: boolean; 
  lastUpdated?: string | null; 
  warning?: string | null 
}> => {
  try {
    const force = !!opts?.force;
    const weatherUrl = `${BASE_URL}/api/weather${force ? '?force=true' : ''}`;
    
    const [weatherRes, reportRes] = await Promise.all([
      fetch(weatherUrl, { cache: 'no-store' }),
      fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' }).catch(() => null)
    ]);

    if (!weatherRes.ok) throw new Error("Weather API load failed");

    const rawJson = await weatherRes.json();
    const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
    
    let specialReports: any[] = [];
    if (reportRes && reportRes.ok) {
      try { specialReports = await reportRes.json(); } catch(e) {}
    }

    const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
    const DISPLAY_NAMES: { [key: string]: string } = { 'RKSI': '인천', 'RKSS': '김포', 'RKPC': '제주', 'RKPK': '김해', 'RKTU': '청주', 'RKTN': '대구', 'RKPU': '울산', 'RKJB': '무안', 'RKJJ': '광주', 'RKJY': '여수', 'RKNY': '양양', 'RKPS': '사천', 'RKTH': '포항', 'RKJK': '군산', 'RKNW': '원주' };

    // 화면 상단 갱신 시간 (DB의 time 필드 활용)
    let latestUpdate = rawJson.last_updated || (weatherData.length > 0 ? weatherData[0].time : null);

    const mappedData: AirportWeather[] = weatherData.map((item: any) => {
      // 특보 매핑 보강
      const report = Array.isArray(specialReports) ? specialReports.find((r: any) => r.airport === item.code) : null;
      const advisoryText = report ? report.special_report : (item.report || "-");

      return {
        airportName: DISPLAY_NAMES[item.code] || (item.name ? item.name.replace('공항', '') : '알 수 없음'),
        icao: item.code,
        current: {
          condition: item.condition || "-",
          temperature: item.temp ? item.temp.toString().replace('℃', '').trim() : "-",
          iconCode: mapConditionToIconCode(item.condition || "")
        },
        forecast12h: mapForecast12h(item.forecast_12h || item.forecast || ""),
        advisories: (!advisoryText || advisoryText === "-") ? "없음" : advisoryText,
        snowfall: item.rain || "-",
        kmaTargetRegion: "-",
        matchingLogic: `수집: ${item.time || ''}`
      };
    });

    const sorted = mappedData.sort((a, b) => {
      const indexA = SORT_ORDER.indexOf(a.icao);
      const indexB = SORT_ORDER.indexOf(b.icao);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
    
    return { data: sorted, cached: false, lastUpdated: latestUpdate, warning: rawJson.error || null };
  } catch (error) {
    console.error("fetchWeatherFromApi Error:", error);
    throw error;
  }
};

// 4. App.tsx에서 요구하는 필수 함수들 (수정 금지)

export async function saveWeatherSnapshot(weatherData: any[]) {
  const response = await fetch(`${BASE_URL}/api/history/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weatherData)
  });
  if (!response.ok) throw new Error('Failed to save snapshot');
  return response.json();
}

export const fetchForecastFromApi = async (icao: string) => {
  const response = await fetch(`${BASE_URL}/api/forecast/${icao}`, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
};

export async function fetchSpecialReportsFromApi() {
  const response = await fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' });
  return response.ok ? response.json() : [];
}

export async function fetchSnapshots() {
  const response = await fetch(`${BASE_URL}/api/history/snapshots`, { cache: 'no-store' });
  return response.ok ? response.json() : [];
}

export async function fetchSnapshotData(snapshotId: number) {
  const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`, { cache
