import React from 'react';
import type { Player, GameData } from '../types';
import { formatNumber } from '../constants';

interface AlchemyPanelProps {
    player: Player;
    onCraftPill: (recipeId: string) => void;
    onUsePill: (pillId: string) => void;
    gameData: GameData;
}

const AlchemyPanel: React.FC<AlchemyPanelProps> = ({ player, onCraftPill, onUsePill, gameData }) => {

    const canCraft = (recipeId: string): boolean => {
        const recipe = gameData.RECIPES.find(r => r.id === recipeId);
        if (!recipe) return false;
        if (player.realmIndex < recipe.requiredRealmIndex) return false;
        if (player.qi < recipe.qiCost) return false;
        for (const herbId in recipe.herbCosts) {
            if ((player.herbs[herbId] || 0) < recipe.herbCosts[herbId]) {
                return false;
            }
        }
        return true;
    };

    const ownedPills = Object.keys(player.pills).filter(pillId => player.pills[pillId] > 0);

    return (
        <div className="flex flex-col space-y-4">
            {/* Materials Bag */}
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex-shrink-0">
                <h3 className="text-md font-semibold text-emerald-400 mb-2">Túi Nguyên Liệu</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {gameData.HERBS.map(herb => (
                        <div key={herb.id} title={herb.description}>
                            <span className="text-slate-400">{herb.name}: </span>
                            <span className="font-bold text-white">{player.herbs[herb.id] || 0}</span>
                        </div>
                    ))}
                </div>
                 {gameData.HERBS.length === 0 && <p className="text-xs text-slate-500">Túi nguyên liệu trống.</p>}
            </div>

            {/* Main Alchemy Panel */}
            <div className="flex-grow flex flex-col min-h-0 space-y-4">
                 {/* Recipe List */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col min-h-0">
                    <h3 className="text-md font-semibold text-emerald-400 mb-2">Đan Phương</h3>
                    <div className="overflow-y-auto pr-2 space-y-3">
                        {gameData.RECIPES.map(recipe => {
                             const meetsRealmReq = player.realmIndex >= recipe.requiredRealmIndex;
                             const isCraftable = canCraft(recipe.id);
                             const pill = gameData.PILLS.find(p => p.id === recipe.pillId);

                             return (
                                <div key={recipe.id} className={`bg-slate-800/60 p-3 rounded-lg ${!meetsRealmReq ? 'opacity-50' : ''}`}>
                                    <h4 className="font-bold text-cyan-400">{recipe.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1 italic">Luyện ra: {pill?.name}</p>
                                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                                         <p>Yêu cầu: {gameData.REALMS[recipe.requiredRealmIndex].name}</p>
                                         <p>Linh khí: {formatNumber(recipe.qiCost)}</p>
                                         {Object.entries(recipe.herbCosts).map(([herbId, amount]) => {
                                             const herb = gameData.HERBS.find(h => h.id === herbId);
                                             const playerAmount = player.herbs[herbId] || 0;
                                             const hasEnough = playerAmount >= amount;
                                             return (
                                                <p key={herbId} className={hasEnough ? '' : 'text-red-400'}>
                                                    {herb?.name}: {playerAmount}/{amount}
                                                </p>
                                             )
                                         })}
                                    </div>
                                    <button
                                        onClick={() => onCraftPill(recipe.id)}
                                        disabled={!isCraftable}
                                        className="w-full mt-3 px-4 py-1 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Luyện (T.công: {recipe.successChance * 100}%)
                                    </button>
                                </div>
                             )
                        })}
                    </div>
                </div>

                {/* Pill Pouch */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex-shrink-0">
                     <h3 className="text-md font-semibold text-emerald-400 mb-2">Túi Càn Khôn</h3>
                     <div className="space-y-2">
                        {ownedPills.length > 0 ? ownedPills.map(pillId => {
                            const pill = gameData.PILLS.find(p => p.id === pillId);
                            if (!pill) return null;
                            const count = player.pills[pillId];
                            return (
                                <div key={pillId} className="flex justify-between items-center text-sm">
                                    <div>
                                        <p className="text-slate-300 font-semibold">{pill.name} <span className="text-xs text-slate-500">x{count}</span></p>
                                        <p className="text-xs text-slate-400 italic">{pill.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => onUsePill(pillId)}
                                        className="px-3 py-1 text-xs font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
                                    >
                                        Dùng
                                    </button>
                                </div>
                            )
                        }) : <p className="text-xs text-slate-500 text-center">Túi càn khôn trống rỗng.</p>}
                     </div>
                </div>
            </div>
        </div>
    )
}

export default AlchemyPanel;
