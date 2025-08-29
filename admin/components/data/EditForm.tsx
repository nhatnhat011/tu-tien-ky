import React, { FC, useState } from 'react';
import type { GenericData, FormField } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import ListEditor from '../ui/ListEditor';

interface EditFormProps {
    initialData: GenericData;
    formFields: FormField[];
    onSave: (data: GenericData) => void;
    onCancel: () => void;
    primaryKey: string;
}
const EditForm: FC<EditFormProps> = ({ initialData, formFields, onSave, onCancel, primaryKey }) => {
    const [formData, setFormData] = useState<GenericData>(() => {
        const data = { ...initialData };
        formFields.forEach(field => {
            if ((field.type === 'json' || field.readOnly) && typeof data[field.name] === 'object' && data[field.name] !== null) {
                data[field.name] = JSON.stringify(data[field.name], null, 2);
            }
             if (field.type === 'boolean') {
                data[field.name] = !!data[field.name];
            }
             if (field.objectAsList) {
                const obj = data[field.name] || {};
                data[field.name] = Object.entries(obj).map(([key, value]) => ({ 
                    [field.objectAsList!.keyName]: key, 
                    [field.objectAsList!.valueName]: value 
                }));
            }
        });
        return data;
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleListChange = (name: string, value: GenericData[]) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        let dataToSave = { ...formData };
        try {
            formFields.forEach(field => {
                 if (field.type === 'json' && typeof dataToSave[field.name] === 'string' && !field.readOnly) {
                    dataToSave[field.name] = JSON.parse(dataToSave[field.name]);
                }
                if (field.objectAsList) {
                    const arr = (dataToSave[field.name] as GenericData[]) || [];
                    dataToSave[field.name] = arr.reduce((acc, row) => {
                        const key = row[field.objectAsList!.keyName];
                        const rawValue = row[field.objectAsList!.valueName];
                        if (key) {
                           acc[key] = field.objectAsList!.valueType === 'number' ? Number(rawValue) : rawValue;
                        }
                        return acc;
                    }, {} as GenericData);
                }
            });
            onSave(dataToSave);
        } catch (err) {
            alert(`Lỗi phân tích cú pháp: ${(err as Error).message}`);
        }
    };
    
    const isNew = initialData[primaryKey] === undefined || initialData[primaryKey] === null || initialData[primaryKey] === '';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map(field => {
                const propsToSpread = {
                    label: field.label,
                    name: field.name,
                    disabled: (field.isKey && !isNew) || field.readOnly,
                    required: field.required,
                };

                if (field.type === 'list' || field.objectAsList) {
                     return (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-slate-400 mb-1">{field.label}</label>
                            <ListEditor
                                value={formData[field.name] || []}
                                onChange={(newList) => handleListChange(field.name, newList)}
                                columns={field.columns!}
                            />
                        </div>
                    );
                }

                const inputSpecificProps: any = {
                    ...propsToSpread,
                    value: formData[field.name] ?? '',
                    onChange: handleChange,
                };
                if (field.type === 'boolean') {
                    inputSpecificProps.checked = formData[field.name] === true;
                }
                
                if (field.type === 'json') return <TextArea key={field.name} {...inputSpecificProps} readOnly={field.readOnly} />;
                if (field.type === 'boolean') return <Checkbox key={field.name} {...inputSpecificProps} />;
                if (field.type === 'textarea') return <TextArea key={field.name} {...inputSpecificProps} rows={3}/>;
                if (field.inputType === 'select') return <Select key={field.name} {...inputSpecificProps} options={field.options}/>;
                return <Input key={field.name} {...inputSpecificProps} type={field.type || 'text'} />;
            })}
            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" onClick={onCancel} className="bg-slate-600 hover:bg-slate-500">Hủy</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Lưu</Button>
            </div>
        </form>
    );
};

export default EditForm;
