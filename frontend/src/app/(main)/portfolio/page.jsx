'use client';

import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { PortfolioTabBar } from '@/components/portfolio/PortfolioTabBar';
import { HoldingsTab } from '@/components/portfolio/tabs/HoldingsTab';
import { MfHoldingsTab } from '@/components/portfolio/tabs/MfHoldingsTab';
import { MfInstrumentsTab } from '@/components/portfolio/tabs/MfInstrumentsTab';
import { MfOrdersTab } from '@/components/portfolio/tabs/MfOrdersTab';
import { MfSipsTab } from '@/components/portfolio/tabs/MfSipsTab';
import { MfTimelineTab } from '@/components/portfolio/tabs/MfTimelineTab';
import { OrdersTab } from '@/components/portfolio/tabs/OrdersTab';
import { PositionsTab } from '@/components/portfolio/tabs/PositionsTab';
import { ProfileTab } from '@/components/portfolio/tabs/ProfileTab';
import { TabLoadingSkeleton } from '@/components/portfolio/tabs/TabLoadingSkeleton';
import { TradesTab } from '@/components/portfolio/tabs/TradesTab';
import { usePortfolioFunds } from '@/hooks/usePortfolioFunds';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { usePortfolioTab } from '@/hooks/usePortfolioTab';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Banknote, BarChart3, Download, PiggyBank, Wallet } from 'lucide-react';
import { Suspense } from 'react';

const TAB_COMPONENTS = {
    holdings: HoldingsTab,
    positions: PositionsTab,
    orders: OrdersTab,
    trades: TradesTab,
    profile: ProfileTab,
    'mf-holdings': MfHoldingsTab,
    'mf-orders': MfOrdersTab,
    'mf-sips': MfSipsTab,
    'mf-timeline': MfTimelineTab,
    'mf-instruments': MfInstrumentsTab,
};

function SummaryStats({ summary, funds, isLoading }) {
    const unrealized = summary?.totalUnrealizedPL ?? 0;
    const unrealizedPos = unrealized >= 0;
    const availableCash = funds?.equity?.net ?? funds?.availableCash ?? funds?.net ?? null;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
                index={1}
                label="Portfolio Value"
                value={formatCurrency(summary?.totalCurrentValue)}
                icon={Wallet}
                isLoading={isLoading}
            />
            <StatsCard
                index={2}
                label="Invested Amount"
                value={formatCurrency(summary?.totalInvestedValue)}
                icon={PiggyBank}
                isLoading={isLoading}
            />
            <StatsCard
                index={3}
                label="Unrealized P&L"
                value={formatCurrency(unrealized, { showSign: true })}
                changePercent={formatPercent(summary?.totalUnrealizedPLPercent, { showSign: true })}
                isPositive={unrealizedPos}
                accentColor={unrealizedPos ? 'success' : 'danger'}
                icon={BarChart3}
                isLoading={isLoading}
            />
            <StatsCard
                index={4}
                label="Available Cash"
                value={formatCurrency(availableCash)}
                icon={Banknote}
                isLoading={isLoading}
            />
        </div>
    );
}

export default function PortfolioPage() {
    const { activeTab, setTab, navigateTo, getContext } = usePortfolioTab();
    const summaryQuery = usePortfolioSummary();
    const fundsQuery = usePortfolioFunds();

    const ActiveTab = TAB_COMPONENTS[activeTab] || HoldingsTab;
    const context = getContext();

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Portfolio Details</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Comprehensive view of your holdings, orders, and trades.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="ed-btn ed-btn-ghost bg-card border shadow-sm h-9">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </button>
                    <RefreshButton />
                </div>
            </header>

            <SummaryStats
                summary={summaryQuery.data}
                funds={fundsQuery.data}
                isLoading={summaryQuery.isLoading || fundsQuery.isLoading}
            />

            <div className="bg-card border shadow-sm rounded-lg overflow-hidden flex flex-col">
                <div className="border-b bg-muted/20 px-2 pt-2">
                    <PortfolioTabBar activeTab={activeTab} onTabChange={setTab} />
                </div>
                <div className="p-0">
                    <Suspense fallback={<TabLoadingSkeleton />}>
                        <ActiveTab navigateTo={navigateTo} context={context} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
