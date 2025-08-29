// --- Type Definitions ---
export type Option = { value: string | number; label: string };

export type ColumnDefinition = {
    name: string;
    label: string;
    type?: string;
    inputType?: 'select';
    options?: Option[];
};

export type FormField = {
    name: string;
    label: string;
    isKey?: boolean;
    required?: boolean;
    type?: string;
    inputType?: 'select';
    options?: Option[];
    objectAsList?: {
        keyName: string;
        valueName: string;
        valueType?: 'number' | 'string';
    };
    columns?: ColumnDefinition[];
    readOnly?: boolean;
};

export type DisplayColumn = {
    key: string;
    label: string;
};

export type AdminStats = {
    playerCount: number;
    guildCount: number;
};

export type ItemIdOption = {
    value: string;
    label: string;
};

export type AdminMetadata = {
    bonusTypes: Option[];
    equipmentSlots: Option[];
    itemIds: {
        pills: ItemIdOption[];
        herbs: ItemIdOption[];
        equipment: ItemIdOption[];
    };
};

export type GenericData = Record<string, any>;