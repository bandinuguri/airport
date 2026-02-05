import { AirportWeather, ForecastItem } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 날짜 오류(NaN) 해결을 위한 초강력 정제 함수
 * 어떤 문자열이 들어와도 숫자만 뽑아 "YY.MM.DD. HH:mm"을 만듭니다.
 */
const formatKoreanDate = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return "갱신 중...";
    try {
        const d = dateStr.match(/\d+/g);
        if (d && d.length >= 5) {
            // 2026 -> 26 (연도 뒷자리), 월, 일, 시, 분
            return `${d[0].slice(-2)}.${d[1]}.${d[2]}. ${d[3]}:${d[4]}`;
        }
        return dateStr;
    } catch {
        return "데이터 확인 필요";
    }
};

/**
 * 2. 기상 아이콘 매핑 (텍스트 포함 여부로 판단)
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
 * 3. 12시간 예보 파싱 (forecast_12h 필드 분해)
 */
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
    } catch {
        return defaultForecast;
    }
};

/**
 * 4. 메인 데이터 로드 함수
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
    data: AirportWeather[]; 
    lastUpdated?: string | null; 
}> => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const rawJson = await response.json();
        
        // API 구조에 따른 방어적 할당 (rawJson.data 또는 rawJson 자체)
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : (Array.isArray(rawJson) ? rawJson : []);
        const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];

        // 첫 번째 데이터에서 시간을 가져와 정제
        const rawTime = weatherData.length > 0 ? (weatherData[0].time || "") : "";
        const lastUpdated = formatKoreanDate(rawTime);

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
            const foundReport = globalReports.find((r: any) => r.airport === item.code || r.icao === item.code);
            
            return {
                airportName: (item.name || "").replace('공항', ''),
                icao: item.code || "",
                current: {
                    condition: item.condition || "-",
                    temperature: item.temp ? String(item.temp).replace('℃', '').trim() : "-",
                    iconCode: mapConditionToIconCode(item.condition)
                },
                forecast12h: mapForecast12h(item.forecast_12h || ""),
                advisories: (item.report && item.report !== "-") ? item.report : (foundReport ? foundReport.special_report : "없음"),
                snowfall: item.rain || "-",
                kmaTargetRegion: "-",
                matchingLogic: `수집: ${item.time || ''}`
            };
        });

        // 공항 정렬 (ICAO 기준)
        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return { data: sorted, lastUpdated };
    } catch (error) {
        console.error("API Error:", error);
        return { data: [], lastUpdated: "연결 오류" };
    }
};

/**
 * 5. 빌드 오류 방지용 Mock 함수 (App.tsx 참조용)
 */
export const fetchForecastFromApi = async (icao: string) => null;
export async function fetchSpecialReportsFromApi() { return []; }
export async function saveWeatherSnapshot(data: any[]) { return { success: true }; }
export async function fetchSnapshots() { return []; }
export async function fetchSnapshotData(id: number) { return null; }
export async function fetchAirportHistory(icao: string) { return []; }
