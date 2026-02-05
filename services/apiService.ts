/**
 * 기상 상태 텍스트를 기반으로 아이콘 코드를 매핑합니다.
 */
const mapConditionToIconCode = (condition: string): string => {
  const text = condition || "";
  if (text.includes('맑음')) return 'sunny';
  if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
  if (text.includes('비')) return 'rain';
  if (text.includes('눈')) return 'snow';
  if (text.includes('안개') || text.includes('박무') || text.includes('연무')) return 'mist';
  return 'sunny';
};

/**
 * 12시간 예보 문자열을 파싱하여 객체 배열로 반환합니다.
 * (예: "맑음 > 흐림 > 비")
 */
const mapForecast12h = (forecastStr: string) => {
  const defaultForecast = [
    { time: "4h", iconCode: "sunny" },
    { time: "8h", iconCode: "sunny" },
    { time: "12h", iconCode: "sunny" }
  ];
  if (!forecastStr || forecastStr === "-" || !forecastStr.includes('>')) return defaultForecast;
  try {
    const parts = forecastStr.split('>').map(p => p.trim());
    return [
      { time: "4h", iconCode: mapConditionToIconCode(parts[0]) },
      { time: "8h", iconCode: mapConditionToIconCode(parts[1]) },
      { time: "12h", iconCode: mapConditionToIconCode(parts[2]) }
    ];
  } catch {
    return defaultForecast;
  }
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * API 호출 및 데이터 가공 메인 함수
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
    
    // DB의 원본 시간을 그대로 전달하여 App.tsx에서 KST로 변환하게 함
    const rawTime = rawJson.updated_at || (weatherData.length > 0 ? weatherData[0].time : null);

    const mappedData = weatherData.map((item: any) => {
      // 특보 데이터 매칭
      const foundReport = globalReports.find((r: any) =>
        item.name.includes(r.airport) || r.airport.includes(item.name.replace('공항', ''))
      );

      return {
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

    // 공항 정렬 순서
    const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
    mappedData.sort((a: any, b: any) => {
      const indexA = SORT_ORDER.indexOf(a.icao);
      const indexB = SORT_ORDER.indexOf(b.icao);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return { 
      data: mappedData, 
      lastUpdated: rawTime, 
      special_reports: globalReports 
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { data: [], lastUpdated: null, special_reports: [] };
  }
};

// 빌드 에러 방지용 Mock 함수들
export const saveWeatherSnapshot = async (data: any) => ({ success: true });
export const fetchForecastFromApi = async (icao: string) => null;
