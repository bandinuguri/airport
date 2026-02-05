import { AirportWeather, ForecastItem } from "../types";

// 개발 환경: Vite 프록시 사용 (빈 문자열)
// 프로덕션: Vercel에 통합 배포 시 같은 도메인 사용 (빈 문자열)
// 외부 백엔드 사용 시: 환경 변수에서 URL 가져오기
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function parseWeatherResponse(weatherRes: Response): Promise<{
    raw: any[];
    cached?: boolean;
    lastUpdated?: string | null;
    warning?: string | null;
    specialReports?: any[];
}> {
    const raw = await weatherRes.json();
    // Vercel/Supabase 형식: { data, special_reports?, error?, cached?, last_updated? }
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
    // 이전 형식: 배열 직접 반환
    return { raw: Array.isArray(raw) ? raw : [] };
}

export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<{ data: AirportWeather[]; cached?: boolean; lastUpdated?: string | null; warning?: string | null }> => {
    try {
        const force = !!opts?.force;
        const weatherUrl = `${BASE_URL}/api/weather${force ? '?force=true' : ''}`;
        
        // 캐시를 사용하지 않고 매번 DB에서 새 데이터를 가져오도록 설정
        const weatherRes = await fetch(weatherUrl, { cache: 'no-store' });
        const reportRes = await fetch(`${BASE_URL}/api/special-reports`, { cache: 'no-store' });

        if (!weatherRes.ok) throw new Error("기상 데이터를 가져오지 못했습니다.");

        const parsed = await parseWeatherResponse(weatherRes);
        const weatherData = parsed.raw;

        // 특보 데이터 매핑 준비
        let specialReports: any[] = parsed.specialReports ?? [];
        if (specialReports.length === 0) {
            try {
                if (reportRes.ok) specialReports = await reportRes.json();
            } catch (e) {
                console.warn("Retrieving special reports failed", e);
            }
        }

        // 정렬 순서 정의
        const SORT_ORDER = [
            'RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU',
            'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY',
            'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'
        ];

        // 표시 이름 매핑
        const DISPLAY_NAMES: { [key: string]: string } = {
            'RKSI': '인천', 'RKSS': '김포', 'RKPC': '제주', 'RKPK': '김해', 'RKTU': '청주',
            'RKTN': '대구', 'RKPU': '울산', 'RKJB': '무안', 'RKJJ': '광주', 'RKJY': '여수',
            'RKNY': '양양', 'RKPS': '사천', 'RKTH': '포항', 'RKJK': '군산', 'RKNW': '원주'
        };

        // DB 데이터를 화면용 인터페이스로 변환
        const mappedData = weatherData.map((item: any) => {
            // 특보 확인 (현재 DB의 special_reports 컬럼 연동)
            const report = specialReports.find((r: any) => item.code === r.airport || item.name.includes(r.airport));
            const advisoryText = report ? report.special_report : "-";

            return {
                airportName: DISPLAY_NAMES[item.code] || item.name.replace('공항', ''),
                icao: item.code,
                current: {
                    condition: item.condition,
                    temperature: item.temp ? item.temp.toString().replace('℃', '') : "-",
                    iconCode: mapIconClassToCode(item.iconClass || "")
                },
                // [수정] DB의 forecast_12h 필드를 사용하여 예보 버튼 활성화
                forecast12h: mapForecast12h(item.forecast_12h || item.forecast || ""),
                advisories: advisoryText === "-" && item.condition === "-" ? "-" : (advisoryText === "-" ? "없음" : advisoryText),
                snowfall: item.rain || "-", // DB의 'rain' 필드가 적설/강수 정보일 경우 매핑
                kmaTargetRegion: "-",
                matchingLogic: `데이터 수집 시각: ${item.time}`
            };
        });

        // 정렬 적용
        const sorted = mappedData.sort((a: AirportWeather, b: AirportWeather) => {
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
    if (!response.ok) throw new Error('Failed to fetch special reports');
    return response.json();
}

// History API functions
export async function saveWeatherSnapshot(weatherData: any[]) {
    const response = await fetch(`${BASE_URL}/api/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weatherData)
    });
    if (!response.ok) throw new Error('Failed to save snapshot');
    return response.json();
}

export async function fetchSnapshots() {
    const response = await fetch(`${BASE_URL}/api/history/snapshots`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch snapshots');
    return response.json();
}

export async function fetchSnapshotData(snapshotId: number) {
    const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch snapshot data');
    return response.json();
}

export async function fetchAirportHistory(airportCode: string) {
    const response = await fetch(`${BASE_URL}/api/history/airport/${airportCode}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch airport history');
    return response.json();
}

export const fetchForecastFromApi = async (icao: string) => {
    try {
        const response = await fetch(`${BASE_URL}/api/forecast/${icao}`, { cache: 'no-store' });
        if (!response.ok) throw new Error("Failed to fetch forecast data");
        return await response.json();
    } catch (error) {
        console.error("Forecast API Error:", error);
        throw error;
    }
};

// 아이콘 클래스 매핑 헬퍼
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

// 예보 문자열("맑음 > 흐림 > 비")을 객체 배열로 변환
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    if (!forecastStr || forecastStr === " - " || forecastStr === "-") {
        return [
            { time: "4h", iconCode: "sunny" },
            { time: "8h", iconCode: "sunny" },
            { time: "12h", iconCode: "sunny" }
        ];
    }

    const conditions = forecastStr.split(' > ');
    return [
        { time: "4h", iconCode: mapConditionToIconCode(conditions[0] || "") },
        { time: "8h", iconCode: mapConditionToIconCode(conditions[1] || "") },
        { time: "12h", iconCode: mapConditionToIconCode(conditions[2] || "") }
    ];
};

const mapConditionToIconCode = (condition: string): string => {
    if (!condition) return 'sunny';
    if (condition.includes('맑음')) return 'sunny';
    if (condition.includes('흐림') || condition.includes('구름') || condition.includes('점차')) return 'cloudy';
    if (condition.includes('비')) return 'rain';
    if (condition.includes('눈')) return 'snow';
    if (condition.includes('박무') || condition.includes('안개')) return 'mist';
    if (condition.includes('낙뢰') || condition.includes('번개')) return 'thunderstorm';
    return 'sunny';
};
