const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/calculators/page.jsx', 'utf8');

// Replace header
content = content.replace(/<header[\s\S]*?<\/header>/m, `<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Financial Calculators</h1>
                    <p className="text-sm text-muted-foreground mt-1">Tools to compute, project, and estimate your finances.</p>
                </div>
            </header>`);

// Fix styles
content = content.replace(/bg-hairline border border-hairline/g, 'bg-border border border-border rounded-lg overflow-hidden');
content = content.replace(/border-t border-hairline/g, 'border-t border-border');
content = content.replace(/border-l border-hairline/g, 'border-l border-border');
content = content.replace(/border border-hairline/g, 'border border-border');
content = content.replace(/border-b border-hairline/g, 'border-b border-border');
content = content.replace(/font-serif/g, 'font-sans');
content = content.replace(/display-serif/g, 'font-bold');

fs.writeFileSync('frontend/src/app/calculators/page.jsx', content);
console.log('Patched calculators');
