// src/components/calculators/framework/CalculatorComponents.jsx
// Editorial framework imported by all 32 calculator pages.
// Public API preserved: CalculatorLayout, InputCard, ResultCard, ResultMetric,
// FormField, BreakdownTable, DisclaimerBanner, ResultSkeleton.
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertCircle, Calculator, Info, Loader2 } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Layout                                                                    */
/* -------------------------------------------------------------------------- */

export function CalculatorLayout({ title, description, category, children }) {
    return (
        <article className="space-y-8">
            {/* Editorial masthead */}
            <header>
                <div className="flex items-baseline gap-3 mb-3">
                    <span className="index-num tnum text-[11px]">[ §FN ]</span>
                    <span className="eyebrow">{category}</span>
                </div>
                <h1 className="font-serif text-[36px] sm:text-[44px] leading-[1.05] tracking-tight text-foreground">
                    {title}
                </h1>
                {description && (
                    <p className="mt-3 font-serif italic text-[16px] text-muted-foreground leading-snug max-w-2xl">
                        {description}
                    </p>
                )}
                <div className="mt-6 rule-strong-h" />
            </header>

            {/* Two-column grid: inputs | results. Children may use lg:col-span-2 for full-width rows. */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
                {children}
            </div>
        </article>
    );
}

/* -------------------------------------------------------------------------- */
/*  Input panel                                                               */
/* -------------------------------------------------------------------------- */

export function InputCard({ title = 'Inputs', children, onCalculate, isLoading }) {
    return (
        <section className="bg-background border border-hairline">
            <div className="border-b border-hairline px-5 py-3.5 flex items-baseline gap-3">
                <span className="display-num text-[10px] text-[hsl(var(--accent))]">§A</span>
                <h2 className="eyebrow-strong">{title}</h2>
            </div>
            <div className="px-5 py-5 space-y-5">
                {children}
                {onCalculate && (
                    <button
                        onClick={onCalculate}
                        disabled={isLoading}
                        className="ed-btn ed-btn-primary w-full h-11 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Calculating…
                            </>
                        ) : (
                            <>
                                <Calculator size={14} />
                                Calculate
                            </>
                        )}
                    </button>
                )}
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/*  Result panel                                                              */
/* -------------------------------------------------------------------------- */

export function ResultCard({ title = 'The Result', children, isEmpty }) {
    if (isEmpty) {
        return (
            <section className="bg-background border border-hairline h-fit">
                <div className="border-b border-hairline px-5 py-3.5 flex items-baseline gap-3">
                    <span className="display-num text-[10px] text-muted-foreground">§B</span>
                    <h2 className="eyebrow-strong text-muted-foreground">Awaiting figures</h2>
                </div>
                <div className="py-14 px-6 text-center">
                    <Calculator size={28} className="text-muted-foreground/50 mx-auto mb-4" aria-hidden="true" />
                    <p className="font-serif italic text-[16px] text-muted-foreground leading-snug">
                        Set the values opposite and press <span className="not-italic font-mono text-foreground">Calculate</span>.
                    </p>
                    <p className="mt-2 eyebrow">No figures filed</p>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-background border border-hairline h-fit">
            <div className="border-b border-hairline px-5 py-3.5 flex items-baseline gap-3">
                <span className="display-num text-[10px] text-[hsl(var(--gain))]">§B</span>
                <h2 className="eyebrow-strong">{title}</h2>
                <span className="live-dot ml-auto" aria-hidden="true" />
            </div>
            <div className="px-5 py-5 space-y-5">
                {children}
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/*  Metric tile                                                               */
/* -------------------------------------------------------------------------- */

const METRIC_VARIANT = {
    default: {
        wrap: 'border-l-2 border-foreground/40 bg-muted/30',
        value: 'text-foreground',
    },
    success: {
        wrap: 'border-l-2 border-[hsl(var(--gain))] bg-[hsl(var(--gain)/0.05)]',
        value: 'text-[hsl(var(--gain))]',
    },
    warning: {
        wrap: 'border-l-2 border-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4)/0.06)]',
        value: 'text-[hsl(var(--chart-4))]',
    },
    error: {
        wrap: 'border-l-2 border-[hsl(var(--loss))] bg-[hsl(var(--loss)/0.05)]',
        value: 'text-[hsl(var(--loss))]',
    },
};

export function ResultMetric({ label, value, subValue, variant = 'default' }) {
    const v = METRIC_VARIANT[variant] || METRIC_VARIANT.default;
    return (
        <div className={cn('px-4 py-3.5 space-y-1', v.wrap)}>
            <p className="eyebrow">{label}</p>
            <motion.p
                key={value}
                initial={{ opacity: 0.4, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                    'font-serif text-[clamp(26px,3.4vw,32px)] leading-[1.05] tracking-tight tabular-nums',
                    v.value
                )}
            >
                {value}
            </motion.p>
            {subValue && (
                <p className="font-mono text-[11px] text-muted-foreground">{subValue}</p>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Form field                                                                */
/* -------------------------------------------------------------------------- */

export function FormField({
    label, name, value, onChange, type = 'number',
    placeholder, prefix, suffix, min, max, step, error, tooltip,
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={name} className="eyebrow-strong">
                    {label}
                </label>
                {tooltip && (
                    <span
                        className="font-mono text-[10px] text-muted-foreground border border-hairline px-1.5 py-0.5"
                        title={tooltip}
                    >
                        {tooltip}
                    </span>
                )}
            </div>
            <div className="relative">
                {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground pointer-events-none select-none">
                        {prefix}
                    </span>
                )}
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value === 0 ? '' : value}
                    onChange={onChange}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                        'w-full h-11 bg-background border font-mono text-[14px] text-foreground',
                        'placeholder:text-muted-foreground/60',
                        'focus:outline-none focus:ring-1 transition-colors',
                        prefix ? 'pl-7' : 'pl-3',
                        suffix ? 'pr-16' : 'pr-3',
                        error
                            ? 'border-[hsl(var(--loss))] focus:border-[hsl(var(--loss))] focus:ring-[hsl(var(--loss))]'
                            : 'border-hairline focus:border-foreground focus:ring-foreground'
                    )}
                />
                {suffix && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground pointer-events-none select-none bg-muted/60 px-1.5 py-0.5">
                        {suffix}
                    </span>
                )}
            </div>
            {error && (
                <p className="flex items-center gap-1.5 text-[11px] font-mono text-[hsl(var(--loss))]">
                    <AlertCircle size={11} /> {error}
                </p>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Breakdown table                                                           */
/* -------------------------------------------------------------------------- */

export function BreakdownTable({ headers, rows, caption }) {
    if (!rows || rows.length === 0) return null;

    return (
        <section className="bg-background border border-hairline">
            <div className="border-b border-hairline px-5 py-3.5 flex items-baseline gap-3">
                <span className="display-num text-[10px] text-muted-foreground">§D</span>
                <div>
                    <h3 className="eyebrow-strong">Detailed Breakdown</h3>
                    {caption && (
                        <p className="font-serif italic text-[13px] text-muted-foreground leading-snug mt-0.5">
                            {caption}
                        </p>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted/50 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-background">
                        <tr className="border-b-2 border-foreground/80">
                            {headers.map((header, i) => (
                                <th
                                    key={i}
                                    className="py-2.5 px-5 text-left eyebrow"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                className="hover:bg-muted/40 transition-colors"
                            >
                                {row.map((cell, j) => (
                                    <td
                                        key={j}
                                        className={cn(
                                            'py-2.5 px-5 tabular-nums',
                                            j === 0
                                                ? 'font-serif italic text-foreground'
                                                : 'font-mono text-foreground/85'
                                        )}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/*  Disclaimer                                                                */
/* -------------------------------------------------------------------------- */

const DISCLAIMER_VARIANT = {
    warning: { border: 'border-[hsl(var(--chart-4))]', tint: 'bg-[hsl(var(--chart-4)/0.05)]', icon: 'text-[hsl(var(--chart-4))]' },
    info:    { border: 'border-[hsl(var(--accent))]',  tint: 'bg-[hsl(var(--accent)/0.05)]',  icon: 'text-[hsl(var(--accent))]' },
    default: { border: 'border-foreground/70',         tint: 'bg-muted/30',                   icon: 'text-muted-foreground' },
};

export function DisclaimerBanner({ title = 'Editor’s note', message, variant = 'warning' }) {
    const v = DISCLAIMER_VARIANT[variant] || DISCLAIMER_VARIANT.default;
    return (
        <div className={cn('mt-4 border-l-2 px-4 py-3 flex items-start gap-3', v.border, v.tint)}>
            <Info size={13} className={cn('flex-shrink-0 mt-1', v.icon)} aria-hidden="true" />
            <div>
                <p className="eyebrow-strong">{title}</p>
                <p className="mt-1 font-serif italic text-[14px] text-muted-foreground leading-snug">
                    {message}
                </p>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

export function ResultSkeleton() {
    return (
        <section className="bg-background border border-hairline p-5 space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-40" />
        </section>
    );
}
