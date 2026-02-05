import React, { useState } from 'react';
import { AirportWeather } from '../types';
import { fetchForecastFromApi } from '../services/apiService';
import { Loader2, Video, AlertTriangle } from 'lucide-react'; // AlertTriangle 추가
import { AIRPORT_LINKS } from '../constants/airportLinks';

interface WeatherTableProps {
  weatherData: AirportWeather[];
  specialReports: any[]; // App.tsx에서 전달받을 특보 데이터 타입 추가
  isLoading: boolean;
}

const WeatherTable: React.FC<WeatherTableProps> = ({ weatherData, specialReports, isLoading }) => {
  const [selectedAirport, setSelectedAirport] = useState<{ icao: string; name: string } | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [forecastMode, setForecastMode] = useState<'12h' | '3day'>('12h');
  const [forecast3Day, setForecast3Day] = useState<Record<string, any[]>>({});
  const [loading3Day, setLoading3Day] = useState(false);

  const handleRowClick = (icao: string) => {
    const link = AIRPORT_LINKS[icao]?.nuri;
    if (link) window.open(link, '_blank');
    else alert("해당 공항의 날씨누리 링크가 없습니다.");
  };

  // 특정 공항의 특보 데이터를 매칭하는 함수
  const getAirportSpecialReport = (airportName: string) => {
    if (!specialReports) return null;
    const report = specialReports.find((r: any) => r.airport === airportName);
    return report && report.special_report !== '-' ? report.special_report : null;
  };

  const handleForecastModeToggle = async () => {
    const newMode = forecastMode === '12h' ? '3day' : '12h';
    setForecastMode(newMode);

    if (newMode === '3day' && Object.keys(forecast3Day).length === 0) {
      setLoading3Day(true);
      try {
        const forecastPromises = weatherData.map(async (airport) => {
          const data = await fetchForecastFromApi(airport.icao);
          return { icao: airport.icao, data };
        });
        const results = await Promise.all(forecastPromises);
        const forecastMap: Record<string, any[]> = {};
        results.forEach(({ icao, data }) => {
          forecastMap[icao] = data;
        });
        setForecast3Day(forecastMap);
      } catch (error) {
        console.error('Failed to fetch 3-day forecasts:', error);
      } finally {
        setLoading3Day(false);
      }
    }
  };

  const getWeatherIcon = (iconCode: string) => {
    switch (iconCode) {
      case 'sunny': return '☀️';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      case 'snowy': return '❄️';
      case 'storm': return '⛈️';
      default: return '☁️';
    }
  };

  const mapConditionToIcon = (condition: string): string => {
    if (!condition) return 'cloudy';
    if (condition.includes('맑음')) return 'sunny';
    if (condition.includes('흐림') || condition.includes('구름')) return 'cloudy';
    if (condition.includes('비')) return 'rainy';
    if (condition.includes('눈')) return 'snowy';
    if (condition.includes('낙뢰') || condition.includes('천둥')) return 'storm';
    return 'cloudy';
  };

  if (isLoading && weatherData.length === 0) {
    return (
      <div className="table-container">
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>공항</th>
              <th>현재</th>
              <th>
                <button
                  className="forecast-toggle"
                  onClick={handleForecastModeToggle}
                  disabled={loading3Day}
                  title="예보 모드 전환"
                >
                  ▼ {forecastMode === '12h' ? '12h 예보' : '3일 예보'}
                </button>
              </th>
              <th>특보</th>
              <th>적설</th>
              <th>영상</th>
            </tr>
          </thead>
          <tbody>
            {weatherData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>데이터가 없습니다.</td>
              </tr>
            ) : (
              weatherData.map((item) => {
                const specialReportText = getAirportSpecialReport(item.airportName);
                
                return (
                  <tr key={item.icao} onClick={() => handleRowClick(item.icao)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="airport-name">{item.airportName}</div>
                      <span className="airport-code">{item.icao}</span>
                    </td>
                    <td>
                      <div className="weather-current">
                        <span style={{ fontSize: '1.5rem' }}>{getWeatherIcon(item.current.iconCode)}</span>
                        <span className="temp">{item.current.temperature}</span>
                      </div>
                    </td>
                    <td>
                      {forecastMode === '12h' ? (
                        <div className="forecast-icons">
                          {item.forecast12h.map((f, idx) => (
                            <div key={idx} className="forecast-item">
                              <span className="forecast-time">{f.time}</span>
                              <span style={{ fontSize: '1.1rem' }}>{getWeatherIcon(f.iconCode)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="forecast-icons">
                          {loading3Day ? (
                            <Loader2 className="animate-spin" size={16} style={{ margin: '0 auto' }} />
                          ) : forecast3Day[item.icao] && forecast3Day[item.icao].length > 0 ? (
                            forecast3Day[item.icao].slice(0, 3).map((day, idx) => {
                              const dowMatch = day.date.match(/\((.*?)\)/);
                              const dow = dowMatch ? dowMatch[1] : '';
                              return (
                                <div key={idx} className="forecast-item">
                                  <span className="forecast-time" style={{ fontSize: '0.85rem', fontWeight: 400 }}>{dow}</span>
                                  <span style={{ fontSize: '1.1rem' }}>
                                    {day.forecasts && day.forecasts.length > 0
                                      ? getWeatherIcon(mapConditionToIcon(day.forecasts[0].condition))
                                      : '☁️'
                                    }
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                          )}
                        </div>
                      )}
                    </td>
                    {/* [수정] 특보 컬럼: 전달받은 specialReports 데이터를 출력 */}
                    <td style={{ textAlign: 'center' }}>
                      {specialReportText ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          border: '1px solid #fecaca'
                        }}>
                          <AlertTriangle size={12} />
                          {specialReportText}
                        </div>
                      ) : (
                        <span style={{ color: '#e2e8f0' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                      {item.snowfall || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <a
                          href={AIRPORT_LINKS[item.icao]?.cctv || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="video-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!AIRPORT_LINKS[item.icao]?.cctv) {
                              e.preventDefault();
                              alert("해당 공항의 CCTV 링크가 없습니다.");
                            }
                          }}
                        >
                          <Video size={18} />
                          <span>영상</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 예보 모달 로직 (기존과 동일) */}
      {selectedAirport && (
        <div className="modal-overlay" onClick={() => setSelectedAirport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedAirport(null)}>&times;</button>
            <h2 className="modal-title">{selectedAirport.name} ({selectedAirport.icao}) 3일 상세 예보</h2>
            {/* ... 모달 내부 로직 생략 ... */}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherTable;
