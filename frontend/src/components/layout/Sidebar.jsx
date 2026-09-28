'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBrokerSummary } from '@/hooks/useBrokerConnection';
import { cn } from '@/lib/utils';
import {
    Building2,
    Calculator,
    Coins,
    Landmark,
    LayoutDashboard,
    Link2,
    LogOut,
    PieChart,
    PiggyBank,
    StickyNote,
    TrendingUp,
    User
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

const PRIMARY_NAV = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Portfolio',  href: '/portfolio', icon: TrendingUp },
    { label: 'Brokers',    href: '/brokers',   icon: Link2 },
    { label: 'Calculators',href: '/calculators',icon: Calculator },
    { label: 'Mutual Funds', href: '/mutual-fund', icon: PieChart },
    { label: 'Fixed Deposits', href: '/fixed-deposit', icon: Building2 },
    { label: 'PPF Ledger', href: '/ppf', icon: Landmark },
    { label: 'EPF Ledger', href: '/epf', icon: PiggyBank },
    { label: 'Gold & Silver', href: '/gold-silver', icon: Coins },
    { label: 'Notes',      href: '/notes',     icon: StickyNote },
];

const BOTTOM_NAV = [
    { label: 'Profile', href: '/profile', icon: User },
];

const isActive = (href, pathname) =>
    pathname === href || pathname.startsWith(href + '/');

function NavRow({ item, active, badge, onClick, isDanger = false }) {
    const Icon = item.icon;

    const body = (
        <div
            className={cn(
                'group relative flex items-center gap-3 h-10 pl-4 pr-3 mx-2 rounded-md transition-colors font-sans',
                active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : isDanger
                        ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2 : 1.75} />
            <span className="flex-1 text-sm">
                {item.label}
            </span>
            {badge && (
                <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    badge.className,
                )}>
                    {badge.text}
                </span>
            )}
        </div>
    );

    if (item.href === '#') {
        return (
            <button type="button" onClick={onClick} className="w-full text-left my-0.5">
                {body}
            </button>
        );
    }

    return (
        <Link href={item.href} onClick={onClick} className="block my-0.5">
            {body}
        </Link>
    );
}

export default function Sidebar({ onNavigate }) {
    const { logout } = useAuth();
    const pathname = usePathname();
    const { connectedCount, hasExpired, hasExpiringSoon } = useBrokerSummary();

    const brokerBadge = (() => {
        if (hasExpired) {
            return { text: 'Reset', className: 'bg-destructive/15 text-destructive' };
        }
        if (hasExpiringSoon) {
            return { text: 'Warn', className: 'bg-orange-500/15 text-orange-600' };
        }
        if (connectedCount > 0) {
            return { text: `${connectedCount} live`, className: 'bg-green-500/15 text-green-700' };
        }
        return null;
    })();

    const handleLogout = useCallback(async (e) => {
        e.preventDefault();
        await logout();
    }, [logout]);

    return (
        <div className="flex h-full w-full flex-col bg-card text-card-foreground">
            {/* Masthead */}
            <Link
                href="/dashboard"
                onClick={onNavigate}
                className="flex items-center gap-3 px-6 py-5 border-b border-border"
            >
                <span className="relative h-7 w-7 flex-shrink-0">
                    <Image
                        src="/coinTrack.png"
                        alt="Kosh"
                        fill
                        priority
                        className="object-contain"
                    />
                </span>
                <span className="font-bold text-xl tracking-tight text-primary">
                    Kosh
                </span>
            </Link>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1">
                    {PRIMARY_NAV.map((item) => (
                        <li key={item.href}>
                            <NavRow
                                item={item}
                                active={isActive(item.href, pathname)}
                                badge={item.href === '/brokers' ? brokerBadge : null}
                                onClick={onNavigate}
                            />
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Bottom */}
            <div className="border-t border-border p-2">
                {BOTTOM_NAV.map((item) => (
                    <NavRow
                        key={item.href}
                        item={item}
                        active={isActive(item.href, pathname)}
                        onClick={onNavigate}
                    />
                ))}
                <NavRow
                    item={{ label: 'Sign out', href: '#', icon: LogOut }}
                    active={false}
                    isDanger
                    onClick={handleLogout}
                />
            </div>
        </div>
    );
}
