import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { mutualFundAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Plus, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import OverrideUnitsModal from "./OverrideUnitsModal";

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ scheme }) {
  const statuses = scheme.statuses || [];

  if (statuses.includes("FULLY_REDEEMED")) {
    return (
      <div className="flex gap-1 flex-wrap justify-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400">
          REDEEMED
        </span>
      </div>
    );
  }

  const activeBadges = [];
  if (statuses.includes("SIP")) activeBadges.push("SIP");
  if (statuses.includes("LUMPSUM")) activeBadges.push("LUMPSUM");
  if (statuses.includes("PARTIALLY_REDEEMED")) activeBadges.push("PARTIALLY REDEEMED");

  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {activeBadges.map((badge) => (
        <span
          key={badge}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${
            badge === "PARTIALLY REDEEMED"
              ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
          }`}
        >
          {badge}
        </span>
      ))}
      {activeBadges.length === 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400">
          CREATED
        </span>
      )}
    </div>
  );
}

export default function SchemeSummaryTab({ onNewScheme, onEditScheme }) {
  const [selectedSchemeForOverride, setSelectedSchemeForOverride] = React.useState(null);
  const [filterPlatform, setFilterPlatform] = React.useState("ALL");
  const [filterStatus, setFilterStatus] = React.useState("ALL");
  const queryClient = useQueryClient();

  const { data: schemes = [], isLoading: isLoadingSchemes } = useQuery({
    queryKey: ["mfSchemeSummaries", { includeRedeemed: true }],
    queryFn: () => mutualFundAPI.getSchemeSummaries({ includeRedeemed: true }),
    staleTime: 30 * 1000,
  });

  const { data: mandates = [], isLoading: isLoadingMandates } = useQuery({
    queryKey: ["mfSipMandates"],
    queryFn: () => mutualFundAPI.getSipMandates(),
    staleTime: 30 * 1000,
  });

  const isLoading = isLoadingSchemes || isLoadingMandates;

  const handleSuccess = () => {
    queryClient.invalidateQueries();
  };

  const processedSchemes = useMemo(() => {
    const schemesWithActiveMandates = new Set(
      mandates.filter(m => m.active).map(m => m.schemeId)
    );

    return schemes.map((scheme) => {
      let newStatuses = [...(scheme.statuses || [])];
      
      if (newStatuses.includes("FULLY_REDEEMED")) {
         newStatuses = ["FULLY_REDEEMED"]; // Only show FULLY_REDEEMED if it's completely redeemed
      } else if (newStatuses.includes("SIP") && !schemesWithActiveMandates.has(scheme.schemeId)) {
        newStatuses = newStatuses.filter(s => s !== "SIP");
        // If they have investments from the stopped SIP, mark it as LUMPSUM so it doesn't show "CREATED"
        if (!newStatuses.includes("LUMPSUM") && (scheme.totalUnit > 0 || scheme.totalInvestment > 0)) {
          newStatuses.push("LUMPSUM");
        }
      }

      return {
        ...scheme,
        statuses: newStatuses
      };
    });
  }, [schemes, mandates]);

  const uniquePlatforms = useMemo(() => {
    const platforms = new Set(processedSchemes.map(s => s.platform || "Other Platforms"));
    return Array.from(platforms).sort();
  }, [processedSchemes]);

  const filteredSchemes = useMemo(() => {
    return processedSchemes.filter(s => {
      const p = s.platform || "Other Platforms";
      if (filterPlatform !== "ALL" && p !== filterPlatform) return false;
      if (filterStatus !== "ALL") {
        if (filterStatus === "CREATED") {
           if (s.statuses.length !== 0) return false;
        } else {
           if (!s.statuses.includes(filterStatus)) return false;
        }
      }
      return true;
    });
  }, [processedSchemes, filterPlatform, filterStatus]);

  const groupedSchemes = useMemo(() => {
    return filteredSchemes.reduce((acc, scheme) => {
      const p = scheme.platform || "Other Platforms";
      if (!acc[p]) acc[p] = [];
      acc[p].push(scheme);
      return acc;
    }, {});
  }, [filteredSchemes]);

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

  if (schemes.length === 0) {
    return (
      <section className="ed-card relative px-8 py-16 text-center max-w-md mx-auto">
        <span className="corner-mark corner-tl" />
        <span className="corner-mark corner-tr" />
        <span className="corner-mark corner-bl" />
        <span className="corner-mark corner-br" />
        <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
        <p className="font-serif italic text-[24px] text-foreground mb-1">
          No mutual fund schemes found.
        </p>
        <p className="text-[12px] text-muted-foreground mb-5">
          Start tracking your mutual fund investments and SIP mandates.
        </p>
        <button onClick={onNewScheme} className="ed-btn ed-btn-primary">
          <Plus className="h-3 w-3" /> Add First Scheme
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Filter by Platform</label>
          <select 
            value={filterPlatform} 
            onChange={(e) => setFilterPlatform(e.target.value)} 
            className="ed-input w-full font-mono text-[13px] py-2"
          >
            <option value="ALL">All Platforms</option>
            {uniquePlatforms.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1 block">Filter by Status</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="ed-input w-full font-mono text-[13px] py-2"
          >
            <option value="ALL">All Statuses</option>
            <option value="SIP">SIP</option>
            <option value="LUMPSUM">LUMPSUM</option>
            <option value="PARTIALLY_REDEEMED">PARTIALLY REDEEMED</option>
            <option value="FULLY_REDEEMED">REDEEMED</option>
            <option value="CREATED">CREATED</option>
          </select>
        </div>
      </div>

      {Object.keys(groupedSchemes).length === 0 ? (
        <div className="ed-card p-8 text-center text-muted-foreground font-mono text-sm">
          No schemes match the selected filters.
        </div>
      ) : (
        Object.entries(groupedSchemes).map(([platform, platformSchemes]) => (
        <div key={platform} className="ed-card relative overflow-hidden">
          <span className="corner-mark corner-tl" />
          <span className="corner-mark corner-tr" />
          <span className="corner-mark corner-bl" />
          <span className="corner-mark corner-br" />

          <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-[18px] text-foreground">
              {platform}
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
              {platformSchemes.length} Schemes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                    Folio / Bank
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                    Scheme Details
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Total Units
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Avg NAV
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Gross Invested
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Stamp Duty
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Net Invested
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Current Invested
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-right">
                    Current Value
                  </th>
                  <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground text-left">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {platformSchemes.map((scheme) => (
                  <tr
                    key={scheme.schemeId}
                    onClick={() => onEditScheme(scheme)}
                    className="border-b border-hairline hover:bg-muted/30 transition-colors group last:border-b-0 cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-mono text-foreground font-medium">
                        {scheme.folioNo || "N/A"}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {scheme.bank || "N/A"}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-serif text-[14px] text-foreground font-medium leading-tight">
                        {scheme.schemeName}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {scheme.mfCategory || "Uncategorized"}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>
                          {scheme.totalUnit != null
                            ? scheme.totalUnit.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 3,
                              })
                            : "0.000"}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedSchemeForOverride(scheme); }}
                          title="Override / Sync Units from Broker (Option 3)"
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-accent transition-opacity"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      {scheme.averageNav != null ? `₹${scheme.averageNav.toFixed(2)}` : "₹0.00"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      {formatCurrency(scheme.totalInvestment)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-muted-foreground">
                      {formatCurrency(scheme.totalStampDuty)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      {formatCurrency(scheme.netInvestment)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] text-foreground">
                      {formatCurrency(scheme.currentInvestment)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[13px] font-semibold text-[hsl(var(--gain))]">
                      {scheme.currentValue != null ? formatCurrency(scheme.currentValue) : "₹0.00"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge scheme={scheme} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ))
      )}
      {selectedSchemeForOverride && (
        <OverrideUnitsModal
          isOpen={!!selectedSchemeForOverride}
          scheme={selectedSchemeForOverride}
          onClose={() => setSelectedSchemeForOverride(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
