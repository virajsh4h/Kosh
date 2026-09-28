'use client';

import { portfolioAPI } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Briefcase, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function Skeleton({ className = '' }) {
    return <div className={cn('animate-pulse bg-muted rounded-md', className)} />;
}

const BROKER_VAR = {
    ZERODHA:   'bg-orange-500',
    ANGEL_ONE: 'bg-blue-600',
    UPSTOX:    'bg-purple-600',
};

const BROKER_NAME = {
    ZERODHA:   'Zerodha',
    ANGEL_ONE: 'Angel',
    UPSTOX:    'Upstox',
};

export function HoldingsTable() {
    const { data: holdingsData, isLoading } = useQuery({
        queryKey: ['holdings'],
        queryFn: portfolioAPI.getHoldings,
        refetchInterval: 60000,
    });

    const holdings = Array.isArray(holdingsData) ? holdingsData : (holdingsData?.data || []);
    const displayHoldings = holdings.slice(0, 10);

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
        );
    }

    if (!holdings || holdings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No holdings found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    Connect a broker account or upload a CSV to see your portfolio holdings here.
                </p>
                <Link href="/brokers" className="ed-btn ed-btn-primary mt-6">
                    Connect Broker
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="ed-table">
                <thead>
                    <tr>
                        <th className="pl-6">Asset / Symbol</th>
                        <th>Source</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Avg Price</th>
                        <th className="text-right">LTP</th>
                        <th className="text-right">Inv. Value</th>
                        <th className="text-right">Cur. Value</th>
                        <th className="text-right">P&amp;L</th>
                        <th className="text-right pr-6">Day Chg</th>
                    </tr>
                </thead>
                <tbody>
                    {displayHoldings.map((pos, i) => {
                        const pnl = pos.unrealizedPL ?? pos.unrealizedPnL ?? 0;
                        const pnlPct = pos.unrealizedPLPercent ?? 0;
                        const dayGain = pos.dayGain ?? 0;
                        const dayPct = pos.dayGainPercent ?? 0;
                        const invValue = (pos.quantity || 0) * (pos.averageBuyPrice || 0);
                        const pnlUp = pnl >= 0;
                        const dayUp = dayGain >= 0;

                        return (
                            <tr key={`${pos.symbol}-${pos.broker}`}>
                                <td className="pl-6">
                                    <span className="font-semibold text-foreground">{pos.symbol}</span>
                                </td>
                                <td>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <span className={cn('h-1.5 w-1.5 rounded-full', BROKER_VAR[pos.broker] || 'bg-primary')} />
                                        {BROKER_NAME[pos.broker] || pos.broker}
                                    </span>
                                </td>
                                <td className="text-right font-medium">{pos.quantity}</td>
                                <td className="text-right text-muted-foreground">{formatCurrency(pos.averageBuyPrice)}</td>
                                <td className="text-right">
                                    {pos.currentPrice && pos.currentPrice > 0 ? formatCurrency(pos.currentPrice) : '—'}
                                </td>
                                <td className="text-right text-muted-foreground">{formatCurrency(invValue)}</td>
                                <td className="text-right font-semibold">{formatCurrency(pos.currentValue)}</td>
                                <td className="text-right">
                                    <span className={cn('block font-medium', pnlUp ? 'text-gain' : 'text-loss')}>
                                        {pnlUp ? '+' : ''}{formatCurrency(pnl)}
                                    </span>
                                    <span className={cn('block text-xs', pnlUp ? 'text-gain' : 'text-loss')}>
                                        {formatPercent(pnlPct)}
                                    </span>
                                </td>
                                <td className="text-right pr-6">
                                    <span className={cn('inline-flex items-center justify-end gap-1 font-medium text-xs', dayUp ? 'text-gain' : 'text-loss')}>
                                        {dayUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                        {formatPercent(dayPct)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            {holdings.length > 10 && (
                <div className="border-t px-6 py-4 flex justify-center bg-muted/10">
                    <Link href="/portfolio" className="text-sm text-primary font-medium inline-flex items-center hover:underline">
                        View all {holdings.length} holdings
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
            )}
        </div>
    );
}
