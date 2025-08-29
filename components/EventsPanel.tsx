import React, { useState, useEffect, useCallback } from 'react';
import type { ActiveEvent } from '../types';

const API_BASE_URL = '/api';

interface EventsPanelProps {
    token: string | null;
}

const formatBonus = (type: string, value: number): string => {
    switch(type) {
        case 'qi_multiplier':
            return `Tốc độ tu luyện x${value}`;
        case 'breakthrough_add':
            return `Tỷ lệ đột phá +${(value * 100).toFixed(0)}%`;
        default:
            return "Phúc lợi đặc biệt";
    }
};

const EventsPanel: React.FC<EventsPanelProps> = ({ token }) => {
    const [events, setEvents] = useState<ActiveEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/events/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải sự kiện.');
            const data = await response.json();
            setEvents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return (
        <div className="flex-grow bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col min-h-0">
            <h3 className="text-md font-semibold text-emerald-400 mb-2 flex-shrink-0">Thiên Địa Sự Kiện</h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-grow">
                {isLoading && <p className="text-sm text-slate-500 text-center">Đang tải...</p>}
                {!isLoading && events.length === 0 && (
                    <p className="text-sm text-slate-500 text-center pt-8">Hiện tại trời yên biển lặng, chưa có sự kiện nào diễn ra.</p>
                )}
                {events.map(event => (
                    <div key={event.id} className="bg-slate-800/60 p-3 rounded-lg">
                        <h4 className="font-bold text-cyan-400">{event.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 italic">{event.description}</p>
                        <p className="text-xs font-semibold text-amber-300 mt-2">
                           {formatBonus(event.bonus_type, event.bonus_value)}
                        </p>
                        <p className="text-right text-xs text-slate-500 mt-1">
                            Kết thúc: {new Date(event.expires_at).toLocaleString('vi-VN')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventsPanel;