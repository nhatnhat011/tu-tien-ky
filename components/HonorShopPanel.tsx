import React from 'react';
import type { Player, GameData } from '../types';

interface HonorShopPanelProps {
    player: Player;
    onBuyItem: (itemId: string) => void;
    gameData: GameData;
}

const HonorShopPanel: React.FC<HonorShopPanelProps> = ({ player, onBuyItem, gameData }) => {
    return (
        <div className="flex flex-col h-full space-y-4">
             <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex-shrink-0 text-center">
                <h3 className="text-md font-semibold text-emerald-400">Điểm Vinh Dự Hiện Có</h3>
                <p className="text-3xl font-bold text-red-400 mt-1">{player.honorPoints}</p>
             </div>
            
            <div className="flex-grow bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col min-h-0">
                 <h3 className="text-md font-semibold text-emerald-400 mb-2 flex-shrink-0">Vật Phẩm</h3>
                <div className="overflow-y-auto pr-2 space-y-3 flex-grow">
                    {gameData.HONOR_SHOP_ITEMS.map(item => {
                        const hasPurchased = item.isUnique && player.purchasedHonorItems.includes(item.id);
                        const canAfford = player.honorPoints >= item.cost;
                        const canBuy = !hasPurchased && canAfford;

                        return (
                            <div key={item.id} className={`bg-slate-800/60 p-3 rounded-lg ${hasPurchased ? 'opacity-50' : ''}`}>
                                <h4 className="font-bold text-cyan-400">{item.name}</h4>
                                <p className="text-xs text-slate-400 mt-1 italic">{item.description}</p>
                                <div className="mt-3 flex justify-between items-center">
                                    <span className={`text-sm font-bold ${canAfford ? 'text-red-400' : 'text-gray-500'}`}>
                                        {item.cost} điểm vinh dự
                                    </span>
                                    <button
                                        onClick={() => onBuyItem(item.id)}
                                        disabled={!canBuy}
                                        className="px-4 py-1 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {hasPurchased ? 'Đã Mua' : 'Mua'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HonorShopPanel;
