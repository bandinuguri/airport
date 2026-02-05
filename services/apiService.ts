import { AirportWeather, ForecastItem } from "../types";

// 개발 환경: Vite 프록시 사용 / 프로덕션: Vercel 통합 도메인 사용
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 기상 상태 텍스트를 아이콘 코드로 변환하는 헬퍼
 * DB의 'condition' 필드나 'forecast_12h'의 텍스트를 기반으로 아이콘을 결정합니다.
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
 * 2. 3일 예보 문자열 처리 헬퍼
 * "구름많음 > 맑음 > 맑음" 형태의 문자열을 분해하여 각 시간대별 아이콘을 할당합니다.
 */
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    // 데이터가 없거나 '-'인 경우 기본값 처리
    if (!forecastStr || forecastStr === "-" || forecastStr.trim() === "") {
        return [
            { time: "4h", iconCode: "sunny" },
            { time: "8h", iconCode: "sunny" },
            { time: "12h", iconCode: "sunny" }
        ];
    }

    // '>' 기호를 기준으로 나누고 trim()으로 공백을 완전히 제거합니다.
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
        
        // 캐시를 무시하고 최신 데이터를 가져옵니다.
        const [weatherRes, reportRes] = await Promise.all([
            fetch(weatherUrl, { cache: 'no-store' }),
            fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' })
        ]);

        if (!weatherRes.ok) throw new Error("기상 데이터를 불러오는 데 실패했습니다.");

        const rawJson = await weatherRes.json();
        // Vercel/Supabase API 응답 구조에 맞게 데이터 추출
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
        
        // 특보 데이터 로드 (별도 테이블 활용)
        let specialReports: any[] = [];
        try {
            if (reportRes.ok) specialReports = await reportRes.json();
        } catch(e) {
            console.warn("특보 로딩 실패", e);
        }

        // 공항 정렬 순서 및 표시 이름 정의
        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const DISPLAY_NAMES: { [key: string]: string } = { 'RKSI': '인천', 'RKSS': '김포', 'RKPC': '제주', 'RKPK': '김해', 'RKTU': '청주', 'RKTN': '대구', 'RKPU': '울산', 'RKJB': '무안', 'RKJJ': '광주', 'RKJY': '여수', 'RKNY': '양양', 'RKPS': '사천', 'RKTH': '포항', 'RKJK': '군산', 'RKNW': '원주' };

        // 갱신 시간 결정: DB 레코드의 'time' 필드를 우선 사용
        let latestUpdate = rawJson.last_updated || null;
        if (!latestUpdate && weatherData.length > 0) {
            // DB 항목 중 가장 첫 번째 데이터의 수집 시간을 화면 상단 갱신 시간으로 사용
            latestUpdate = weatherData[0].time; 
        }

        // DB 데이터를 UI에 맞는 인터페이스로 변환
        const mappedData = weatherData.map((item: any) => {
            // 특보 매핑 로직
            const report = specialReports.find((r: any) => r.airport === item.code || (item.name && item.name.includes(r.airport)));
            const advisoryText = report ? report.special_report : (item.report || "-");

            return {
                airportName: DISPLAY_NAMES[item.code] || (item.name ? item.name.replace('공항', '') : '알 수 없음'),
                icao: item.code,
                current: {
                    condition: item.condition || "-",
                    temperature: item.temp ? item.temp.toString().replace('℃', '').trim() : "-",
                    iconCode: mapConditionToIconCode(item.condition || "")
                },
                // 3일 예보 매핑 (공백 제거 포함)
                forecast12h: mapForecast12h(item.forecast_12h || item.forecast || ""),
                advisories: advisoryText === "-" || advisoryText === "" ? "없음" : advisoryText,
                snowfall: item.rain || "-",
                kmaTargetRegion: "-",
                matchingLogic: `수집 시각: ${item.time}`
            };
        });

        // 지정된 순서대로 정렬
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
 * 4. 기타 API 유틸리티 (기존과 동일)
 */
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
    return response.json();
}

export async function fetchSnapshots() {
    const response = await fetch(`${BASE_URL}/api/history/snapshots`, { cache: 'no-store' });
    return response.ok ? response.json() : [];
}

export async function fetchSnapshotData(snapshotId: number) {
    const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`, { cache: 'no-store' });
    return response.ok ? response.json() : null;
}

export async function fetchAirportHistory(airportCode: string) {
    const response = await fetch(`${BASE_URL}/api/history/airport/${airportCode}`, { cache: 'no-store' });
    return response.ok ? response.json() : [];
}
