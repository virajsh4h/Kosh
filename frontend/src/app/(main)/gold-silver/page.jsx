'use client';

import GoldSilverDialog from '@/components/goldsilver/GoldSilverDialog';
import MarketRateDialog from '@/components/goldsilver/MarketRateDialog';
import RateSettingsDialog from '@/components/goldsilver/RateSettingsDialog';
import RateDisclosureBanner from '@/components/goldsilver/RateDisclosureBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { goldSilverAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Coins,
    ArrowUpDown,
    Check,
    LayoutGrid,
    List,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    ShieldAlert,
    RefreshCw,
    Sliders,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
    { value: 'purchaseDate:desc', label: 'Purchase Date (Newest First)' },
    { value: 'purchaseDate:asc', label: 'Purchase Date (Oldest First)' },
    { value: 'maturityDate:asc', label: 'Maturity Date (Nearest First)' },
    { value: 'netAmount:desc', label: 'Invested (Highest First)' },
    { value: 'returnPercent:desc', label: 'Returns (Highest First)' },
];

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatWeight(w) {
    if (!w) return '0g';
    return `${w.toFixed(3)}g`;
}

function StatusBadge({ status, highlight, daysToMaturity }) {
    if (status === 'ACTIVE' && (!highlight || highlight === 'NONE')) {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border bg-[hsl(var(--gain))]/10 text-[hsl(var(--gain))] border-[hsl(var(--gain))]/30">ACTIVE</span>;
    }
    if (status === 'MATURED') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border bg-blue-500/10 text-blue-500 border-blue-500/30">MATURED</span>;
    }

    let colorClass = 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30';
    let icon = <Clock className="h-2.5 w-2.5 mr-1" />;

    if (highlight === 'RED') {
        colorClass = 'bg-[hsl(var(--loss))]/10 text-[hsl(var(--loss))] border-[hsl(var(--loss))]/30';
        icon = <ShieldAlert className="h-2.5 w-2.5 mr-1" />;
    }

    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border', colorClass)} title={daysToMaturity ? `${daysToMaturity} days left` : ''}>
            {icon}
            {status}
        </span>
    );
}

function RateModeBadge({ mode, onClick }) {
    const isLive = mode === 'LIVE' || !mode;
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick();
            }}
            title="Click to toggle rate mode (LIVE / MANUAL)"
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-mono border transition-all cursor-pointer hover:opacity-80",
                isLive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
            )}
        >
            <Zap className="h-2.5 w-2.5" />
            {isLive ? 'LIVE' : 'MANUAL'}
        </button>
    );
}

