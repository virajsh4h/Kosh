'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="relative min-h-screen bg-background text-foreground font-sans">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-card">
                <Sidebar />
            </aside>

            {/* Mobile sidebar */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="p-0 w-64 border-r border-border bg-card">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <Sidebar onNavigate={() => setIsMobileOpen(false)} />
                </SheetContent>
            </Sheet>

            <div className="md:pl-64 flex min-h-screen flex-col relative z-10">
                <Header onMenuClick={() => setIsMobileOpen(true)} />
                <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
                    {children}
                </main>
                <footer className="px-4 md:px-8 py-4 border-t border-border mt-auto">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>© {new Date().getFullYear()} Kosh Wealth Management</span>
                        <span>Version 3.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
