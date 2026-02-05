import { AirportWeather, ForecastItem } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 날짜 오류(NaN) 해결을 위한 정제 함수
 */
const formatKoreanDate = (dateStr: string): string => {
    if (!dateStr) return "갱신 중...";
    try {
        // ISO 형식(2026-02-05T...) 또는 일반 날짜 문자열 모두 처리
        const date = new Date(dateStr);
        
        // 유효하지 않은 날짜인 경우 기존 로직(숫자만 추출)으로 대체
        if (isNaN(date.getTime())) {
            const d = dateStr.match(/\d+/g);
            if (d && d.length >= 5) {
                return `${d[0].slice(-2)}.${d[1]}.${d[2]}. ${d[3]}:${d[4]}`;
            }
            return dateStr;
        }

        const yy = date.getFullYear().toString().slice(-2);
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');
        return `${yy}.${m}.${d}. ${hh}:${mm}`;
    } catch {
        return "갱신 중...";
    }
};

const mapConditionToIconCode = (condition: string): string => {
    const text = condition || "";
    if (text.includes('맑음')) return 'sunny';
    if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
    if (text.includes('비')) return 'rain';
    if (text.includes('눈')) return 'snow';
    if (text.includes('안개') || text.includes('박무') || text.includes('연무')) return 'mist';
    return 'sunny';
};

const mapForecast12h = (forecastStr: string): ForecastItem[] => {
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
    } catch { return defaultForecast; }
};

export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
    data: AirportWeather[]; 
    lastUpdated?: string | null;
    special_reports?: any[]; // 반환 타입에 추가
}> => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const rawJson = await response.json();
        
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : (Array.isArray(rawJson) ? rawJson : []);
        // DB에서 온 special_reports 추출
        const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];

        // [수정] 갱신 시간 오류 해결: rawJson.updated_at이 있다면 우선 사용, 없으면 데이터의 시간 사용
        const rawTime = rawJson.updated_at || (weatherData.length > 0 ? weatherData[0].time : "");
        const lastUpdated = formatKoreanDate(rawTime);

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
            // 특보 매칭: 공항 이름 포함 여부로 확인
            const foundReport = globalReports.find((r: any) => 
                item.name.includes(r.airport) || r.airport.includes(item.name.replace('공항',''))
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
                // 특보가 있으면 표시, 없으면 기존 report 필드 활용
                advisories: (foundReport && foundReport.special_report !== "-") ? foundReport.special_report : (item.report !== "-" ? item.report : "없음"),
                snowfall: item.rain || "-",
                kmaTargetRegion: "-",
                matchingLogic: `수집: ${item.time || ''}`
            };
        });

        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return { data: sorted, lastUpdated, special_reports: globalReports };
    } catch (error) {
        console.error("API Error:", error);
        return { data: [], lastUpdated: "연결 오류" };
    }
};

// 하단 Mock 함수들은 기존 소스와 동일하게 유지 (빌드 에러 방지)
export const fetchForecastFromApi = async (icao: string) => null;
export async function fetchSpecialReportsFromApi() { return []; }
export async function saveWeatherSnapshot(data: any[]) { return { success: true }; }
export async function fetchSnapshots() { return []; }
export async function fetchSnapshotData(id: number) { return null; }
export async function fetchAirportHistory(icao: string) { return []; }
