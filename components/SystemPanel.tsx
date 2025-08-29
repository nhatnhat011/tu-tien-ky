import React from 'react';
import EventsPanel from './EventsPanel';
import RedeemCodePanel from './RedeemCodePanel';

interface SystemPanelProps {
    token: string | null;
    onRedeemCode: (code: string) => Promise<boolean | void>;
}

const SystemPanel: React.FC<SystemPanelProps> = ({ token, onRedeemCode }) => {
    return (
        <div className="flex flex-col space-y-4">
            <EventsPanel token={token} />
            <RedeemCodePanel onRedeemCode={onRedeemCode} />
        </div>
    );
};

export default SystemPanel;
