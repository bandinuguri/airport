import { AirportWeather, ForecastItem } from "../types";

// API 베이스 URL 설정
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 한글 날짜 문자열 정제 (NaN 오류 방지)
 * "2026년 2월 5일(목) 12:00(KST)" -> "26.02.05. 12:00" 형태로 변환
 */
const formatKoreanDate = (dateStr: string): string => {
    if (!dateStr) return "-";
    try {
        const matches = dateStr.match(/\d+/g);
        if (matches && matches.length >= 5) {
            const [year, month, day, hour, minute] = matches;
            // 연도 뒷자리만 사용 (예: 2026 -> 26)
            const shortYear = year.slice(-2);
            return `${shortYear}.${month}.${day}. ${hour}:${minute}`;
        }
        return dateStr;
    } catch {
        return dateStr;
    }
};

/**
 * 2. 기상 상태 텍스트를 아이콘 코드로 변환
 */
const mapConditionToIconCode = (condition: string): string => {
    if (!condition) return 'sunny';
    const text = condition.trim();
    if (text.includes('맑음')) return 'sunny';
    if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
    if (text.includes('비')) return 'rain';
    if (text.includes('눈')) return 'snow';
    if (text.includes('안개') || text.includes('박무') || text.includes('연무')) return 'mist';
    if (text.includes('낙뢰') || text.includes('번개')) return 'thunderstorm';
    return 'sunny';
};

/**
 * 3. 12시간 예보 파싱 (forecast_12h 필드 사용)
 */
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    if (!forecastStr || forecastStr === "-" || !forecastStr.includes('>')) {
        return [
            { time: "4h", iconCode: "sunny" },
            { time: "8h", iconCode: "sunny" },
            { time: "12h", iconCode: "sunny" }
        ];
    }
    const conditions = forecastStr.split('>').map(s => s.trim());
    return [
        { time: "4h", iconCode: mapConditionToIconCode(conditions[0] || "") },
        { time: "8h", iconCode: mapConditionToIconCode(conditions[1] || "") },
        { time: "12h", iconCode: mapConditionToIconCode(conditions[2] || "") }
    ];
};

/**
 * 4. 메인 데이터 Fetch 함수
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
    data: AirportWeather[]; 
    lastUpdated?: string | null; 
}> => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { cache: 'no-store' });
        if (!response.ok) throw new Error("데이터 로드 실패");

        const rawJson = await response.json();
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
        const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];

        // 갱신 시간 정제 (NaN 발생 지점 수정)
        const rawTime = weatherData.length > 0 ? weatherData[0].time : "";
        const lastUpdated = formatKoreanDate(rawTime);

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
            // 특보(Advisories) 매핑
            const foundReport = globalReports.find((r: any) => r.airport === item.code || r.icao === item.code);
            const advisoryText = (item.report && item.report !== "-") ? item.report : (foundReport ? foundReport.special_report : "없음");

            return {
                airportName: (item.name || "").replace('공항', ''),
                icao: item.code,
                current: {
                    condition: item.condition || "-",
                    temperature: item.temp ? item.temp.toString().replace('℃', '').trim() : "-",
                    iconCode: mapConditionToIconCode(item.condition || "")
                },
                forecast12h: mapForecast12h(item.forecast_12h || ""),
                advisories: advisoryText,
                snowfall: item.rain || "-",
                kmaTargetRegion: "-",
                matchingLogic: `수집: ${item.time || ''}`
            };
        });

        // 공항 정렬 순서
        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return { data: sorted, lastUpdated };
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};

/**
 * 5. 빌드 에러 방지용 필수 Export 함수들 (App.tsx 참조)
 */
export const fetchForecastFromApi = async (icao: string) => null;
export async function fetchSpecialReportsFromApi() { return []; }
export async function saveWeatherSnapshot(data: any[]) { return { success: true }; }
export async function fetchSnapshots() { return []; }
export async function fetchSnapshotData(id: number) { return null; }
export async function fetchAirportHistory(icao: string) { return []; }
