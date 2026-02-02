import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, Plane } from 'lucide-react';
import { fetchSnapshots, fetchSnapshotData, fetchAirportHistory } from '../services/apiService';
import WeatherTable from '../components/WeatherTable';
import '../styles/amo.css';

interface Snapshot {
    id: number;
    timestamp: string;
    created_at: string;
}

type ViewMode = 'list' | 'snapshot' | 'airport';

const History: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
    const [snapshotData, setSnapshotData] = useState<any[]>([]);
    const [airportHistory, setAirportHistory] = useState<any[]>([]);
    const [selectedAirport, setSelectedAirport] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSnapshots();
    }, []);

    const loadSnapshots = async () => {
        setLoading(true);
        try {
            const data = await fetchSnapshots();
            setSnapshots(data);
        } catch (error) {
            console.error('Failed to load snapshots:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSnapshotClick = async (snapshot: Snapshot) => {
        setLoading(true);
        try {
            const data = await fetchSnapshotData(snapshot.id);
            setSelectedSnapshot(snapshot);
            setSnapshotData(data);
            setViewMode('snapshot');
        } catch (error) {
            console.error('Failed to load snapshot data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAirportClick = async (airportCode: string, airportName: string) => {
        setLoading(true);
        try {
            const history = await fetchAirportHistory(airportCode);
            setAirportHistory(history);
            setSelectedAirport(airportName);
            setViewMode('airport');
        } catch (error) {
            console.error('Failed to load airport history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="amo-container">
            <header>
                <div className="header-title-group">
                    <div className="header-icon">
                        <a onClick={() => (window as any).navigateTo('/')} style={{ cursor: 'pointer' }} title="메인 대시보드">
                            <Plane size={24} fill="currentColor" />
                        </a>
                    </div>
                    <div className="header-info">
                        <h1>날씨 데이터 히스토리</h1>
                        <span>저장된 날씨 스냅샷 조회</span>
                    </div>
                </div>
            </header>

            {viewMode === 'list' && (
                <div className="table-container">
                    <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>저장된 시간대</h2>
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>로딩 중...</p>
                    ) : snapshots.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            저장된 데이터가 없습니다. 메인 페이지에서 데이터를 새로고침하면 자동으로 저장됩니다.
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {snapshots.map((snapshot) => (
                                <div
                                    key={snapshot.id}
                                    onClick={() => handleSnapshotClick(snapshot)}
                                    style={{
                                        padding: '16px 20px',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <Clock size={20} color="#3b82f6" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                                            {snapshot.timestamp}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            저장 시각: {formatDateTime(snapshot.created_at)}
                                        </div>
                                    </div>
                                    <ChevronLeft size={20} color="#94a3b8" style={{ transform: 'rotate(180deg)' }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'snapshot' && selectedSnapshot && (
                <div className="table-container">
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '20px',
                            color: '#475569'
                        }}
                    >
                        <ChevronLeft size={18} />
                        목록으로 돌아가기
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ marginBottom: '4px', color: '#1e293b' }}>{selectedSnapshot.timestamp}</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                전국 공항 날씨 스냅샷
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>저장 시각</div>
                            <div style={{ fontWeight: 600, color: '#475569' }}>{formatDateTime(selectedSnapshot.created_at)}</div>
                        </div>
                    </div>

                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>로딩 중...</p>
                    ) : (
                        <WeatherTable weatherData={snapshotData} isLoading={loading} />
                    )}
                </div>
            )}

            {viewMode === 'airport' && (
                <div className="table-container">
                    <button
                        onClick={() => setViewMode('snapshot')}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '20px',
                            color: '#475569'
                        }}
                    >
                        <ChevronLeft size={18} />
                        스냅샷으로 돌아가기
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                        <div>
                            <h2 style={{ marginBottom: '4px', color: '#1e293b' }}>{selectedAirport} 공항</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                시간대별 날씨 기록
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>로딩 중...</p>
                    ) : airportHistory.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            이 공항의 히스토리가 없습니다.
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {airportHistory.map((record, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '20px',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>
                                            {record.snapshot_timestamp}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            저장: {formatDateTime(record.snapshot_created_at)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontSize: '2rem' }}>
                                                {record.current?.iconCode === 'sunny' ? '☀️' :
                                                    record.current?.iconCode === 'cloudy' ? '☁️' :
                                                        record.current?.iconCode === 'rainy' ? '🌧️' :
                                                            record.current?.iconCode === 'snowy' ? '❄️' :
                                                                record.current?.iconCode === 'storm' ? '⛈️' : '☁️'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>날씨/기온</div>
                                                <div style={{ fontWeight: 600 }}>{record.condition} / {record.temp || record.current?.temperature}</div>
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>특보</div>
                                            <div style={{ fontWeight: 600, color: record.advisories !== '없음' ? '#ef4444' : '#1e293b' }}>
                                                {record.advisories || '-'}
                                            </div>
                                        </div>

                                        {record.wind_dir && (
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>풍향/풍속</div>
                                                <div style={{ fontWeight: 600 }}>{record.wind_dir} {record.wind_speed}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default History;
