# Ser Único — Website

Single-page website for the Ser Único clinic (developmental psychology and ABA intervention, Portugal).

## Files

| File | Purpose |
|------|---------|
| `index.html` | The website itself. All HTML, CSS, and JavaScript inlined into one file. |
| `404.html` | Error page shown for broken links. |
| `logo-dark.webp` | Logo with dark lines on transparent background (for light areas: nav, About section). |
| `logo-light.webp` | Logo with cream lines on transparent background (for dark areas: footer). |
| `logo.png` | Standard PNG logo (Open Graph share image, fallback). |
| `logo.webp` | Original-color PNG converted to WebP for general use. |
| `favicon.png` | 256×256 favicon for higher-DPI browsers. |
| `favicon-32.png` | 32×32 favicon for browser tabs. |
| `robots.txt` | Tells search engines they can index the site. |
| `sitemap.xml` | Helps Google discover the page sections. |
| `CNAME` | The custom domain (for GitHub Pages). Edit if hosting on a different platform. |

## Before going live: 3 things to update in `index.html`

Open `index.html` and search for `YOUR_FORM_ID` (it appears three times). Replace all three with your Brevo form endpoint URL.

To get that URL:
1. Sign in to Brevo
2. Contacts → Forms → Create form
3. Select your *Leads Ser Único* list
4. When asked about design, pick "I will host the form on my own website"
5. Brevo gives you a form action URL (looks like `https://sibforms.com/serve/MUIFAxxxxxxxxxxxxxxxxxx`)
6. Paste that URL into all three `YOUR_FORM_ID` placeholders

Required custom attributes in Brevo (Contacts → Contact Attributes):
- `TELEFONE` (text), `CHILD_AGE` (text), `CONCERN` (text), `QUIZ_BUCKET` (text), `SOURCE` (text), `INTEREST` (text), `MESSAGE` (text)
- `QUIZ_SCORE` (number)

## Hosting

### Option A — Vercel (recommended, free)

1. Sign up at vercel.com if you don't have an account
2. New Project → either connect a GitHub repo, or drag-and-drop the folder containing all these files
3. Vercel detects static HTML and deploys in ~10 seconds
4. Live at a random URL like `ser-unico-abc123.vercel.app`
5. To use `www.ser-unico.com`: Project Settings → Domains → Add domain → Vercel shows you the DNS records to add at your domain registrar
6. HTTPS is automatic

Note: Vercel ignores the `CNAME` file (that's GitHub-Pages specific). You can leave it in the repo or delete it — either way it has no effect.

### Option B — Netlify (also free, similar to Vercel)

1. Sign up at netlify.com
2. Drag the folder of files into the deploy area
3. Live within seconds
4. Custom domain: Site Settings → Domain → Add custom domain → follow DNS instructions
5. HTTPS automatic

### Option C — GitHub Pages (free, slightly more setup)

1. Create a **public** repository (private repos can't use free Pages)
2. Upload all 11 files via github.com (no Git knowledge needed)
3. Settings → Pages → Source: `main` branch, root folder
4. Live within ~60 seconds at `https://YOUR-USERNAME.github.io/REPO-NAME/`
5. For `www.ser-unico.com`, the `CNAME` file does its work; configure DNS at your registrar:
   - 4 `A` records on the apex pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 `CNAME` record for `www` pointing to `YOUR-USERNAME.github.io`
6. Settings → Pages → tick "Enforce HTTPS" once DNS resolves

## How forms flow (no backend needed)

Visitor submits a form → JavaScript POSTs directly to Brevo's hosted form URL → Brevo adds the contact to your list and triggers any automation you've set up. No database, no Supabase, no serverless functions. Brevo's API does it all.

As a safety net, every submission is also stored in the visitor's browser `localStorage` under `serUnicoLeads`. You'd only see this if you opened DevTools on a visitor's machine — practically a fallback for development debugging only.

## Updating the site

Edit `index.html` locally, then either:
- (GitHub Pages) commit and push — GitHub redeploys automatically
- (Netlify) drag the new folder to your Netlify dashboard, or connect Git for auto-deploy

## Forms and analytics

Form submissions flow to Brevo. As a backup, every submission is also stored in the visitor's `localStorage` under the key `serUnicoLeads` — useful only if Brevo fails.

To add Google Analytics, paste your GA4 tracking snippet right before `</head>` in `index.html`.

## License

All rights reserved, Ser Único, 2026.
