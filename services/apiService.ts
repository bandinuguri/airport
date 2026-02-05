import { AirportWeather, ForecastItem } from "../types";

// 개발 환경: Vite 프록시 사용 (빈 문자열)
// 프로덕션: Vercel에 통합 배포 시 같은 도메인 사용 (빈 문자열)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function parseWeatherResponse(weatherRes: Response): Promise<{
    raw: any[];
    cached?: boolean;
    lastUpdated?: string | null;
    warning?: string | null;
    specialReports?: any[];
}> {
    const raw = await weatherRes.json();
    if (raw && typeof raw === 'object' && 'data' in raw) {
        const dataArr = Array.isArray(raw.data) ? raw.data : [];
        return {
            raw: dataArr,
            cached: !!raw.cached,
            lastUpdated: raw.last_updated ?? null,
            warning: raw.error ?? null,
            specialReports: Array.isArray(raw.special_reports) ? raw.special_reports : undefined,
        };
    }
    return { raw: Array.isArray(raw) ? raw : [] };
}

export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ data: AirportWeather[]; cached?: boolean; lastUpdated?: string | null; warning?: string | null }> => {
    try {
        const force = !!opts?.force;
        const weatherUrl = `${BASE_URL}/api/weather${force ? '?force=true' : ''}`;
        
        const weatherRes = await fetch(weatherUrl, { cache: 'no-store' });
        const reportRes = await fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' });

        if (!weatherRes.ok) throw new Error("기상 데이터를 가져오지 못했습니다.");

        const parsed = await parseWeatherResponse(weatherRes);
        const weatherData = parsed.raw;

        let specialReports: any[] = parsed.specialReports ?? [];
        if (specialReports.length === 0) {
            try {
                if (reportRes.ok) specialReports = await reportRes.json();
            } catch (e) {
                console.warn("Retrieving special reports failed", e);
            }
        }

        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const DISPLAY_NAMES: { [key: string]: string } = { 'RKSI': '인천', 'RKSS': '김포', 'RKPC': '제주', 'RKPK': '김해', 'RKTU': '청주', 'RKTN': '대구', 'RKPU': '울산', 'RKJB': '무안', 'RKJJ': '광주', 'RKJY': '여수', 'RKNY': '양양', 'RKPS': '사천', 'RKTH': '포항', 'RKJK': '군산', 'RKNW': '원주' };

        const mappedData = weatherData.map((item: any) => {
            // 특보 로직 보강: DB의 special_reports 컬럼과 item 내부의 report 필드를 모두 확인
            const report = specialReports.find((r: any) => item.code === r.airport || item.name.includes(r.airport));
            const advisoryText = report ? report.special_report : (item.report || "-");

            return {
                airportName: DISPLAY_NAMES[item.code] || item.name.replace('공항', ''),
                icao: item.code,
                current: {
                    condition: item.condition,
                    temperature: item.temp ? item.temp.toString().replace('℃', '') : "-",
                    iconCode: mapIconClassToCode(item.iconClass || "")
                },
                // DB의 forecast_12h 필드를 안전하게 매핑
                forecast12h: mapForecast12h(item.forecast_12h || item.forecast || ""),
                advisories: advisoryText === "-" || advisoryText === "" ? "없음" : advisoryText,
                snowfall: item.rain || "-", 
                kmaTargetRegion: "-",
                matchingLogic: `데이터 수집 시각: ${item.time}`
            };
        });

        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        
        return { data: sorted, cached: false, lastUpdated: parsed.lastUpdated, warning: parsed.warning };
    } catch (error: any) {
        console.error("API Fetch Error:", error);
        throw error;
    }
};

export async function fetchSpecialReportsFromApi() {
    const response = await fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' });
    return response.ok ? response.json() : [];
}

// ... 중간 History 관련 함수 생략 (기존과 동일) ...
export async function saveWeatherSnapshot(weatherData: any[]) { const response = await fetch(`${BASE_URL}/api/history/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(weatherData) }); return response.json(); }
export async function fetchSnapshots() { const response = await fetch(`${BASE_URL}/api/history/snapshots`, { cache: 'no-store' }); return response.json(); }
export async function fetchSnapshotData(snapshotId: number) { const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`, { cache: 'no-store' }); return response.json(); }
export async function fetchAirportHistory(airportCode: string) { const response = await fetch(`${BASE_URL}/api/history/airport/${airportCode}`, { cache: 'no-store' }); return response.json(); }

export const fetchForecastFromApi = async (icao: string) => {
    const response = await fetch(`${BASE_URL}/api/forecast/${icao}`, { cache: 'no-store' });
    return response.ok ? response.json() : null;
};

const mapIconClassToCode = (iconClass: string): string => {
    const lower = iconClass.toLowerCase();
    if (lower.includes('sunny') || lower.includes('clear')) return 'sunny';
    if (lower.includes('cloudy') || lower.includes('mostly')) return 'cloudy';
    if (lower.includes('rain')) return 'rain';
    if (lower.includes('snow')) return 'snow';
    if (lower.includes('mist') || lower.includes('fog')) return 'mist';
    if (lower.includes('wind')) return 'wind';
    if (lower.includes('thunder')) return 'thunderstorm';
    return 'sunny';
};

// [핵심 수정] 예보 문자열 분리 시 공백 제거(trim) 로직 추가
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    if (!forecastStr || forecastStr === " - " || forecastStr === "-") {
        return [
            { time: "4h", iconCode: "sunny" },
            { time: "8h", iconCode: "sunny" },
            { time: "12h", iconCode: "sunny" }
        ];
    }

    // '>' 문자로 자른 후 각 텍스트의 앞뒤 공백을 완벽히 제거합니다.
    const conditions = forecastStr.split('>').map(s => s.trim());
    
    return [
        { time: "4h", iconCode: mapConditionToIconCode(conditions[0] || "") },
        { time: "8h", iconCode: mapConditionToIconCode(conditions[1] || "") },
        { time: "12h", iconCode: mapConditionToIconCode(conditions[2] || "") }
    ];
};

const mapConditionToIconCode = (condition: string): string => {
    if (!condition) return 'sunny';
    // 공백이 제거된 상태이므로 정확한 매칭이 가능합니다.
    if (condition.includes('맑음')) return 'sunny';
    if (condition.includes('흐림') || condition.includes('구름') || condition.includes('점차')) return 'cloudy';
    if (condition.includes('비')) return 'rain';
    if (condition.includes('눈')) return 'snow';
    if (condition.includes('박무') || condition.includes('안개')) return 'mist';
    if (condition.includes('낙뢰') || condition.includes('번개')) return 'thunderstorm';
    return 'sunny';
};
