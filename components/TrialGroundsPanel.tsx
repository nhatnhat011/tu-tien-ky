import React, { useState, useEffect } from 'react';
import type { Player, GameEvent, TrialZone, Reward, GameData } from '../types';
import { formatNumber } from '../constants';

const API_BASE_URL = '/api';

interface TrialGroundsPanelProps {
    player: Player;
    token: string | null;
    lastChallengeTime: { [key: string]: number };
    onChallengeResult: (data: any) => void;
    addEvent: (message: string, type: GameEvent['type']) => void;
    gameData: GameData;
}

const formatReward = (reward: Reward, gameData: GameData): string | null => {
    switch (reward.type) {
        case 'qi': return `${formatNumber(reward.amount)} Linh Khí`;
        case 'herb':
            const herb = gameData.HERBS.find(h => h.id === reward.herbId);
            return `${herb?.name} x${reward.amount}`;
        default: return null;
    }
};

const TrialGroundsPanel: React.FC<TrialGroundsPanelProps> = ({ player, token, lastChallengeTime, onChallengeResult, addEvent, gameData }) => {
    const [isFighting, setIsFighting] = useState<string | null>(null); // Store the ID of the zone being fought
    const [time, setTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleChallenge = async (zone: TrialZone) => {
        if (!token || isFighting) return;
        
        setIsFighting(zone.id);
        addEvent(`Bắt đầu khiêu chiến ${zone.name}...`, 'info');

        try {
            const response = await fetch(`${API_BASE_URL}/challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ zoneId: zone.id }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Khiêu chiến thất bại.');
            }
            onChallengeResult(data);
        } catch (err) {
            addEvent((err as Error).message, 'danger');
        } finally {
            setIsFighting(null);
        }
    };
    
    const renderCooldownTimer = (zoneId: string, cooldownSeconds: number) => {
        const lastTime = lastChallengeTime[zoneId] || 0;
        const endTime = lastTime + cooldownSeconds * 1000;
        const timeLeft = Math.max(0, Math.floor((endTime - time) / 1000));

        if (timeLeft <= 0) return null;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `(${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')})`;
    };

    return (
        <div className="flex flex-col space-y-4">
            {gameData.TRIAL_ZONES.map(zone => {
                const canChallenge = player.realmIndex >= zone.requiredRealmIndex;
                const lastTime = lastChallengeTime[zone.id] || 0;
                const onCooldown = (time - lastTime) < zone.cooldownSeconds * 1000;
                const cooldownTimer = renderCooldownTimer(zone.id, zone.cooldownSeconds);

                return (
                    <div key={zone.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-md text-emerald-400">{zone.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 italic">{zone.description}</p>
                         <p className="text-xs text-slate-500 mt-2">
                            Phần thưởng: {zone.rewards.map(r => formatReward(r, gameData)).filter(Boolean).join(', ')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Yêu cầu: Tu vi [{gameData.REALMS[zone.requiredRealmIndex].name}]
                        </p>
                        <div className="mt-3">
                            <button
                                onClick={() => handleChallenge(zone)}
                                disabled={!canChallenge || isFighting !== null || onCooldown}
                                className="w-full px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-red-700 hover:bg-red-800 text-white focus:outline-none focus:ring-4 focus:ring-red-500/50 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFighting === zone.id ? 'Đang chiến đấu...' : `Khiêu Chiến ${cooldownTimer || ''}`}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TrialGroundsPanel;
