'use client';

import { BROKER_LIST } from '@/lib/brokerConfig';
import { ShieldCheck } from 'lucide-react';
import { BrokerCard } from './_shared/BrokerCard';

export default function BrokersPage() {
    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Broker Integrations</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Connect and manage your brokerage accounts for automatic sync.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BROKER_LIST.map((broker, i) => (
                    <BrokerCard key={broker.id} broker={broker} index={i} />
                ))}
            </div>

            <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-lg p-5 flex gap-4 items-start">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-md shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900 text-sm">Security & Privacy</h3>
                    <p className="text-sm text-blue-800/80 mt-1">
                        Your credentials are encrypted using industry-standard AES-256. Kosh only requests read-only access to synchronize your portfolio data. We cannot execute trades or withdraw funds on your behalf.
                    </p>
                </div>
            </div>
        </div>
    );
}
