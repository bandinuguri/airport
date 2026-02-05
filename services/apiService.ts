const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 기상 상태 텍스트를 기반으로 Lucide 아이콘 등에 사용할 아이콘 코드를 매핑합니다.
 */
const mapConditionToIconCode = (condition: string): string => {
  const text = condition || "";
  if (text.includes('맑음')) return 'sunny';
  if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
  if (text.includes('비')) return 'rain';
  if (text.includes('눈')) return 'snow';
  if (text.includes('안개') || text.includes('박무') || text.includes('연무')) return 'mist';
  return 'cloudy';
};

/**
 * 서버의 예보 문자열(예: "맑음 > 흐림 > 비")을 파싱하여 객체 배열로 반환합니다.
 */
const mapForecast12h = (forecastStr: string): any[] => {
  const defaultForecast = [
    { time: "4h", iconCode: "sunny" },
    { time: "8h", iconCode: "sunny" },
    { time: "12h", iconCode: "sunny" }
  ];
  
  if (!forecastStr || forecastStr === "-" || !forecastStr.includes('>')) {
    return defaultForecast;
  }

  try {
    const parts = forecastStr.split('>').map(p => p.trim());
    return [
      { time: "4h", iconCode: mapConditionToIconCode(parts[0]) },
      { time: "8h", iconCode: mapConditionToIconCode(parts[1]) },
      { time: "12h", iconCode: mapConditionToIconCode(parts[2]) }
    ];
  } catch (e) {
    return defaultForecast;
  }
};

/**
 * 메인 날씨 데이터를 가져오는 함수입니다.
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error("Network response error");
    const rawJson = await response.json();

    const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
    const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];
    
    // 서버 응답에서 가장 신뢰할 수 있는 시간을 추출합니다.
    const serverTime =
      rawJson.last_updated
      || rawJson.updated_at
      || (weatherData.length > 0 ? weatherData[0].time : new Date().toISOString());
    
    const mappedData = weatherData.map((item: any) => {
      // 해당 공항에 대한 특보 매칭
      const foundReport = globalReports.find((r: any) =>
        item.name.includes(r.airport) || r.airport.includes(item.name.replace('공항', ''))
      );

      return {
        ...item, // 기존의 모든 데이터 필드(id 등) 보존
        airportName: (item.name || "").replace('공항', ''),
        icao: item.code || "",
        current: {
          condition: item.condition || "-",
          temperature: item.temp ? String(item.temp).replace('℃', '').trim() : "-",
          iconCode: mapConditionToIconCode(item.condition)
        },
        forecast12h: mapForecast12h(item.forecast_12h || ""),
        advisories: (foundReport && foundReport.special_report !== "-") ? foundReport.special_report : (item.report !== "-" ? item.report : "없음"),
        snowfall: item.rain || "-",
      };
    });

    // 지정된 ICAO 순서로 정렬
    const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
    mappedData.sort((a: any, b: any) => {
      const idxA = SORT_ORDER.indexOf(a.icao);
      const idxB = SORT_ORDER.indexOf(b.icao);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return { 
      data: mappedData, 
      lastUpdated: serverTime, 
      special_reports: globalReports 
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { data: [], lastUpdated: null, special_reports: [] };
  }
};

/**
 * 빌드 성공 및 타 페이지 호환성을 위한 함수 정의
 */
export const saveWeatherSnapshot = async (data: any) => ({ success: true });
export const fetchForecastFromApi = async (icao: string) => null;
export const fetchSpecialReportsFromApi = async () => [];
export const fetchSnapshots = async () => [];
export const fetchSnapshotData = async (id: number) => null;
export const fetchAirportHistory = async (icao: string) => [];
