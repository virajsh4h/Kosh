const fs = require('fs');
let content = fs.readFileSync('frontend/src/app/(main)/fixed-deposit/page.jsx', 'utf8');

// Replace header
const newHeader = `<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fixed Deposits</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your term deposits and fixed return instruments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openCreate}
                        className="ed-btn ed-btn-primary h-9"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        <span>New Deposit</span>
                    </button>
                </div>
            </header>`;

content = content.replace(/<header className="pb-6 border-b border-hairline flex items-end justify-between gap-6">[\s\S]*?<\/header>/m, newHeader);

// Replace "ed-card relative" with "bg-card border shadow-sm rounded-lg"
content = content.replace(/ed-card relative/g, 'bg-card border shadow-sm rounded-lg overflow-hidden');
content = content.replace(/ed-card/g, 'bg-card border shadow-sm rounded-lg overflow-hidden');

// Remove corner marks
content = content.replace(/<span className="corner-mark corner-[a-z]{2}" \/>/g, '');

fs.writeFileSync('frontend/src/app/(main)/fixed-deposit/page.jsx', content);
