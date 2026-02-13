import React, { useState } from 'react';
import { AirportWeather } from '../types';
import { fetchForecastFromApi } from '../services/apiService';
import { Loader2, Video } from 'lucide-react';
import { AIRPORT_LINKS } from '../constants/airportLinks';

interface WeatherTableProps {
  weatherData: AirportWeather[];
  isLoading: boolean;
}

const WeatherTable: React.FC<WeatherTableProps> = ({ weatherData, isLoading }) => {
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
        results.forEach(({ icao, data }) => { forecastMap[icao] = data; });
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
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
            ) : (
              weatherData.map((item) => (
                <tr key={item.icao} onClick={() => handleRowClick(item.icao)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="airport-name">{item.airportName === "포항경주" ? "포항" : item.airportName}</div>
                    <span className="airport-code">{item.icao}</span>
                  </td>
                  <td>
                    <div className="weather-current">
                      <span style={{ fontSize: '1.5rem' }}>{getWeatherIcon(item.current.iconCode)}</span>
                      <span className="temp">{item.current.temperature}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="forecast-icons">
                        {forecastMode === '12h' ? (
                          item.forecast12h.map((f, idx) => (
                            <div key={idx} className="forecast-item">
                              <span className="forecast-time">{f.time}</span>
                              <span className="forecast-icon-display">{getWeatherIcon(f.iconCode)}</span>
                            </div>
                          ))
                        ) : (
                          loading3Day ? (
                            <Loader2 className="animate-spin" size={16} style={{ margin: '0 auto' }} />
                          ) : forecast3Day[item.icao] && forecast3Day[item.icao].length > 0 ? (
                            forecast3Day[item.icao].slice(0, 3).map((day, idx) => (
                              <div key={idx} className="forecast-item">
                                <span className="forecast-time" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
                                  {day.date.match(/\((.*?)\)/)?.[1] || ''}
                                </span>
                                <span className="forecast-icon-display">
                                  {day.forecasts?.[0] ? getWeatherIcon(mapConditionToIcon(day.forecasts[0].condition)) : '☁️'}
                                </span>
                              </div>
                            ))
                          ) : <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                    {(() => {
                      if (!item.advisories || item.advisories === '없음' || item.advisories === '-') return <span style={{ color: '#e2e8f0' }}>-</span>;
                      const parts = String(item.advisories).split(',').map(p => p.trim());
                      const snow = parts.filter(p => p.includes('대설')).map(p => p.includes('예') ? '대설예비' : p.includes('주') ? '대설주의' : '대설경보');
                      const gen = parts.filter(p => !p.includes('대설')).slice(0, 2);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          {gen.length > 0 && <div className="advisory-general-text">{gen.join('·')}</div>}
                          {snow.map((s, i) => <span key={i} className="advisory-badge advisory-snow-emphasized">{s}</span>)}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                    {(() => {
                      const raw = String(item.snowfall || '-').replace(/[a-zA-Z]/g, '').trim();
                      if (raw === '-' || isNaN(parseFloat(raw))) return '-';
                      return (parseFloat(raw) / 10).toFixed(2);
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <a href={AIRPORT_LINKS[item.icao]?.cctv} target="_blank" className="video-link" onClick={e => e.stopPropagation()}>
                        <Video size={18} /><span>영상</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* ... (Modal 코드는 동일) ... */}
    </div>
  );
};

export default WeatherTable;
