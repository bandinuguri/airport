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
      <div className="list-controls">
        <span className="forecast-mode-label">공항별 기상 정보</span>
        <button
          className="forecast-toggle"
          onClick={handleForecastModeToggle}
          disabled={loading3Day}
          title="예보 모드 전환"
        >
          {forecastMode === '12h' ? '🕒 12h 예보' : '📅 3일 예보'} ▼
        </button>
      </div>

      <div className="weather-list">
        {weatherData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: 'white', borderRadius: '14px' }}>
            데이터가 없습니다.
          </div>
        ) : (
          weatherData.map((item) => (
            <div
              key={item.icao}
              className="weather-card"
              onClick={() => handleRowClick(item.icao)}
            >
              <div className="card-header">
                <div className="airport-info">
                  <div className="airport-name">
                    {item.airportName === "포항경주" ? "포항" : item.airportName}
                    <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '6px', fontWeight: 400 }}>{item.icao}</span>
                  </div>
                </div>
                <div className="current-weather">
                  <span className="current-icon">{getWeatherIcon(item.current.iconCode)}</span>
                  <span className="current-temp">{item.current.temperature}</span>
                </div>
              </div>

              <div className="forecast-container">
                {forecastMode === '12h' ? (
                  item.forecast12h.map((f, idx) => (
                    <div key={idx} className="forecast-item">
                      <span className="forecast-time">{f.time}</span>
                      <span className="forecast-icon-display">{getWeatherIcon(f.iconCode)}</span>
                    </div>
                  ))
                ) : (
                  loading3Day ? (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <Loader2 className="animate-spin" size={16} />
                    </div>
                  ) : forecast3Day[item.icao] && forecast3Day[item.icao].length > 0 ? (
                    forecast3Day[item.icao].slice(0, 3).map((day, idx) => {
                      const dowMatch = day.date.match(/\((.*?)\)/);
                      const dow = dowMatch ? dowMatch[1] : '';
                      return (
                        <div key={idx} className="forecast-item">
                          <span className="forecast-time" style={{ fontSize: '13px' }}>{dow}</span>
                          <span className="forecast-icon-display">
                            {day.forecasts && day.forecasts.length > 0
                              ? getWeatherIcon(mapConditionToIcon(day.forecasts[0].condition))
                              : '☁️'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>-</div>
                  )
                )}
              </div>

              <div className="card-footer">
                <div className="footer-stats">
                  <div className="stat-item" style={{ minWidth: '110px' }}>
                    <span className="stat-label">특보</span>
                    <div className="stat-value">
                      {(() => {
                        if (!item.advisories || item.advisories === '없음' || item.advisories === '-') {
                          return <span style={{ color: '#e2e8f0' }}>-</span>;
                        }
                        const parts = String(item.advisories).split(',').map((p) => p.trim()).filter(Boolean);
                        const snowReports: string[] = [];
                        const generalReports: string[] = [];

                        parts.forEach(part => {
                          if (part.includes('대설')) {
                            let label = part;
                            if (part.includes('예')) label = '대설예';
                            else if (part.includes('주')) label = '대설주';
                            else if (part.includes('경')) label = '대설경';
                            snowReports.push(label);
                          } else {
                            generalReports.push(part);
                          }
                        });
                        const displayGeneral = generalReports.length >= 3 ? generalReports.slice(0, 2) : generalReports;
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            {displayGeneral.length > 0 && (
                              <span className="advisory-general-text" style={{ fontSize: '13px' }}>{displayGeneral.join('·')}</span>
                            )}
                            {snowReports.map((s, i) => (
                              <span key={i} className="advisory-badge advisory-snow-emphasized" style={{ padding: '2px 6px', fontSize: '12px' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">적설</span>
                    <span className="stat-value" style={{ fontSize: '13px' }}>
                      {(() => {
                        const raw = String(item.snowfall || '-').replace(/\s*[a-zA-Z]+\s*$/gi, '').trim();
                        if (raw === '-' || isNaN(parseFloat(raw))) return '-';
                        const cmValue = (parseFloat(raw) / 10).toFixed(1);
                        return parseFloat(cmValue) === 0 ? '0' : cmValue + 'cm';
                      })()}
                    </span>
                  </div>
                </div>
                <div className="video-action">
                  <a
                    href={AIRPORT_LINKS[item.icao]?.cctv || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="video-link"
                    style={{ flexDirection: 'row', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!AIRPORT_LINKS[item.icao]?.cctv) {
                        e.preventDefault();
                        alert('해당 공항의 CCTV 링크가 없습니다.');
                      }
                    }}
                  >
                    <Video size={16} />
                    <span style={{ display: 'inline', fontSize: '13px' }}>영상</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAirport && (
        <div className="modal-overlay" onClick={() => setSelectedAirport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedAirport(null)}>
              &times;
            </button>
            <h2 className="modal-title">
              {selectedAirport.name} ({selectedAirport.icao}) 상세 예보
            </h2>

            {loadingForecast ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                <p>예보 정보를 불러오는 중입니다...</p>
              </div>
            ) : forecast.length > 0 ? (
              <>
                <div className="tabs">
                  {forecast.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`tab-btn ${activeTab === idx ? 'active' : ''}`}
                    >
                      {day.date}
                    </button>
                  ))}
                </div>
                <div className="modal-table-container">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th>시간</th>
                        <th>날씨</th>
                        <th>기온</th>
                        <th>풍속</th>
                        <th>운고</th>
                        <th>시정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast[activeTab].forecasts.map((f: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{f.time}</td>
                          <td>{f.condition}</td>
                          <td style={{ fontWeight: 700, color: '#2563eb' }}>{f.temp}</td>
                          <td>{f.wind_speed}</td>
                          <td>{f.cloud || '-'}</td>
                          <td>{f.visibility}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                예보 정보를 가져오지 못했습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherTable;
