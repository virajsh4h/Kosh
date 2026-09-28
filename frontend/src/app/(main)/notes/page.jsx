'use client';

import NoteDialog from '@/components/notes/NoteDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { notesAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pin, Plus, Search, StickyNote, Trash2 } from 'lucide-react';
import { useState } from 'react';

const PAGE_SIZE = 20;

const NOTE_ACCENT = {
    default: { tint: 'hsl(var(--card))',            stripe: 'hsl(var(--muted-foreground))', dot: 'hsl(var(--muted-foreground))' },
    rose:    { tint: 'hsl(346 70% 50% / 0.14)',     stripe: 'hsl(346 70% 50%)',              dot: 'hsl(346 70% 50%)' },
    orange:  { tint: 'hsl(24 92% 52% / 0.14)',      stripe: 'hsl(24 92% 52%)',               dot: 'hsl(24 92% 52%)' },
    amber:   { tint: 'hsl(var(--accent) / 0.18)',   stripe: 'hsl(var(--accent))',            dot: 'hsl(var(--accent))' },
    lime:    { tint: 'hsl(80 65% 45% / 0.16)',      stripe: 'hsl(80 65% 45%)',               dot: 'hsl(80 65% 45%)' },
    emerald: { tint: 'hsl(var(--gain) / 0.14)',     stripe: 'hsl(var(--gain))',              dot: 'hsl(var(--gain))' },
    cyan:    { tint: 'hsl(189 75% 45% / 0.15)',     stripe: 'hsl(189 75% 45%)',              dot: 'hsl(189 75% 45%)' },
    blue:    { tint: 'hsl(var(--neutral) / 0.15)',  stripe: 'hsl(var(--neutral))',           dot: 'hsl(var(--neutral))' },
    violet:  { tint: 'hsl(265 65% 58% / 0.16)',     stripe: 'hsl(265 65% 58%)',              dot: 'hsl(265 65% 58%)' },
    fuchsia: { tint: 'hsl(310 75% 58% / 0.16)',     stripe: 'hsl(310 75% 58%)',              dot: 'hsl(310 75% 58%)' },
};

function getColorKey(colorStr) {
    if (!colorStr) return 'default';
    for (const key of Object.keys(NOTE_ACCENT)) {
        if (colorStr.includes(key)) return key;
    }
    return 'default';
}

function relativeTime(dateStr) {
    if (!dateStr) return '';
    const d = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function NoteCard({ note, onEdit, onDelete, onPin, index }) {
    const colorKey = getColorKey(note.color);
    const accent = NOTE_ACCENT[colorKey] || NOTE_ACCENT.default;

    return (
        <article
            className="bg-card border shadow-sm rounded-lg overflow-hidden group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md p-4 flex flex-col min-h-[180px]"
            onClick={() => onEdit(note)}
            style={{
                background: accent.tint,
                borderTop: `3px solid ${accent.stripe}`,
                borderLeft: '1px solid hsl(var(--border))',
                borderRight: '1px solid hsl(var(--border))',
                borderBottom: '1px solid hsl(var(--border))',
            }}
        >
            
            

            <div className="flex items-baseline justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="index-num tnum" style={{ color: accent.stripe }}>
                        № {String(index + 1).padStart(3, '0')}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent.dot }} />
                </div>
                {note.pinned && (
                    <span
                        className="inline-flex items-center justify-center h-5 w-5 rounded-sm"
                        style={{ background: accent.stripe, color: 'white' }}
                        title="Pinned"
                    >
                        <Pin className="h-2.5 w-2.5 fill-current" strokeWidth={2.5} />
                    </span>
                )}
            </div>

            <h3 className="font-serif text-[18px] text-foreground leading-tight mb-2 line-clamp-2 tracking-tight">
                {note.title || <span className="italic text-muted-foreground">Untitled</span>}
            </h3>

            {note.content && (
                <p className="text-[12px] text-foreground/75 leading-relaxed line-clamp-3 mb-3 font-serif">
                    {note.content}
                </p>
            )}

            {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
                            style={{
                                background: 'hsl(var(--card))',
                                border: `1px solid ${accent.stripe}40`,
                                color: accent.stripe,
                            }}
                        >
                            #{tag}
                        </span>
                    ))}
                    {note.tags.length > 3 && (
                        <span className="text-[9px] font-mono text-muted-foreground">+{note.tags.length - 3}</span>
                    )}
                </div>
            )}

            <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-[9px] tracking-[0.16em] uppercase text-muted-foreground font-mono">
                    {relativeTime(note.updatedAt)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onPin(note); }}
                        className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-sm border transition-all',
                            note.pinned
                                ? 'bg-[hsl(var(--accent))] border-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                                : 'border-border bg-card text-muted-foreground hover:text-[hsl(var(--accent))] hover:border-[hsl(var(--accent))]'
                        )}
                        aria-label={note.pinned ? 'Unpin' : 'Pin'}
                        title={note.pinned ? 'Unpin' : 'Pin'}
                    >
                        <Pin className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-sm border border-border bg-card text-muted-foreground hover:text-[hsl(var(--loss))] hover:border-[hsl(var(--loss))] hover:bg-[hsl(var(--loss))]/10 transition-all"
                        aria-label="Delete"
                        title="Delete"
                    >
                        <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </article>
    );
}

