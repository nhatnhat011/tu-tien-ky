import React, { FC } from 'react';
import type { GenericData, ColumnDefinition } from '../../types';
import Button from './Button';

interface ListEditorProps {
    value?: GenericData[];
    onChange: (newList: GenericData[]) => void;
    columns: ColumnDefinition[];
}
const ListEditor: FC<ListEditorProps> = ({ value = [], onChange, columns }) => {
    const handleRowChange = (index: number, fieldName: string, fieldValue: string) => {
        const newList = [...value];
        const currentItem = { ...newList[index] };
        
        const columnDef = columns.find(c => c.name === fieldName);
        if (columnDef && columnDef.type === 'number') {
            currentItem[fieldName] = fieldValue === '' ? '' : parseFloat(fieldValue);
        } else {
            currentItem[fieldName] = fieldValue;
        }

        newList[index] = currentItem;
        onChange(newList);
    };

    const addRow = () => {
        const newRow = columns.reduce((acc, col) => {
            acc[col.name] = col.type === 'number' ? 0 : '';
            return acc;
        }, {} as GenericData);
        onChange([...value, newRow]);
    };

    const removeRow = (index: number) => {
        const newList = value.filter((_, i) => i !== index);
        onChange(newList);
    };

    return (
        <div className="space-y-2 p-2 border border-slate-700 rounded-md bg-slate-900/50">
            {value.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                    {columns.map(col => (
                        <div key={`${index}-${col.name}`} className="flex-1">
                            <label className="text-xs text-slate-400">{col.label}</label>
                             {col.inputType === 'select' ? (
                                <select
                                    value={item[col.name] ?? ''}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRowChange(index, col.name, e.target.value)}
                                    className="block w-full text-sm bg-slate-700 border border-slate-600 rounded py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                >
                                     <option value="">-- Chọn --</option>
                                    {col.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                             ) : (
                                <input
                                    type={col.type || 'text'}
                                    value={item[col.name] ?? ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRowChange(index, col.name, e.target.value)}
                                    className="block w-full text-sm bg-slate-700 border border-slate-600 rounded py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                             )}
                        </div>
                    ))}
                    <button type="button" onClick={() => removeRow(index)} className="mt-4 flex-shrink-0 w-8 h-8 rounded bg-red-600/50 hover:bg-red-600 text-white font-bold">
                        &times;
                    </button>
                </div>
            ))}
            <Button type="button" onClick={addRow} className="w-full bg-slate-600 hover:bg-slate-500 text-sm py-1">
                + Thêm Dòng
            </Button>
        </div>
    );
};

export default ListEditor;
