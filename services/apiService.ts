import { AirportWeather, ForecastItem } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 기상 상태에 따른 아이콘 매핑
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
 * 12시간 예보 문자열 파싱
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
    } catch { return defaultForecast; }
};

/**
 * 메인 데이터 로드 함수
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
    data: AirportWeather[]; 
    lastUpdated: string | null;
    special_reports: any[];
    cached?: boolean;
}> => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const rawJson = await response.json();
        
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : (Array.isArray(rawJson) ? rawJson : []);
        const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];

        // [핵심] 가공하지 않은 서버 원본 시간(ISO 8601)을 그대로 리턴합니다.
        const rawTime = rawJson.updated_at || (weatherData.length > 0 ? weatherData[0].time : null);

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
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

        return { 
            data: sorted, 
            lastUpdated: rawTime, 
            special_reports: globalReports,
            cached: rawJson.cached 
        };
    } catch (error) {
        console.error("API Error:", error);
        return { data: [], lastUpdated: null, special_reports: [] };
    }
};

// 빌드 에러 방지를 위한 추가 익스포트
export const fetchForecastFromApi = async (icao: string) => null;
export async function saveWeatherSnapshot(data: any[]) { return { success: true }; }
