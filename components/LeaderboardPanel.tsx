import React, { useState, useEffect, useCallback } from 'react';
import type { GameData } from '../types';

const API_BASE_URL = '/api';

interface LeaderboardPlayer {
  name: string;
  realmIndex: number;
}

interface LeaderboardPanelProps {
  token: string | null;
  onInspectPlayer: (name: string) => void;
  gameData: GameData;
}

const rankColors: { [key: number]: string } = {
  1: 'text-amber-300 font-bold',
  2: 'text-slate-300 font-bold',
  3: 'text-amber-600 font-bold',
};

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ token, onInspectPlayer, gameData }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!token) {
      setError("Yêu cầu xác thực để xem bảng xếp hạng.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Cố gắng đọc thông điệp lỗi cụ thể hơn từ server
        const errorData = await response.json().catch(() => null); // Xử lý các phản hồi không phải JSON một cách nhẹ nhàng
        const message = errorData?.message || 'Không thể tải bảng xếp hạng. Vui lòng thử lại.';
        throw new Error(message);
      }

      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-slate-400">Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4 text-center">Thiên Địa Bảng</h3>
        <div className="overflow-y-auto pr-2 flex-grow">
            <ul className="space-y-2">
            {leaderboard.map((player, index) => {
                const rank = index + 1;
                const realmName = gameData.REALMS[player.realmIndex]?.name || 'Không rõ';
                return (
                <li key={player.name} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center">
                        <span className={`w-8 text-center text-lg ${rankColors[rank] || 'text-slate-400'}`}>
                            {rank}
                        </span>
                        <button 
                          onClick={() => onInspectPlayer(player.name)}
                          className="ml-3 font-semibold text-white text-left hover:text-cyan-300 transition-colors"
                        >
                          {player.name}
                        </button>
                    </div>
                    <span className="text-sm text-emerald-400">{realmName}</span>
                </li>
                );
            })}
            </ul>
        </div>
    </div>
  );
};

export default LeaderboardPanel;
