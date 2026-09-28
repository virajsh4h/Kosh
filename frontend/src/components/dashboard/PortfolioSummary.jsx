'use client';

import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useState } from 'react';

function MetricCard({ title, value, subtext, trend, valueClass }) {
    return (
        <div className="flex flex-col gap-2 p-5 bg-card border rounded-lg shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold tracking-tight", valueClass)}>{value}</span>
                {trend !== undefined && (
                    <span className={cn(
                        "text-sm font-medium flex items-center",
                        trend >= 0 ? "text-gain" : "text-loss"
                    )}>
                        {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {formatPercent(trend)}
                    </span>
                )}
            </div>
            {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
        </div>
    );
}

export function PortfolioSummary() {
    const { data, isLoading } = usePortfolioSummary();
    const [dismissedStale, setDismissedStale] = useState(false);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-28 bg-muted rounded-lg" />
                ))}
            </div>
        );
    }

    if (!data) return null;

    const dayPositive = (data.totalDayGain || 0) >= 0;
    const plPositive = (data.totalUnrealizedPL || 0) >= 0;

    return (
        <div className="space-y-4">
            {data.hasStalePrices && !dismissedStale && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Live market data is currently unavailable. Prices shown may be delayed.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total Net Worth" 
                    value={formatCurrency(data.totalCurrentValue)} 
                    subtext="Across all linked accounts"
                />
                <MetricCard 
                    title="Total Invested" 
                    value={formatCurrency(data.totalInvestedValue)} 
                    subtext="Total principal amount"
                />
                <MetricCard 
                    title="Today's Return" 
                    value={`${dayPositive ? '+' : ''}${formatCurrency(data.totalDayGain)}`} 
                    trend={data.totalDayGainPercent}
                    valueClass={dayPositive ? 'text-gain' : 'text-loss'}
                />
                <MetricCard 
                    title="Overall Return" 
                    value={`${plPositive ? '+' : ''}${formatCurrency(data.totalUnrealizedPL)}`} 
                    trend={data.totalUnrealizedPLPercent}
                    valueClass={plPositive ? 'text-gain' : 'text-loss'}
                />
            </div>
        </div>
    );
}
