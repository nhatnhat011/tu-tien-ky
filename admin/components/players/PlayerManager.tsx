import React, { FC, useState, useEffect, useCallback } from 'react';
import type { GenericData, FormField, AdminMetadata } from '../../types';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import EditForm from '../data/EditForm';

const API_BASE_URL = '/api';

interface PlayerData {
    name: string;
    realmIndex: number;
    is_banned: boolean;
    [key: string]: any;
}
interface PlayerManagerProps {
    token: string;
    metadata: AdminMetadata;
}
const PlayerManager: FC<PlayerManagerProps> = ({ token, metadata }) => {
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [search, setSearch] = useState('');
    const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);

    const fetchPlayers = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/players?search=${search}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            setPlayers(data);
        } catch (err) {
            alert('Lỗi tìm người chơi: ' + (err as Error).message);
        }
    }, [token, search]);

    useEffect(() => {
        const handler = setTimeout(() => fetchPlayers(), 300);
        return () => clearTimeout(handler);
    }, [fetchPlayers]);

    const handleSave = async (playerData: GenericData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/players/${playerData.name}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(playerData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            setEditingPlayer(null);
            fetchPlayers();
        } catch (err) {
            alert('Lỗi cập nhật người chơi: ' + (err as Error).message);
        }
    };

    const playerFormFields: FormField[] = [
        { name: 'name', label: 'Tên', isKey: true },
        { name: 'qi', label: 'Linh Khí', type: 'number' },
        { name: 'linh_thach', label: 'Linh Thạch', type: 'number' },
        { name: 'realmIndex', label: 'Cảnh Giới (Index)', type: 'number' },
        { name: 'bodyStrength', label: 'Luyện Thể', type: 'number' },
        { name: 'karma', label: 'Ác Nghiệp', type: 'number' },
        { name: 'honorPoints', label: 'Điểm Vinh Dự', type: 'number' },
        { name: 'enlightenmentPoints', label: 'Điểm Lĩnh Ngộ', type: 'number' },
        { name: 'is_banned', label: 'Đã Khóa', type: 'boolean' },
        { name: 'ban_reason', label: 'Lý Do Khóa', type: 'textarea' },
        { name: 'pvpBuff', label: 'Buff PvP (JSON)', type: 'json' },
        { name: 'pills', label: 'Đan Dược', objectAsList: { keyName: 'pillId', valueName: 'amount', valueType: 'number' }, columns: [{ name: 'pillId', label: 'Pill ID', inputType: 'select', options: metadata.itemIds.pills }, { name: 'amount', label: 'Số Lượng', type: 'number' }] },
        { name: 'herbs', label: 'Linh Thảo', objectAsList: { keyName: 'herbId', valueName: 'amount', valueType: 'number' }, columns: [{ name: 'herbId', label: 'Herb ID', inputType: 'select', options: metadata.itemIds.herbs }, { name: 'amount', label: 'Số Lượng', type: 'number' }] },
        { name: 'inventory', label: 'Túi Đồ (Chỉ đọc)', type: 'json', readOnly: true },
        { name: 'equipment', label: 'Trang Bị (Chỉ đọc)', type: 'json', readOnly: true },
    ];

    return (
        <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-cyan-300 mb-4">Quản Lý Người Chơi</h2>
            <Input label="Tìm theo tên" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập tên người chơi..." />
            <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-300 uppercase bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3">Tên</th><th className="px-6 py-3">Cảnh Giới</th><th className="px-6 py-3">Trạng Thái</th><th className="px-6 py-3 text-right">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(p => (
                            <tr key={p.name} className="border-b border-slate-700 hover:bg-slate-800">
                                <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                                <td className="px-6 py-4">{p.realmIndex}</td>
                                <td className="px-6 py-4">{p.is_banned ? <span className="text-red-400 font-bold">Đã Khóa</span> : <span className="text-green-400">Hoạt Động</span>}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setEditingPlayer(p)} className="font-medium text-blue-400 hover:underline">Sửa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingPlayer && (
                <Modal title={`Sửa Người Chơi: ${editingPlayer.name}`} onClose={() => setEditingPlayer(null)}>
                    <EditForm initialData={editingPlayer} formFields={playerFormFields} onSave={handleSave} onCancel={() => setEditingPlayer(null)} primaryKey="name" />
                </Modal>
            )}
        </div>
    )
}

export default PlayerManager;
