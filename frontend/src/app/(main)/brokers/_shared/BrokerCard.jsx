'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useBrokerConnection } from '@/hooks/useBrokerConnection';
import { cn } from '@/lib/utils';
import { ArrowRight, Check, Clock } from 'lucide-react';
import Link from 'next/link';

function relativeTime(iso) {
    if (!iso) return null;
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const BROKER_COLOR = {
    ZERODHA:   'text-orange-600 bg-orange-100 border-orange-200',
    ANGEL_ONE: 'text-blue-600 bg-blue-100 border-blue-200',
    UPSTOX:    'text-purple-600 bg-purple-100 border-purple-200',
};

const BROKER_BORDER = {
    ZERODHA:   'border-t-orange-500',
    ANGEL_ONE: 'border-t-blue-500',
    UPSTOX:    'border-t-purple-500',
};

function StatusPill({ isConnected, isExpiringSoon, isExpired, isLoading }) {
    if (isLoading) return <Skeleton className="h-5 w-20 rounded-md" />;
    if (isExpired) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">Expired</span>;
    if (isExpiringSoon) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Expiring Soon</span>;
    if (isConnected) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">Not connected</span>;
}

export function BrokerCard({ broker, index = 0 }) {
    const { data, isLoading } = useBrokerConnection();
    const status = data?.brokers?.find((b) => b.broker === broker.key);
    const isConnected = status?.tokenActive ?? false;
    const isExpiringSoon = status?.isExpiringSoon ?? false;
    const isExpired = status && !status.tokenActive && status.lastStatus !== null;
    const lastSyncedAt = status?.lastSuccessAt;
    const ctaLabel = isExpired ? 'Reconnect' : isConnected ? 'Manage' : 'Connect';

    const colorClasses = BROKER_COLOR[broker.key] || 'text-primary bg-primary/10 border-primary/20';
    const borderTopClass = BROKER_BORDER[broker.key] || 'border-t-primary';

    return (
        <article className={cn("bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md", borderTopClass)} style={{ borderTopWidth: '4px' }}>
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-12 h-12 flex items-center justify-center rounded-lg border font-bold text-lg", colorClasses)}>
                        {broker.initials}
                    </div>
                    <StatusPill
                        isConnected={isConnected}
                        isExpiringSoon={isExpiringSoon}
                        isExpired={isExpired}
                        isLoading={isLoading}
                    />
                </div>

                <div className="mb-4">
                    <h3 className="font-semibold text-lg text-foreground">{broker.displayName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{broker.tagline}</p>
                </div>

                <div className="pt-4 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Supported Features</span>
                    <ul className="grid grid-cols-2 gap-y-2 gap-x-2">
                        {broker.capabilities.map((cap) => (
                            <li key={cap} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                {cap}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="px-5 py-4 bg-muted/20 border-t flex items-center justify-between">
                {isConnected && lastSyncedAt ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {relativeTime(lastSyncedAt)}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                )}

                <Link
                    href={broker.setupPath}
                    className={cn(
                        'ed-btn h-8 text-xs',
                        isConnected ? 'ed-btn-ghost bg-background border' : isExpired ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'ed-btn-primary'
                    )}
                >
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
            </div>
        </article>
    );
}