function NoteCardSkeleton() {
    return (
        <div className="bg-card border shadow-sm rounded-lg overflow-hidden p-4 space-y-2">
            <Skeleton className="h-3 w-1/3 rounded-sm" />
            <Skeleton className="h-5 w-3/4 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-5/6 rounded-sm" />
            <Skeleton className="h-3 w-2/3 rounded-sm" />
        </div>
    );
}

export default function NotesPage() {
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState('all');
    const [page, setPage] = useState(0);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['notes', { page, search, tag: activeTag }],
        queryFn: () => notesAPI.getAll({
            page, size: PAGE_SIZE,
            search: search || undefined,
            tag: activeTag !== 'all' ? activeTag : undefined,
        }),
        staleTime: 30 * 1000,
        keepPreviousData: true,
    });

    const notes = Array.isArray(data) ? data : (data?.content ?? []);
    const totalPages = data?.totalPages ?? (Array.isArray(data) ? 1 : 0);
    const totalElements = data?.totalElements ?? notes.length;
    const allTags = ['all', ...new Set(notes.flatMap((n) => n.tags || []))].slice(0, 9);
    const pinned = notes.filter((n) => n.pinned);
    const unpinned = notes.filter((n) => !n.pinned);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notes'] });
    const optimistic = async (updateFn) => {
        await queryClient.cancelQueries({ queryKey: ['notes'] });
        const prev = queryClient.getQueryData(['notes', { page, search, tag: activeTag }]);
        const old = Array.isArray(prev) ? prev : (prev?.content ?? []);
        const updated = updateFn(old);
        queryClient.setQueryData(['notes', { page, search, tag: activeTag }], Array.isArray(prev) ? updated : { ...prev, content: updated });
        return { prev };
    };
    const onErr = (err, _, ctx) => {
        queryClient.setQueryData(['notes', { page, search, tag: activeTag }], ctx.prev);
        toast({ title: 'Operation Failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    };

    const createMutation = useMutation({
        mutationFn: notesAPI.create,
        onMutate: (n) => optimistic((old) => [{ ...n, id: 'temp-' + Date.now(), updatedAt: new Date().toISOString() }, ...old]),
        onSuccess: () => toast({ title: 'Note Created', variant: 'success' }),
        onError: onErr,
        onSettled: invalidate,
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, data: d }) => notesAPI.update(id, d),
        onMutate: ({ id, data: d }) => optimistic((old) => old.map((n) => (n.id === id ? { ...n, ...d, updatedAt: new Date().toISOString() } : n))),
        onSuccess: () => toast({ title: 'Note Updated', variant: 'success' }),
        onError: onErr,
        onSettled: invalidate,
    });
    const deleteMutation = useMutation({
        mutationFn: notesAPI.delete,
        onMutate: (id) => optimistic((old) => old.filter((n) => n.id !== id)),
        onSuccess: () => toast({ title: 'Note Deleted', variant: 'success' }),
        onError: onErr,
        onSettled: invalidate,
    });

    const handleSave = (noteData) => {
        if (editingNote) updateMutation.mutate({ id: editingNote.id, data: noteData });
        else createMutation.mutate(noteData);
    };

    const handleDelete = (id) => {
        toast({
            title: 'Delete this note?',
            description: 'This action cannot be undone.',
            variant: 'warning',
            action: <button onClick={() => deleteMutation.mutate(id)} className="text-[11px] font-medium text-[hsl(var(--loss))] hover:underline">Delete</button>,
        });
    };

    const handlePin = (note) => updateMutation.mutate({ id: note.id, data: { ...note, pinned: !note.pinned } });
    const openCreate = () => { setEditingNote(null); setIsDialogOpen(true); };
    const openEdit = (note) => { setEditingNote(note); setIsDialogOpen(true); };

    const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

    return (
        <div className="space-y-8">
            {/* Masthead */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Financial Notes</h1>
                    <p className="text-sm text-muted-foreground mt-1">Keep track of financial goals, strategies, and reminders.</p>
                </div>
            </header>

            {/* Filters */}
            <div className="flex items-end flex-wrap gap-x-6 gap-y-3 pb-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-[220px]">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search notes…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="ed-input text-[13px] py-1 w-56"
                    />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="eyebrow mr-1">Tag</span>
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => { setActiveTag(tag); setPage(0); }}
                            className={cn(
                                'h-6 px-2 text-[10px] font-mono uppercase tracking-[0.08em] border transition-colors rounded-sm',
                                activeTag === tag
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'border-border text-muted-foreground hover:border-hairline hover:text-foreground'
                            )}
                        >
                            {tag === 'all' ? 'all' : `#${tag}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className={gridClass}>
                    {Array.from({ length: 8 }).map((_, i) => <NoteCardSkeleton key={i} />)}
                </div>
            ) : notes.length === 0 ? (
                <section className="bg-card border shadow-sm rounded-lg overflow-hidden px-8 py-16 text-center max-w-md mx-auto">
                    
                    
                    
                    
                    <StickyNote className="h-7 w-7 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="font-serif italic text-[24px] text-foreground mb-1">
                        {search ? 'No matches found.' : 'The pages are blank.'}
                    </p>
                    <p className="text-[12px] text-muted-foreground mb-5">
                        {search ? `Nothing matches "${search}".` : 'Begin your first annotation.'}
                    </p>
                    {!search && (
                        <button onClick={openCreate} className="ed-btn ed-btn-primary">
                            <Plus className="h-3 w-3" /> Create Entry
                        </button>
                    )}
                </section>
            ) : (
                <div className="space-y-8">
                    {pinned.length > 0 && (
                        <div>
                            <div className="flex items-baseline gap-3 mb-4">
                                <Pin className="h-3 w-3 text-[hsl(var(--accent))]" />
                                <span className="eyebrow-strong">Pinned</span>
                                <span className="index-num tnum">[{String(pinned.length).padStart(2, '0')}]</span>
                            </div>
                            <div className={gridClass}>
                                {pinned.map((note, i) => (
                                    <NoteCard key={note.id} note={note} index={i} onEdit={openEdit} onDelete={handleDelete} onPin={handlePin} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        {pinned.length > 0 && (
                            <div className="flex items-baseline gap-3 mb-4">
                                <span className="eyebrow-strong">Archive</span>
                                <span className="index-num tnum">[{String(unpinned.length).padStart(2, '0')}]</span>
                            </div>
                        )}
                        <div className={gridClass}>
                            {unpinned.map((note, i) => (
                                <NoteCard key={note.id} note={note} index={pinned.length + i} onEdit={openEdit} onDelete={handleDelete} onPin={handlePin} />
                            ))}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <p className="text-[11px] tabular-nums font-mono text-muted-foreground">
                                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={page === 0}
                                    className="w-8 h-8 border border-border text-muted-foreground hover:border-hairline hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm flex items-center justify-center"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                    const p = page < 3 ? i : page - 2 + i;
                                    if (p >= totalPages) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={cn(
                                                'w-8 h-8 font-mono tnum text-[12px] transition-colors rounded-sm',
                                                p === page ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:border-hairline hover:text-foreground'
                                            )}
                                        >{p + 1}</button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="w-8 h-8 border border-border text-muted-foreground hover:border-hairline hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm flex items-center justify-center"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <NoteDialog
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setEditingNote(null); }}
                onSave={handleSave}
                onDelete={editingNote ? () => { handleDelete(editingNote.id); setIsDialogOpen(false); } : undefined}
                initialData={editingNote}
            />
        </div>
    );
}
