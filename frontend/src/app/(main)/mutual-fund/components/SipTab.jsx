import React, { useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mutualFundAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Repeat, Plus, Play, Pause } from "lucide-react";
import SipContributionModal from "../SipContributionModal";
import SipMandateModal from "../SipMandateModal";
import { useToast } from "@/components/ui/use-toast";

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  if (Array.isArray(dateStr)) {
    const [y, m, d] = dateStr;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return dateStr;
}

function getDayOfMonth(dateStr) {
  if (!dateStr) return 0;
  if (Array.isArray(dateStr)) return dateStr[2] || 0;
  if (typeof dateStr === 'string') {
    const parts = dateStr.split('-');
    if (parts.length >= 3) return parseInt(parts[2], 10);
    return new Date(dateStr).getDate() || 0;
  }
  return 0;
}

function getYearMonthKey(dateStr) {
  if (!dateStr) return "";
  if (Array.isArray(dateStr)) {
    return `${dateStr[0]}-${String(dateStr[1]).padStart(2, '0')}`;
  }
  if (typeof dateStr === 'string') {
    const parts = dateStr.split('-');
    if (parts.length >= 2) return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return "";
}

function calculateDuration(start, end) {
  if (!start) return '-';
  
  const parseDate = (d) => {
    if (Array.isArray(d)) return new Date(d[0], d[1] - 1, d[2]);
    return new Date(d);
  };
  
  const startDate = parseDate(start);
  const endDate = end ? parseDate(end) : new Date();
  
  if (isNaN(startDate) || isNaN(endDate)) return '-';
  
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months -= startDate.getMonth();
  months += endDate.getMonth();
  
  if (endDate.getDate() < startDate.getDate()) {
    months--;
  }
  
  if (months <= 0) return '< 1 mo';
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  let result = [];
  if (years > 0) result.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (remainingMonths > 0) result.push(`${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`);
  
  return result.join(', ');
}

export default function SipTab() {
  const [isContributionModalOpen, setIsContributionModalOpen] = React.useState(false);
  const [isMandateModalOpen, setIsMandateModalOpen] = React.useState(false);
  const [editingMandate, setEditingMandate] = React.useState(null);
  const [editingContribution, setEditingContribution] = React.useState(null);
  const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, type: null, mandate: null, date: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef(null);

  const handleSuccess = () => {
    queryClient.invalidateQueries();
  };

  const { data: schemes = [], isLoading: isLoadingSchemes } = useQuery({
    queryKey: ["mfSchemeDropdown", { includeRedeemed: true }],
    queryFn: () => mutualFundAPI.getSchemeDropdown({ includeRedeemed: true }),
    staleTime: 30 * 1000,
  });

  const { data: sips = [], isLoading: isLoadingSips } = useQuery({
    queryKey: ["mfSips"],
    queryFn: () => mutualFundAPI.getSipContributions(),
    staleTime: 30 * 1000,
  });

  const { data: mandates = [], isLoading: isLoadingMandates } = useQuery({
    queryKey: ["mfSipMandates"],
    queryFn: () => mutualFundAPI.getSipMandates(),
    staleTime: 30 * 1000,
  });

  const stopMutation = useMutation({
    mutationFn: ({ id, date }) => mutualFundAPI.stopSipMandate({ id, date }),
    onSuccess: () => {
      toast({ title: "Success", description: "Mandate stopped successfully." });
      handleSuccess();
    },
    onError: () => toast({ title: "Error", description: "Failed to stop mandate.", variant: "destructive" }),
  });

  const restartMutation = useMutation({
    mutationFn: ({ id, date }) => mutualFundAPI.restartSipMandate({ id, date }),
    onSuccess: () => {
      toast({ title: "Success", description: "Mandate renewed successfully." });
      handleSuccess();
    },
    onError: () => toast({ title: "Error", description: "Failed to renew mandate.", variant: "destructive" }),
  });

  const isLoading = isLoadingSchemes || isLoadingSips || isLoadingMandates;

  const data = useMemo(() => {
    const schemeMap = {};
    schemes.forEach(s => { schemeMap[s.id] = s; });

    const enrichedMandates = mandates.map(m => ({
      ...m,
      schemeName: schemeMap[m.schemeId]?.schemeName || 'Unknown Scheme',
      platform: schemeMap[m.schemeId]?.platform || 'Unknown',
      bank: m.bank || schemeMap[m.schemeId]?.bank || '-',
      folioNo: schemeMap[m.schemeId]?.folioNo || '-',
    }));

    const activeMandates = enrichedMandates.filter(m => m.active);
    const stoppedMandates = enrichedMandates.filter(m => !m.active);

    const sortFn = (a, b) => {
      const platformA = (a.platform || "").toLowerCase();
      const platformB = (b.platform || "").toLowerCase();
      if (platformA !== platformB) {
        return platformA.localeCompare(platformB);
      }
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB;
    };

    activeMandates.sort(sortFn);
    stoppedMandates.sort(sortFn);

    // Group SIP Contributions by Mandate and Month
    const contributionsByMandate = {};
    let minYear = new Date().getFullYear();
    let minMonth = new Date().getMonth() + 1;
    let maxYear = new Date().getFullYear();
    let maxMonth = new Date().getMonth() + 1;

    // Track min dates from mandates
    enrichedMandates.forEach(m => {
        if (m.startDate) {
            const y = Array.isArray(m.startDate) ? m.startDate[0] : new Date(m.startDate).getFullYear();
            const mo = Array.isArray(m.startDate) ? m.startDate[1] : new Date(m.startDate).getMonth() + 1;
            if (y < minYear || (y === minYear && mo < minMonth)) {
                minYear = y;
                minMonth = mo;
            }
        }
    });

    sips.forEach(sip => {
        const mandateId = sip.sipMandateId;
        const key = getYearMonthKey(sip.contributionDate);
        if (!contributionsByMandate[mandateId]) {
            contributionsByMandate[mandateId] = {};
        }
        contributionsByMandate[mandateId][key] = sip;

        if (sip.contributionDate) {
            const y = Array.isArray(sip.contributionDate) ? sip.contributionDate[0] : new Date(sip.contributionDate).getFullYear();
            const mo = Array.isArray(sip.contributionDate) ? sip.contributionDate[1] : new Date(sip.contributionDate).getMonth() + 1;
            if (y > maxYear || (y === maxYear && mo > maxMonth)) {
                maxYear = y;
                maxMonth = mo;
            }
        }
    });

    const monthColumns = [];
    let currY = minYear;
    let currM = minMonth;
    while (currY < maxYear || (currY === maxYear && currM <= maxMonth)) {
        const monthName = new Date(currY, currM - 1).toLocaleString('default', { month: 'short' });
        monthColumns.push({
            key: `${currY}-${String(currM).padStart(2, '0')}`,
            label: `${monthName}-${String(currY).slice(-2)}`,
            year: currY,
            month: currM
        });
        currM++;
        if (currM > 12) {
            currM = 1;
            currY++;
        }
    }

    const activeTotalAmount = activeMandates.reduce((sum, m) => sum + (m.amount || 0), 0);
    const stoppedTotalAmount = stoppedMandates.reduce((sum, m) => sum + (m.amount || 0), 0);
    const grandTotalAmount = activeTotalAmount + stoppedTotalAmount;

    const activeMonthTotals = {};
    const stoppedMonthTotals = {};
    const grandMonthTotals = {};
    const mandateTotals = {};
    
    enrichedMandates.forEach(m => {
        mandateTotals[m.id] = 0;
    });

    monthColumns.forEach(col => {
        activeMonthTotals[col.key] = activeMandates.reduce((sum, m) => {
            const sip = contributionsByMandate[m.id]?.[col.key];
            if (sip?.amount) { mandateTotals[m.id] += sip.amount; return sum + sip.amount; }
            return sum;
        }, 0);
        
        stoppedMonthTotals[col.key] = stoppedMandates.reduce((sum, m) => {
            const sip = contributionsByMandate[m.id]?.[col.key];
            if (sip?.amount) { mandateTotals[m.id] += sip.amount; return sum + sip.amount; }
            return sum;
        }, 0);

        grandMonthTotals[col.key] = activeMonthTotals[col.key] + stoppedMonthTotals[col.key];
    });

    const activeTotalInvested = activeMandates.reduce((sum, m) => sum + mandateTotals[m.id], 0);
    const stoppedTotalInvested = stoppedMandates.reduce((sum, m) => sum + mandateTotals[m.id], 0);
    const grandTotalInvested = activeTotalInvested + stoppedTotalInvested;

    return { 
      activeMandates, 
      stoppedMandates, 
      totalMandates: enrichedMandates.length, 
      hasSips: sips.length > 0,
      monthColumns,
      contributionsByMandate,
      activeTotalAmount,
      stoppedTotalAmount,
      grandTotalAmount,
      activeMonthTotals,
      stoppedMonthTotals,
      grandMonthTotals,
      mandateTotals,
      activeTotalInvested,
      stoppedTotalInvested,
      grandTotalInvested
    };
  }, [schemes, sips, mandates]);

  // Auto scroll to the end
  useEffect(() => {
      if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
      }
  }, [data.monthColumns.length]);

  if (isLoading) {
    return (
      <div className="ed-card p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border pb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (data.totalMandates === 0 && !data.hasSips) {
    return (
      <>
        <section className="ed-card relative px-8 py-16 text-center max-w-md mx-auto">
          <span className="corner-mark corner-tl" />
          <span className="corner-mark corner-tr" />
          <span className="corner-mark corner-bl" />
          <span className="corner-mark corner-br" />
          <Repeat className="h-8 w-8 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <p className="font-serif italic text-[24px] text-foreground mb-1">
            No SIPs found.
          </p>
          <button onClick={() => { setEditingMandate(null); setIsMandateModalOpen(true); }} className="ed-btn ed-btn-accent mt-6">
            <Plus className="h-4 w-4" /> Setup First Mandate
          </button>
        </section>
        <SipMandateModal 
          isOpen={isMandateModalOpen} 
          onClose={() => { setIsMandateModalOpen(false); setEditingMandate(null); }} 
          onSuccess={handleSuccess}
          schemes={schemes}
          initialData={editingMandate}
        />
        <SipContributionModal 
          isOpen={isContributionModalOpen} 
          onClose={() => { setIsContributionModalOpen(false); setEditingContribution(null); }} 
          onSuccess={handleSuccess}
          schemes={schemes}
          initialData={editingContribution}
        />
      </>
    );
  }

  const renderMandateRows = (mandateList, isStopped) => {
    let currentPlatform = null;
    const rows = [];
    
    mandateList.forEach((m) => {
      if (m.platform !== currentPlatform) {
        rows.push(
          <tr key={`sep-${m.platform}`} className="border-b border-border/40">
            <td colSpan={8 + data.monthColumns.length} className="py-1.5 px-0 bg-muted">
              <div className="sticky left-4 inline-block text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-widest z-20">
                {m.platform}
              </div>
            </td>
          </tr>
        );
        currentPlatform = m.platform;
      }
      
      rows.push(
        <tr 
          key={m.id} 
          onClick={() => { setEditingMandate(m); setIsMandateModalOpen(true); }}
          className="border-b border-hairline hover:bg-muted/30 transition-colors group cursor-pointer"
        >
          <td className="py-3 px-4 sticky left-0 w-[200px] min-w-[200px] bg-background group-hover:bg-muted z-10">
            <p className="text-[13px] font-medium text-foreground">{m.holderName}</p>
            <p className="text-[11px] font-mono text-muted-foreground">{m.platform}</p>
          </td>
          <td className="py-3 px-4 sticky left-[200px] w-[250px] min-w-[250px] bg-background group-hover:bg-muted z-10">
            <p className="font-serif text-[14px] text-foreground font-medium">{m.schemeName}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Folio: {m.folioNo}</p>
          </td>
          <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap sticky left-[450px] w-[120px] min-w-[120px] bg-background group-hover:bg-muted z-10">
            {m.bank}
          </td>
          <td className="py-3 px-4 font-mono text-[13px] text-foreground whitespace-nowrap sticky left-[570px] w-[150px] min-w-[150px] bg-background group-hover:bg-muted z-10">
            {isStopped ? (
               <>
                 <div>S: {formatDate(m.startDate)}</div>
                 {m.endDate && <div className="text-[11px] text-muted-foreground mt-0.5">E: {formatDate(m.endDate)}</div>}
                 <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">({calculateDuration(m.startDate, m.endDate)})</div>
               </>
            ) : (
               <>
                 <div>{formatDate(m.startDate)}</div>
                 <div className="text-[11px] text-muted-foreground mt-0.5">({calculateDuration(m.startDate, null)})</div>
               </>
            )}
          </td>
          <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-foreground whitespace-nowrap sticky left-[720px] w-[120px] min-w-[120px] bg-background group-hover:bg-muted z-10">
            {formatCurrency(m.amount)}
          </td>
          <td className="py-3 px-4 text-right font-mono text-[13px] font-bold text-primary whitespace-nowrap sticky left-[840px] w-[130px] min-w-[130px] bg-background group-hover:bg-muted z-10 border-r border-border shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
            {formatCurrency(data.mandateTotals[m.id])}
          </td>
          
          {/* Month Columns */}
          {data.monthColumns.map(col => {
              const contribution = data.contributionsByMandate[m.id]?.[col.key];
              
              const colDate = new Date(col.year, col.month - 1, 1);
              const mStart = Array.isArray(m.startDate) 
                  ? new Date(m.startDate[0], m.startDate[1] - 1, 1) 
                  : m.startDate ? new Date(new Date(m.startDate).getFullYear(), new Date(m.startDate).getMonth(), 1) : null;
              const mEnd = Array.isArray(m.endDate)
                  ? new Date(m.endDate[0], m.endDate[1] - 1, 1)
                  : m.endDate ? new Date(new Date(m.endDate).getFullYear(), new Date(m.endDate).getMonth(), 1) : null;
                  
              let isValid = true;
              if (mStart && colDate < mStart) isValid = false;
              if (!m.active && mEnd && colDate > mEnd) isValid = false;

              return (
                  <td key={col.key} className="py-3 px-4 text-center font-mono text-[12px] text-muted-foreground min-w-[80px]">
                      {contribution ? (
                          <div 
                              className={`font-medium cursor-pointer hover:underline flex items-center justify-center gap-1 ${
                                contribution.status === 'FAILED' ? 'text-red-500' : 
                                contribution.status === 'PENDING_NAV' ? 'text-yellow-500' : 'text-foreground'
                              }`}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingContribution({
                                      ...contribution,
                                      debitedBank: m.debitedBank
                                  });
                                  setIsContributionModalOpen(true);
                              }}
                              title={
                                contribution.status === 'FAILED' ? 'Failed - Action Required' : 
                                contribution.status === 'PENDING_NAV' ? 'Pending NAV' : 
                                (contribution.remarks || 'View details')
                              }
                          >
                              {contribution.status === 'FAILED' && <span className="text-[10px]" title="Failed">⚠️</span>}
                              {contribution.status === 'PENDING_NAV' && <span className="text-[10px]" title="Pending NAV">⏳</span>}
                              ₹{contribution.amount}
                          </div>
                      ) : isValid ? (
                          <div 
                              className="cursor-pointer hover:text-foreground hover:font-bold opacity-40 hover:opacity-100 transition-all"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingContribution({
                                      sipMandateId: m.id,
                                      schemeId: m.schemeId,
                                      debitedBank: m.debitedBank,
                                      amount: m.amount,
                                      contributionDate: `${col.year}-${String(col.month).padStart(2, '0')}-${String(getDayOfMonth(m.startDate)).padStart(2, '0')}`,
                                      remarks: `Manual Entry`
                                  });
                                  setIsContributionModalOpen(true);
                              }}
                              title="Add entry for this month"
                          >
                              -
                          </div>
                      ) : null}
                  </td>
              )
          })}

          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap border-l border-border/30 sticky right-0 bg-background group-hover:bg-muted z-10">
            {!isStopped ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'STOP', mandate: m, date: "" }); }}
                  disabled={stopMutation.isPending}
                  className="text-[10px] font-mono text-amber-500 hover:underline inline-flex items-center gap-1"
                >
                  <Pause className="h-3 w-3" /> STOP
                </button>
            ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'RENEW', mandate: m, date: "" }); }}
                  disabled={restartMutation.isPending}
                  className="text-[10px] font-mono text-emerald-500 hover:underline inline-flex items-center gap-1"
                >
                  <Play className="h-3 w-3" /> RENEW
                </button>
            )}
          </td>
        </tr>
      );
    });
    return rows;
  };

  return (
    <div className="space-y-8">
      {/* SIP LEDGER SECTION */}
      <div className="ed-card relative overflow-hidden flex flex-col">
        <span className="corner-mark corner-tl" />
        <span className="corner-mark corner-tr" />
        <span className="corner-mark corner-bl" />
        <span className="corner-mark corner-br" />

        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
          <h3 className="font-serif italic text-lg">SIP Ledger</h3>
          <div className="flex gap-2">
            <button onClick={() => { setEditingContribution(null); setIsContributionModalOpen(true); }} className="ed-btn ed-btn-ghost h-8 text-[11px] border border-border">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Log Entry</span>
            </button>
            <button onClick={() => { setEditingMandate(null); setIsMandateModalOpen(true); }} className="ed-btn ed-btn-accent h-8 text-[11px]">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>New Mandate</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-blue-500/10 border-b border-border text-[11px] text-blue-600 dark:text-blue-400 font-medium">
          Note: Investment amounts are shown strictly as Net Investment, after deducting the applicable Government Stamp Duty (0.005% since July 2020).
        </div>

        <div className="overflow-x-auto custom-scrollbar" ref={scrollContainerRef}>
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground sticky left-0 w-[200px] min-w-[200px] bg-muted z-20">Holder / Platform</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground sticky left-[200px] w-[250px] min-w-[250px] bg-muted z-20">Scheme Name</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground sticky left-[450px] w-[120px] min-w-[120px] bg-muted z-20">Debited Bank</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground sticky left-[570px] w-[150px] min-w-[150px] bg-muted z-20">Start Date</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right sticky left-[720px] w-[120px] min-w-[120px] bg-muted z-20">Amount</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right sticky left-[840px] w-[130px] min-w-[130px] bg-muted z-20 border-r border-border shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">Total Net Inv.</th>
                
                {data.monthColumns.map(col => (
                    <th key={col.key} className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-center">
                        {col.label}
                    </th>
                ))}
                
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right border-l border-border/30 sticky right-0 bg-muted z-20">Action</th>
              </tr>
            </thead>
            <tbody>
              
              {/* ACTIVE MANDATES */}
              {data.activeMandates.length > 0 && (
                <>
                  <tr className="bg-[hsl(var(--gain))]/5 border-y border-[hsl(var(--gain))]/20">
                    <td colSpan={8 + data.monthColumns.length} className="py-2 px-0 bg-background">
                      <div className="sticky left-4 inline-block text-[11px] font-mono font-semibold text-[hsl(var(--gain))] uppercase tracking-widest z-20">
                        Active SIPs
                      </div>
                    </td>
                  </tr>
                  {renderMandateRows(data.activeMandates, false)}
                </>
              )}

              {/* ACTIVE TOTAL ROW */}
              <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                <td className="py-4 px-4 sticky left-0 z-10 bg-muted w-[200px] min-w-[200px]" colSpan={1}></td>
                <td className="py-4 px-4 sticky left-[200px] z-10 bg-muted w-[250px] min-w-[250px]" colSpan={1}></td>
                <td className="py-4 px-4 sticky left-[450px] z-10 bg-muted w-[120px] min-w-[120px]" colSpan={1}></td>
                <td className="py-4 px-4 sticky left-[570px] z-10 bg-muted w-[150px] min-w-[150px] text-right">
                  <span className="text-[13px] font-mono uppercase tracking-wider text-primary">Active Total</span>
                </td>
                <td className="py-4 px-4 text-right sticky left-[720px] w-[120px] min-w-[120px] bg-muted z-10 text-[14px] text-primary">
                  {formatCurrency(data.activeTotalAmount)}
                </td>
                <td className="py-4 px-4 text-right sticky left-[840px] w-[130px] min-w-[130px] bg-muted z-10 border-r border-border shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[14px] text-primary">
                  {formatCurrency(data.activeTotalInvested)}
                </td>
                {data.monthColumns.map(col => (
                  <td key={`total-active-${col.key}`} className="py-4 px-4 text-center font-mono text-[13px] text-primary bg-muted/20">
                    {data.activeMonthTotals[col.key] > 0 ? formatCurrency(data.activeMonthTotals[col.key]) : "-"}
                  </td>
                ))}
                <td className="py-4 px-4 sticky right-0 bg-muted z-10 border-l border-border/30"></td>
              </tr>

              {/* STOPPED MANDATES */}
              {data.stoppedMandates.length > 0 && (
                <>
                  <tr className="bg-amber-500/5 border-y border-amber-500/20">
                    <td colSpan={8 + data.monthColumns.length} className="py-2 px-0 mt-4 bg-background">
                      <div className="sticky left-4 inline-block text-[11px] font-mono font-semibold text-amber-600 uppercase tracking-widest z-20">
                        Stopped SIPs
                      </div>
                    </td>
                  </tr>
                  {renderMandateRows(data.stoppedMandates, true)}
                </>
              )}

              {/* GRAND TOTAL ROW */}
              <tr className="bg-[hsl(var(--gain))]/10 border-t-2 border-[hsl(var(--gain))]/30 font-bold">
                <td className="py-4 px-4 sticky left-0 z-10 bg-muted w-[200px] min-w-[200px]" colSpan={1}></td>
                <td className="py-4 px-4 sticky left-[200px] z-10 bg-muted w-[250px] min-w-[250px]" colSpan={1}></td>
                <td className="py-4 px-4 sticky left-[450px] z-10 bg-muted w-[120px] min-w-[120px]" colSpan={1}></td>
                <td className="py-4 px-4 sticky left-[570px] z-10 bg-muted w-[150px] min-w-[150px] text-right">
                  <span className="text-[13px] font-mono uppercase tracking-wider text-[hsl(var(--gain))]">Grand Total</span>
                </td>
                <td className="py-4 px-4 text-right sticky left-[720px] w-[120px] min-w-[120px] bg-muted z-10 text-[14px] text-[hsl(var(--gain))]">
                  {formatCurrency(data.grandTotalAmount)}
                </td>
                <td className="py-4 px-4 text-right sticky left-[840px] w-[130px] min-w-[130px] bg-muted z-10 border-r border-border shadow-[1px_0_0_0_rgba(0,0,0,0.1)] text-[14px] text-[hsl(var(--gain))]">
                  {formatCurrency(data.grandTotalInvested)}
                </td>
                {data.monthColumns.map(col => (
                  <td key={`total-grand-${col.key}`} className="py-4 px-4 text-center font-mono text-[13px] text-[hsl(var(--gain))] bg-muted/20">
                    {data.grandMonthTotals[col.key] > 0 ? formatCurrency(data.grandMonthTotals[col.key]) : "-"}
                  </td>
                ))}
                <td className="py-4 px-4 sticky right-0 bg-muted z-10 border-l border-border/30"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <SipMandateModal 
        isOpen={isMandateModalOpen} 
        onClose={() => { setIsMandateModalOpen(false); setEditingMandate(null); }} 
        onSuccess={handleSuccess}
        schemes={schemes}
        initialData={editingMandate}
      />
      <SipContributionModal 
        isOpen={isContributionModalOpen} 
        onClose={() => { setIsContributionModalOpen(false); setEditingContribution(null); }} 
        onSuccess={handleSuccess}
        schemes={schemes}
        initialData={editingContribution}
      />

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="ed-card w-full max-w-md p-6 space-y-6">
            <h3 className="font-serif italic text-xl">
              {confirmModal.type === 'STOP' ? 'Stop SIP Mandate' : 'Renew SIP Mandate'}
            </h3>
            <p className="text-sm text-muted-foreground font-mono">
              {confirmModal.type === 'STOP' ? 'Please select the date when this SIP was stopped.' : 'Please select the new start date for this SIP.'}
              <br/>
              <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                {confirmModal.type === 'STOP' 
                  ? '(The date of the final deduction from your bank account)' 
                  : '(The date of the next scheduled deduction from your bank account)'}
              </span>
            </p>
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {confirmModal.type === 'STOP' ? 'Stopped Date' : 'Start Date'} <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                className="ed-input w-full"
                value={confirmModal.date}
                onChange={(e) => setConfirmModal(prev => ({...prev, date: e.target.value}))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, type: null, mandate: null, date: "" })}
                className="ed-btn bg-muted/50 hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button 
                disabled={!confirmModal.date || stopMutation.isPending || restartMutation.isPending}
                onClick={() => {
                  if (confirmModal.type === 'STOP') {
                    stopMutation.mutate({ id: confirmModal.mandate.id, date: confirmModal.date });
                  } else {
                    restartMutation.mutate({ id: confirmModal.mandate.id, date: confirmModal.date });
                  }
                  setConfirmModal({ isOpen: false, type: null, mandate: null, date: "" });
                }}
                className={`ed-btn ${confirmModal.type === 'STOP' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30' : 'ed-btn-accent'}`}
              >
                {confirmModal.type === 'STOP' ? 'Stop SIP' : 'Renew SIP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
