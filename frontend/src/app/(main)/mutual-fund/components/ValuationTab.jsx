import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { mutualFundAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Handle array format if backend returns [YYYY, MM, DD]
  if (Array.isArray(dateStr)) {
    const [y, m, d] = dateStr;
    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return dateStr;
}

function getYearFromDate(dateStr) {
  if (!dateStr) return "Unknown";
  if (Array.isArray(dateStr)) return String(dateStr[0]);
  if (typeof dateStr === 'string') return dateStr.substring(0, 4);
  return "Unknown";
}

export default function ValuationTab() {
  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ["mfValuations"],
    queryFn: () => mutualFundAPI.getValuations(),
    staleTime: 30 * 1000,
  });

  const valuationsByYear = useMemo(() => {
    const groups = {};
    valuations.forEach(val => {
      const year = getYearFromDate(val.snapshotDate);
      if (!groups[year]) groups[year] = [];
      groups[year].push(val);
    });
    return groups;
  }, [valuations]);

  const availableYears = useMemo(() => {
    return Object.keys(valuationsByYear).sort((a, b) => b.localeCompare(a));
  }, [valuationsByYear]);

  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

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

  if (valuations.length === 0) {
    return (
      <section className="ed-card relative px-8 py-16 text-center max-w-md mx-auto">
        <span className="corner-mark corner-tl" />
        <span className="corner-mark corner-tr" />
        <span className="corner-mark corner-bl" />
        <span className="corner-mark corner-br" />
        <LineChart className="h-8 w-8 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
        <p className="font-serif italic text-[24px] text-foreground mb-1">
          No valuation snapshots.
        </p>
        <p className="text-[12px] text-muted-foreground mb-5">
          Record manual valuation snapshots to track your portfolio performance.
        </p>
      </section>
    );
  }

  const displayedValuations = valuationsByYear[selectedYear] || [];
  const currentYearIndex = availableYears.indexOf(selectedYear);

  return (
    <div className="space-y-4">
      {/* Year Pagination / Tabs */}
      <div className="flex items-center justify-between bg-card p-3 rounded-sm border border-border">
        <button
          disabled={currentYearIndex >= availableYears.length - 1}
          onClick={() => setSelectedYear(availableYears[currentYearIndex + 1])}
          className="p-1.5 hover:bg-muted disabled:opacity-30 rounded transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-2 overflow-x-auto px-4 hide-scrollbar">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "px-4 py-1 text-[13px] font-mono tracking-widest rounded-sm transition-colors whitespace-nowrap",
                selectedYear === year
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {year}
            </button>
          ))}
        </div>

        <button
          disabled={currentYearIndex <= 0}
          onClick={() => setSelectedYear(availableYears[currentYearIndex - 1])}
          className="p-1.5 hover:bg-muted disabled:opacity-30 rounded transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="ed-card relative overflow-hidden">
        <span className="corner-mark corner-tl" />
        <span className="corner-mark corner-tr" />
        <span className="corner-mark corner-bl" />
        <span className="corner-mark corner-br" />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                  Holder / Platform
                </th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                  Snapshot Date
                </th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                  Investment Value
                </th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                  Current Value
                </th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                  Period P&L
                </th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                  P&L %
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedValuations.map((val) => (
                <tr
                  key={val.id}
                  className="border-b border-hairline hover:bg-muted/30 transition-colors group"
                >
                  <td className="py-3 px-4">
                    <p className="text-[13px] font-medium text-foreground">
                      {val.holderName}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {val.platform}
                    </p>
                  </td>
                  <td className="py-3 px-4 font-mono text-[13px] text-foreground">
                    {formatDate(val.snapshotDate)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                    {formatCurrency(val.investmentValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-foreground">
                    {formatCurrency(val.currentValue)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono text-[13px] font-semibold ${val.periodPL >= 0 ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'}`}>
                    {val.periodPL >= 0 ? '+' : ''}{formatCurrency(val.periodPL)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono text-[13px] font-semibold ${val.periodPLPercent >= 0 ? 'text-[hsl(var(--gain))]' : 'text-[hsl(var(--loss))]'}`}>
                    {val.periodPLPercent >= 0 ? '+' : ''}{val.periodPLPercent?.toFixed(2) || '0.00'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
