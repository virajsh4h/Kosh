import React, { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mutualFundAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, Plus } from "lucide-react";
import RedemptionModal from "../RedemptionModal";
import FilterDropdown from "@/components/ui/FilterDropdown";

function getFinancialYear(dateString) {
  if (!dateString) return "Unknown";
  const d = new Date(dateString);
  const year = d.getFullYear();
  if (d.getMonth() < 3) {
    return `FY ${year - 1}-${String(year).slice(2)}`;
  } else {
    return `FY ${year}-${String(year + 1).slice(2)}`;
  }
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

const getStatusBadge = (status) => {
  if (status === 'COMPLETED') return <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded">Completed</span>;
  if (status === 'PENDING_NAV') return <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">Pending NAV</span>;
  if (status === 'FAILED') return <span className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded flex items-center gap-1 w-max">Failed <span title="Needs manual intervention" className="cursor-help">⚠️</span></span>;
  return <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">{status || 'Unknown'}</span>;
};

export default function RedemptionTab() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTxn, setEditingTxn] = React.useState(null);
  const [selectedFy, setSelectedFy] = React.useState("ALL");
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries();
  };

  const { data: schemes = [], isLoading: isLoadingSchemes } = useQuery({
    queryKey: ["mfSchemeSummaries", { includeRedeemed: true }],
    queryFn: () => mutualFundAPI.getSchemeSummaries({ includeRedeemed: true }),
    staleTime: 30 * 1000,
  });

  const { data: redemptions = [], isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ["mfRedemptions"],
    queryFn: () => mutualFundAPI.getRedemptions(),
    staleTime: 30 * 1000,
  });

  const isLoading = isLoadingSchemes || isLoadingRedemptions;

  const baseData = useMemo(() => {
    const schemeMap = {};
    schemes.forEach(s => {
      const id = s.id || s.schemeId;
      schemeMap[id] = s;
    });
    return redemptions.map(r => {
      const scheme = schemeMap[r.schemeId];
      return {
        ...r,
        schemeName: scheme?.schemeName || 'Unknown Scheme',
        holderName: scheme?.holderName || 'Unknown',
        platform: scheme?.platform || 'Unknown',
      };
    }).sort((a, b) => new Date(a.redemptionDate) - new Date(b.redemptionDate));
  }, [schemes, redemptions]);

  const fyOptions = useMemo(() => {
    const set = new Set();
    baseData.forEach(r => {
      if (r.redemptionDate) set.add(getFinancialYear(r.redemptionDate));
    });
    const opts = Array.from(set).sort().reverse().map(fy => ({ label: fy, value: fy }));
    return [{ label: 'All Financial Years', value: 'ALL' }, ...opts];
  }, [baseData]);

  const data = useMemo(() => {
    if (selectedFy === "ALL") return baseData;
    return baseData.filter(r => r.redemptionDate && getFinancialYear(r.redemptionDate) === selectedFy);
  }, [baseData, selectedFy]);

  const totals = useMemo(() => {
    return data.reduce((acc, txn) => ({
      netRedemption: acc.netRedemption + ((txn.sttAmount > 0 || txn.exitLoadDeducted > 0) ? (txn.netRedemptionValue || 0) : (txn.redemptionValue || 0)),
      capitalGain: acc.capitalGain + (txn.capitalGain || 0)
    }), { netRedemption: 0, capitalGain: 0 });
  }, [data]);

  const groupedData = useMemo(() => {
    if (selectedFy !== "ALL") {
      return [{
        fy: selectedFy,
        transactions: data,
        totals: totals
      }];
    }
    
    const groups = {};
    data.forEach(txn => {
      const fy = txn.redemptionDate ? getFinancialYear(txn.redemptionDate) : 'Unknown';
      if (!groups[fy]) groups[fy] = [];
      groups[fy].push(txn);
    });
    
    return Object.keys(groups).sort().reverse().map(fy => {
      const groupTxns = groups[fy];
      const groupTotals = groupTxns.reduce((acc, txn) => ({
        netRedemption: acc.netRedemption + ((txn.sttAmount > 0 || txn.exitLoadDeducted > 0) ? (txn.netRedemptionValue || 0) : (txn.redemptionValue || 0)),
        capitalGain: acc.capitalGain + (txn.capitalGain || 0)
      }), { netRedemption: 0, capitalGain: 0 });
      
      return {
        fy,
        transactions: groupTxns,
        totals: groupTotals
      };
    });
  }, [data, selectedFy, totals]);

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

  if (data.length === 0) {
    return (
      <>
        <section className="ed-card relative px-8 py-16 text-center max-w-md mx-auto">
          <span className="corner-mark corner-tl" />
          <span className="corner-mark corner-tr" />
          <span className="corner-mark corner-bl" />
          <span className="corner-mark corner-br" />
          <ArrowDownLeft className="h-8 w-8 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <p className="font-serif italic text-[24px] text-foreground mb-1">
            No redemptions found.
          </p>
          <p className="text-[12px] font-mono text-muted-foreground mb-6">
            Record a partial or full redemption for your schemes.
          </p>
          <button
            onClick={() => { setEditingTxn(null); setIsModalOpen(true); }}
            className="ed-btn ed-btn-accent inline-flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Record Redemption</span>
          </button>
        </section>
        <RedemptionModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingTxn(null); }} 
          onSuccess={handleSuccess}
          schemes={schemes}
          initialData={editingTxn}
        />
      </>
    );
  }

  return (
    <div className="ed-card relative overflow-hidden">
      <span className="corner-mark corner-tl" />
      <span className="corner-mark corner-tr" />
      <span className="corner-mark corner-bl" />
      <span className="corner-mark corner-br" />

      <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
        <h3 className="font-serif italic text-lg">Redemption Ledger</h3>
        <div className="flex items-center gap-3">
          <FilterDropdown
            value={selectedFy}
            onChange={setSelectedFy}
            options={fyOptions}
            menuWidth="w-48"
          />
          <button
            onClick={() => { setEditingTxn(null); setIsModalOpen(true); }}
            className="ed-btn ed-btn-accent h-8 text-[11px] bg-[hsl(var(--loss))] border-[hsl(var(--loss))] hover:bg-[hsl(var(--loss))]/90"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Record Redemption</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Txn No</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Holder / Platform</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Scheme Name</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Date</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Status</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Units Sold</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">NAV</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Invested Value</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Net Redemption</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Capital Gain</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map((group) => (
              <React.Fragment key={group.fy}>
                {selectedFy === "ALL" && (
                  <tr className="bg-muted/40 border-b border-border">
                    <td colSpan={10} className="py-2.5 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                      {group.fy}
                    </td>
                  </tr>
                )}
                {group.transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => { setEditingTxn(txn); setIsModalOpen(true); }}
                    className="border-b border-hairline hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {txn.transactionNo}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-medium text-foreground">{txn.holderName}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{txn.platform}</p>
                    </td>
                    <td className="py-3 px-4 font-serif text-[14px] text-foreground font-medium">
                      {txn.schemeName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[13px] text-foreground">
                      {txn.redemptionDate}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(txn.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      <p className="font-semibold text-[hsl(var(--loss))]">
                        {txn.redemptionUnit != null
                          ? txn.redemptionUnit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })
                          : "0.000"}
                      </p>
                      {txn.totalUnit != null && (
                        <p className="text-[10px] text-muted-foreground">
                          (of {txn.totalUnit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} total)
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-muted-foreground">
                      {txn.redemptionNav ? formatCurrency(txn.redemptionNav) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-muted-foreground">
                      {formatCurrency(txn.tradeInvestmentValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      {(txn.sttAmount > 0 || txn.exitLoadDeducted > 0) ? (
                        <div className="flex flex-col items-end">
                          <div className="font-semibold text-foreground text-[14px]">
                            {formatCurrency(txn.netRedemptionValue)}
                          </div>
                          <div className="flex flex-col items-end bg-muted/30 border border-border/50 rounded px-2 py-1 mt-1 min-w-[120px]">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5 border-b border-border/50 w-full text-right pb-0.5">Deductions</span>
                            <div className="flex justify-between w-full gap-3 text-[10px] mt-0.5">
                               <span className="text-muted-foreground">Gross</span>
                               <span className="text-foreground">{formatCurrency(txn.redemptionValue)}</span>
                            </div>
                            {txn.exitLoadDeducted > 0 && (
                              <div className="flex justify-between w-full gap-3 text-[10px] text-[hsl(var(--loss))]" title="Exit Load Deducted">
                                 <span>Exit Load</span>
                                 <span>- {formatCurrency(txn.exitLoadDeducted)}</span>
                              </div>
                            )}
                            {txn.sttAmount > 0 && (
                              <div className="flex justify-between w-full gap-3 text-[10px] text-[hsl(var(--loss))]" title="Securities Transaction Tax (0.001%)">
                                 <span>STT</span>
                                 <span>- {formatCurrency(txn.sttAmount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="font-semibold text-foreground text-[14px]">{formatCurrency(txn.redemptionValue)}</div>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono text-[13px] font-semibold ${txn.capitalGain >= 0 ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'}`}>
                      {txn.capitalGain >= 0 ? '+' : ''}{formatCurrency(txn.capitalGain)}
                      {txn.gainType && (
                        <span className="block text-[9px] text-muted-foreground font-normal tracking-widest mt-0.5">{txn.gainType}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {group.transactions.length > 0 && (
                  <tr className="border-t-2 border-border bg-muted/10 font-semibold">
                    <td colSpan={8} className="py-4 px-4 text-right font-mono text-[12px] text-muted-foreground uppercase tracking-wider">
                      Total {selectedFy === "ALL" ? group.fy : ''}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[14px] text-foreground text-[hsl(var(--gain))] bg-[hsl(var(--gain))]/5">
                      {formatCurrency(group.totals.netRedemption)}
                    </td>
                    <td className={`py-4 px-4 text-right font-mono text-[14px] font-semibold ${group.totals.capitalGain >= 0 ? 'text-[hsl(var(--gain))] bg-[hsl(var(--gain))]/5' : 'text-[hsl(var(--loss))] bg-[hsl(var(--loss))]/5'}`}>
                      {group.totals.capitalGain >= 0 ? '+' : ''}{formatCurrency(group.totals.capitalGain)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <RedemptionModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTxn(null); }} 
        onSuccess={handleSuccess}
        schemes={schemes}
        initialData={editingTxn}
      />
    </div>
  );
}
