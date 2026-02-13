  return (
    <div className="w-full">
      <div className="list-controls">
        <span className="forecast-mode-label">공항별 기상 정보</span>
        <button
          className="forecast-toggle"
          onClick={handleForecastModeToggle}
          disabled={loading3Day}
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
              {/* Header: Airport & Current Temp */}
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

              {/* Forecast Section (Requirement 4) */}
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
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" size={16} /></div>
                  ) : forecast3Day[item.icao]?.slice(0, 3).map((day, idx) => (
                    <div key={idx} className="forecast-item">
                      <span className="forecast-time" style={{ fontSize: '13px' }}>{day.date.match(/\((.*?)\)/)?.[1] || ''}</span>
                      <span className="forecast-icon-display">{getWeatherIcon(mapConditionToIcon(day.forecasts?.[0]?.condition))}</span>
                    </div>
                  )) || <div style={{ width: '100%', textAlign: 'center' }}>-</div>
                )}
              </div>

              {/* Footer: Advisories, Snow, Video */}
              <div className="card-footer">
                <div className="footer-stats">
                  <div className="stat-item" style={{ minWidth: '110px' }}>
                    <span className="stat-label">특보</span>
                    <span className="stat-value">
                      {(() => {
                        if (!item.advisories || item.advisories === '없음' || item.advisories === '-') return '-';
                        const parts = item.advisories.split(',').map(p => p.trim());
                        const snow = parts.filter(p => p.includes('대설')).map(p => p.includes('예') ? '대설예' : p.includes('주') ? '대설주' : '대설경');
                        const general = parts.filter(p => !p.includes('대설')).slice(0, 2);
                        return (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {general.length > 0 && <span className="advisory-general-text" style={{ fontSize: '13px' }}>{general.join('·')}</span>}
                            {snow.map((s, i) => <span key={i} className="advisory-badge advisory-snow-emphasized" style={{ padding: '2px 6px', fontSize: '12px' }}>{s}</span>)}
                          </div>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">적설</span>
                    <span className="stat-value" style={{ fontSize: '13px' }}>
                      {(() => {
                        const raw = String(item.snowfall || '-').replace(/[a-zA-Z]/g, '').trim();
                        return (raw === '-' || isNaN(parseFloat(raw))) ? '-' : (parseFloat(raw) / 10).toFixed(1) + 'cm';
                      })()}
                    </span>
                  </div>
                </div>
                <div className="video-action">
                  <a href={AIRPORT_LINKS[item.icao]?.cctv} target="_blank" className="video-link" style={{ flexDirection: 'row', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                    <Video size={16} /><span style={{ fontSize: '13px' }}>영상</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* ... Modal Code ... */}
    </div>
  );
