'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioHoldings } from '@/hooks/usePortfolioHoldings';
import { formatCurrency, formatPercent } from '@/lib/format';
import { getShortCompanyName } from '@/lib/stockNameMapping';
import { cn } from '@/lib/utils';
import { BarChart2, ChevronDown, ChevronUp, Info, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TabError } from './TabError';

const BROKER_DISPLAY = { ZERODHA: 'Zerodha', ANGEL_ONE: 'Angel One', UPSTOX: 'Upstox', GROWW: 'Groww' };
const BROKER_VAR = {
    ZERODHA:   'hsl(var(--broker-zerodha))',
    ANGEL_ONE: 'hsl(var(--broker-angel))',
    UPSTOX:    'hsl(var(--broker-upstox))',
    GROWW:     'hsl(var(--gain))',
};
const PAGE_SIZE = 20;

function SortIcon({ column, sortKey, sortDir }) {
    if (sortKey !== column) return null;
    return sortDir === 'asc'
        ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
        : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
}

export function HoldingsTab() {
    const { data: rawData, isLoading, error, refetch } = usePortfolioHoldings();
    const [search, setSearch] = useState('');
    const [selectedBrokers, setSelectedBrokers] = useState([]);
    const [sortKey, setSortKey] = useState('currentValue');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(0);

    const holdings = useMemo(() => Array.isArray(rawData) ? rawData : (rawData?.data || []), [rawData]);

    const availableBrokers = useMemo(() => {
        const set = new Set();
        holdings.forEach(h => { const b = h.broker || h.brokerType; if (b) set.add(b); });
        return Array.from(set);
    }, [holdings]);

    const toggleBroker = (b) => {
        setSelectedBrokers(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
        setPage(0);
    };

    const filtered = useMemo(() => {
        let result = holdings;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(h =>
                (h.symbol || '').toLowerCase().includes(q) ||
                (getShortCompanyName(h.symbol) || '').toLowerCase().includes(q)
            );
        }
        if (selectedBrokers.length > 0) {
            result = result.filter(h => selectedBrokers.includes(h.broker || h.brokerType));
        }
        return result;
    }, [holdings, search, selectedBrokers]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const aVal = a[sortKey] ?? 0;
            const bVal = b[sortKey] ?? 0;
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    if (error) return <TabError error={error} onRetry={refetch} />;

    const hasT1 = holdings.some(h => h.t1Quantity > 0);
    const TH = (extra) => cn(
        'cursor-pointer select-none hover:text-foreground transition-colors',
        extra,
    );

    return (
        <div className="space-y-5">
            {/* Filter bar */}
            <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search holdings…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                            className="ed-input text-[13px] py-1 w-48"
                        />
                    </div>
                    {availableBrokers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="eyebrow mr-1">Filter</span>
                            {availableBrokers.map(b => (
                                <button
                                    key={b}
                                    onClick={() => toggleBroker(b)}
                                    className={cn(
                                        'h-6 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] border transition-colors rounded-sm inline-flex items-center gap-1.5',
                                        selectedBrokers.includes(b)
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'border-border text-muted-foreground hover:text-foreground hover:border-hairline'
                                    )}
                                >
                                    <span className="h-1 w-1 rounded-full" style={{ background: BROKER_VAR[b] || 'currentColor' }} />
                                    {BROKER_DISPLAY[b] || b}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <span className="text-[11px] tabular-nums font-mono text-muted-foreground">
                    {filtered.length} of {holdings.length} on record
                </span>
            </div>

            {/* Table */}
            <section className="ed-card relative">
                <span className="corner-mark corner-tl" />
                <span className="corner-mark corner-br" />
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full rounded-sm" />
                        ))}
                    </div>
                ) : holdings.length === 0 ? (
                    <div className="py-14 text-center">
                        <BarChart2 className="h-6 w-6 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                        <p className="font-serif italic text-[22px] text-foreground">No holdings on record.</p>
                        <p className="text-[12px] text-muted-foreground mt-1">Connect a broker to begin tracking.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="ed-table">
                                <thead>
                                    <tr>
                                        <th className={TH('text-left')} onClick={() => handleSort('symbol')}>
                                            Stock <SortIcon column="symbol" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="text-left">Broker</th>
                                        <th className={TH('text-right')} onClick={() => handleSort('quantity')}>
                                            Qty <SortIcon column="quantity" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        {hasT1 && <th className="text-right">T1</th>}
                                        <th className={TH('text-right')} onClick={() => handleSort('averageBuyPrice')}>
                                            Avg <SortIcon column="averageBuyPrice" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="text-right">LTP</th>
                                        <th className={TH('text-right')} onClick={() => handleSort('currentValue')}>
                                            Value <SortIcon column="currentValue" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className={TH('text-right')} onClick={() => handleSort('unrealizedPL')}>
                                            P&amp;L <SortIcon column="unrealizedPL" sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                        <th className="text-right pr-6">Day</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((h, i) => {
                                        const broker = h.broker || h.brokerType;
                                        const pnl = h.unrealizedPL ?? h.unrealizedPnL ?? 0;
                                        const pnlPct = h.unrealizedPLPercent ?? h.unrealizedPnLPct ?? 0;
                                        const dayChange = h.dayGain ?? h.dayChange;
                                        const dayPct = h.dayGainPercent ?? h.dayChangePct;
                                        const pnlPos = pnl >= 0;
                                        const dayPos = (dayChange ?? 0) >= 0;
                                        const stockName = getShortCompanyName(h.symbol);

                                        return (
                                            <tr key={`${h.symbol}-${broker}-${i}`}>
                                                <td>
                                                    <div className="flex items-baseline gap-3">
                                                        <span className="index-num tnum w-6">{String(page * PAGE_SIZE + i + 1).padStart(2, '0')}</span>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-foreground tracking-tight">{stockName || h.symbol}</span>
                                                            {stockName && stockName !== h.symbol && (
                                                                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{h.symbol}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
                                                        <span className="h-1 w-1 rounded-full" style={{ background: BROKER_VAR[broker] || 'currentColor' }} />
                                                        {BROKER_DISPLAY[broker] || broker}
                                                    </span>
                                                </td>
                                                <td className="text-right font-mono tnum">{h.quantity}</td>
                                                {hasT1 && (
                                                    <td className="text-right font-mono tnum" title="Unsettled shares">
                                                        {h.t1Quantity > 0
                                                            ? <span className="text-[hsl(var(--chart-4))]">{h.t1Quantity}</span>
                                                            : <span className="text-muted-foreground/50">—</span>}
                                                    </td>
                                                )}
                                                <td className="text-right font-mono tnum text-muted-foreground">
                                                    {formatCurrency(h.averageBuyPrice ?? h.avgBuyPrice, { precise: true })}
                                                </td>
                                                <td className="text-right font-mono tnum text-foreground">
                                                    {h.currentPrice > 0 ? formatCurrency(h.currentPrice) : '—'}
                                                </td>
                                                <td className="text-right font-mono tnum font-semibold text-foreground">
                                                    {formatCurrency(h.currentValue)}
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            'font-mono tnum text-[13px] font-medium inline-flex items-center gap-1',
                                                            pnlPos ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'
                                                        )}>
                                                            {formatCurrency(pnl, { showSign: true })}
                                                            {h.dataConfidence === 'LOW' && (
                                                                <span title="Average price may be inaccurate">
                                                                    <Info className="h-3 w-3 text-muted-foreground/60" />
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className={cn(
                                                            'font-mono tnum text-[10px]',
                                                            pnlPos ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'
                                                        )}>
                                                            {formatPercent(pnlPct, { showSign: true })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-right pr-6">
                                                    {dayChange != null ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className={cn(
                                                                'font-mono tnum text-[11px] font-medium',
                                                                dayPos ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'
                                                            )}>
                                                                {formatPercent(dayPct, { showSign: true })}
                                                            </span>
                                                            <span className={cn(
                                                                'font-mono tnum text-[10px] mt-0.5',
                                                                dayPos ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'
                                                            )}>
                                                                {formatCurrency(dayChange, { showSign: true })}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-muted-foreground/50">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-hairline flex items-center justify-between">
                                <span className="eyebrow tnum">
                                    Page {page + 1} of {totalPages} · {sorted.length} rows
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="h-7 w-7 text-[12px] font-mono border border-border hover:border-hairline disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
                                    >‹</button>
                                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                        const p = page < 3 ? i : page - 2 + i;
                                        if (p >= totalPages) return null;
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={cn(
                                                    'h-7 w-7 text-[12px] font-mono tnum transition-colors rounded-sm',
                                                    p === page
                                                        ? 'bg-foreground text-background'
                                                        : 'border border-border text-muted-foreground hover:border-hairline hover:text-foreground'
                                                )}
                                            >{p + 1}</button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="h-7 w-7 text-[12px] font-mono border border-border hover:border-hairline disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
                                    >›</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
