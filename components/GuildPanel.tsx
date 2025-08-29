import React, { useState, useEffect, useCallback } from 'react';
import type { Player, GameData } from '../types';
import { GUILD_CREATION_COST, getGuildNextLevelExp, formatNumber, getGuildMemberLimit } from '../constants';
// FIX: Import UserGroupIcon which was previously missing.
import { UserGroupIcon } from './Icons'; // Simple icon for members

const API_BASE_URL = '/api';

interface Guild {
    id: number;
    name: string;
    leaderName: string;
    level: number;
    memberCount: number;
}

interface GuildMember {
    name: string;
    realmIndex: number;
}

interface GuildDetails extends Guild {
    exp: number;
    members: GuildMember[];
}

interface GuildPanelProps {
    player: Player;
    token: string | null;
    onCreateGuild: (guildName: string) => void;
    onJoinGuild: (guildId: number) => void;
    onLeaveGuild: () => void;
    onContributeToGuild: (amount: number) => void;
    onInspectPlayer: (name: string) => void;
    showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
    gameData: GameData;
}

const GuildPanel: React.FC<GuildPanelProps> = ({ player, token, onCreateGuild, onJoinGuild, onLeaveGuild, onContributeToGuild, onInspectPlayer, showConfirmation, gameData }) => {
    
    // For players without a guild
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [newGuildName, setNewGuildName] = useState('');

    // For players in a guild
    const [guildDetails, setGuildDetails] = useState<GuildDetails | null>(null);
    const [contributionAmount, setContributionAmount] = useState('1000');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGuildsList = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/guilds`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải danh sách Tông Môn.');
            const data = await response.json();
            setGuilds(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const fetchGuildDetails = useCallback(async (guildId: number) => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/guilds/details/${guildId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Không thể tải thông tin Tông Môn.');
            const data = await response.json();
            setGuildDetails(data);
        } catch (err) {
             setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);
    
    useEffect(() => {
        if (player.guildId) {
            fetchGuildDetails(player.guildId);
        } else {
            fetchGuildsList();
        }
    }, [player.guildId, fetchGuildsList, fetchGuildDetails]);

    const handleCreate = () => {
        if (newGuildName.trim()) {
            onCreateGuild(newGuildName.trim());
            setNewGuildName('');
        }
    };

    const handleContribute = () => {
        const amount = parseInt(contributionAmount, 10);
        if (!isNaN(amount) && amount > 0) {
            onContributeToGuild(amount);
        }
    };
    
    if (isLoading) return <p className="text-center text-slate-400">Đang tải dữ liệu Tông Môn...</p>;
    if (error) return (
        <div className="text-center">
            <p className="text-red-400">{error}</p>
            <button 
                onClick={() => player.guildId ? fetchGuildDetails(player.guildId) : fetchGuildsList()}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
                Thử lại
            </button>
        </div>
    );

    // View for players IN a guild
    if (player.guildId && player.guildLevel !== null && player.guildExp !== null && guildDetails) {
        const expNeeded = getGuildNextLevelExp(player.guildLevel);
        const progressPercent = (Number(player.guildExp) / expNeeded) * 100;
        const isLeader = player.name === guildDetails.leaderName;
        const memberLimit = getGuildMemberLimit(player.guildLevel);
        
        return (
            <div className="flex flex-col space-y-4">
                <div>
                    <h3 className="text-2xl font-bold text-cyan-300 text-center">{guildDetails.name}</h3>
                    <p className="text-center text-slate-400 text-sm">Cấp {player.guildLevel} | Tông Chủ: {guildDetails.leaderName}</p>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                     <h4 className="text-md font-semibold text-emerald-400 mb-2">Phát Triển Tông Môn</h4>
                      <div>
                        <div className="flex justify-between items-baseline mb-1 text-xs">
                          <span className="text-slate-400">Kinh nghiệm:</span>
                          <span className="font-mono text-white">
                            {formatNumber(Number(player.guildExp))} / {formatNumber(expNeeded)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full rounded-full transition-all duration-100 ease-linear" 
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                         <input 
                            type="number"
                            value={contributionAmount}
                            onChange={(e) => setContributionAmount(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-1 px-2 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                        />
                         <button
                            onClick={handleContribute}
                            disabled={player.qi < Number(contributionAmount) || Number(contributionAmount) <= 0}
                            className="px-4 py-1 font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-amber-600 hover:bg-amber-700 text-white focus:outline-none focus:ring-4 focus:ring-amber-400/50 disabled:bg-slate-600 disabled:opacity-50 text-sm"
                        >
                            Cống Hiến
                        </button>
                      </div>
                </div>

                <div className="flex-grow bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col min-h-0">
                    <h4 className="text-md font-semibold text-emerald-400 mb-2 flex items-center"><UserGroupIcon/> Thành Viên ({guildDetails.members.length} / {memberLimit})</h4>
                    <div className="overflow-y-auto pr-2 space-y-2 flex-grow">
                        {guildDetails.members.map((member) => (
                            <div key={member.name} className="flex justify-between items-center bg-slate-800/60 p-2 rounded">
                                <button onClick={() => onInspectPlayer(member.name)} className="text-left">
                                    <p className={`font-semibold ${member.name === guildDetails.leaderName ? 'text-amber-400' : 'text-white'} hover:text-cyan-300 transition-colors`}>
                                        {member.name === guildDetails.leaderName && '👑 '}{member.name}
                                    </p>
                                </button>
                                <span className="text-xs text-slate-400">{gameData.REALMS[member.realmIndex]?.name || 'N/A'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                 <div className="flex-shrink-0 pt-2">
                     <button
                        onClick={() => {
                            const title = isLeader ? 'Xác Nhận Giải Tán' : 'Xác Nhận Rời Đi';
                            const message = isLeader
                                ? "Bạn có chắc chắn muốn GIẢI TÁN Tông Môn? Hành động này không thể hoàn tác và tất cả thành viên sẽ trở thành tán tu!"
                                : "Bạn có chắc chắn muốn rời khỏi Tông Môn?";
                            showConfirmation(title, message, onLeaveGuild);
                        }}
                        className="w-full px-4 py-2 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-red-800 hover:bg-red-700 text-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/50"
                    >
                        {isLeader ? 'Giải Tán Tông Môn' : 'Rời Khỏi Tông Môn'}
                    </button>
                </div>
            </div>
        );
    }

    // View for players NOT in a guild
    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-cyan-300">Lập Tông Môn</h3>
                <p className="text-xs text-slate-400 mt-1">Cần {formatNumber(GUILD_CREATION_COST)} Linh Khí để khai tông lập phái, vang danh thiên hạ.</p>
                <div className="flex space-x-2 mt-3">
                    <input 
                        type="text"
                        value={newGuildName}
                        onChange={(e) => setNewGuildName(e.target.value)}
                        placeholder="Nhập tên Tông Môn"
                        className="flex-grow bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    />
                     <button
                        onClick={handleCreate}
                        disabled={player.qi < GUILD_CREATION_COST || !newGuildName.trim()}
                        className="px-4 py-2 font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:bg-slate-600 disabled:opacity-50"
                    >
                        Tạo
                    </button>
                </div>
            </div>
             <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                 <h3 className="text-lg font-semibold text-cyan-300">Danh Sách Tông Môn</h3>
                 {guilds.length === 0 && <p className="text-sm text-slate-500 text-center mt-4">Chưa có Tông Môn nào được thành lập.</p>}
                 {guilds.map(guild => {
                    const maxMembers = getGuildMemberLimit(guild.level);
                    const isFull = guild.memberCount >= maxMembers;
                    return (
                        <div key={guild.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <div>
                                <h4 className="font-bold text-md text-emerald-400">{guild.name} (Cấp {guild.level})</h4>
                                <p className="text-xs text-slate-500">Tông Chủ: {guild.leaderName} | Nhân số: {guild.memberCount}/{maxMembers}</p>
                            </div>
                            <button
                               onClick={() => onJoinGuild(guild.id)}
                               disabled={isFull}
                               className={`px-3 py-1 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                                   isFull 
                                   ? 'bg-slate-600 cursor-not-allowed' 
                                   : 'bg-green-600 hover:bg-green-700 focus:ring-green-400'
                               }`}
                            >
                                {isFull ? 'Đã Đầy' : 'Gia Nhập'}
                            </button>
                        </div>
                    );
                 })}
             </div>
        </div>
    );
};

export default GuildPanel;