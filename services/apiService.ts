import { AirportWeather, ForecastItem } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 1. 날짜 오류(NaN) 해결
 * 서버에서 오는 ISO 8601 문자열이나 "2026-02-05..." 형태를 모두 처리합니다.
 */
const formatKoreanDate = (dateStr: string): string => {
    if (!dateStr) return "갱신 중...";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
             // 숫자가 아닌 경우 숫자만 추출 시도
             const d = dateStr.match(/\d+/g);
             if (d && d.length >= 5) return `${d[0].slice(-2)}.${d[1]}.${d[2]}. ${d[3]}:${d[4]}`;
             return "시간 정보 없음";
        }
        
        const yy = date.getFullYear().toString().slice(-2);
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');
        return `${yy}.${m}.${d}. ${hh}:${mm}`;
    } catch {
        return "갱신 중...";
    }
};

const mapConditionToIconCode = (condition: string): string => {
    const text = condition || "";
    if (text.includes('맑음')) return 'sunny';
    if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
    if (text.includes('비')) return 'rain';
    if (text.includes('눈')) return 'snow';
    return 'sunny';
};

const mapForecast12h = (forecastStr: string): ForecastItem[] => {
    const defaultForecast = [{ time: "4h", iconCode: "sunny" }, { time: "8h", iconCode: "sunny" }, { time: "12h", iconCode: "sunny" }];
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

export const fetchWeatherFromApi = async (opts?: { force?: boolean }) => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const rawJson = await response.json();
        
        // [중요] DB에서 가져온 원본 데이터 구조에 맞게 할당
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
        const specialReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];
        
        // 갱신 시간 (updated_at 사용)
        const lastUpdated = formatKoreanDate(rawJson.updated_at);

        const mappedData: AirportWeather[] = weatherData.map((item: any) => {
            // DB의 special_reports 배열에서 해당 공항 이름이 포함된 특보 찾기
            const foundReport = specialReports.find((r: any) => 
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
                // 특보 데이터 매칭
                advisories: (foundReport && foundReport.special_report !== '-') ? foundReport.special_report : "없음",
                snowfall: item.rain || "-",
            };
        });

        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        const sorted = mappedData.sort((a, b) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        // App.tsx에서 활용할 수 있게 special_reports도 같이 반환
        return { data: sorted, lastUpdated, special_reports: specialReports };
    } catch (error) {
        console.error("API Error:", error);
        return { data: [], lastUpdated: "연결 오류", special_reports: [] };
    }
};

// ... 나머지 Mock 함수들 유지
export const fetchForecastFromApi = async (icao: string) => [];
export const saveWeatherSnapshot = async (data: any[]) => ({ success: true });
