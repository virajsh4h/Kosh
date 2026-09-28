'use client';

import { BrokerStatusBanner } from '@/components/dashboard/BrokerStatusBanner';
import { HoldingsTable } from '@/components/dashboard/HoldingsTable';
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary';
import { RefreshButton } from '@/components/dashboard/RefreshButton';
import { useAuth } from '@/contexts/AuthContext';
import { FileDown, Plus } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    
    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Portfolio Overview</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Consolidated view of all linked assets and holdings.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="ed-btn ed-btn-ghost bg-card border shadow-sm h-9">
                        <FileDown className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                    <button className="ed-btn ed-btn-primary h-9">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                    </button>
                    <RefreshButton />
                </div>
            </header>

            <BrokerStatusBanner />

            <div className="bg-card border shadow-sm rounded-lg p-6">
                <PortfolioSummary />
            </div>

            <div className="bg-card border shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Current Holdings</h2>
                    <input 
                        type="search" 
                        placeholder="Search holdings..." 
                        className="h-8 w-64 rounded-md border border-input bg-background px-3 text-sm"
                    />
                </div>
                <HoldingsTable />
            </div>
        </div>
    );
}