function GsCard({ item, onEdit, onToggleRateMode }) {
    const isProfit = item.profitLoss >= 0;
    const isGold = item.metalType === 'GOLD';
    const purityLabel = item.purityLabel || `${item.purity}K`;

    return (
        <article
            className="bg-card border shadow-sm rounded-lg overflow-hidden group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md p-5 flex flex-col justify-between"
            onClick={() => onEdit(item)}
        >
            
            
            
            

            <div>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn("px-1.5 py-0.5 text-[9px] font-mono rounded-sm border", isGold ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30")}>
                                {item.metalType}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground font-medium">{purityLabel}</span>
                            <RateModeBadge mode={item.rateSource} onClick={() => onToggleRateMode(item)} />
                        </div>
                        <h3 className="font-serif text-[18px] text-foreground leading-tight line-clamp-1">
                            {item.purchaseItem}
                        </h3>
                        <p className="text-[12px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span>{item.purchasedFrom} • {item.purchaseDate}</span>
                            {item.remarks && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground font-mono font-medium">
                                    {item.remarks}
                                </span>
                            )}
                        </p>
                    </div>
                    <StatusBadge status={item.status} highlight={item.highlight} daysToMaturity={item.daysToMaturity} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Weight</p>
                        <p className="font-mono text-[14px] text-foreground font-medium">{formatWeight(item.netWeight)}</p>
                    </div>
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Invested (Cost)</p>
                        <p className="font-mono text-[14px] text-foreground font-medium">{formatCurrency(item.netAmount)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border/60">
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Current Value</p>
                        <p className="text-[13px] font-mono font-medium text-foreground">{item.currentValue ? formatCurrency(item.currentValue) : '—'}</p>
                    </div>
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">P&L</p>
                        {item.currentValue ? (
                            <div className={cn("flex items-center gap-1 text-[13px] font-mono font-medium", isProfit ? "text-[hsl(var(--gain))]" : "text-[hsl(var(--loss))]")}>
                                {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {formatCurrency(Math.abs(item.profitLoss))}
                                <span className="text-[10px] ml-1">({item.returnPercent}%)</span>
                            </div>
                        ) : <span className="text-[13px] font-mono text-muted-foreground">—</span>}
                    </div>
                </div>

                {item.maturityDate && (
                    <div className="pt-2 text-[11px] font-mono text-muted-foreground">
                        Maturity: <span className="text-foreground">{item.maturityDate}</span>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    Buy: ₹{item.ratePerGram}/g
                    {item.currentMarketRate ? ` → ₹${item.currentMarketRate}/g` : ''}
                </div>
            </div>
        </article>
    );
}

function GsTable({ data, onEdit, onToggleRateMode }) {
    return (
        <div className="bg-card border shadow-sm rounded-lg overflow-hidden overflow-hidden">
            
            
            
            

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Item / Store</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Type / Purity / Mode</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Weight</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Cost Rate</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Invested</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Current Value</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">P&L</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                onClick={() => onEdit(item)}
                                className="border-b border-hairline hover:bg-muted/30 cursor-pointer transition-colors group"
                            >
                                <td className="py-3 px-4">
                                    <p className="text-[13px] font-medium text-foreground group-hover:text-[hsl(var(--accent))] transition-colors">
                                        {item.purchaseItem}
                                    </p>
                                    <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                        <span>{item.purchasedFrom} • {item.purchaseDate}</span>
                                        {item.remarks && (
                                            <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-foreground font-mono font-medium">
                                                {item.remarks}
                                            </span>
                                        )}
                                    </p>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={cn("px-1 rounded-sm text-[9px] font-mono border", item.metalType === 'GOLD' ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30")}>
                                            {item.metalType}
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground">{item.purityLabel || `${item.purity}K`}</span>
                                        <RateModeBadge mode={item.rateSource} onClick={() => onToggleRateMode(item)} />
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">{formatWeight(item.netWeight)}</td>
                                <td className="py-3 px-4 text-right font-mono text-[12px] text-muted-foreground">₹{item.ratePerGram}/g</td>
                                <td className="py-3 px-4 text-right font-mono text-[13px] font-medium text-foreground">{formatCurrency(item.netAmount)}</td>
                                <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-foreground">
                                    {item.currentValue ? formatCurrency(item.currentValue) : '—'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    {item.currentValue ? (
                                        <div className={cn("flex flex-col items-end text-[12px] font-mono font-medium", item.profitLoss >= 0 ? "text-[hsl(var(--gain))]" : "text-[hsl(var(--loss))]")}>
                                            <span>{item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}</span>
                                            <span className="text-[10px]">({item.returnPercent}%)</span>
                                        </div>
                                    ) : <span className="text-[13px] font-mono text-muted-foreground">—</span>}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <StatusBadge status={item.status} highlight={item.highlight} daysToMaturity={item.daysToMaturity} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function GoldSilverPage() {
    const [page, setPage] = useState(0);
    const [metalFilter, setMetalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('purchaseDate');
    const [sortDir, setSortDir] = useState('desc');
    const [viewMode, setViewMode] = useState('table');

    const [isExporting, setIsExporting] = useState(false);
    const [isRefreshingRates, setIsRefreshingRates] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [marketRateDialogState, setMarketRateDialogState] = useState({ isOpen: false, metalType: 'GOLD' });
    const [isRateSettingsOpen, setIsRateSettingsOpen] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: pageData, isLoading: isLoadingData } = useQuery({
        queryKey: ['goldSilver', { page, size: PAGE_SIZE, metalType: metalFilter, status: statusFilter, sortBy, sortDir }],
        queryFn: () => goldSilverAPI.getAll({
            page, size: PAGE_SIZE,
            metalType: metalFilter || undefined,
            status: statusFilter || undefined,
            sortBy,
            sortDir,
        }),
        staleTime: 30 * 1000,
        keepPreviousData: true,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['gsSummary'],
        queryFn: () => goldSilverAPI.getSummary(),
        staleTime: 30 * 1000,
    });

    const { data: currentRates, refetch: refetchRates } = useQuery({
        queryKey: ['gsCurrentRates'],
        queryFn: () => goldSilverAPI.getCurrentRates(),
        staleTime: 60 * 1000,
    });

    const items = Array.isArray(pageData) ? pageData : (pageData?.content ?? []);
    const totalPages = pageData?.totalPages ?? pageData?.page?.totalPages ?? (Array.isArray(pageData) ? 1 : 0);
    const totalElements = pageData?.totalElements ?? pageData?.page?.totalElements ?? items.length;

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['goldSilver'] });
        queryClient.invalidateQueries({ queryKey: ['gsSummary'] });
        queryClient.invalidateQueries({ queryKey: ['gsCurrentRates'] });
    };

    const onErr = (err) => {
        toast({ title: 'Operation Failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    };

    const createMutation = useMutation({
        mutationFn: goldSilverAPI.create,
        onSuccess: () => { toast({ title: 'Record Created', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data: d }) => goldSilverAPI.update(id, d),
        onSuccess: () => { toast({ title: 'Record Updated', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const deleteMutation = useMutation({
        mutationFn: goldSilverAPI.delete,
        onSuccess: () => { toast({ title: 'Record Deleted', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateMarketRateMutation = useMutation({
        mutationFn: goldSilverAPI.updateMarketRate,
        onSuccess: () => { toast({ title: 'Manual Rates Updated', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateRateModeMutation = useMutation({
        mutationFn: ({ id, rateSource }) => goldSilverAPI.updateRateMode(id, { rateSource }),
        onSuccess: () => { toast({ title: 'Rate Mode Updated', variant: 'success' }); invalidate(); },
        onError: onErr,
    });

    const handleSave = async (data) => {
        if (editingItem) {
            await updateMutation.mutateAsync({ id: editingItem.id, data });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    const handleDelete = () => {
        if (editingItem) {
            toast({
                title: 'Delete Record?',
                description: 'This action cannot be undone.',
                variant: 'warning',
                action: (
                    <button onClick={() => {
                        deleteMutation.mutate(editingItem.id);
                        setIsDialogOpen(false);
                        setEditingItem(null);
                    }} className="text-[11px] font-medium text-[hsl(var(--loss))] hover:underline">
                        Confirm
                    </button>
                ),
            });
        }
    };

    const handleForceRefreshRates = async () => {
        setIsRefreshingRates(true);
        try {
            await goldSilverAPI.refreshRates();
            toast({ title: 'Rates Refreshed', description: 'Live market prices fetched & holdings recomputed.', variant: 'success' });
            invalidate();
        } catch (err) {
            console.error('Refresh rates failed', err);
            toast({ title: 'Refresh Failed', description: err?.message || 'Failed to refresh rates.', variant: 'destructive' });
        } finally {
            setIsRefreshingRates(false);
        }
    };

    const handleToggleRateMode = (item) => {
        const nextMode = item.rateSource === 'MANUAL' ? 'LIVE' : 'MANUAL';
        updateRateModeMutation.mutate({ id: item.id, rateSource: nextMode });
    };

    const openCreate = () => { setEditingItem(null); setIsDialogOpen(true); };
    const openEdit = (item) => { setEditingItem(item); setIsDialogOpen(true); };

    const gridClass = 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';
    const isTotalProfit = summaryData?.overallProfitLoss >= 0;

    const goldSnapshot = currentRates?.find(r => r.metalType === 'GOLD');
    const silverSnapshot = currentRates?.find(r => r.metalType === 'SILVER');

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gold & Silver</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your precious metal investments (SGBs, physical, ETFs).</p>
                </div>
            </header>

            {/* Rate Disclosure Banner */}
            <RateDisclosureBanner
                goldSnapshot={goldSnapshot}
                silverSnapshot={silverSnapshot}
                onOpenSettings={() => setIsRateSettingsOpen(true)}
                className="mb-3"
            />

            {/* Live Metal Rates Banner */}
            <div className="bg-card border shadow-sm rounded-lg overflow-hidden p-4 bg-muted/20 border border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                    {/* GOLD Rates */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="eyebrow text-amber-600 dark:text-amber-400 font-semibold">Gold Live Rates</span>
                            {goldSnapshot?.localPremiumPercent && (
                                <span className="text-[10px] font-mono text-muted-foreground">(+{goldSnapshot.localPremiumPercent}% Local Premium)</span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap font-mono">
                            <div>
                                <span className="text-[10px] text-muted-foreground block">24K (999)</span>
                                <span className="text-[14px] font-bold text-foreground">
                                    {goldSnapshot?.effectiveBaseRate ? `₹${goldSnapshot.effectiveBaseRate.toFixed(2)}/g` : '—'}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-border/60" />
                            <div>
                                <span className="text-[10px] text-muted-foreground block">22K (916)</span>
                                <span className="text-[14px] font-bold text-foreground">
                                    {goldSnapshot?.effectiveBaseRate ? `₹${(goldSnapshot.effectiveBaseRate * 0.916).toFixed(2)}/g` : '—'}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-border/60" />
                            <div>
                                <span className="text-[10px] text-muted-foreground block">18K (750)</span>
                                <span className="text-[14px] font-bold text-foreground">
                                    {goldSnapshot?.effectiveBaseRate ? `₹${(goldSnapshot.effectiveBaseRate * 0.750).toFixed(2)}/g` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-border hidden lg:block" />

                    {/* SILVER Rates */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
                            <span className="eyebrow text-slate-400 font-semibold">Silver Live Rates</span>
                            {silverSnapshot?.localPremiumPercent && (
                                <span className="text-[10px] font-mono text-muted-foreground">(+{silverSnapshot.localPremiumPercent}% Local Premium)</span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap font-mono">
                            <div>
                                <span className="text-[10px] text-muted-foreground block">999 Fine</span>
                                <span className="text-[14px] font-bold text-foreground">
                                    {silverSnapshot?.effectiveBaseRate ? `₹${silverSnapshot.effectiveBaseRate.toFixed(2)}/g` : '—'}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-border/60" />
                            <div>
                                <span className="text-[10px] text-muted-foreground block">925 Sterling</span>
                                <span className="text-[14px] font-bold text-foreground">
                                    {silverSnapshot?.effectiveBaseRate ? `₹${(silverSnapshot.effectiveBaseRate * 0.925).toFixed(2)}/g` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground self-end lg:self-auto">
                    {(goldSnapshot?.isStale || silverSnapshot?.isStale) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/30">
                            STALE (Fallback)
                        </span>
                    )}
                    {goldSnapshot?.fetchedAt && (
                        <span>Rate As Of: {new Date(goldSnapshot.fetchedAt).toLocaleString()}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-border">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="eyebrow mr-1">Metal</span>
                        {['', 'GOLD', 'SILVER'].map((s) => (
                            <button
                                key={s}
                                onClick={() => { setMetalFilter(s); setPage(0); }}
                                className={cn(
                                    'h-7 px-3 text-[11px] font-mono tracking-[0.05em] border transition-colors rounded-sm',
                                    metalFilter === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-hairline hover:text-foreground'
                                )}
                            >
                                {s === '' ? 'ALL' : s}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-border hidden sm:block" />

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="eyebrow mr-1">Status</span>
                        {['', 'ACTIVE', 'DUE', 'MATURED'].map((s) => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setPage(0); }}
                                className={cn(
                                    'h-7 px-3 text-[11px] font-mono tracking-[0.05em] border transition-colors rounded-sm',
                                    statusFilter === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-hairline hover:text-foreground'
                                )}
                            >
                                {s === '' ? 'ALL' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="eyebrow">Sort</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="h-7 px-3 text-[11px] font-mono tracking-[0.05em] border border-border hover:border-hairline bg-card text-foreground hover:bg-muted transition-colors rounded-sm flex items-center gap-2 outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                    <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.value === `${sortBy}:${sortDir}`)?.label || 'Sort'}</span>
                                    <span className="sm:hidden">Sort</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-sm border-hairline bg-card shadow-lg z-50">
                                <DropdownMenuLabel className="eyebrow text-[10px] px-2 py-1.5">Order Sequence</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {SORT_OPTIONS.map((opt) => {
                                    const isSelected = `${sortBy}:${sortDir}` === opt.value;
                                    return (
                                        <DropdownMenuItem
                                            key={opt.value}
                                            onClick={() => {
                                                const [by, dir] = opt.value.split(':');
                                                setSortBy(by);
                                                setSortDir(dir);
                                                setPage(0);
                                            }}
                                            className={cn(
                                                'cursor-pointer text-[12px] font-mono px-2 py-2 flex items-center justify-between transition-colors',
                                                isSelected ? 'bg-muted text-[hsl(var(--accent))] font-medium' : 'text-foreground hover:bg-muted/50'
                                            )}
                                        >
                                            <span>{opt.label}</span>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center border border-border rounded-sm p-0.5 bg-muted/20">
                        <button type="button" onClick={() => setViewMode('grid')} className={cn('p-1 rounded-xs transition-colors', viewMode === 'grid' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setViewMode('table')} className={cn('p-1 rounded-xs transition-colors', viewMode === 'table' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                            <List className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {isLoadingData ? (
                <div className={gridClass}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card border shadow-sm rounded-lg overflow-hidden h-48 p-5 space-y-4">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-12 w-full mt-4" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <section className="bg-card border shadow-sm rounded-lg overflow-hidden px-8 py-16 text-center max-w-md mx-auto mt-12">
                    
                    
                    
                    
                    <Coins className="h-7 w-7 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="font-serif italic text-[24px] text-foreground mb-1">No holdings found.</p>
                    <p className="text-[12px] text-muted-foreground mb-5">
                        Start tracking your precious metal investments.
                    </p>
                    <button onClick={openCreate} className="ed-btn ed-btn-primary">
                        <Plus className="h-3 w-3" /> Add Holding
                    </button>
                </section>
            ) : (
                <div className="space-y-8">
                    {viewMode === 'grid' ? (
                        <div className={gridClass}>
                            {items.map((item) => (
                                <GsCard key={item.id} item={item} onEdit={openEdit} onToggleRateMode={handleToggleRateMode} />
                            ))}
                        </div>
                    ) : (
                        <GsTable data={items} onEdit={openEdit} onToggleRateMode={handleToggleRateMode} />
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <p className="text-[11px] tabular-nums font-mono text-muted-foreground">
                            Showing {totalElements === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page === 0}
                                className="w-8 h-8 border border-border text-muted-foreground hover:border-hairline rounded-sm flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-mono text-[12px] px-2">{page + 1} / {Math.max(1, totalPages)}</span>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={totalPages <= 1 || page >= totalPages - 1}
                                className="w-8 h-8 border border-border text-muted-foreground hover:border-hairline rounded-sm flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <GoldSilverDialog
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setEditingItem(null); }}
                onSave={handleSave}
                onDelete={editingItem ? handleDelete : undefined}
                initialData={editingItem}
            />

            <MarketRateDialog
                isOpen={marketRateDialogState.isOpen}
                metalType={marketRateDialogState.metalType}
                onClose={() => setMarketRateDialogState({ isOpen: false, metalType: 'GOLD' })}
                onSave={async (data) => {
                    await updateMarketRateMutation.mutateAsync(data);
                }}
            />

            <RateSettingsDialog
                isOpen={isRateSettingsOpen}
                onClose={() => setIsRateSettingsOpen(false)}
                onSaved={invalidate}
            />
        </div>
    );
}
