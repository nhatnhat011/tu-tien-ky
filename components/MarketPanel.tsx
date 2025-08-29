import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { MarketListing, Player } from '../types';
import { formatNumber } from '../constants';
import { formatBonus } from './EquipmentPanel'; // Re-use the bonus formatter

const API_BASE_URL = '/api';

interface MarketPanelProps {
    token: string | null;
    player: Player;
    onAction: (endpoint: string, body?: object) => Promise<boolean | void>;
    showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const MarketPanel: React.FC<MarketPanelProps> = ({ token, player, onAction, showConfirmation }) => {
    const [activeTab, setActiveTab] = useState<'shop' | 'my_shop'>('shop');
    const [listings, setListings] = useState<MarketListing[]>([]);
    const [myListings, setMyListings] = useState<MarketListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest'>('newest');

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const [listingsRes, myListingsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/market/listings`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/market/my-listings`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!listingsRes.ok || !myListingsRes.ok) {
                throw new Error('Không thể tải dữ liệu Chợ.');
            }

            setListings(await listingsRes.json());
            setMyListings(await myListingsRes.json());
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBuyItem = (listing: MarketListing) => {
        showConfirmation(
            'Xác nhận mua',
            `Bạn có chắc muốn mua [${listing.item.name}] với giá ${formatNumber(listing.price)} Linh Thạch không?`,
            async () => {
                const success = await onAction(`/market/buy/${listing.id}`);
                if (success) fetchData();
            }
        );
    };

    const handleCancelListing = (listing: MarketListing) => {
        showConfirmation(
            'Xác nhận hủy bán',
            `Bạn có chắc muốn hủy bán [${listing.item.name}]?`,
            async () => {
                const success = await onAction(`/market/cancel/${listing.id}`);
                if (success) fetchData();
            }
        );
    };
    
    const filteredAndSortedListings = useMemo(() => {
        return listings
            .filter(l => l.item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                switch (sortBy) {
                    case 'price_asc': return a.price - b.price;
                    case 'price_desc': return b.price - a.price;
                    case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    default: return 0;
                }
            });
    }, [listings, searchTerm, sortBy]);

    const renderListingItem = (listing: MarketListing, isMyItem: boolean) => (
        <div key={listing.id} className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
            <h4 className="font-bold text-cyan-400">{listing.item.name}</h4>
            <div className="mt-1 text-xs space-y-1">
                {listing.item.bonuses.map((bonus, index) => (
                    <p key={index} className="text-cyan-300">{formatBonus(bonus)}</p>
                ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Người bán: {listing.seller_name}</p>
            <div className="flex justify-between items-center mt-3">
                <span className="font-bold text-lg text-yellow-400">{formatNumber(listing.price)}</span>
                {isMyItem ? (
                    <button onClick={() => handleCancelListing(listing)} className="px-4 py-1 text-sm font-bold rounded-lg bg-red-700 hover:bg-red-800 text-white">Hủy Bán</button>
                ) : (
                    <button onClick={() => handleBuyItem(listing)} className="px-4 py-1 text-sm font-bold rounded-lg bg-green-600 hover:bg-green-700 text-white">Mua</button>
                )}
            </div>
        </div>
    );

    const renderShop = () => (
        <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow bg-slate-900 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500"
                />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-slate-900 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500">
                    <option value="newest">Mới nhất</option>
                    <option value="price_asc">Giá tăng dần</option>
                    <option value="price_desc">Giá giảm dần</option>
                </select>
            </div>
            <div className="overflow-y-auto pr-2 space-y-3 flex-grow h-96">
                {isLoading ? <p className="text-center">Đang tải...</p> : 
                 filteredAndSortedListings.length > 0 ? filteredAndSortedListings.map(listing => {
                    const isMyItem = listing.seller_name === player.name;
                    return (
                        <div key={listing.id} className={`bg-slate-800/60 p-3 rounded-lg border border-slate-700 ${isMyItem ? 'opacity-60' : ''}`}>
                            <h4 className="font-bold text-cyan-400">{listing.item.name}</h4>
                            <div className="mt-1 text-xs space-y-1">
                                {listing.item.bonuses.map((bonus, index) => (
                                    <p key={index} className="text-cyan-300">{formatBonus(bonus)}</p>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Người bán: {listing.seller_name}</p>
                            <div className="flex justify-between items-center mt-3">
                                <span className="font-bold text-lg text-yellow-400">{formatNumber(listing.price)}</span>
                                {isMyItem ? (
                                    <button disabled className="px-4 py-1 text-sm font-bold rounded-lg bg-slate-600 text-slate-400 cursor-not-allowed">Của bạn</button>
                                ) : (
                                    <button onClick={() => handleBuyItem(listing)} className="px-4 py-1 text-sm font-bold rounded-lg bg-green-600 hover:bg-green-700 text-white">Mua</button>
                                )}
                            </div>
                        </div>
                    );
                 }) :
                 <p className="text-center text-slate-500 pt-8">Chợ hiện không có vật phẩm nào.</p>}
            </div>
        </div>
    );

    const renderMyShop = () => (
        <div className="overflow-y-auto pr-2 space-y-3 flex-grow h-[28rem]">
            {isLoading ? <p className="text-center">Đang tải...</p> :
             myListings.length > 0 ? myListings.map(l => renderListingItem(l, true)) :
             <p className="text-center text-slate-500 pt-8">Bạn chưa đăng bán vật phẩm nào.</p>}
        </div>
    );
    
    const getTabClass = (tabName: 'shop' | 'my_shop') => {
        return `flex-1 py-2 text-sm font-semibold transition-colors duration-200 ${
            activeTab === tabName 
            ? 'text-cyan-300 border-b-2 border-cyan-400 bg-slate-800/50' 
            : 'text-slate-400 hover:text-white'
        }`;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex border-b border-slate-700 flex-shrink-0">
                <button onClick={() => setActiveTab('shop')} className={getTabClass('shop')}>Mua Sắm</button>
                <button onClick={() => setActiveTab('my_shop')} className={getTabClass('my_shop')}>Cửa Hàng Của Tôi</button>
            </div>
             <div className="flex-grow min-h-0 pt-4">
                {error && <p className="text-red-400 text-center">{error}</p>}
                {activeTab === 'shop' && renderShop()}
                {activeTab === 'my_shop' && renderMyShop()}
            </div>
        </div>
    );
};

export default MarketPanel;