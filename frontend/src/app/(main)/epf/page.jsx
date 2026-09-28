'use client';

import EpfInterestRateDialog from '@/components/epf/EpfInterestRateDialog';
import EpfSettingsDialog from '@/components/epf/EpfSettingsDialog';
import EpfTransactionDialog from '@/components/epf/EpfTransactionDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import FilterDropdown from '@/components/ui/FilterDropdown';
import { epfAPI, userAPI } from '@/lib/api';
import { generateFinancialYearOptions, getFinancialYear } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Percent,
    PiggyBank,
    Plus,
    Settings,
    ShieldAlert,
    Zap,
    Pencil,
} from 'lucide-react';
import { useState, useMemo } from 'react';

const PAGE_SIZE = 20;

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatModeLabel(mode) {
    if (!mode) return 'All Modes';
    if (mode === 'AUTO_SALARY') return 'Auto Salary';
    if (mode === 'MANUAL_OVERRIDE') return 'Manual Entry';
    return mode.replace(/_/g, ' ');
}

function ParticularsCell({ txn }) {
    const isW = !!txn.withdrawalAmount && txn.withdrawalAmount > 0;
    const isAuto = txn.mode === 'AUTO_SALARY';

    return (
        <div className="flex items-center gap-3">
            <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors group-hover:scale-105",
                isW ? "bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]" :
                isAuto ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]" :
                "bg-muted text-muted-foreground"
            )}>
                {isW ? <ArrowDownRight className="h-4 w-4" /> :
                 isAuto ? <Zap className="h-4 w-4" /> :
                 <Pencil className="h-3.5 w-3.5" />}
            </div>
            <div className="flex flex-col justify-center">
                <span className={cn(
                    "text-[13px] font-medium leading-tight transition-colors line-clamp-1",
                    isW ? "text-[hsl(var(--loss))] group-hover:text-[hsl(var(--loss))]" : "text-foreground group-hover:text-[hsl(var(--accent))]"
                )}>
                    {isW ? `Withdrawal — ${formatCurrency(txn.withdrawalAmount)}` : (txn.remarks || (isAuto ? 'Auto Salary Split' : 'Manual Contribution'))}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5 tracking-wide uppercase">
                    {formatModeLabel(txn.mode)}
                </span>
            </div>
        </div>
    );
}

function EpfTableSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-border">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                </div>
            ))}
        </div>
    );
}

const modeOptions = [
    { value: '', label: 'All Modes' },
    { value: 'AUTO_SALARY', label: 'Auto Salary' },
    { value: 'MANUAL_OVERRIDE', label: 'Manual Override' },
];

