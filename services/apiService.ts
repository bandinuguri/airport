import { AirportWeather, ForecastItem } from "../types";

// Vite 환경 변수에서 API 주소를 가져옵니다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 기상 상태 텍스트를 아이콘 코드로 변환하는 헬퍼
 * DB의 'condition'이나 'forecast_12h'에 포함된 한글 텍스트를 기반으로 합니다.
 */
const mapConditionToIconCode = (condition: string): string => {
    if (!condition) return 'sunny';
    const text = condition.trim();
    if (text.includes('맑음')) return 'sunny';
    if (text.includes('흐림') || text.includes('구름') || text.includes('점차')) return 'cloudy';
    if (text.includes('비')) return 'rain';
    if (text.includes('눈')) return 'snow';
    if (text.includes('박무') || text.includes('안개') || text.includes('연무')) return 'mist';
    if (text.includes('낙뢰') || text.includes('번개')) return 'thunderstorm';
    return 'sunny';
};

/**
 * 2. 12시간 예보 문자열 처리 헬퍼
 * DB의 "구름조금 > 맑음 > 맑음" 형태를 분해하여 아이콘을 할당합니다.
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
 * 3. 메인 기상 데이터 fetch 함수
 */
export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ 
    data: AirportWeather[]; 
    lastUpdated?: string | null; 
}> => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { cache: 'no-store' });
        if (!response.ok) throw new Error("기상 데이터를 불러오는 데 실패했습니다.");

        const rawJson = await response.json();
        
        // weather_latest 테이블의 data 컬럼 (공항별 상세 데이터)
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
        
        // weather_latest 테이블의 special_reports 컬럼 (전체 특보 목록)
        const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];

        // 갱신 시간 결정: DB 레코드 내부의 'time' 필드를 사용
        const latestUpdate = weatherData.length > 0 ? weatherData[0].time : null;

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
            // [특보 매핑] 전체 특보 목록(globalReports)에서 해당 공항 코드(ICAO)를 찾습니다.
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
                // DB의 forecast_12h 필드를 사용하여 예보 아이콘 생성
                forecast12h: mapForecast12h(item.forecast_12h || ""),
                advisories: advisoryText,
                snowfall: item.rain || "-",
                kmaTargetRegion: "-",
                matchingLogic: `수집 시각: ${item.time || ''}`
            };
        });

        // 공항 정렬 (인천, 김포, 제주 순...)
        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        
        return { data: sorted, lastUpdated: latestUpdate };
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
};

/**
 * 4. App.tsx 빌드 에러 방지를 위한 필수 Export 함수들
 */
export const fetchForecastFromApi = async (icao: string) => {
    const response = await fetch(`${BASE_URL}/api/forecast/${icao}`);
    return response.ok ? response.json() : null;
};

export async function fetchSpecialReportsFromApi() {
    const response = await fetch(`${BASE_URL}/api/special-reports`);
    return response.ok ? response.json() : [];
}

export async function saveWeatherSnapshot(weatherData: any[]) {
    const response = await fetch(`${BASE_URL}/api/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weatherData)
    });
    return response.ok ? response.json() : { success: false };
}

export async function fetchSnapshots() {
    const response = await fetch(`${BASE_URL}/api/history/snapshots`);
    return response.ok ? response.json() : [];
}

export async function fetchSnapshotData(snapshotId: number) {
    const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`);
    return response.ok ? response.json() : null;
}

export async function fetchAirportHistory(airportCode: string) {
    const response = await fetch(`${BASE_URL}/api/history/airport/${airportCode}`);
    return response.ok ? response.json() : [];
}
