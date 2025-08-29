import React, { useState } from 'react';
import type { Player, PlayerEquipment, EquipmentBonus, EquipmentSlot } from '../types';
import { SwordIcon, TreasureIcon } from './Icons'; // Assuming a ShieldIcon exists or can be made

// A helper component for an equipment slot
const EquipmentSlotDisplay: React.FC<{
    slot: EquipmentSlot;
    item: PlayerEquipment | undefined;
    onItemClick: (item: PlayerEquipment) => void;
}> = ({ slot, item, onItemClick }) => {
    const slotNames: Record<EquipmentSlot, string> = {
        weapon: 'Vũ Khí',
        armor: 'Giáp',
        accessory: 'Phụ Kiện',
    };
    const Icon = slot === 'weapon' ? SwordIcon : slot === 'armor' ? () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> : TreasureIcon;

    return (
        <div 
            className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-cyan-400 transition-colors"
            onClick={() => item && onItemClick(item)}
        >
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-800 rounded-md flex items-center justify-center text-cyan-400">
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-xs text-slate-400">{slotNames[slot]}</p>
                    <p className="font-semibold text-white">{item?.name || 'Trống'}</p>
                </div>
            </div>
        </div>
    );
};


// FIX: Exported the formatBonus function to be used in other components.
export const formatBonus = (bonus: EquipmentBonus): string => {
    const formatPercent = (val: number) => `${((val - 1) * 100).toFixed(0)}%`;
    const formatAddPercent = (val: number) => `${(val * 100).toFixed(1)}%`;
    switch (bonus.type) {
        case 'qi_per_second_multiplier': return `Tốc độ tu luyện +${formatPercent(bonus.value)}`;
        case 'breakthrough_chance_add': return `Tỷ lệ đột phá +${(bonus.value * 100).toFixed(0)}%`;
        case 'hp_add': return `Sinh Lực +${bonus.value}`;
        case 'atk_add': return `Công Kích +${bonus.value}`;
        case 'def_add': return `Phòng Ngự +${bonus.value}`;
        case 'hp_mul': return `Sinh Lực +${formatPercent(bonus.value)}`;
        case 'atk_mul': return `Công Kích +${formatPercent(bonus.value)}`;
        case 'def_mul': return `Phòng Ngự +${formatPercent(bonus.value)}`;
        case 'speed_add': return `Tốc Độ +${bonus.value}`;
        case 'crit_rate_add': return `Tỷ lệ Bạo Kích +${formatAddPercent(bonus.value)}`;
        case 'crit_damage_add': return `ST Bạo Kích +${formatAddPercent(bonus.value)}`;
        case 'dodge_rate_add': return `Tỷ lệ Né Tránh +${formatAddPercent(bonus.value)}`;
        case 'lifesteal_rate_add': return `Hút Máu +${formatAddPercent(bonus.value)}`;
        case 'counter_rate_add': return `Tỷ lệ Phản Đòn +${formatAddPercent(bonus.value)}`;
        case 'hit_rate_add': return `Chính Xác +${formatAddPercent(bonus.value)}`;
        case 'crit_resist_add': return `Kháng Bạo Kích +${formatAddPercent(bonus.value)}`;
        case 'lifesteal_resist_add': return `Kháng Hút Máu +${formatAddPercent(bonus.value)}`;
        case 'counter_resist_add': return `Kháng Phản Đòn +${formatAddPercent(bonus.value)}`;
        default: return 'Hiệu ứng không xác định';
    }
};

interface EquipmentPanelProps {
  player: Player;
  onEquipItem: (itemInstanceId: number) => void;
  onListItem: (itemInstanceId: number, price: number) => void;
}

const ListItemModal: React.FC<{
    item: PlayerEquipment;
    onClose: () => void;
    onConfirm: (price: number) => void;
}> = ({ item, onClose, onConfirm }) => {
    const [price, setPrice] = useState('');

    const handleConfirm = () => {
        const priceNum = parseInt(price, 10);
        if (!isNaN(priceNum) && priceNum > 0) {
            onConfirm(priceNum);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-sm m-4 p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-cyan-300 mb-2">Rao Bán: {item.name}</h2>
                <p className="text-sm text-slate-400 mb-4">Nhập giá bán bằng Linh Thạch.</p>
                <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Nhập giá..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    autoFocus
                />
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 font-semibold rounded-lg bg-slate-600 hover:bg-slate-500 text-white">Hủy</button>
                    <button onClick={handleConfirm} disabled={!price || parseInt(price, 10) <= 0} className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-500 disabled:cursor-not-allowed">Xác Nhận</button>
                </div>
            </div>
        </div>
    );
};


const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ player, onEquipItem, onListItem }) => {
    const [itemToSell, setItemToSell] = useState<PlayerEquipment | null>(null);
    
    const handleConfirmSell = (price: number) => {
        if (itemToSell) {
            onListItem(itemToSell.instance_id, price);
            setItemToSell(null);
        }
    };

    const equippedWeapon = player.equipment.find(item => item.slot === 'weapon');
    const equippedArmor = player.equipment.find(item => item.slot === 'armor');
    const equippedAccessory = player.equipment.find(item => item.slot === 'accessory');

    return (
        <div className="flex flex-col h-full space-y-4">
             {itemToSell && <ListItemModal item={itemToSell} onClose={() => setItemToSell(null)} onConfirm={handleConfirmSell} />}
            {/* Equipped Items Section */}
            <div className="space-y-2">
                <EquipmentSlotDisplay slot="weapon" item={equippedWeapon} onItemClick={(item) => onEquipItem(item.instance_id)} />
                <EquipmentSlotDisplay slot="armor" item={equippedArmor} onItemClick={(item) => onEquipItem(item.instance_id)} />
                <EquipmentSlotDisplay slot="accessory" item={equippedAccessory} onItemClick={(item) => onEquipItem(item.instance_id)} />
            </div>

            {/* Inventory Section */}
            <div className="flex-grow bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col min-h-0">
                <h3 className="text-md font-semibold text-emerald-400 mb-2 flex-shrink-0">Túi Càn Khôn</h3>
                <div className="overflow-y-auto pr-2 space-y-3">
                    {player.inventory.length > 0 ? player.inventory.map(item => (
                        <div key={item.instance_id} className="bg-slate-800/60 p-3 rounded-lg">
                            <h4 className="font-bold text-cyan-400">{item.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 italic">{item.description}</p>
                            <div className="mt-2 text-xs space-y-1">
                                {item.bonuses.map((bonus, index) => (
                                    <p key={index} className="text-cyan-300">{formatBonus(bonus)}</p>
                                ))}
                            </div>
                             <div className="flex space-x-2 mt-3">
                                <button
                                    onClick={() => onEquipItem(item.instance_id)}
                                    className="w-full px-4 py-1 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-4 focus:ring-blue-400/50"
                                >
                                    Trang Bị
                                </button>
                                 <button
                                    onClick={() => setItemToSell(item)}
                                    className="w-full px-4 py-1 text-sm font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-amber-600 hover:bg-amber-700 text-white focus:outline-none focus:ring-4 focus:ring-amber-400/50"
                                >
                                    Rao Bán
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-500 text-center pt-8">Túi càn khôn trống rỗng.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EquipmentPanel;