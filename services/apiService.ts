// services/apiService.ts

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const mapConditionToIconCode = (condition: string): string => {
  const text = condition || "";
  if (text.includes('맑음')) return 'sunny';
  if (text.includes('흐림') || text.includes('구름')) return 'cloudy';
  if (text.includes('비')) return 'rain';
  if (text.includes('눈')) return 'snow';
  if (text.includes('안개') || text.includes('박무') || text.includes('연무')) return 'mist';
  return 'cloudy';
};

const mapForecast12h = (forecastStr: string): any[] => {
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
    if (!response.ok) throw new Error("Network error");
    const rawJson = await response.json();

    const weatherData = Array.isArray(rawJson.data) ? rawJson.data : [];
    const globalReports = Array.isArray(rawJson.special_reports) ? rawJson.special_reports : [];
    
    // [수정] 서버 원본 시간을 그대로 보존하여 반환
    const rawTime = rawJson.updated_at || (weatherData.length > 0 ? weatherData[0].time : new Date().toISOString());

    const mappedData = weatherData.map((item: any) => {
      const foundReport = globalReports.find((r: any) =>
        item.name.includes(r.airport) || r.airport.includes(item.name.replace('공항', ''))
      );

      return {
        ...item,
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
      };
    });

    return { data: mappedData, lastUpdated: rawTime, special_reports: globalReports };
  } catch (error) {
    return { data: [], lastUpdated: null, special_reports: [] };
  }
};

// 기존 함수들 유지 (빌드 에러 방지)
export const saveWeatherSnapshot = async (data: any) => ({ success: true });
export const fetchForecastFromApi = async (icao: string) => null;
export const fetchSpecialReportsFromApi = async () => [];
export const fetchSnapshots = async () => [];
export const fetchSnapshotData = async (id: number) => null;
export const fetchAirportHistory = async (icao: string) => [];
