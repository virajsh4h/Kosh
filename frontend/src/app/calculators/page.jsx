// src/app/calculators/page.jsx — Editorial calculator index
'use client';

import { ArrowRight, BarChart2, CreditCard, FileText, PiggyBank, Search, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const CATEGORIES = [
    {
        id: 'investment', name: 'Investment', icon: TrendingUp, index: '§I',
        kicker: 'Compounding & Markets',
        calculators: [
            { id: 'sip', name: 'SIP Calculator', description: 'Returns on systematic monthly investments' },
            { id: 'step-up-sip', name: 'Step-Up SIP', description: 'Increasing instalments over time' },
            { id: 'lumpsum', name: 'Lumpsum', description: 'Future value of a one-time investment' },
            { id: 'cagr', name: 'CAGR', description: 'Compound annual growth rate' },
            { id: 'xirr', name: 'XIRR', description: 'Extended internal rate of return' },
            { id: 'stock-average', name: 'Stock Average', description: 'Average price across purchases' },
            { id: 'inflation', name: 'Inflation', description: 'Purchasing power, over time' },
        ],
    },
    {
        id: 'savings', name: 'Savings Schemes', icon: PiggyBank, index: '§II',
        kicker: 'Small Saver Instruments',
        calculators: [
            { id: 'ppf', name: 'PPF', description: 'Public Provident Fund corpus' },
            { id: 'epf', name: 'EPF', description: 'Employee Provident Fund estimate' },
            { id: 'fd', name: 'Fixed Deposit', description: 'Bank FD maturity & interest' },
            { id: 'rd', name: 'Recurring Deposit', description: 'Monthly deposit maturity' },
            { id: 'ssy', name: 'SSY', description: 'Sukanya Samriddhi Yojana' },
            { id: 'nps', name: 'NPS', description: 'National Pension System corpus' },
            { id: 'nsc', name: 'NSC', description: 'National Savings Certificate' },
            { id: 'scss', name: 'SCSS', description: 'Senior Citizens Savings Scheme' },
            { id: 'mis', name: 'PO MIS', description: 'Post Office Monthly Income Scheme' },
            { id: 'apy', name: 'APY', description: 'Atal Pension Yojana' },
        ],
    },
    {
        id: 'loans', name: 'Loans & EMI', icon: CreditCard, index: '§III',
        kicker: 'Borrowing & Repayment',
        calculators: [
            { id: 'emi', name: 'EMI Calculator', description: 'Standard loan instalment' },
            { id: 'home-loan-emi', name: 'Home Loan', description: 'Residential loan instalment' },
            { id: 'car-loan-emi', name: 'Car Loan', description: 'Auto loan instalment' },
            { id: 'simple-interest', name: 'Simple Interest', description: 'Linear interest accrual' },
            { id: 'compound-interest', name: 'Compound Interest', description: 'Interest on interest' },
            { id: 'flat-vs-reducing', name: 'Flat vs Reducing', description: 'Two methods, side by side' },
        ],
    },
    {
        id: 'tax', name: 'Tax & Salary', icon: FileText, index: '§IV',
        kicker: 'Statutory & Salary',
        calculators: [
            { id: 'income-tax', name: 'Income Tax', description: 'Old vs New regime comparison' },
            { id: 'hra', name: 'HRA Exemption', description: 'House Rent Allowance relief' },
            { id: 'salary', name: 'Salary Calculator', description: 'CTC to in-hand breakdown' },
            { id: 'gratuity', name: 'Gratuity', description: 'End-of-service entitlement' },
            { id: 'gst', name: 'GST Calculator', description: 'Inclusive and exclusive GST' },
            { id: 'tds', name: 'TDS Calculator', description: 'Tax deducted at source' },
        ],
    },
    {
        id: 'trading', name: 'Trading', icon: BarChart2, index: '§V',
        kicker: 'Execution & Cost',
        calculators: [
            { id: 'brokerage', name: 'Brokerage', description: 'All-in cost of a trade' },
            { id: 'margin', name: 'Margin', description: 'Margin required to trade' },
        ],
    },
    {
        id: 'planning', name: 'Financial Planning', icon: Target, index: '§VI',
        kicker: 'The Long View',
        calculators: [
            { id: 'retirement', name: 'Retirement', description: 'Corpus for your later years' },
        ],
    },
];

const TOTAL = CATEGORIES.reduce((n, c) => n + c.calculators.length, 0);

function useNow() {
    const [now, setNow] = useState(null);
    useEffect(() => { setNow(new Date()); }, []);
    return now;
}

export default function CalculatorsPage() {
    const [search, setSearch] = useState('');
    const now = useNow();

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return CATEGORIES;
        return CATEGORIES
            .map((cat) => ({
                ...cat,
                calculators: cat.calculators.filter(
                    (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
                ),
            }))
            .filter((cat) => cat.calculators.length > 0);
    }, [search]);

    const matchCount = filtered.reduce((n, c) => n + c.calculators.length, 0);

    const dateString = now ? now.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
    }) : '';

    return (
        <article className="space-y-12">
            {/* Masthead */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Financial Calculators</h1>
                    <p className="text-sm text-muted-foreground mt-1">Tools to compute, project, and estimate your finances.</p>
                </div>
            </header>

            {/* Search */}
            <section>
                <div className="grid lg:grid-cols-[1fr_minmax(0,420px)] gap-4 items-baseline">
                    <p className="font-sans italic text-[15px] text-muted-foreground">
                        Search the index by name or by what it computes — for instance, <span className="not-italic font-mono text-foreground">retirement</span>, <span className="not-italic font-mono text-foreground">EMI</span>, <span className="not-italic font-mono text-foreground">GST</span>.
                    </p>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search calculators…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-3 h-11 w-full bg-background border border-border font-mono text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors"
                        />
                    </div>
                </div>
                {search && (
                    <p className="mt-3 text-[11px] font-mono text-muted-foreground">
                        {matchCount} {matchCount === 1 ? 'entry' : 'entries'} matching “{search}”
                    </p>
                )}
            </section>

            {/* Categories */}
            {filtered.length > 0 ? (
                filtered.map((category) => {
                    const Icon = category.icon;
                    return (
                        <section key={category.id} className="space-y-5">
                            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                                <div className="flex items-baseline gap-3 min-w-0">
                                    <span className="display-num text-[12px] text-[hsl(var(--accent))] flex-shrink-0">
                                        {category.index}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="eyebrow">{category.kicker}</p>
                                        <h2 className="font-sans text-[26px] sm:text-[30px] leading-none tracking-tight text-foreground flex items-baseline gap-2.5 mt-1">
                                            <Icon size={16} className="text-muted-foreground translate-y-0.5" aria-hidden="true" />
                                            <span>{category.name}</span>
                                        </h2>
                                    </div>
                                </div>
                                <p className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                    {category.calculators.length} {category.calculators.length === 1 ? 'entry' : 'entries'}
                                </p>
                            </div>

                            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
                                {category.calculators.map((calc, i) => (
                                    <li key={calc.id} className="bg-background">
                                        <Link
                                            href={`/calculators/${category.id}/${calc.id}`}
                                            className="group block h-full px-5 py-4 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="display-num text-[10px] text-muted-foreground mb-1.5 group-hover:text-[hsl(var(--accent))] transition-colors">
                                                        {category.index}.{String(i + 1).padStart(2, '0')}
                                                    </p>
                                                    <h3 className="font-sans text-[18px] leading-snug text-foreground truncate">
                                                        {calc.name}
                                                    </h3>
                                                    <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                                                        {calc.description}
                                                    </p>
                                                </div>
                                                <ArrowRight
                                                    size={14}
                                                    className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
                                                />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })
            ) : (
                <div className="border border-border px-6 py-16 text-center">
                    <Search size={28} className="text-muted-foreground/50 mx-auto mb-4" aria-hidden="true" />
                    <h2 className="font-sans text-[22px] text-foreground">No matching entries</h2>
                    <p className="mt-2 font-sans italic text-[15px] text-muted-foreground">
                        We could not find anything for <span className="not-italic font-mono text-foreground">“{search}”</span>. Try a different word.
                    </p>
                    <button
                        onClick={() => setSearch('')}
                        className="ed-btn ed-btn-ghost h-10 px-5 mt-5"
                    >
                        Clear search
                    </button>
                </div>
            )}

            {/* Disclaimer */}
            <section className="border-t border-border pt-8">
                <div className="border-l-2 border-foreground/70 pl-5 max-w-3xl mx-auto">
                    <p className="eyebrow-strong mb-1">Editor’s note</p>
                    <p className="font-sans italic text-[15px] text-muted-foreground leading-snug">
                        All figures are produced for reference only. Tax brackets, scheme rates, and market assumptions change; verify with a qualified adviser before acting on any number you find here.
                    </p>
                </div>
            </section>
        </article>
    );
}
