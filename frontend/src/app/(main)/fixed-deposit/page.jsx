'use client';

import FdDialog from '@/components/fixeddeposit/FdDialog';
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
import { fdAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Building2, CheckCircle2, XCircle, Clock, ChevronDown, ArrowUpDown, Check, LayoutGrid, List, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
    { value: 'maturityDate:asc', label: 'Maturity Date (Nearest First)' },
    { value: 'maturityDate:desc', label: 'Maturity Date (Farthest First)' },
    { value: 'issueDate:desc', label: 'Issue Date (Newest First)' },
    { value: 'issueDate:asc', label: 'Issue Date (Oldest First)' },
    { value: 'issueAmount:desc', label: 'Amount (Highest First)' },
    { value: 'issueAmount:asc', label: 'Amount (Lowest First)' },
];

function formatCurrency(amount) {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
}

function StatusBadge({ status }) {
    let colorClass = 'bg-muted text-muted-foreground border-border';
    let Icon = Clock;
    
    if (status === 'ACTIVE') {
        colorClass = 'bg-[hsl(var(--gain))]/10 text-[hsl(var(--gain))] border-[hsl(var(--gain))]/30';
        Icon = CheckCircle2;
    } else if (status === 'DUE') {
        colorClass = 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30';
    } else if (status === 'MATURED') {
        colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    } else if (status === 'CLOSED') {
        colorClass = 'bg-[hsl(var(--loss))]/10 text-[hsl(var(--loss))] border-[hsl(var(--loss))]/30';
        Icon = XCircle;
    }

    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border', colorClass)}>
            <Icon className="h-2.5 w-2.5" />
            {status}
        </span>
    );
}

