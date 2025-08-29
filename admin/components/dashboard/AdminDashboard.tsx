import React, { FC, useState, useEffect } from 'react';
import type { AdminStats, AdminMetadata, FormField, ColumnDefinition } from '../../types';
import Button from '../ui/Button';
import DataManager from '../data/DataManager';
import PlayerManager from '../players/PlayerManager';
import GuildWarManager from '../guild-war/GuildWarManager';

const API_BASE_URL = '/api';

interface AdminDashboardProps {
    token: string;
    onLogout: () => void;
}
const AdminDashboard: FC<AdminDashboardProps> = ({ token, onLogout }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const [stats, setStats] = useState<AdminStats>({ playerCount: 0, guildCount: 0 });
    const [metadata, setMetadata] = useState<AdminMetadata>({
        bonusTypes: [],
        equipmentSlots: [],
        itemIds: { pills: [], herbs: [], equipment: [] }
    });
    const [isMetadataLoading, setIsMetadataLoading] = useState(true);

    useEffect(() => {
        const fetchAllMetadata = async () => {
            setIsMetadataLoading(true);
            try {
                const fetchWithAuth = (url: string) => fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

                const [statsRes, bonusTypesRes, itemIdsRes] = await Promise.all([
                    fetchWithAuth(`${API_BASE_URL}/admin/stats`),
                    fetchWithAuth(`${API_BASE_URL}/admin/metadata/bonus-types`),
                    fetchWithAuth(`${API_BASE_URL}/admin/metadata/item-ids`),
                ]);

                const checkResponse = async (res: Response, name: string) => {
                    if (!res.ok) {
                        let errorBody = `API call failed with status ${res.status}`;
                        try {
                            const errJson = await res.json();
                            errorBody = errJson.message || JSON.stringify(errJson);
                        } catch (e) {
                            try {
                                errorBody = await res.text();
                            } catch (readErr) {
                                // Ignore
                            }
                        }
                        throw new Error(`Failed to fetch ${name}: ${errorBody}`);
                    }
                    return res.json();
                };

                const [statsData, bonusTypesData, itemIdsData] = await Promise.all([
                    checkResponse(statsRes, 'stats'),
                    checkResponse(bonusTypesRes, 'bonus types'),
                    checkResponse(itemIdsRes, 'item IDs'),
                ]);

                setStats(statsData);

                setMetadata({
                    bonusTypes: bonusTypesData.bonusTypes.map((t: string) => ({ value: t, label: t })),
                    equipmentSlots: bonusTypesData.equipmentSlots.map((s: string) => ({ value: s, label: s })),
                    itemIds: {
                        pills: itemIdsData.pills.map((i: { id: string, name: string }) => ({ value: i.id, label: `${i.name} (${i.id})` })),
                        herbs: itemIdsData.herbs.map((i: { id: string, name: string }) => ({ value: i.id, label: `${i.name} (${i.id})` })),
                        equipment: itemIdsData.equipment.map((i: { id: string, name: string }) => ({ value: i.id, label: `${i.name} (${i.id})` })),
                    }
                });
            } catch (err) {
                console.error("Could not fetch metadata", err);
                alert("Không thể tải dữ liệu meta cho admin panel.\n\nChi tiết: " + (err as Error).message);
            } finally {
                setIsMetadataLoading(false);
            }
        };
        fetchAllMetadata();
    }, [token]);

    const handleReloadData = async () => {
        if (!confirm('Bạn có chắc muốn làm mới dữ liệu game trên server? Hành động này sẽ cập nhật mọi thay đổi cho tất cả người chơi.')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/admin/reload-gamedata`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            alert('Làm mới dữ liệu thành công!');
        } catch (err) {
            alert('Lỗi: ' + (err as Error).message);
        }
    };

    const navItems = [
        { key: 'dashboard', label: 'Tổng Quan' },
        { key: 'players', label: 'Người Chơi' },
        { key: 'guilds', label: 'Tông Môn' },
        { key: 'guild_wars_manager', label: 'Quản Lý T.M.C' },
        { key: 'market_listings', label: 'Chợ Giao Dịch' },
        { key: 'events', label: 'Sự Kiện' },
        { key: 'gift_codes', label: 'Giftcode' },
        { type: 'divider', label: 'Dữ Liệu Game' },
        { key: 'guild_wars', label: 'Tạo T.M.C' },
        { key: 'realms', label: 'Cảnh Giới' },
        { key: 'techniques', label: 'Công Pháp' },
        { key: 'equipment', label: 'Trang Bị' },
        { key: 'pvp_skills', label: 'Tuyệt Kỹ PvP' },
        { key: 'herbs', label: 'Linh Thảo' },
        { key: 'pills', label: 'Đan Dược' },
        { key: 'recipes', label: 'Đan Phương' },
    ];

    const rewardsColumns: ColumnDefinition[] = [
        { name: 'type', label: 'Loại (qi, herb, equipment)', type: 'text' },
        { name: 'amount', label: 'Số Lượng', type: 'number' },
        { name: 'herbId', label: 'Herb ID', inputType: 'select', options: metadata.itemIds.herbs },
        { name: 'equipmentId', label: 'Equipment ID', inputType: 'select', options: metadata.itemIds.equipment },
    ];

    const guildWarRewardsColumns: ColumnDefinition[] = [
        { name: 'type', label: 'Loại (linh_thach, honor_points, equipment, pill)', type: 'text' },
        { name: 'amount', label: 'Số Lượng', type: 'number' },
        { name: 'itemId', label: 'Item ID (cho equipment/pill)', type: 'text' }, // Can't be a dropdown as it can be pill or equip
        { name: 'description', label: 'Mô tả (cho admin)', type: 'text' },
    ];

    const renderView = () => {
        if (isMetadataLoading) return <div>Đang tải dữ liệu cấu hình...</div>;
        switch (activeView) {
            case 'dashboard': return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 text-center">
                        <h3 className="text-xl text-slate-400">Tổng Số Người Chơi</h3>
                        <p className="text-5xl font-bold text-cyan-300 mt-2">{stats.playerCount}</p>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 text-center">
                        <h3 className="text-xl text-slate-400">Tổng Số Tông Môn</h3>
                        <p className="text-5xl font-bold text-cyan-300 mt-2">{stats.guildCount}</p>
                    </div>
                </div>
            );
            case 'players': return <PlayerManager token={token} metadata={metadata} />;
            case 'guilds': return <DataManager token={token} tableName="guilds" title="Quản Lý Tông Môn" primaryKey="id" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên Tông Môn' }, { key: 'leaderName', label: 'Tông Chủ' }, { key: 'level', label: 'Cấp' }, { key: 'memberCount', label: 'Thành Viên' }]} formFields={[{ name: 'id', label: 'ID', isKey: true }, { name: 'name', label: 'Tên' }, { name: 'leaderName', label: 'Tông Chủ' }, { name: 'level', label: 'Cấp', type: 'number' }, { name: 'exp', label: 'Kinh Nghiệm', type: 'number' }]} />;
            case 'guild_wars_manager': return <GuildWarManager token={token} />;
            case 'guild_wars': return <DataManager token={token} tableName="guild_wars" title="Tạo Mới Tông Môn Chiến" primaryKey="id" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên Sự Kiện' }, { key: 'start_time', label: 'Thời Gian Bắt Đầu' }, { key: 'status', label: 'Trạng Thái' }]} formFields={[{ name: 'id', label: 'ID', isKey: true }, { name: 'name', label: 'Tên Sự Kiện' }, { name: 'start_time', label: 'Thời Gian Bắt Đầu', type: 'datetime-local' }, { name: 'status', label: 'Trạng Thái (PENDING, REGISTRATION, IN_PROGRESS, COMPLETED)' }, { name: 'rewards', label: 'Phần thưởng cho Tông Môn thắng', type: 'list', columns: guildWarRewardsColumns }]} />;
            case 'market_listings': return <DataManager token={token} tableName="market_listings" title="Quản Lý Chợ" primaryKey="id" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'seller_name', label: 'Người Bán' }, { key: 'item_instance_id', label: 'Instance ID' }, { key: 'price', label: 'Giá' }]} formFields={[{ name: 'id', label: 'ID', isKey: true }, { name: 'seller_name', label: 'Người Bán' }, { name: 'item_instance_id', label: 'Item Instance ID', type: 'number' }, { name: 'price', label: 'Giá', type: 'number' }, { name: 'expires_at', label: 'Hết Hạn', type: 'datetime-local' }]} />;
            case 'events': return <DataManager token={token} tableName="events" title="Quản Lý Sự Kiện" primaryKey="id" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'title', label: 'Tiêu Đề' }, { key: 'bonus_type', label: 'Loại Bonus' }]} formFields={[{ name: 'id', label: 'ID', isKey: true }, { name: 'title', label: 'Tiêu Đề' }, { name: 'description', label: 'Mô Tả' }, { name: 'bonus_type', label: 'Loại Bonus' }, { name: 'bonus_value', label: 'Giá Trị Bonus', type: 'number' }, { name: 'starts_at', label: 'Bắt Đầu', type: 'datetime-local' }, { name: 'expires_at', label: 'Kết Thúc', type: 'datetime-local' }, { name: 'is_active', label: 'Kích Hoạt', type: 'boolean' }]} />;
            case 'gift_codes': return <DataManager token={token} tableName="gift_codes" title="Quản Lý Giftcode" primaryKey="code" displayColumns={[{ key: 'code', label: 'Mã' }, { key: 'uses', label: 'Lượt Dùng' }, { key: 'max_uses', label: 'Tối Đa' }]} formFields={[{ name: 'code', label: 'Mã', isKey: true, required: true }, { name: 'rewards', label: 'Phần Thưởng', type: 'list', columns: rewardsColumns }, { name: 'max_uses', label: 'Số Lượt Tối Đa', type: 'number' }, { name: 'expires_at', label: 'Hết Hạn', type: 'datetime-local' }]} />;
            case 'realms': return <DataManager token={token} tableName="realms" title="Quản Lý Cảnh Giới" primaryKey="realmIndex" displayColumns={[{ key: 'realmIndex', label: 'Index' }, { key: 'name', label: 'Tên' }]} formFields={[{ name: 'realmIndex', label: 'Index', type: 'number', isKey: true, required: true }, { name: 'name', label: 'Tên' }, { name: 'qiThreshold', label: 'Linh Khí Cần', type: 'number' }, { name: 'baseQiPerSecond', label: 'Linh Khí/s', type: 'number' }, { name: 'breakthroughChance', label: 'Tỉ Lệ Đột Phá', type: 'number' }, { name: 'baseHp', label: 'HP Gốc', type: 'number' }, { name: 'baseAtk', label: 'ATK Gốc', type: 'number' }, { name: 'baseDef', label: 'DEF Gốc', type: 'number' }, { name: 'baseSpeed', label: 'Tốc Độ Gốc', type: 'number' }, { name: 'baseCritRate', label: 'Tỷ Lệ Bạo Kích Gốc', type: 'number' }, { name: 'baseCritDamage', label: 'ST Bạo Kích Gốc', type: 'number' }, { name: 'baseDodgeRate', label: 'Tỷ Lệ Né Gốc', type: 'number' }]} />;
            case 'techniques': return <DataManager token={token} tableName="techniques" title="Quản Lý Công Pháp" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên' }]} formFields={[{ name: 'id', label: 'ID', isKey: true, required: true }, { name: 'name', label: 'Tên' }, { name: 'description', label: 'Mô Tả' }, { name: 'requiredRealmIndex', label: 'Cảnh Giới Yêu Cầu', type: 'number' }, { name: 'bonuses', label: 'Bonuses', type: 'list', columns: [{ name: 'type', label: 'Loại', inputType: 'select', options: metadata.bonusTypes }, { name: 'value', label: 'Giá trị', type: 'number' }] }]} />;
            case 'equipment': return <DataManager token={token} tableName="equipment" title="Quản Lý Trang Bị" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên' }, { key: 'slot', label: 'Loại' }]} formFields={[{ name: 'id', label: 'ID', isKey: true, required: true }, { name: 'name', label: 'Tên' }, { name: 'description', label: 'Mô Tả' }, { name: 'slot', label: 'Loại', inputType: 'select', options: metadata.equipmentSlots }, { name: 'bonuses', label: 'Bonuses', type: 'list', columns: [{ name: 'type', label: 'Loại', inputType: 'select', options: metadata.bonusTypes }, { name: 'value', label: 'Giá trị', type: 'number' }] }]} />;
            case 'pvp_skills': return <DataManager token={token} tableName="pvp_skills" title="Quản Lý Tuyệt Kỹ PvP" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên' }]} formFields={[{ name: 'id', label: 'ID', isKey: true, required: true }, { name: 'name', label: 'Tên' }, { name: 'description', label: 'Mô Tả' }, { name: 'cost', label: 'Giá (Điểm Vinh Dự)', type: 'number' }, { name: 'energy_cost', label: 'Sát Khí Tốn', type: 'number' }, { name: 'effect', label: 'Hiệu Ứng (JSON)', type: 'json' }]} />;
            case 'herbs': return <DataManager token={token} tableName="herbs" title="Quản Lý Linh Thảo" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên' }]} formFields={[{ name: 'id', label: 'ID', isKey: true, required: true }, { name: 'name', label: 'Tên' }, { name: 'description', label: 'Mô Tả' }]} />;
            case 'pills': return <DataManager token={token} tableName="pills" title="Quản Lý Đan Dược" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên' }]} formFields={[{ name: 'id', label: 'ID', isKey: true, required: true }, { name: 'name', label: 'Tên' }, { name: 'description', label: 'Mô Tả' }, { name: 'effect', label: 'Hiệu Ứng (JSON)', type: 'json' }]} />;
            case 'recipes': return <DataManager token={token} tableName="recipes" title="Quản Lý Đan Phương" displayColumns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Tên' }]} formFields={[{ name: 'id', label: 'ID', isKey: true, required: true }, { name: 'pillId', label: 'Pill ID', inputType: 'select', options: metadata.itemIds.pills }, { name: 'name', label: 'Tên' }, { name: 'description', label: 'Mô Tả' }, { name: 'requiredRealmIndex', label: 'Cảnh Giới Yêu Cầu', type: 'number' }, { name: 'qiCost', label: 'Linh Khí Tốn', type: 'number' }, { name: 'herbCosts', label: 'Nguyên Liệu', objectAsList: { keyName: 'herbId', valueName: 'amount', valueType: 'number' }, columns: [{ name: 'herbId', label: 'Herb ID', inputType: 'select', options: metadata.itemIds.herbs }, { name: 'amount', label: 'Số lượng', type: 'number' }] }, { name: 'successChance', label: 'Tỉ Lệ Thành Công', type: 'number' }]} />;
            default: return <div>Chọn một mục để quản lý</div>
        }
    };

    return (
        <div className="flex min-h-screen">
            <aside className="w-64 bg-slate-900 text-slate-300 p-4 flex flex-col flex-shrink-0">
                <h1 className="text-2xl font-bold text-cyan-300 text-center mb-8">Admin Panel</h1>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {navItems.map(item => item.type === 'divider' ?
                            <li key={item.label} className="pt-4 pb-2 text-sm uppercase text-slate-500 font-semibold tracking-wider">{item.label}</li> :
                            <li key={item.key}>
                                <button onClick={() => setActiveView(item.key!)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === item.key ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-slate-700/50'}`}>
                                    {item.label}
                                </button>
                            </li>
                        )}
                    </ul>
                </nav>
                <div className="flex-shrink-0 space-y-2">
                    <Button onClick={handleReloadData} className="w-full bg-amber-600 hover:bg-amber-500">⚡ Làm Mới Dữ Liệu</Button>
                    <Button onClick={onLogout} className="w-full bg-slate-600 hover:bg-slate-500">Đăng Xuất</Button>
                </div>
            </aside>
            <main className="flex-grow p-8 bg-slate-900/80">
                {renderView()}
            </main>
        </div>
    );
};

export default AdminDashboard;
