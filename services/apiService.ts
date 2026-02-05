import { AirportWeather, ForecastItem } from "../types";

// 개발 환경: Vite 프록시 사용 / 프로덕션: Vercel 통합 도메인 사용
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
    if (text.includes('박무') || text.includes('안개')) return 'mist';
    if (text.includes('낙뢰') || text.includes('번개')) return 'thunderstorm';
    return 'sunny';
};

/**
 * 2. 3일 예보(12시간 예보) 문자열 처리 헬퍼
 * DB의 "구름조금 > 맑음 > 맑음" 형태를 분해하여 아이콘을 할당합니다.
 */
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    // 데이터가 없거나 형식이 맞지 않는 경우 처리
    if (!forecastStr || forecastStr === "-" || !forecastStr.includes('>')) {
        return [
            { time: "4h", iconCode: "sunny" },
            { time: "8h", iconCode: "sunny" },
            { time: "12h", iconCode: "sunny" }
        ];
    }

    // '>' 기호를 기준으로 나누고 trim()으로 공백을 제거합니다.
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
    cached?: boolean; 
    lastUpdated?: string | null; 
    warning?: string | null 
}> => {
    try {
        const force = !!opts?.force;
        const weatherUrl = `${BASE_URL}/api/weather${force ? '?force=true' : ''}`;
        
        // 캐시를 무시하고 데이터를 가져옵니다.
        const response = await fetch(weatherUrl, { cache: 'no-store' });

        if (!response.ok) throw new Error("기상 데이터를 불러오는 데 실패했습니다.");

        const rawJson = await response.json();
        // weather_latest 테이블의 data JSONB 컬럼에서 배열 추출
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
        
        // 공항 정렬 순서 및 표시 이름 정의
        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const DISPLAY_NAMES: { [key: string]: string } = { 'RKSI': '인천', 'RKSS': '김포', 'RKPC': '제주', 'RKPK': '김해', 'RKTU': '청주', 'RKTN': '대구', 'RKPU': '울산', 'RKJB': '무안', 'RKJJ': '광주', 'RKJY': '여수', 'RKNY': '양양', 'RKPS': '사천', 'RKTH': '포항', 'RKJK': '군산', 'RKNW': '원주' };

        // 갱신 시간 결정: DB 레코드 내부의 'time' 필드를 사용
        const latestUpdate = weatherData.length > 0 ? weatherData[0].time : null;

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
            return {
                airportName: DISPLAY_NAMES[item.code] || (item.name ? item.name.replace('공항', '') : '알 수 없음'),
                icao: item.code,
                current: {
                    condition: item.condition || "-",
                    temperature: item.temp ? item.temp.toString().replace('℃', '').trim() : "-",
                    iconCode: mapConditionToIconCode(item.condition || "")
                },
                // [수정 핵심] DB의 'forecast_12h' 필드를 직접 사용하여 매핑
                forecast12h: mapForecast12h(item.forecast_12h || ""),
                advisories: item.report && item.report !== "-" ? item.report : "없음",
                snowfall: item.rain || "-",
                kmaTargetRegion: "-",
                matchingLogic: `수집 시각: ${item.time || ''}`
            };
        });

        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        
        return { 
            data: sorted, 
            cached: false, 
            lastUpdated: latestUpdate, 
            warning: rawJson.error || null 
        };
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
};

/**
 * 4. App.tsx 및 기타 컴포넌트에서 참조하는 필수 export 함수들 (빌드 에러 방지용)
 */
export const fetchForecastFromApi = async (icao: string) => {
    const response = await fetch(`${BASE_URL}/api/forecast/${icao}`, { cache: 'no-store' });
    return response.ok ? response.json() : null;
};

export async function fetchSpecialReportsFromApi() {
    const response = await fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' });
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
    const response = await fetch(`${BASE_URL}/api/history/snapshots`, { cache: 'no-store' });
    return response.ok ? response.json() : [];
}

export async function fetchSnapshotData(snapshotId: number) {
    const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`, { cache: 'no-store' });
    return response.ok ? response.json() : null;
}

export async function fetchAirportHistory(airportCode:
