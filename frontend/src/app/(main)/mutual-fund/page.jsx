'use client';

import { useToast } from "@/components/ui/use-toast";
import { mutualFundAPI } from "@/lib/api/mutualFundAPI";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useIsFetching, useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";
import DashboardTab from "./components/DashboardTab";
import LumpsumTab from "./components/LumpsumTab";
import NewSchemeModal from "./components/NewSchemeModal";
import RedemptionTab from "./components/RedemptionTab";
import SchemeSummaryTab from "./components/SchemeSummaryTab";
import SipTab from "./components/SipTab";
import ValuationTab from "./components/ValuationTab";

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'summary', label: 'Summary' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'lumpsum', label: 'Lump Sums' },
  { id: 'redemption', label: 'Redemptions' },
  { id: 'sip', label: 'SIPs' },
];

export default function MutualFundPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [syncStatus, setSyncStatus] = useState("idle");

  useEffect(() => {
    if (isFetching > 0 || isMutating > 0) {
      if (syncStatus !== "syncing") {
        setSyncStatus("syncing");
        sonnerToast.loading("Syncing Data...", { id: "sync-toast" });
      }
    } else if (syncStatus === "syncing") {
      setSyncStatus("success");
      sonnerToast.success("Data Up to Date", { id: "sync-toast", duration: 3000 });
      const timer = setTimeout(() => {
        setSyncStatus("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isFetching, isMutating, syncStatus]);

  const handleSuccess = () => {
    queryClient.invalidateQueries();
  };

  const { data: summaryData, isLoading, refetch } = useQuery({
    queryKey: ["mutualFundDashboard"],
    queryFn: () => mutualFundAPI.getDashboard(),
    staleTime: 30 * 1000,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blobData = await mutualFundAPI.exportExcel();
      const url = window.URL.createObjectURL(
        new Blob([blobData], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Mutual_Funds_Ledger.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Mutual Fund ledger downloaded.",
      });
    } catch (error) {
      console.error("Export failed", error);
      toast({
        title: "Export Failed",
        description: "Could not export Mutual Fund ledger.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalInvestment = summaryData?.totalInvestment || 0;
  const currentValue = summaryData?.currentValue || 0;
  const absoluteGain = summaryData?.absoluteGain || 0;
  const isTotalProfit = absoluteGain >= 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mutual Funds</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track schemes, SIPs, lump sum investments, and redemptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={isExporting}
            onClick={handleExport}
            className="ed-btn ed-btn-ghost bg-card border shadow-sm h-9"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export Excel
          </button>
          <button onClick={() => { setEditingScheme(null); setIsModalOpen(true); }} className="ed-btn ed-btn-primary h-9">
            <Plus className="w-4 h-4 mr-2" />
            New Scheme
          </button>
        </div>
      </header>

      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(totalInvestment)}</p>
          </div>
          <div className="bg-card border rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Current Value</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(currentValue)}</p>
          </div>
          <div className="bg-card border rounded-lg p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Overall P&L</p>
            <p className={cn("text-2xl font-bold tracking-tight mt-1", isTotalProfit ? "text-gain" : "text-loss")}>
              {isTotalProfit ? "+" : ""}{formatCurrency(absoluteGain)}
            </p>
          </div>
        </div>
      )}

      {summaryData?.discrepancyFlag && (
        <div className="p-4 rounded-md border border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Discrepancy Detected</p>
            <p className="text-sm text-amber-800 mt-1">
              Discrepancies found between scheme transaction totals and logged valuation snapshots.
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border shadow-sm rounded-lg overflow-hidden flex flex-col">
        <div className="border-b bg-muted/20 px-2 pt-2 overflow-x-auto flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors rounded-t-md relative whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-background text-foreground border-b-2 border-b-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-0">
          {activeTab === 'dashboard' && <DashboardTab summaryData={summaryData} />}
          {activeTab === 'summary' && <SchemeSummaryTab 
            onNewScheme={() => { setEditingScheme(null); setIsModalOpen(true); }} 
            onEditScheme={(scheme) => { setEditingScheme(scheme); setIsModalOpen(true); }}
          />}
          {activeTab === 'valuation' && <ValuationTab />}
          {activeTab === 'lumpsum' && <LumpsumTab />}
          {activeTab === 'redemption' && <RedemptionTab />}
          {activeTab === 'sip' && <SipTab />}
        </div>
      </div>

      <NewSchemeModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingScheme(null); }}
        onSuccess={handleSuccess}
        initialData={editingScheme}
      />
    </div>
  );
}
