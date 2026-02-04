
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
        const weatherRes = await fetch(weatherUrl);
        // Vercel API는 weather 한 번에 data + special_reports 반환 → 별도 호출 생략
        const reportRes = await fetch(`${BASE_URL}/api/special-reports`);

        if (!weatherRes.ok) {
            let msg = "기상 데이터를 가져오지 못했습니다.";
            try {
                const errBody = await weatherRes.json().catch(() => ({}));
                const detail = errBody?.detail ?? errBody?.error ?? errBody?.message;
                if (detail) msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
            } catch {
                if (weatherRes.status === 502 || weatherRes.status === 504)
                    msg = "백엔드 서버에 연결할 수 없습니다. 터미널에서 'npm run dev'로 실행했는지 확인하세요.";
            }
            throw new Error(msg);
        }

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

        // Defined Sort Order
        const SORT_ORDER = [
            'RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU',
            'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY',
            'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'
        ];

        // Display Name Mapping
        const DISPLAY_NAMES: { [key: string]: string } = {
            'RKSI': '인천', 'RKSS': '김포', 'RKPC': '제주', 'RKPK': '김해', 'RKTU': '청주',
            'RKTN': '대구', 'RKPU': '울산', 'RKJB': '무안', 'RKJJ': '광주', 'RKJY': '여수',
            'RKNY': '양양', 'RKPS': '사천', 'RKTH': '포항', 'RKJK': '군산', 'RKNW': '원주'
        };

        // Map scraper data to AirportWeather interface
        const mappedData = weatherData.map((item: any) => {
            // Find matching special report
            const report = specialReports.find((r: any) => item.name.includes(r.airport));
            const advisoryText = report ? report.special_report : "-";

            return {
                airportName: DISPLAY_NAMES[item.code] || item.name.replace('공항', ''),
                icao: item.code,
                current: {
                    condition: item.condition,
                    temperature: item.temp,
                    iconCode: mapIconClassToCode(item.iconClass)
                },
                forecast12h: mapForecast12h(item.forecast_12h),
                advisories: advisoryText === "-" && item.condition === "-" ? "-" : (advisoryText === "-" ? "없음" : advisoryText),
                snowfall: "-",
                kmaTargetRegion: "-",
                matchingLogic: `데이터 수집 시각: ${item.time}`
            };
        });

        // Sort data
        const sorted = mappedData.sort((a: AirportWeather, b: AirportWeather) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        return { data: sorted, cached: parsed.cached, lastUpdated: parsed.lastUpdated, warning: parsed.warning };
    } catch (error: any) {
        console.error("API Fetch Error:", error);
        const msg = error?.message ?? String(error);
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed"))
            throw new Error("백엔드 서버에 연결할 수 없습니다. 터미널에서 'npm run dev'로 실행했는지 확인하세요.");
        throw error;
    }
};

export async function fetchSpecialReportsFromApi() {
    const response = await fetch(`${BASE_URL}/api/special-reports`);
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
    const response = await fetch(`${BASE_URL}/api/history/snapshots`);
    if (!response.ok) throw new Error('Failed to fetch snapshots');
    return response.json();
}

export async function fetchSnapshotData(snapshotId: number) {
    const response = await fetch(`${BASE_URL}/api/history/snapshot/${snapshotId}`);
    if (!response.ok) throw new Error('Failed to fetch snapshot data');
    return response.json();
}

export async function fetchAirportHistory(airportCode: string) {
    const response = await fetch(`${BASE_URL}/api/history/airport/${airportCode}`);
    if (!response.ok) throw new Error('Failed to fetch airport history');
    return response.json();
}

export const fetchForecastFromApi = async (icao: string) => {
    try {
        const response = await fetch(`${BASE_URL}/api/forecast/${icao}`);
        if (!response.ok) throw new Error("Failed to fetch forecast data");
        return await response.json();
    } catch (error) {
        console.error("Forecast API Error:", error);
        throw error;
    }
};

// Helper to map scraper's icon class to our iconCode
const mapIconClassToCode = (iconClass: string): string => {
    if (iconClass.includes('sunny')) return 'sunny';
    if (iconClass.includes('cloudy')) return 'cloudy';
    if (iconClass.includes('rain')) return 'rain';
    if (iconClass.includes('snow')) return 'snow';
    if (iconClass.includes('mist')) return 'mist';
    if (iconClass.includes('wind')) return 'wind';
    if (iconClass.includes('thunder')) return 'thunderstorm';
    return 'sunny'; // Default
};

// Helper to map forecast string "A > B > C" to ForecastItem array
const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    if (!forecastStr || forecastStr === " - ") {
        return [
            { time: "4h", iconCode: "sunny" },
            { time: "8h", iconCode: "sunny" },
            { time: "12h", iconCode: "sunny" }
        ];
    }

    const conditions = forecastStr.split(' > ');
    return [
        { time: "4h", iconCode: mapConditionToIconCode(conditions[0]) },
        { time: "8h", iconCode: mapConditionToIconCode(conditions[1]) },
        { time: "12h", iconCode: mapConditionToIconCode(conditions[2]) }
    ];
};

const mapConditionToIconCode = (condition: string): string => {
    if (!condition) return 'sunny';
    if (condition.includes('맑음')) return 'sunny';
    if (condition.includes('흐림') || condition.includes('구름')) return 'cloudy';
    if (condition.includes('비')) return 'rain';
    if (condition.includes('눈')) return 'snow';
    if (condition.includes('박무') || condition.includes('안개')) return 'mist';
    if (condition.includes('낙뢰')) return 'thunderstorm';
    return 'sunny';
};