function FdCard({ fd, onEdit, onCloseFd }) {
    return (
        <article
            className="bg-card border shadow-sm rounded-lg overflow-hidden group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md p-5 flex flex-col justify-between"
            onClick={() => onEdit(fd)}
        >
            
            
            
            

            <div>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-serif text-[18px] text-foreground leading-tight mb-1">
                            {fd.place}
                        </h3>
                        <p className="text-[12px] text-muted-foreground">
                            Holder: {fd.holderName}
                            {fd.accountNumber ? ` • A/C: ${fd.accountNumber}` : ''}
                        </p>
                    </div>
                    <StatusBadge status={fd.status} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Invested</p>
                        <p className="font-mono text-[14px] text-foreground font-medium">{formatCurrency(fd.issueAmount)}</p>
                    </div>
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Maturity</p>
                        <p className="font-mono text-[14px] text-[hsl(var(--gain))] font-semibold">
                            {fd.maturityAmount ? formatCurrency(fd.maturityAmount) : 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border/60">
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Issue Date</p>
                        <p className="text-[12px] text-foreground">{fd.issueDate}</p>
                    </div>
                    <div>
                        <p className="eyebrow text-muted-foreground mb-0.5">Maturity Date</p>
                        <p className="text-[12px] text-foreground">{fd.maturityDate}</p>
                    </div>
                </div>

                {fd.investmentPeriod && (
                    <div className="pt-2 text-[11px] font-mono text-muted-foreground">
                        Tenure: <span className="text-foreground">{fd.investmentPeriod}</span>
                    </div>
                )}

                {fd.remarks && (
                    <p className="text-[11px] text-muted-foreground italic mt-2 line-clamp-1">
                        "{fd.remarks}"
                    </p>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 px-2 py-0.5 rounded-sm">
                        {fd.interestRate}% p.a.
                    </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {fd.status !== 'CLOSED' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCloseFd(fd.id); }}
                            className="text-[11px] font-mono text-muted-foreground hover:text-[hsl(var(--loss))] transition-colors border border-border bg-card px-2 py-1 rounded-sm hover:border-[hsl(var(--loss))]/50"
                            aria-label="Mark Closed"
                        >
                            CLOSE
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

function FdTable({ fds, onEdit, onCloseFd }) {
    return (
        <div className="bg-card border shadow-sm rounded-lg overflow-hidden overflow-hidden">
            
            
            
            

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Bank / Institution</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Holder</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Issue Date</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Maturity Date</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Rate</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Invested</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Maturity Amount</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-center">Status</th>
                            <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fds.map((fd) => (
                            <tr
                                key={fd.id}
                                onClick={() => onEdit(fd)}
                                className="border-b border-hairline hover:bg-muted/30 cursor-pointer transition-colors group"
                            >
                                <td className="py-3 px-4">
                                    <p className="text-[14px] font-medium text-foreground group-hover:text-[hsl(var(--accent))] transition-colors">
                                        {fd.place}
                                    </p>
                                    {fd.accountNumber && (
                                        <p className="text-[11px] font-mono text-muted-foreground">A/C: {fd.accountNumber}</p>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-[13px] text-foreground">{fd.holderName}</td>
                                <td className="py-3 px-4 text-[13px] font-mono text-muted-foreground">{fd.issueDate}</td>
                                <td className="py-3 px-4 text-[13px] font-mono text-muted-foreground">{fd.maturityDate}</td>
                                <td className="py-3 px-4 text-[13px] font-mono text-[hsl(var(--accent))] font-medium">{fd.interestRate}%</td>
                                <td className="py-3 px-4 text-right font-mono text-[13px] font-medium text-foreground">{formatCurrency(fd.issueAmount)}</td>
                                <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[hsl(var(--gain))]">
                                    {fd.maturityAmount ? formatCurrency(fd.maturityAmount) : '—'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <StatusBadge status={fd.status} />
                                </td>
                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    {fd.status !== 'CLOSED' && (
                                        <button
                                            onClick={() => onCloseFd(fd.id)}
                                            className="text-[11px] font-mono text-muted-foreground hover:text-[hsl(var(--loss))] border border-border bg-card px-2 py-1 rounded-sm transition-colors hover:border-[hsl(var(--loss))]/50"
                                        >
                                            CLOSE
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function FixedDepositPage() {
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('maturityDate');
    const [sortDir, setSortDir] = useState('asc');
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
    const [isExporting, setIsExporting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingFd, setEditingFd] = useState(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: fdsData, isLoading: isLoadingFds } = useQuery({
        queryKey: ['fds', { page, size: PAGE_SIZE, status: statusFilter, sortBy, sortDir }],
        queryFn: () => fdAPI.getAll({
            page, size: PAGE_SIZE,
            status: statusFilter || undefined,
            sortBy,
            sortDir,
        }),
        staleTime: 30 * 1000,
        keepPreviousData: true,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['fdSummary'],
        queryFn: () => fdAPI.getSummary(),
        staleTime: 30 * 1000,
    });

    const fds = Array.isArray(fdsData) ? fdsData : (fdsData?.content ?? []);
    const totalPages = fdsData?.totalPages ?? fdsData?.page?.totalPages ?? (Array.isArray(fdsData) ? 1 : 0);
    const totalElements = fdsData?.totalElements ?? fdsData?.page?.totalElements ?? fds.length;

    const computedSummary = useMemo(() => {
        if (!statusFilter) {
            return {
                totalInvestment: summaryData?.totalInvestment || 0,
                totalReturns: summaryData?.totalReturns || 0,
                totalActive: summaryData?.totalActiveInvestment || 0,
                activeEstReturns: summaryData?.totalEstimatedReturns || 0,
            };
        } else if (statusFilter === 'ACTIVE') {
            return {
                totalActiveInvestment: summaryData?.totalActiveInvestment || 0,
                totalEstimatedReturns: summaryData?.totalEstimatedReturns || 0,
            };
        } else if (statusFilter === 'DUE') {
            return {
                totalActiveInvestment: summaryData?.totalDueInvestment || 0,
                totalEstimatedReturns: summaryData?.totalDueReturns || 0,
            };
        } else if (statusFilter === 'MATURED') {
            return {
                totalActiveInvestment: summaryData?.totalMaturedInvestment || 0,
                totalEstimatedReturns: summaryData?.totalMaturedReturns || 0,
            };
        } else {
            return {
                totalActiveInvestment: 0,
                totalEstimatedReturns: 0,
            };
        }
    }, [statusFilter, summaryData]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['fds'] });
        queryClient.invalidateQueries({ queryKey: ['fdSummary'] });
    };

    const onErr = (err) => {
        toast({ title: 'Operation Failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    };

    const createMutation = useMutation({
        mutationFn: fdAPI.create,
        onSuccess: () => { toast({ title: 'FD Created', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data: d }) => fdAPI.update(id, d),
        onSuccess: () => { toast({ title: 'FD Updated', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const deleteMutation = useMutation({
        mutationFn: fdAPI.delete,
        onSuccess: () => { toast({ title: 'FD Deleted', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const closeMutation = useMutation({
        mutationFn: fdAPI.close,
        onSuccess: () => { toast({ title: 'FD Marked Closed', variant: 'success' }); invalidate(); },
        onError: onErr,
    });

    const handleSave = async (fdData) => {
        if (editingFd) {
            await updateMutation.mutateAsync({ id: editingFd.id, data: fdData });
        } else {
            await createMutation.mutateAsync(fdData);
        }
    };

    const handleDelete = () => {
        if (editingFd) {
            toast({
                title: 'Delete Fixed Deposit?',
                description: 'This action cannot be undone.',
                variant: 'warning',
                action: (
                    <button onClick={() => {
                        deleteMutation.mutate(editingFd.id);
                        setIsDialogOpen(false);
                        setEditingFd(null);
                    }} className="text-[11px] font-medium text-[hsl(var(--loss))] hover:underline">
                        Confirm
                    </button>
                ),
            });
        }
    };

    const handleClose = (id) => {
        toast({
            title: 'Close Fixed Deposit?',
            description: 'This marks the FD as permanently closed.',
            action: (
                <button onClick={() => closeMutation.mutate(id)} className="text-[11px] font-medium text-[hsl(var(--accent))] hover:underline">
                    Close FD
                </button>
            ),
        });
    };

    const openCreate = () => { setEditingFd(null); setIsDialogOpen(true); };
    const openEdit = (fd) => { setEditingFd(fd); setIsDialogOpen(true); };

    const gridClass = 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'ACTIVE', label: 'ACTIVE' },
        { value: 'DUE', label: 'DUE' },
        { value: 'MATURED', label: 'MATURED' },
        { value: 'CLOSED', label: 'CLOSED' },
    ];

    return (
        <div className="space-y-8">
            <header className="pb-6 border-b border-hairline flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="index-num">FOLIO·§06</span>
                        <span className="h-px w-8 bg-hairline" />
                        <span className="eyebrow">Fixed Income</span>
                    </div>
                    <h1 className="display-serif text-[40px] md:text-[56px] text-foreground leading-none">
                        Fixed <span className="italic text-[hsl(var(--accent))]">Deposits</span>
                    </h1>
                    {statusFilter === '' ? (
                        <div className="flex flex-wrap gap-6 mt-4">
                            <div>
                                <p className="eyebrow text-muted-foreground">Total Investment</p>
                                <p className="font-mono text-lg font-bold">{formatCurrency(computedSummary.totalInvestment)}</p>
                            </div>
                            <div>
                                <p className="eyebrow text-muted-foreground">Total Returns</p>
                                <p className="font-mono text-lg font-bold text-[hsl(var(--gain))]">+{formatCurrency(computedSummary.totalReturns)}</p>
                            </div>
                            <div>
                                <p className="eyebrow text-muted-foreground">Total Active</p>
                                <p className="font-mono text-lg font-bold">{formatCurrency(computedSummary.totalActive)}</p>
                            </div>
                            <div>
                                <p className="eyebrow text-muted-foreground">Est. Returns</p>
                                <p className="font-mono text-lg font-bold text-[hsl(var(--gain))]">+{formatCurrency(computedSummary.activeEstReturns)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-6 mt-4">
                            <div>
                                <p className="eyebrow text-muted-foreground">
                                    {statusFilter === 'ACTIVE' ? 'Total Active' : 
                                     statusFilter === 'DUE' ? 'Total Due' : 
                                     statusFilter === 'MATURED' ? 'Total Matured' : 
                                     `${statusFilter} Investment`}
                                </p>
                                <p className="font-mono text-lg font-bold">{formatCurrency(computedSummary.totalActiveInvestment)}</p>
                            </div>
                            <div>
                                <p className="eyebrow text-muted-foreground">
                                    {statusFilter === 'MATURED' ? 'Actual Returns' : 'Est. Returns'}
                                </p>
                                <p className="font-mono text-lg font-bold text-[hsl(var(--gain))]">+{formatCurrency(computedSummary.totalEstimatedReturns)}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        disabled={isExporting}
                        onClick={async () => {
                            setIsExporting(true);
                            try {
                                const params = {
                                    sortBy: 'issueDate',
                                    sortDir: 'asc',
                                };
                                if (statusFilter !== 'ALL' && statusFilter !== '') params.status = statusFilter;
                                const blobData = await fdAPI.exportCSV(params);
                                const url = window.URL.createObjectURL(new Blob([blobData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', 'fixed_deposits_export.xlsx');
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode.removeChild(link);
                                window.URL.revokeObjectURL(url);
                                toast({ title: 'Export Successful', description: 'FD records downloaded as Excel (.xlsx).' });
                            } catch (err) {
                                console.error('[Export Error]', err);
                                toast({ title: 'Export Failed', description: 'Could not export Excel file.', variant: 'destructive' });
                            } finally {
                                setIsExporting(false);
                            }
                        }}
                        className="ed-btn bg-card text-foreground border-border hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <span>Export Excel</span>
                        )}
                    </button>
                    <button onClick={openCreate} className="ed-btn ed-btn-accent">
                        <Plus className="h-3 w-3" strokeWidth={2.5} /> New Deposit
                    </button>
                </div>
            </header>

            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-border">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="eyebrow mr-1">Status</span>
                    {['', 'ACTIVE', 'DUE', 'MATURED', 'CLOSED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(0); }}
                            className={cn(
                                'h-7 px-3 text-[11px] font-mono tracking-[0.05em] border transition-colors rounded-sm',
                                statusFilter === s
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'border-border text-muted-foreground hover:border-hairline hover:text-foreground'
                            )}
                        >
                            {s === '' ? 'ALL' : s}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="eyebrow">Sort By</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="h-7 px-3 text-[11px] font-mono tracking-[0.05em] border border-border hover:border-hairline bg-card text-foreground hover:bg-muted transition-colors rounded-sm flex items-center gap-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                    <span>{SORT_OPTIONS.find(o => o.value === `${sortBy}:${sortDir}`)?.label || 'Sort By'}</span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
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
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'p-1 rounded-xs transition-colors',
                                viewMode === 'grid'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                            title="Card View"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                'p-1 rounded-xs transition-colors',
                                viewMode === 'table'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                            title="Table View"
                        >
                            <List className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {isLoadingFds ? (
                <div className={gridClass}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card border shadow-sm rounded-lg overflow-hidden h-48 p-5 space-y-4">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-12 w-full mt-4" />
                        </div>
                    ))}
                </div>
            ) : fds.length === 0 ? (
                <section className="bg-card border shadow-sm rounded-lg overflow-hidden px-8 py-16 text-center max-w-md mx-auto">
                    
                    
                    
                    
                    <Building2 className="h-7 w-7 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="font-serif italic text-[24px] text-foreground mb-1">No deposits found.</p>
                    <p className="text-[12px] text-muted-foreground mb-5">
                        Start tracking your safe harbor investments.
                    </p>
                    <button onClick={openCreate} className="ed-btn ed-btn-primary">
                        <Plus className="h-3 w-3" /> Add Deposit
                    </button>
                </section>
            ) : (
                <div className="space-y-8">
                    {viewMode === 'grid' ? (
                        <div className={gridClass}>
                            {fds.map((fd) => (
                                <FdCard key={fd.id} fd={fd} onEdit={openEdit} onCloseFd={handleClose} />
                            ))}
                        </div>
                    ) : (
                        <FdTable fds={fds} onEdit={openEdit} onCloseFd={handleClose} />
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

            <FdDialog
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setEditingFd(null); }}
                onSave={handleSave}
                onDelete={editingFd ? handleDelete : undefined}
                initialData={editingFd}
            />
        </div>
    );
}
