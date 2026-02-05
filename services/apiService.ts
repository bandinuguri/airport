const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const mapConditionToIconCode = (condition: string): string => {
    const text = condition || "";
    if (text.includes('맑음')) return 'sunny';
    if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
    if (text.includes('비')) return 'rain';
    if (text.includes('눈')) return 'snow';
    if (text.includes('안개') || text.includes('박무') || text.includes('연무')) return 'mist';
    return 'sunny';
};

// [복구] 12시간 예보 파싱 로직
const mapForecast12h = (forecastStr: string) => {
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

export const fetchWeatherFromApi = async (opts?: { force?: boolean }): Promise<any> => {
    try {
        const response = await fetch(`${BASE_URL}/api/weather${opts?.force ? '?force=true' : ''}`, { 
            cache: 'no-store'
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        const rawJson = await response.json();
        
        const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
        const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];
        
        // [중요] DB의 updated_at을 원본 그대로 전달
        const rawTime = rawJson.updated_at || (weatherData.length > 0 ? weatherData[0].time : null);

        const mappedData = weatherData.map((item: any) => {
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
                // [복구됨] 예보 정보 다시 매핑
                forecast12h: mapForecast12h(item.forecast_12h || ""),
                advisories: (foundReport && foundReport.special_report !== "-") ? foundReport.special_report : (item.report !== "-" ? item.report : "없음"),
                snowfall: item.rain || "-",
            };
        });

        const SORT_ORDER = ['RKSI', 'RKSS', 'RKPC', 'RKPK', 'RKTU', 'RKTN', 'RKPU', 'RKJB', 'RKJJ', 'RKJY', 'RKNY', 'RKPS', 'RKTH', 'RKJK', 'RKNW'];
        mappedData.sort((a: any, b: any) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        return { data: mappedData, lastUpdated: rawTime, special_reports: globalReports };
    } catch (error) {
        return { data: [], lastUpdated: null, special_reports: [] };
    }
};

export const saveWeatherSnapshot = async (data: any) => ({ success: true });
export const fetchForecastFromApi = async (icao: string) => null;
