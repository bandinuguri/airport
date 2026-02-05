import { AirportWeather } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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
 * API로부터 날씨 및 특보 데이터를 가져오는 메인 함수입니다.
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const rawJson = await response.json();

    // 데이터 구조 안전하게 추출
    const weatherData = Array.isArray(rawJson.data) ? rawJson.data : (Array.isArray(rawJson) ? rawJson : []);
    const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];

    // [중요] 갱신 시간 원본 유지: 가공하지 않고 App.tsx로 넘겨 타임존 문제를 해결합니다.
    const rawTime = rawJson.updated_at || (weatherData.length > 0 ? weatherData[0].time : null);

    const mappedData = weatherData.map((item: any) => {
      // 공항 이름 매칭을 통해 특보(special_report) 데이터 연결
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
        forecast12h: [], // 필요 시 확장 가능
        advisories: (foundReport && foundReport.special_report !== "-") 
          ? foundReport.special_report 
          : (item.report && item.report !== "-" ? item.report : "없음"),
        snowfall: item.rain || "-",
        kmaTargetRegion: "-",
        matchingLogic: `수집: ${item.time || ''}`
      };
    });

    // 정렬 (ICAO 기준)
    const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
    mappedData.sort((a: any, b: any) => {
      const indexA = SORT_ORDER.indexOf(a.icao);
      const indexB = SORT_ORDER.indexOf(b.icao);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return {
      data: mappedData,
      lastUpdated: rawTime,
      special_reports: globalReports,
      cached: rawJson.cached || false
    };
  } catch (error) {
    console.error("API Error:", error);
    return { data: [], lastUpdated: null, special_reports: [] };
  }
};

/**
 * 히스토리 저장을 위한 스냅샷 함수 (빌드 오류 방지용)
 */
export const saveWeatherSnapshot = async (weatherData: any[]) => {
  try {
    // 필요한 경우 Supabase 또는 API 호출 로직 추가
    return { success: true };
  } catch (err) {
    console.error("Error saving snapshot:", err);
    return { success: false };
  }
};

// 기타 빌드 오류 방지용 Mock 함수
export const fetchForecastFromApi = async (icao: string) => null;
export async function fetchSpecialReportsFromApi() { return []; }
export async function fetchSnapshots() { return []; }
export async function fetchSnapshotData(id: number) { return null; }
export async function fetchAirportHistory(icao: string) { return []; }