export default function EpfPage() {
    const [page, setPage] = useState(0);
    const [financialYear, setFinancialYear] = useState('');
    const [modeFilter, setModeFilter] = useState('');
    const [isTxnDialogOpen, setIsTxnDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRatesOpen, setIsRatesOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Queries
    const { data: txnData, isLoading: isLoadingTxns } = useQuery({
        queryKey: ['epf', { page, financialYear, modeFilter }],
        queryFn: () => epfAPI.getAll({
            page, size: PAGE_SIZE,
            financialYear: financialYear || undefined,
            mode: modeFilter || undefined,
            sortBy: 'transactionDate',
            sortDir: 'desc',
        }),
        staleTime: 30 * 1000,
        keepPreviousData: true,
    });

    const { data: allTxnData } = useQuery({
        queryKey: ['epfAllTxns'],
        queryFn: () => epfAPI.getAll({
            page: 0, size: 1000,
            sortBy: 'transactionDate',
            sortDir: 'desc',
        }),
        staleTime: 30 * 1000,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['epfSummary'],
        queryFn: () => epfAPI.getSummary(),
        staleTime: 30 * 1000,
    });

    const { data: settingsData } = useQuery({
        queryKey: ['epfSettings'],
        queryFn: () => epfAPI.getSettings(),
        staleTime: 60 * 1000,
    });

    const { data: ratesData } = useQuery({
        queryKey: ['epfRates'],
        queryFn: () => epfAPI.getInterestRates(),
        staleTime: 60 * 1000,
    });

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: () => userAPI.getProfile(),
        staleTime: 5 * 60 * 1000,
    });

    const transactions = Array.isArray(txnData) ? txnData : (txnData?.content ?? []);
    const allTransactions = Array.isArray(allTxnData) ? allTxnData : (allTxnData?.content ?? []);
    const totalPages = txnData?.totalPages ?? txnData?.page?.totalPages ?? (Array.isArray(txnData) ? 1 : 0);
    const totalElements = txnData?.totalElements ?? txnData?.page?.totalElements ?? transactions.length;

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['epf'] });
        queryClient.invalidateQueries({ queryKey: ['epfAllTxns'] });
        queryClient.invalidateQueries({ queryKey: ['epfSummary'] });
        queryClient.invalidateQueries({ queryKey: ['epfSettings'] });
        queryClient.invalidateQueries({ queryKey: ['epfRates'] });
    };

    const onErr = (err) => {
        toast({ title: 'Operation Failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    };

    // Mutations
    const createMutation = useMutation({
        mutationFn: epfAPI.create,
        onSuccess: () => { toast({ title: 'EPF Entry Created', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data: d }) => epfAPI.update(id, d),
        onSuccess: () => { toast({ title: 'EPF Entry Updated', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const deleteMutation = useMutation({
        mutationFn: epfAPI.delete,
        onSuccess: () => { toast({ title: 'EPF Entry Deleted', variant: 'success' }); invalidate(); },
        onError: onErr,
    });
    const updateSettingsMutation = useMutation({
        mutationFn: epfAPI.updateSettings,
        onSuccess: () => { invalidate(); },
        onError: onErr,
    });

    const handleSaveTxn = async (txn) => {
        if (editingTxn && editingTxn.id) {
            await updateMutation.mutateAsync({ id: editingTxn.id, data: txn });
        } else {
            await createMutation.mutateAsync(txn);
        }
    };

    const handleDeleteTxn = () => {
        if (editingTxn) {
            toast({
                title: 'Delete EPF Transaction?',
                description: 'This action will trigger a full dual-balance (EPF & EPS) recalculation.',
                variant: 'warning',
                action: (
                    <button onClick={() => {
                        deleteMutation.mutate(editingTxn.id);
                        setIsTxnDialogOpen(false);
                        setEditingTxn(null);
                    }} className="text-[11px] font-medium text-[hsl(var(--loss))] hover:underline">
                        Confirm Delete
                    </button>
                ),
            });
        }
    };

    const openCreate = () => { setEditingTxn(null); setIsTxnDialogOpen(true); };
    const openEdit = (txn) => { setEditingTxn(txn); setIsTxnDialogOpen(true); };

    // Dynamic Interest Calculation Sheet (exactly like the Excel template)
    const interestSheet = useMemo(() => {
        if (!financialYear || allTransactions.length === 0) return null;

        // Find interest rate for the year
        const activeRate = ratesData?.find(r => r.financialYear === financialYear)?.ratePercent || 8.25;

        // Sort all transactions chronologically
        const sortedAll = [...allTransactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

        const startYear = parseInt(financialYear.split('-')[0], 10);
        if (isNaN(startYear)) return null;

        // Calculate opening balances by propagating previous years
        let openingEmployeeShare = 0;
        let openingEmployerShare = 0;

        // Find the earliest year in the database
        let minYear = startYear;
        sortedAll.forEach(t => {
            const tFY = getFinancialYear(t.transactionDate);
            if (tFY) {
                const sy = parseInt(tFY.split('-')[0], 10);
                if (sy < minYear) minYear = sy;
            }
        });

        // Initialize with the very first transaction's opening balance
        const firstTxn = sortedAll[0];
        const firstTxnEmp = (firstTxn.employeeContribution || 0) + (firstTxn.vpfAmount || 0);
        const firstTxnEmpr = firstTxn.employerEpfContribution || 0;
        const firstTxnWithdrawal = firstTxn.withdrawalAmount || 0;
        const initialBalance = (firstTxn.epfBalance || 0) - (firstTxnEmp + firstTxnEmpr - firstTxnWithdrawal);
        let currentEmpClosing = Math.round((initialBalance / 2) * 100) / 100;
        let currentEmprClosing = Math.round((initialBalance - currentEmpClosing) * 100) / 100;

        // Month mapping
        const monthsMapping = [
            { label: 'Mar', creditMonth: 4, creditYearOffset: 0, monthsConsider: 11 },
            { label: 'Apr', creditMonth: 5, creditYearOffset: 0, monthsConsider: 10 },
            { label: 'May', creditMonth: 6, creditYearOffset: 0, monthsConsider: 9 },
            { label: 'Jun', creditMonth: 7, creditYearOffset: 0, monthsConsider: 8 },
            { label: 'Jul', creditMonth: 8, creditYearOffset: 0, monthsConsider: 7 },
            { label: 'Aug', creditMonth: 9, creditYearOffset: 0, monthsConsider: 6 },
            { label: 'Sep', creditMonth: 10, creditYearOffset: 0, monthsConsider: 5 },
            { label: 'Oct', creditMonth: 11, creditYearOffset: 0, monthsConsider: 4 },
            { label: 'Nov', creditMonth: 12, creditYearOffset: 0, monthsConsider: 3 },
            { label: 'Dec', creditMonth: 1, creditYearOffset: 1, monthsConsider: 2 },
            { label: 'Jan', creditMonth: 2, creditYearOffset: 1, monthsConsider: 1 },
            { label: 'Feb', creditMonth: 3, creditYearOffset: 1, monthsConsider: 0 },
        ];

        const getTxnKey = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length < 2) return '';
            return `${parts[0]}-${parts[1]}`;
        };

        // Propagate year by year up to startYear
        for (let y = minYear; y < startYear; y++) {
            const yearFY = `${y}-${String(y + 1).slice(-2)}`;
            const yearRate = ratesData?.find(r => r.financialYear === yearFY)?.ratePercent || 8.25;

            // Get transactions of this year
            const yearTxns = sortedAll.filter(t => getFinancialYear(t.transactionDate) === yearFY);

            let yearEmpContrib = 0;
            let yearEmprContrib = 0;

            const txnMap = new Map();
            yearTxns.forEach(txn => {
                if (txn.remarks && txn.remarks.startsWith("Annual Interest Credit")) return;
                const key = getTxnKey(txn.transactionDate);
                if (key) {
                    const existing = txnMap.get(key) || { employeeContribution: 0, employerEpfContribution: 0, vpfAmount: 0, withdrawalAmount: 0 };
                    txnMap.set(key, {
                        employeeContribution: existing.employeeContribution + (txn.employeeContribution || 0),
                        employerEpfContribution: existing.employerEpfContribution + (txn.employerEpfContribution || 0),
                        vpfAmount: existing.vpfAmount + (txn.vpfAmount || 0),
                        withdrawalAmount: existing.withdrawalAmount + (txn.withdrawalAmount || 0),
                    });
                }
            });

            // Sum up interest for the year
            let yearEmpInterest = Math.round((currentEmpClosing * 12 * yearRate) / 1200 * 100) / 100;
            let yearEmprInterest = Math.round((currentEmprClosing * 12 * yearRate) / 1200 * 100) / 100;

            monthsMapping.forEach(m => {
                const targetYear = y + m.creditYearOffset;
                const targetKey = `${targetYear}-${String(m.creditMonth).padStart(2, '0')}`;
                const txn = txnMap.get(targetKey);

                const withdrawalAmt = txn ? txn.withdrawalAmount : 0;
                const empShare = txn ? (txn.employeeContribution + txn.vpfAmount - (withdrawalAmt / 2)) : 0;
                const emprShare = txn ? (txn.employerEpfContribution - (withdrawalAmt / 2)) : 0;

                yearEmpContrib += empShare;
                yearEmprContrib += emprShare;

                yearEmpInterest += Math.round((empShare * m.monthsConsider * yearRate) / 1200 * 100) / 100;
                yearEmprInterest += Math.round((emprShare * m.monthsConsider * yearRate) / 1200 * 100) / 100;
            });

            currentEmpClosing = currentEmpClosing + yearEmpContrib + yearEmpInterest;
            currentEmprClosing = currentEmprClosing + yearEmprContrib + yearEmprInterest;
        }

        openingEmployeeShare = currentEmpClosing;
        openingEmployerShare = currentEmprClosing;

        const rows = [];
        
        // Add Opening Balance Row
        const openingInterestEmp = Math.round((openingEmployeeShare * 12 * activeRate) / 1200 * 100) / 100;
        const openingInterestEmpr = Math.round((openingEmployerShare * 12 * activeRate) / 1200 * 100) / 100;
        
        rows.push({
            monthLabel: 'Opening balance',
            creditDate: `31.03.${startYear}`,
            monthsConsider: 12,
            rate: activeRate,
            empShare: openingEmployeeShare,
            empInterest: 0,
            emprShare: openingEmployerShare,
            emprInterest: 0,
            isOpening: true,
            rawTxn: null,
            basicDa: 0,
            employeeShare: 0,
            employerEpf: 0,
            employerEps: 0,
            vpf: 0,
            epfBalance: openingEmployeeShare + openingEmployerShare,
            epsBalance: 0,
            withdrawalAmount: 0,
            mode: null,
            details: 'Opening Balance',
        });

        let totalEmpShare = openingEmployeeShare;
        let totalEmprShare = openingEmployerShare;
        let totalEmpInterest = 0;
        let totalEmprInterest = 0;

        let runningEmpBalance = openingEmployeeShare;
        let runningEmprBalance = openingEmployerShare;

        // Map transactions of the selected financial year
        const selectedYearTxns = sortedAll.filter(t => getFinancialYear(t.transactionDate) === financialYear);
        const txnMapSelected = new Map();
        selectedYearTxns.forEach(txn => {
            if (txn.remarks && txn.remarks.startsWith("Annual Interest Credit")) return;
            const key = getTxnKey(txn.transactionDate);
            if (key) {
                const existing = txnMapSelected.get(key) || {
                    employeeContribution: 0,
                    employerEpfContribution: 0,
                    employerEpsContribution: 0,
                    vpfAmount: 0,
                    withdrawalAmount: 0,
                    basicDa: 0,
                    epfBalance: 0,
                    epsBalance: 0,
                    txns: []
                };
                existing.employeeContribution += (txn.employeeContribution || 0);
                existing.employerEpfContribution += (txn.employerEpfContribution || 0);
                existing.employerEpsContribution += (txn.employerEpsContribution || 0);
                existing.vpfAmount += (txn.vpfAmount || 0);
                existing.withdrawalAmount += (txn.withdrawalAmount || 0);
                existing.basicDa = txn.basicDa || existing.basicDa;
                existing.epfBalance = txn.epfBalance || existing.epfBalance;
                existing.epsBalance = txn.epsBalance || existing.epsBalance;
                existing.txns.push(txn);
                txnMapSelected.set(key, existing);
            }
        });

        monthsMapping.forEach(m => {
            const targetYear = startYear + m.creditYearOffset;
            const targetKey = `${targetYear}-${String(m.creditMonth).padStart(2, '0')}`;
            const groupedTxn = txnMapSelected.get(targetKey);
            const primaryTxn = groupedTxn && groupedTxn.txns.length > 0 ? groupedTxn.txns[0] : null;

            const withdrawalAmt = groupedTxn ? groupedTxn.withdrawalAmount : 0;
            const empShare = groupedTxn ? (groupedTxn.employeeContribution + groupedTxn.vpfAmount - (withdrawalAmt / 2)) : 0;
            const emprShare = groupedTxn ? (groupedTxn.employerEpfContribution - (withdrawalAmt / 2)) : 0;
            
            const empInterest = Math.round((runningEmpBalance * activeRate) / 1200 * 100) / 100;
            const emprInterest = Math.round((runningEmprBalance * activeRate) / 1200 * 100) / 100;

            runningEmpBalance += empShare;
            runningEmprBalance += emprShare;

            let creditDateStr = '-';
            if (primaryTxn?.transactionDate) {
                const parts = primaryTxn.transactionDate.split('-');
                if (parts.length === 3) {
                    creditDateStr = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }
            }

            const remarksList = groupedTxn ? groupedTxn.txns.map(t => t.remarks).filter(Boolean) : [];
            const remarks = remarksList.join(', ');

            rows.push({
                monthLabel: `${m.label}-${String(targetYear).slice(-2)}`,
                creditDate: creditDateStr,
                monthsConsider: m.monthsConsider,
                rate: activeRate,
                empShare,
                empInterest,
                emprShare,
                emprInterest,
                isOpening: false,
                rawTxn: primaryTxn,
                txns: groupedTxn ? groupedTxn.txns : [],
                basicDa: groupedTxn ? groupedTxn.basicDa : 0,
                employeeShare: groupedTxn ? groupedTxn.employeeContribution : 0,
                employerEpf: groupedTxn ? groupedTxn.employerEpfContribution : 0,
                employerEps: groupedTxn ? groupedTxn.employerEpsContribution : 0,
                vpf: groupedTxn ? groupedTxn.vpfAmount : 0,
                epfBalance: groupedTxn ? groupedTxn.epfBalance : 0,
                epsBalance: groupedTxn ? groupedTxn.epsBalance : 0,
                withdrawalAmount: withdrawalAmt,
                mode: primaryTxn ? primaryTxn.mode : null,
                details: primaryTxn ? (primaryTxn.withdrawalAmount ? 'EPF Withdrawal' : primaryTxn.mode === 'AUTO_SALARY' ? 'Auto Salary Split' : 'Manual Entry') : null,
                remarks,
                targetMonth: m.creditMonth,
                targetYear: targetYear,
            });

            totalEmpShare += empShare;
            totalEmprShare += emprShare;
            totalEmpInterest += empInterest;
            totalEmprInterest += emprInterest;
        });

        const closingEmp = totalEmpShare + totalEmpInterest;
        const closingEmpr = totalEmprShare + totalEmprInterest;
        const totalClosing = closingEmp + closingEmpr;

        const sumEmpShare = rows.reduce((sum, r) => sum + (r.isOpening ? 0 : (r.employeeShare || 0)), 0);
        const sumEmprEpf = rows.reduce((sum, r) => sum + (r.isOpening ? 0 : (r.employerEpf || 0)), 0);
        const sumEmprEps = rows.reduce((sum, r) => sum + (r.isOpening ? 0 : (r.employerEps || 0)), 0);
        const sumVpf = rows.reduce((sum, r) => sum + (r.isOpening ? 0 : (r.vpf || 0)), 0);
        const totalInterestAdded = totalEmpInterest + totalEmprInterest;

        return {
            rows,
            totalEmpShare,
            totalEmpInterest,
            totalEmprShare,
            totalEmprInterest,
            closingEmp,
            closingEmpr,
            totalClosing,
            sumEmpShare,
            sumEmprEpf,
            sumEmprEps,
            sumVpf,
            totalInterestAdded,
        };
    }, [financialYear, allTransactions, ratesData]);

    // Dynamic Summary calculation based on FY/Mode filter selection
    const computedSummary = useMemo(() => {
        if (!financialYear && !modeFilter) {
            return {
                currentEpfBalance: summaryData?.currentEpfBalance || 0,
                currentEpsBalance: summaryData?.currentEpsBalance || 0,
                totalEmployeeContribution: summaryData?.totalEmployeeContribution || 0,
                totalEmployerEpfContribution: summaryData?.totalEmployerEpfContribution || 0,
                totalEmployerEpsContribution: summaryData?.totalEmployerEpsContribution || 0,
                interestAccruedThisFyEpf: summaryData?.interestAccruedThisFyEpf || 0,
            };
        }

        let empTotal = 0;
        let emprEpfTotal = 0;
        let emprEpsTotal = 0;
        let latestEpfBalance = 0;
        let latestEpsBalance = 0;
        let interestCreditedEpf = 0;

        if (transactions.length > 0) {
            // Sort ascending by transactionDate to find final balance in FY
            const sorted = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
            const latest = sorted[sorted.length - 1];
            latestEpfBalance = latest?.epfBalance || 0;
            latestEpsBalance = latest?.epsBalance || 0;

            for (const txn of transactions) {
                if (txn.remarks && txn.remarks.startsWith("Annual Interest Credit")) {
                    interestCreditedEpf += (txn.employeeContribution || 0) + (txn.employerEpfContribution || 0);
                } else {
                    if (!txn.withdrawalAmount) {
                        empTotal += (txn.employeeContribution || 0);
                        emprEpfTotal += (txn.employerEpfContribution || 0);
                        emprEpsTotal += (txn.employerEpsContribution || 0);
                    }
                }
            }
        }

        let accruedInterest = interestCreditedEpf;
        if (financialYear) {
            if (interestSheet) {
                accruedInterest = interestSheet.totalEmpInterest + interestSheet.totalEmprInterest;
            } else if (interestCreditedEpf === 0) {
                accruedInterest = summaryData?.interestAccruedThisFyEpf || 0;
            }
        } else if (interestCreditedEpf === 0) {
            accruedInterest = summaryData?.interestAccruedThisFyEpf || 0;
        }

        return {
            currentEpfBalance: latestEpfBalance || summaryData?.currentEpfBalance || 0,
            currentEpsBalance: latestEpsBalance || summaryData?.currentEpsBalance || 0,
            totalEmployeeContribution: empTotal,
            totalEmployerEpfContribution: emprEpfTotal,
            totalEmployerEpsContribution: emprEpsTotal,
            interestAccruedThisFyEpf: accruedInterest,
        };
    }, [financialYear, modeFilter, summaryData, transactions, interestSheet]);

    // Dynamic financial year options derived from data & current timeline via shared helper
    const fyOptions = useMemo(() => generateFinancialYearOptions(allTransactions), [allTransactions]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Employees Provident Fund</h1>
                    <p className="text-sm text-muted-foreground mt-1">Monitor your EPF/VPF balances and employer contributions.</p>
                </div>
            </header>

            {/* Taxable Interest Alert Banner */}
            {summaryData?.taxableInterestFlag && (
                <div className="p-4 rounded-sm border border-[hsl(var(--chart-4))]/40 bg-[hsl(var(--chart-4))]/10 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-[hsl(var(--chart-4))] flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-[12px]">
                        <p className="font-semibold text-foreground font-serif">
                            Taxable Interest Threshold Exceeded (Section 10(11)/10(12))
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            Your total employee contributions (including VPF) for the current financial year exceed ₹2,50,000. Under statutory IT rules, interest earned on the contribution amount exceeding ₹2.5L is taxable as Income from Other Sources.
                        </p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-border">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* FY Dropdown Filter */}
                    <FilterDropdown
                        label="Financial Year"
                        value={financialYear}
                        options={fyOptions}
                        onChange={(val) => { setFinancialYear(val); setPage(0); }}
                        placeholder="All Financial Years"
                    />

                    {/* Mode filter — only visible when showing all FY (no FY selected) */}
                    {!financialYear && (
                        <>
                            <span className="h-4 w-px bg-border hidden sm:inline-block" />
                            <FilterDropdown
                                label="Calculation Mode"
                                value={modeFilter}
                                options={modeOptions}
                                onChange={(val) => { setModeFilter(val); setPage(0); }}
                                placeholder="All Modes"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Main Content List / Table */}
            {isLoadingTxns ? (
                <div className="bg-card border shadow-sm rounded-lg overflow-hidden p-6"><EpfTableSkeleton /></div>
            ) : transactions.length === 0 && (!financialYear || !interestSheet) ? (
                <section className="bg-card border shadow-sm rounded-lg overflow-hidden px-8 py-16 text-center max-w-md mx-auto">
                    
                    
                    
                    
                    <PiggyBank className="h-8 w-8 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="font-serif italic text-[24px] text-foreground mb-1">EPF ledger is empty.</p>
                    <p className="text-[12px] text-muted-foreground mb-5">
                        Add monthly salary split contributions or past EPF transactions.
                    </p>
                    <button onClick={openCreate} className="ed-btn ed-btn-primary">
                        <Plus className="h-3 w-3" /> Add First EPF Entry
                    </button>
                </section>
            ) : (
                <div className="space-y-8">
                    <div className="bg-card border shadow-sm rounded-lg overflow-hidden overflow-hidden">
                            
                            
                            
                            

                            <div className="overflow-x-auto animate-fadeIn">
                                {financialYear && interestSheet ? (
                                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground">Month</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground">Date</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground">Mode / Details</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">Basic + DA</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">Employee Share</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">Employer EPF</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">Employer EPS</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">VPF</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">EPF Balance</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">EPS Balance</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-center">Rate</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">Emp Interest</th>
                                                <th className="py-3 px-2 font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground text-right">Empr Interest</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {interestSheet.rows.map((row, idx) => {
                                                const hasTxn = !!row.rawTxn;
                                                const isClickable = !row.isOpening;
                                                return (
                                                    <tr
                                                        key={idx}
                                                        onClick={(e) => {
                                                            if (!isClickable) return;
                                                            if (e.target.closest('.interactive-txn-badge')) return;
                                                            
                                                            if (row.txns && row.txns.length === 1) {
                                                                openEdit(row.txns[0]);
                                                             } else if (!row.txns || row.txns.length === 0) {
                                                                const defaultDate = `${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}-15`;
                                                                setEditingTxn({
                                                                    transactionDate: defaultDate,
                                                                });
                                                                setIsTxnDialogOpen(true);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "border-b border-hairline transition-colors",
                                                            row.isOpening ? "bg-[hsl(var(--accent))]/5 font-semibold text-muted-foreground" : "hover:bg-muted/30 cursor-pointer group"
                                                        )}
                                                    >
                                                        <td className="py-3 px-2 font-medium">{row.monthLabel}</td>
                                                        <td className="py-3 px-2 text-muted-foreground">
                                                            {row.isOpening ? (
                                                                row.creditDate
                                                            ) : row.txns && row.txns.length > 0 ? (
                                                                <div className="flex flex-col gap-1.5">
                                                                    {row.txns.map((txn) => {
                                                                        const parts = txn.transactionDate.split('-');
                                                                        const formattedDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : txn.transactionDate;
                                                                        return (
                                                                            <div key={txn.id} className="py-1 text-[11px] font-mono leading-tight">
                                                                                {formattedDate}
                                                                                {txn.remarks && <div className="h-[13px]" />}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            {row.isOpening ? (
                                                                <span>Opening Balance</span>
                                                            ) : row.txns && row.txns.length > 0 ? (
                                                                <div className="flex flex-col gap-1.5">
                                                                    {row.txns.map((txn) => {
                                                                        const isW = !!txn.withdrawalAmount && txn.withdrawalAmount > 0;
                                                                        return (
                                                                            <div
                                                                                key={txn.id}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    openEdit(txn);
                                                                                }}
                                                                                className="interactive-txn-badge hover:text-[hsl(var(--accent))] transition-colors cursor-pointer text-[12px] py-1 border-b border-border/10 last:border-0"
                                                                            >
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={cn(
                                                                                        "leading-tight font-medium",
                                                                                        isW ? "text-[hsl(var(--loss))] font-semibold" : "text-foreground group-hover/item:text-[hsl(var(--accent))]"
                                                                                    )}>
                                                                                        {isW 
                                                                                            ? `Withdrawal: -${formatCurrency(txn.withdrawalAmount)}` 
                                                                                            : `${formatModeLabel(txn.mode)}`
                                                                                        }
                                                                                    </span>
                                                                                    <span className="text-[9px] text-muted-foreground font-normal ml-2">
                                                                                        ({txn.transactionDate.split('-')[2]})
                                                                                    </span>
                                                                                </div>
                                                                                {txn.remarks && (
                                                                                    <span className="text-[9px] text-muted-foreground italic mt-0.5 block truncate max-w-[180px]" title={txn.remarks}>
                                                                                        {txn.remarks}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground/60 italic flex items-center gap-1 group-hover:text-[hsl(var(--accent))]">
                                                                    <Plus className="h-3 w-3" /> Click to Add
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-muted-foreground">
                                                            {row.isOpening ? '-' : row.basicDa ? formatCurrency(row.basicDa) : '-'}
                                                        </td>
                                                        <td className="py-3 px-2 text-right font-medium text-foreground">
                                                            {row.isOpening ? (
                                                                formatCurrency(row.empShare)
                                                            ) : (
                                                                row.withdrawalAmount > 0 ? (
                                                                    <div className="flex flex-col items-end">
                                                                        {row.employeeShare > 0 && <span className="text-foreground">{formatCurrency(row.employeeShare)}</span>}
                                                                        <span className="text-[hsl(var(--loss))] font-medium">-{formatCurrency(row.withdrawalAmount / 2)}</span>
                                                                    </div>
                                                                ) : row.employeeShare > 0 ? (
                                                                    formatCurrency(row.employeeShare)
                                                                ) : '-'
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-[hsl(var(--gain))]">
                                                            {row.isOpening ? (
                                                                formatCurrency(row.emprShare)
                                                            ) : (
                                                                row.withdrawalAmount > 0 ? (
                                                                    <div className="flex flex-col items-end">
                                                                        {row.employerEpf > 0 && <span className="text-[hsl(var(--gain))]">{formatCurrency(row.employerEpf)}</span>}
                                                                        <span className="text-[hsl(var(--loss))] font-medium">-{formatCurrency(row.withdrawalAmount / 2)}</span>
                                                                    </div>
                                                                ) : row.employerEpf > 0 ? (
                                                                    formatCurrency(row.employerEpf)
                                                                ) : '-'
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-[hsl(var(--accent))]">
                                                            {row.isOpening ? '-' : hasTxn ? formatCurrency(row.employerEps) : '-'}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-muted-foreground">
                                                            {row.isOpening ? '-' : row.vpf ? formatCurrency(row.vpf) : '-'}
                                                        </td>
                                                        <td className="py-3 px-2 text-right font-bold text-foreground">
                                                            {row.isOpening ? formatCurrency(row.empShare + row.emprShare) : hasTxn ? formatCurrency(row.epfBalance) : '-'}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-muted-foreground font-medium">
                                                            {row.isOpening ? '-' : hasTxn ? formatCurrency(row.epsBalance) : '-'}
                                                        </td>
                                                        <td className="py-3 px-2 text-center text-muted-foreground">{row.rate}%</td>
                                                        <td className="py-3 px-2 text-right text-[hsl(var(--accent))]">
                                                            {formatCurrency(row.empInterest)}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-[hsl(var(--accent))]">
                                                            {formatCurrency(row.emprInterest)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Summary Row */}
                                            <tr className="bg-[hsl(var(--accent))]/5 border-b border-border font-semibold">
                                                <td className="py-3 px-2 text-muted-foreground font-semibold" colSpan={4}>Total Contributions (FY)</td>
                                                <td className="py-3 px-2 text-right font-semibold">{formatCurrency(interestSheet.sumEmpShare)}</td>
                                                <td className="py-3 px-2 text-right text-[hsl(var(--gain))] font-semibold">{formatCurrency(interestSheet.sumEmprEpf)}</td>
                                                <td className="py-3 px-2 text-right text-[hsl(var(--accent))] font-semibold">{formatCurrency(interestSheet.sumEmprEps)}</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">{formatCurrency(interestSheet.sumVpf)}</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-center text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                            </tr>
                                            {/* Interest Credited Row */}
                                            <tr className="bg-[hsl(var(--accent))]/5 border-b border-border font-semibold text-[hsl(var(--accent))]">
                                                <td className="py-3 px-2 font-semibold" colSpan={4}>Interest Credited (FY)</td>
                                                <td className="py-3 px-2 text-right font-semibold">-</td>
                                                <td className="py-3 px-2 text-right font-semibold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-right font-bold">{formatCurrency(interestSheet.totalInterestAdded)}</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-center text-muted-foreground font-semibold">-</td>
                                                <td className="py-3 px-2 text-right font-semibold">{formatCurrency(interestSheet.totalEmpInterest)}</td>
                                                <td className="py-3 px-2 text-right font-semibold">{formatCurrency(interestSheet.totalEmprInterest)}</td>
                                            </tr>
                                            {/* TDS Row */}
                                            <tr className="border-b border-border text-muted-foreground italic">
                                                <td className="py-3 px-2 text-muted-foreground" colSpan={4}>TDS</td>
                                                <td className="py-3 px-2 text-right">₹0.00</td>
                                                <td className="py-3 px-2 text-right">₹0.00</td>
                                                <td className="py-3 px-2 text-right">-</td>
                                                <td className="py-3 px-2 text-right">-</td>
                                                <td className="py-3 px-2 text-right">₹0.00</td>
                                                <td className="py-3 px-2 text-right">-</td>
                                                <td className="py-3 px-2 text-center">-</td>
                                                <td className="py-3 px-2 text-right">₹0.00</td>
                                                <td className="py-3 px-2 text-right">₹0.00</td>
                                            </tr>
                                            {/* Closing Balance Row */}
                                            <tr className="bg-[hsl(var(--accent))]/10 border-b-2 border-border font-bold">
                                                <td className="py-3 px-2 text-muted-foreground font-bold" colSpan={4}>Closing Balance</td>
                                                <td className="py-3 px-2 text-right font-bold">{formatCurrency(interestSheet.closingEmp)}</td>
                                                <td className="py-3 px-2 text-right text-[hsl(var(--gain))] font-bold">{formatCurrency(interestSheet.closingEmpr)}</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-bold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-bold">-</td>
                                                <td className="py-3 px-2 text-right font-bold">{formatCurrency(interestSheet.closingEmp + interestSheet.closingEmpr)}</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-bold">-</td>
                                                <td className="py-3 px-2 text-center text-muted-foreground font-bold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-bold">-</td>
                                                <td className="py-3 px-2 text-right text-muted-foreground font-bold">-</td>
                                            </tr>
                                            {/* EPF Balance Row */}
                                            <tr className="bg-[hsl(var(--accent))]/15 font-black text-sm">
                                                <td className="py-4 px-2 text-left text-muted-foreground font-bold" colSpan={8}>EPF Balance</td>
                                                <td className="py-4 px-2 text-right font-black text-[13px] text-foreground" colSpan={1}>
                                                    {formatCurrency(interestSheet.totalClosing)}
                                                </td>
                                                <td colSpan={4}></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Date</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Particulars</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Basic + DA</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Employee Share</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Employer EPF</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Employer EPS</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">VPF</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">EPF Balance</th>
                                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">EPS Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((txn) => {
                                                const isW = !!txn.withdrawalAmount && txn.withdrawalAmount > 0;
                                                return (
                                                    <tr
                                                        key={txn.id}
                                                        onClick={() => openEdit(txn)}
                                                        className="border-b border-hairline hover:bg-muted/30 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="py-3 px-4 text-[13px] font-mono whitespace-nowrap">{txn.transactionDate}</td>
                                                        <td className="py-3 px-4">
                                                            <ParticularsCell txn={txn} />
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[12px] text-muted-foreground">
                                                            {txn.basicDA ? formatCurrency(txn.basicDA) : '-'}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[12px] font-medium text-foreground">
                                                            {isW ? '-' : formatCurrency(txn.employeeContribution)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[12px] text-[hsl(var(--gain))]">
                                                            {isW ? '-' : formatCurrency(txn.employerEpfContribution)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[12px] text-[hsl(var(--accent))]">
                                                            {isW ? '-' : formatCurrency(txn.employerEpsContribution)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[12px] text-muted-foreground">
                                                            {txn.vpfAmount ? formatCurrency(txn.vpfAmount) : '-'}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[13px] font-bold text-foreground">
                                                            {formatCurrency(txn.epfBalance)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-[12px] text-muted-foreground font-medium">
                                                            {formatCurrency(txn.epsBalance)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                    {!financialYear && totalPages > 1 && (
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

            {/* Dialogs */}
            <EpfTransactionDialog
                isOpen={isTxnDialogOpen}
                onClose={() => { setIsTxnDialogOpen(false); setEditingTxn(null); }}
                onSave={handleSaveTxn}
                onDelete={editingTxn && editingTxn.id ? handleDeleteTxn : undefined}
                initialData={editingTxn}
                settings={settingsData}
            />

            <EpfSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settingsData}
                onSaveSettings={async (data) => {
                    await updateSettingsMutation.mutateAsync(data);
                }}
            />

            <EpfInterestRateDialog
                isOpen={isRatesOpen}
                onClose={() => setIsRatesOpen(false)}
                rates={ratesData}
            />
        </div>
    );
}
