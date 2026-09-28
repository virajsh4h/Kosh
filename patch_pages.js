const fs = require('fs');

const pagesToPatch = [
    {
        file: 'frontend/src/app/(main)/ppf/page.jsx',
        title: 'Public Provident Fund',
        desc: 'Track your PPF contributions, interest, and maturity.'
    },
    {
        file: 'frontend/src/app/(main)/epf/page.jsx',
        title: 'Employees Provident Fund',
        desc: 'Monitor your EPF/VPF balances and employer contributions.'
    },
    {
        file: 'frontend/src/app/(main)/gold-silver/page.jsx',
        title: 'Gold & Silver',
        desc: 'Manage your precious metal investments (SGBs, physical, ETFs).'
    },
    {
        file: 'frontend/src/app/(main)/notes/page.jsx',
        title: 'Financial Notes',
        desc: 'Keep track of financial goals, strategies, and reminders.'
    },
    {
        file: 'frontend/src/app/(main)/profile/page.jsx',
        title: 'User Profile',
        desc: 'Manage your account settings, security, and preferences.'
    }
];

pagesToPatch.forEach(page => {
    if (fs.existsSync(page.file)) {
        let content = fs.readFileSync(page.file, 'utf8');
        
        // Find the header block. It usually starts with <header and ends with </header>
        // Because regex can be tricky, let's just do a greedy match for the header.
        content = content.replace(/<header[\s\S]*?<\/header>/m, `<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">${page.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">${page.desc}</p>
                </div>
            </header>`);
            
        // Replace styles
        content = content.replace(/ed-card relative/g, 'bg-card border shadow-sm rounded-lg overflow-hidden');
        content = content.replace(/ed-card/g, 'bg-card border shadow-sm rounded-lg overflow-hidden');
        content = content.replace(/<span className="corner-mark corner-[a-z]{2}" \/>/g, '');
        content = content.replace(/FOLIO·§\d{2}/g, '');
        
        fs.writeFileSync(page.file, content);
        console.log('Patched: ' + page.file);
    }
});
