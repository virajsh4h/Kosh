'use client';

import PpfDialog from '@/components/ppf/PpfDialog';
import PpfSettingsDialog from '@/components/ppf/PpfSettingsDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/use-toast';
import FilterDropdown from '@/components/ui/FilterDropdown';
import { ppfAPI } from '@/lib/api';
import { generateFinancialYearOptions } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Landmark,
    ArrowDownRight,
    ArrowUpRight,
    Loader2,
    Settings,
} from 'lucide-react';
import { useState, useMemo } from 'react';

const PAGE_SIZE = 20;

function formatCurrency(amount) {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    // Handle both LocalDate (YYYY-MM-DD) and ISO strings
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PpfTableSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-border">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                </div>
            ))}
        </div>
    );
}

export default function PpfPage() {
    const [page, setPage] = useState(0);
    const [financialYear, setFinancialYear] = useState('');
    const [sortDir, setSortDir] = useState('desc');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: txnData, isLoading: isLoadingTxns } = useQuery({
        queryKey: ['ppf', { page, financialYear, sortDir }],
        queryFn: () => ppfAPI.getAll({
            page, size: PAGE_SIZE,
            financialYear: financialYear || undefined,
            sortBy: 'transactionDate',
            sortDir: sortDir,
        }),
        staleTime: 30 * 1000,
        keepPreviousData: true,
    });

    const { data: allTxnData } = useQuery({
        queryKey: ['ppfAllTxns'],
        queryFn: () => ppfAPI.getAll({
            page: 0, size: 1000,
            sortBy: 'transactionDate',
            sortDir: 'desc',
        }),
        staleTime: 30 * 1000,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['ppfSummary'],
        queryFn: () => ppfAPI.getSummary(),
        staleTime: 30 * 1000,
    });

    const { data: settingsData } = useQuery({
        queryKey: ['ppfSettings'],
        queryFn: () => ppfAPI.getSettings(),
        staleTime: 60 * 1000,
    });

    const transactions = Array.isArray(txnData) ? txnData : (txnData?.content ?? []);
    const allTransactions = Array.isArray(allTxnData) ? allTxnData : (allTxnData?.content ?? []);
    const totalPages = txnData?.totalPages ?? txnData?.page?.totalPages ?? (Array.isArray(txnData) ? 1 : 0);
    const totalElements = txnData?.totalElements ?? txnData?.page?.totalElements ?? transactions.length;

    // Dynamic Summary calculation based on FY selection
    const computedSummary = useMemo(() => {
        if (!financialYear) {
            return {
                label: 'All Time Total',
                currentBalance: summaryData?.currentBalance || 0,
                totalDeposits: summaryData?.totalDeposits || 0,
                totalInterestCredited: summaryData?.totalInterestCredited || 0,
            };
        }

        let deposits = 0;
        let interest = 0;
        let endingBalance = 0;

        if (transactions.length > 0) {
            const sorted = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
            endingBalance = sorted[sorted.length - 1]?.balance || 0;

            for (const txn of transactions) {
                if (txn.creditAmount) {
                    if (txn.particularType === 'INTEREST_CREDIT') {
                        interest += txn.creditAmount;
                    } else {
                        deposits += txn.creditAmount;
                    }
                }
            }
        }

        return {
            label: `FY ${financialYear} Total`,
            currentBalance: endingBalance || summaryData?.currentBalance || 0,
            totalDeposits: deposits,
            totalInterestCredited: interest,
        };
    }, [financialYear, summaryData, transactions]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['ppf'] });
        queryClient.invalidateQueries({ queryKey: ['ppfAllTxns'] });
        queryClient.invalidateQueries({ queryKey: ['ppfSummary'] });
        queryClient.invalidateQueries({ queryKey: ['ppfSettings'] });
    };

    const onErr = (err) => {
        toast({ title: 'Operation Failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    };

    const createMutation = useMutation({
        mutationFn: ppfAPI.create,
        onSuccess: () => { toast({ title: 'Transaction Added', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data: d }) => ppfAPI.update(id, d),
        onSuccess: () => { toast({ title: 'Transaction Updated', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const deleteMutation = useMutation({
        mutationFn: ppfAPI.delete,
        onSuccess: () => { toast({ title: 'Transaction Deleted', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateSettingsMutation = useMutation({
        mutationFn: ppfAPI.updateSettings,
        onSuccess: () => { invalidate(); },
        onError: onErr,
    });

    const handleSave = async (txn) => {
        if (editingTxn) {
            await updateMutation.mutateAsync({ id: editingTxn.id, data: txn });
        } else {
            await createMutation.mutateAsync(txn);
        }
    };

    const handleDelete = () => {
        if (editingTxn) {
            toast({
                title: 'Delete Transaction?',
                description: 'This action will trigger a full ledger recalculation.',
                variant: 'warning',
                action: (
                    <button onClick={() => {
                        deleteMutation.mutate(editingTxn.id);
                        setIsDialogOpen(false);
                        setEditingTxn(null);
                    }} className="text-[11px] font-medium text-[hsl(var(--loss))] hover:underline">
                        Confirm
                    </button>
                ),
            });
        }
    };

    const openCreate = () => { setEditingTxn(null); setIsDialogOpen(true); };
    const openEdit = (txn) => { setEditingTxn(txn); setIsDialogOpen(true); };

    const fyOptions = useMemo(() => generateFinancialYearOptions(allTransactions), [allTransactions]);

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Public Provident Fund</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track your PPF contributions, interest, and maturity.</p>
                </div>
            </header>

            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-border">
                <div className="flex items-center gap-4 flex-wrap">
                    <FilterDropdown
                        label="Financial Year"
                        value={financialYear}
                        options={fyOptions}
                        onChange={(val) => { setFinancialYear(val); setPage(0); }}
                        placeholder="All Financial Years"
                    />
                    <FilterDropdown
                        label="Sort Order"
                        value={sortDir}
                        options={[{ value: 'desc', label: 'Date: Newest First' }, { value: 'asc', label: 'Date: Oldest First' }]}
                        onChange={(val) => { setSortDir(val); setPage(0); }}
                        placeholder="Sort By Date"
                    />
                </div>
            </div>

            {isLoadingTxns ? (
                <div className="bg-card border shadow-sm rounded-lg overflow-hidden p-6"><PpfTableSkeleton /></div>
            ) : transactions.length === 0 ? (
                <section className="bg-card border shadow-sm rounded-lg overflow-hidden px-8 py-16 text-center max-w-md mx-auto">
                    
                    
                    
                    
                    <Landmark className="h-7 w-7 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="font-serif italic text-[24px] text-foreground mb-1">Ledger is empty.</p>
                    <p className="text-[12px] text-muted-foreground mb-5">
                        Start tracking your PPF contributions.
                    </p>
                    <button onClick={openCreate} className="ed-btn ed-btn-primary">
                        <Plus className="h-3 w-3" /> Add First Entry
                    </button>
                </section>
            ) : (
                <div className="space-y-8">
                    <div className="bg-card border shadow-sm rounded-lg overflow-hidden overflow-hidden">
                        
                        
                        
                        
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Date</th>
                                        <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Particulars / Payment Mode</th>
                                        <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Debit</th>
                                        <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Credit</th>
                                        <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((txn) => (
                                        <tr 
                                            key={txn.id} 
                                            onClick={() => openEdit(txn)}
                                            className="border-b border-hairline hover:bg-muted/30 cursor-pointer transition-colors group"
                                        >
                                            <td className="py-3 px-4 text-[13px] font-mono whitespace-nowrap">{txn.transactionDate}</td>
                                            <td className="py-3 px-4">
                                                <p className="text-[14px] text-foreground leading-tight group-hover:text-[hsl(var(--accent))] transition-colors">
                                                    {txn.particulars}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                                    {txn.particularType?.replace('_', ' ')}{txn.remarks ? ` • ${txn.remarks}` : ''}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {txn.debitAmount ? (
                                                    <span className="inline-flex items-center text-[hsl(var(--loss))] font-mono text-[13px]">
                                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                                        {formatCurrency(txn.debitAmount)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {txn.creditAmount ? (
                                                    <span className="inline-flex items-center text-[hsl(var(--gain))] font-mono text-[13px]">
                                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                                        {formatCurrency(txn.creditAmount)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-[13px] font-medium text-foreground">
                                                {formatCurrency(txn.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                    </table>
                </div>
            </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 bg-muted/10 border-t border-border">
                            <p className="text-[11px] tabular-nums font-mono text-muted-foreground">
                                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={page === 0}
                                    className="w-8 h-8 border border-border text-muted-foreground hover:border-hairline rounded-sm flex items-center justify-center disabled:opacity-30"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <span className="font-mono text-[12px] px-2">{page + 1} / {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="w-8 h-8 border border-border text-muted-foreground hover:border-hairline rounded-sm flex items-center justify-center disabled:opacity-30"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <PpfDialog
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setEditingTxn(null); }}
                onSave={handleSave}
                onDelete={editingTxn ? handleDelete : undefined}
                initialData={editingTxn}
            />

            <PpfSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settingsData}
                onSaveSettings={async (data) => {
                    await updateSettingsMutation.mutateAsync(data);
                }}
            />
        </div>
    );
}
