
import { AirportWeather, ForecastItem } from "../types";

const BASE_URL = ""; // Vite proxy will handle this

export const fetchWeatherFromApi = async (): Promise<AirportWeather[]> => {
    try {
        const [weatherRes, reportRes] = await Promise.all([
            fetch(`${BASE_URL}/api/weather`),
            fetch(`${BASE_URL}/api/special-reports`)
        ]);

        if (!weatherRes.ok) throw new Error("Failed to fetch weather data");
        const weatherData = await weatherRes.json();

        let specialReports: any[] = [];
        try {
            if (reportRes.ok) {
                specialReports = await reportRes.json();
            }
        } catch (e) {
            console.warn("Retriving special reports failed", e);
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
        return mappedData.sort((a: AirportWeather, b: AirportWeather) => {
            const indexA = SORT_ORDER.indexOf(a.icao);
            const indexB = SORT_ORDER.indexOf(b.icao);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
};

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
