import React, { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mutualFundAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { List, Plus } from "lucide-react";
import LumpsumTransactionModal from "../LumpsumTransactionModal";
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

export default function LumpsumTab() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTxn, setEditingTxn] = React.useState(null);
  const [selectedFy, setSelectedFy] = React.useState("ALL");
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries();
  };

  const { data: schemes = [], isLoading: isLoadingSchemes } = useQuery({
    queryKey: ["mfSchemeDropdown", { includeRedeemed: true }],
    queryFn: () => mutualFundAPI.getSchemeDropdown({ includeRedeemed: true }),
    staleTime: 30 * 1000,
  });

  const { data: lumpsums = [], isLoading: isLoadingLumpsums, refetch } = useQuery({
    queryKey: ["mfLumpsums"],
    queryFn: () => mutualFundAPI.getLumpsum(),
    staleTime: 30 * 1000,
  });

  const isLoading = isLoadingSchemes || isLoadingLumpsums;

  const baseData = useMemo(() => {
    const schemeMap = {};
    schemes.forEach(s => { schemeMap[s.id] = s; });
    return lumpsums.map(l => ({
      ...l,
      schemeName: schemeMap[l.schemeId]?.schemeName || 'Unknown Scheme',
      holderName: schemeMap[l.schemeId]?.holderName || 'Unknown',
      platform: schemeMap[l.schemeId]?.platform || 'Unknown',
      debitedBank: l.debitedBank || schemeMap[l.schemeId]?.bank || '-',
    })).sort((a, b) => new Date(a.investmentDate) - new Date(b.investmentDate));
  }, [schemes, lumpsums]);

  const fyOptions = useMemo(() => {
    const set = new Set();
    baseData.forEach(r => {
      if (r.investmentDate) set.add(getFinancialYear(r.investmentDate));
    });
    const opts = Array.from(set).sort().reverse().map(fy => ({ label: fy, value: fy }));
    return [{ label: 'All Financial Years', value: 'ALL' }, ...opts];
  }, [baseData]);

  const data = useMemo(() => {
    if (selectedFy === "ALL") return baseData;
    return baseData.filter(r => r.investmentDate && getFinancialYear(r.investmentDate) === selectedFy);
  }, [baseData, selectedFy]);

  const totalInvestment = useMemo(() => {
    return data.reduce((sum, txn) => sum + (txn.lumpsumInvestment || 0), 0);
  }, [data]);

  const groupedData = useMemo(() => {
    if (selectedFy !== "ALL") {
      return [{
        fy: selectedFy,
        transactions: data,
        totalInvestment: totalInvestment
      }];
    }
    
    const groups = {};
    data.forEach(txn => {
      const fy = txn.investmentDate ? getFinancialYear(txn.investmentDate) : 'Unknown';
      if (!groups[fy]) groups[fy] = [];
      groups[fy].push(txn);
    });
    
    return Object.keys(groups).sort().reverse().map(fy => ({
      fy,
      transactions: groups[fy],
      totalInvestment: groups[fy].reduce((sum, t) => sum + (t.lumpsumInvestment || 0), 0)
    }));
  }, [data, selectedFy, totalInvestment]);

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
          <List className="h-8 w-8 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <p className="font-serif italic text-[24px] text-foreground mb-1">
            No lumpsum investments.
          </p>
          <p className="text-[12px] font-mono text-muted-foreground mb-6">
            Record your first lumpsum investment.
          </p>
          <button
            onClick={() => { setEditingTxn(null); setIsModalOpen(true); }}
            className="ed-btn ed-btn-accent inline-flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>New Lumpsum</span>
          </button>
        </section>
        <LumpsumTransactionModal 
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
        <h3 className="font-serif italic text-lg">Lumpsum Ledger</h3>
        <div className="flex items-center gap-3">
          <FilterDropdown
            value={selectedFy}
            onChange={setSelectedFy}
            options={fyOptions}
            menuWidth="w-48"
          />
          <button onClick={() => { setEditingTxn(null); setIsModalOpen(true); }} className="ed-btn ed-btn-accent h-8 text-[11px]">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>New Lumpsum</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-blue-500/10 border-b border-border text-[11px] text-blue-600 dark:text-blue-400 font-medium">
        Note: Investment amounts are shown strictly as Net Investment, after deducting the applicable Government Stamp Duty (0.005% since July 2020).
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Txn No</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Holder / Platform</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Scheme Name</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Debited Bank</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Date</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">Status</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Net Investment</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">NAV</th>
              <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">Units</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map((group) => (
              <React.Fragment key={group.fy}>
                {selectedFy === "ALL" && (
                  <tr className="bg-muted/40 border-b border-border">
                    <td colSpan={9} className="py-2.5 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
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
                    <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">
                      {txn.debitedBank}
                    </td>
                    <td className="py-3 px-4 font-mono text-[13px] text-foreground">
                      {txn.investmentDate}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(txn.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground font-medium">
                      {formatCurrency(txn.lumpsumInvestment)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-muted-foreground">
                      {txn.navPrice ? formatCurrency(txn.navPrice) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      {txn.totalUnit != null 
                        ? txn.totalUnit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })
                        : "0.000"}
                    </td>
                  </tr>
                ))}
                {group.transactions.length > 0 && (
                  <tr className="border-t-2 border-border bg-muted/10 font-semibold">
                    <td colSpan={6} className="py-4 px-4 text-right font-mono text-[12px] text-muted-foreground uppercase tracking-wider">
                      Total {selectedFy === "ALL" ? group.fy : ''}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[14px] text-foreground text-[hsl(var(--gain))] bg-[hsl(var(--gain))]/5">
                      {formatCurrency(group.totalInvestment)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <LumpsumTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTxn(null); }} 
        onSuccess={handleSuccess}
        schemes={schemes}
        initialData={editingTxn}
      />
    </div>
  );
}
