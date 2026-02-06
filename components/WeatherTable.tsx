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

  const formatAdvisoryLabel = (raw: string | null | undefined) => {
    if (!raw || raw === '없음' || raw === '-') return '';
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const mapped = parts.map((code) => {
      if (code.startsWith('대설')) {
        if (code.includes('예')) return '대설예비';
        if (code.includes('주')) return '대설주의';
        if (code.includes('경')) return '대설경보';
      }
      return code;
    });
    return mapped.join(', ');
  };

  const handleRowClick = (icao: string) => {
    const link = AIRPORT_LINKS[icao]?.nuri;
    if (link) window.open(link, '_blank');
    else alert("해당 공항의 날씨누리 링크가 없습니다.");
  };

  const handleAirportClick = async (icao: string, name: string) => {
    setSelectedAirport({ icao, name });
    setLoadingForecast(true);
    setForecast([]);
    setActiveTab(0);
    try {
      const data = await fetchForecastFromApi(icao);
      setForecast(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingForecast(false);
    }
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
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              {/* 컬럼별 너비를 강제로 지정하여 간격 조절 */}
              <th style={{ width: '22%', textAlign: 'left', paddingLeft: '12px' }}>공항</th>
              <th style={{ width: '18%' }}>현재</th>
              <th style={{ width: '30%' }}>
                <button
                  className="forecast-toggle"
                  onClick={(e) => { e.stopPropagation(); handleForecastModeToggle(); }}
                  disabled={loading3Day}
                  title="예보 모드 전환"
                >
                  ▼ {forecastMode === '12h' ? '12h' : '3일'}
                </button>
              </th>
              <th style={{ width: '15%' }}>특보</th>
              <th style={{ width: '10%' }}>적설</th>
              <th style={{ width: '10%' }}>영상</th>
            </tr>
          </thead>
          <tbody>
            {weatherData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              weatherData.map((item) => (
                <tr
                  key={item.icao}
                  onClick={() => handleRowClick(item.icao)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ paddingLeft: '12px' }}>
                    <div className="airport-name" style={{ fontSize: '0.9rem' }}>{item.airportName}</div>
                    <span className="airport-code">{item.icao}</span>
                  </td>
                  <td>
                    <div className="weather-current" style={{ gap: '2px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{getWeatherIcon(item.current.iconCode)}</span>
                      <span className="temp" style={{ fontSize: '0.85rem' }}>{item.current.temperature}</span>
                    </div>
                  </td>
                  <td>
                    {forecastMode === '12h' ? (
                      <div className="forecast-icons" style={{ gap: '4px', padding: '4px 6px' }}>
                        {item.forecast12h.map((f, idx) => (
                          <div key={idx} className="forecast-item">
                            <span className="forecast-time" style={{ fontSize: '0.55rem' }}>{f.time}</span>
                            <span style={{ fontSize: '1rem' }}>{getWeatherIcon(f.iconCode)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="forecast-icons" style={{ gap: '4px', padding: '4px 6px' }}>
                        {loading3Day ? (
                          <Loader2 className="animate-spin" size={14} style={{ margin: '0 auto' }} />
                        ) : forecast3Day[item.icao] && forecast3Day[item.icao].length > 0 ? (
                          forecast3Day[item.icao].slice(0, 3).map((day, idx) => {
                            const dowMatch = day.date.match(/\((.*?)\)/);
                            const dow = dowMatch ? dowMatch[1] : '';
                            return (
                              <div key={idx} className="forecast-item">
                                <span className="forecast-time" style={{ fontSize: '0.6rem' }}>{dow}</span>
                                <span style={{ fontSize: '1rem' }}>
                                  {day.forecasts && day.forecasts.length > 0
                                    ? getWeatherIcon(mapConditionToIcon(day.forecasts[0].condition))
                                    : '☁️'}
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
                  <td style={{ textAlign: 'center', padding: '4px 2px' }}>
                    {(() => {
                      const formatted = formatAdvisoryLabel(item.advisories as string);
                      if (!formatted) return <span style={{ color: '#e2e8f0' }}>-</span>;
                      const isSnow = formatted.includes('대설');
                      return (
                        <span className={`advisory-badge ${isSnow ? 'advisory-snow' : 'advisory-plain'}`} style={{ fontSize: '0.65rem', padding: '2px 5px' }}>
                          {formatted}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    {item.snowfall || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <a
                        href={AIRPORT_LINKS[item.icao]?.cctv || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="video-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!AIRPORT_LINKS[item.icao]?.cctv) {
                            e.preventDefault();
                            alert('해당 공항의 CCTV 링크가 없습니다.');
                          }
                        }}
                      >
                        <Video size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedAirport && (
        <div className="modal-overlay" onClick={() => setSelectedAirport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedAirport(null)}>&times;</button>
            <h2 className="modal-title">{selectedAirport.name} ({selectedAirport.icao}) 3일 상세 예보</h2>
            {loadingForecast ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                <p>예보 정보를 불러오는 중입니다...</p>
              </div>
            ) : (
              <>
                <div className="tabs">
                  {forecast.map((day, idx) => (
                    <button key={idx} onClick={() => setActiveTab(idx)} className={`tab-btn ${activeTab === idx ? 'active' : ''}`}>
                      {day.date}
                    </button>
                  ))}
                </div>
                <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ border: 'none' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                      <tr>
                        <th>시간</th><th>날씨</th><th>기온</th><th>풍향</th><th>풍속</th><th>운고</th><th>시정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast[activeTab].forecasts.map((f: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{f.time}</td>
                          <td style={{ textAlign: 'center' }}>{f.condition}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{f.temp}</td>
                          <td style={{ textAlign: 'center' }}>{f.wind_dir}</td>
                          <td style={{ textAlign: 'center' }}>{f.wind_speed}</td>
                          <td style={{ textAlign: 'center' }}>{f.cloud || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{f.visibility}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherTable;
