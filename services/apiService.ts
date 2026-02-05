import { AirportWeather, ForecastItem } from "../types";

// Vite 환경 변수에서 API 주소를 가져옵니다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 기상 텍스트 -> 아이콘 코드 변환 헬퍼
 * DB의 'condition'이나 'forecast_12h' 텍스트를 처리합니다.
 */
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

/**
 * 2. 3일 예보(12시간 예보) 문자열 처리 헬퍼
 * DB의 "구름조금 > 맑음 > 맑음" 형태를 분해합니다.
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
 * 3. 메인 날씨 데이터 Fetch 함수
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
    data: AirportWeather[]; 
    lastUpdated?: string | null; 
}> => {
    try {
        const weatherUrl = `${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`;
        const response = await fetch(weatherUrl, { cache: 'no-store' });
        
        if (!response.ok) throw new Error("API 로드 실패");
        const rawJson = await response.json();
        
        // weather_latest 테이블의 data 컬럼 (JSON 배열)
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];

        // 화면 상단 갱신 시간 (DB 내 'time' 필드와 동기화)
        const latestUpdate = weatherData.length > 0 ? weatherData[0].time : null;

        const mappedData: AirportWeather[] = weatherData.map((item: any) => ({
            airportName: (item.name || "").replace('공항', ''),
            icao: item.code,
            current: {
                condition: item.condition || "-",
                temperature: item.temp ? item.temp.toString().replace('℃', '').trim() : "-",
                iconCode: mapConditionToIconCode(item.condition || "")
            },
            // DB의 forecast_12h 필드 매핑
            forecast12h: mapForecast12h(item.forecast_12h || ""),
            advisories: item.report && item.report !== "-" ? item.report : "없음",
            snowfall: item.rain || "-",
            kmaTargetRegion: "-",
            matchingLogic: `수집: ${item.time || ''}`
        }));

        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return { data: sorted, lastUpdated: latestUpdate };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

/**
 * 4. 빌드 오류 해결을 위한 필수 Export 함수들 (App.tsx 참조용)
 */
export const fetchForecastFromApi = async (icao: string) => {
    const res = await fetch(`${BASE_URL}/api/forecast/${icao}`);
    return res.ok ? res.json() : null;
};

export async function fetchSpecialReportsFromApi() {
    const res = await fetch(`${BASE_URL}/api/special-reports`);
    return res.ok ? res.json() : [];
}

export async function saveWeatherSnapshot(data: any[]) {
    const res = await fetch(`${BASE_URL}/api/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.ok ? res.json() : { success: false };
}

export async function fetchSnapshots() {
    const res = await fetch(`${BASE_URL}/api/history/snapshots`);
    return res.ok ? res.json() : [];
}

export async function fetchSnapshotData(id: number) {
    const res = await fetch(`${BASE_URL}/api/history/snapshot/${id}`);
    return res.ok ? res.json() : null;
}

export async function fetchAirportHistory(icao: string) {
    const res = await fetch(`${BASE_URL}/api/history/airport/${icao}`);
    return res.ok ? res.json() : [];
}
