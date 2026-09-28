'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header({ onMenuClick }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const getPageTitle = () => {
        if (pathname === '/dashboard') return 'Dashboard';
        if (pathname === '/portfolio') return 'Portfolio Summary';
        if (pathname === '/brokers') return 'Broker Integrations';
        if (pathname === '/calculators') return 'Calculators';
        if (pathname === '/mutual-fund') return 'Mutual Funds';
        if (pathname === '/fixed-deposit') return 'Fixed Deposits';
        if (pathname === '/ppf') return 'PPF Ledger';
        if (pathname === '/epf') return 'EPF Ledger';
        if (pathname === '/gold-silver') return 'Gold & Silver';
        if (pathname === '/notes') return 'Notes';
        if (pathname === '/profile') return 'User Profile';
        return 'Overview';
    };

    return (
        <header className="sticky top-0 z-20 w-full flex items-center justify-between px-4 md:px-8 py-3 bg-card border-b border-border shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-1.5 -ml-1.5 text-muted-foreground hover:bg-muted rounded-md"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                        {getPageTitle()}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <ThemeToggle />
                
                <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-border">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium leading-none">{user?.firstName || 'User'}</span>
                        <span className="text-xs text-muted-foreground mt-1">{user?.email || ''}</span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {user?.firstName?.charAt(0) || 'U'}
                    </div>
                </div>
            </div>
        </header>
    );
}
