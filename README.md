# 🦥 Lazy BYGS Update!

*(BYGS = Boys & Girls, obviously. 😂)*

**Too lazy to update your CV? Good. We automated that.**

Let's be honest. You changed jobs. Learned new technologies. Worked on interesting projects. Maybe even survived a few production incidents. And now you have to update your CV.

Open Canva. Find a template. Move some boxes around. Rewrite your experience. Adjust the formatting. Write a cover letter.

Ugh. Ain't nobody got time for that.

So: a simple, AI-friendly CV generator for people who want to get things done without overcomplicating their lives. It keeps **your** design — not a generic template — and makes it easy to add a new job, fix a date, or drop in a new skill without ever opening Canva again.

![CV Generator screenshot](docs/screenshot.png)

## 🚀 What it does (today)

- **Keeps your own design.** Built from a real CV — dark sidebar, accent color, timeline dots, date pills — not a generic template. Fork it, swap the colors/fonts, make it yours.
- **Live preview, always in sync.** Every field you edit updates the actual print layout instantly — what you see is exactly what lands in the PDF.
- **Add/remove anything.** Work experience, education, certifications, references, skills, languages, achievements — all repeatable, reorderable, no fixed number of entries.
- **Drag & drop (or click) to add your photo.** No image editor, no cropping tool — drop a picture in and it's circular-cropped in the preview automatically.
- **Print-ready PDF, no account, no watermark.** `Ctrl+P` → Save as PDF. Multi-page CVs paginate cleanly (sidebar included).
- **Runs completely offline.** No backend, no build step, no npm install, no subscription. It's HTML/CSS/JS — double-click `index.html` and go.
- **Autosaves locally.** Your data lives in your browser's `localStorage`. Nothing leaves your machine.

## 🤖 About the "AI-powered" part

There's no embedded AI API here — no key to configure, nothing to pay for. The AI part is **you, plus whatever AI assistant you already have** (Claude, Claude Code, ChatGPT, Cursor, whatever):

1. Open this project's folder with your AI assistant of choice.
2. Paste your work history — a LinkedIn export, a messy bullet list, your old CV, whatever you've got.
3. Ask it to update the default data in `js/app.js` (or just edit the form yourself — the UI works standalone too, no AI required).
4. Open `index.html`, hit print, done.

That's it. If we're already using AI to automate our work, why are we still updating our CVs by hand? No fancy promises, no magic button that guarantees you a job — just point a smart assistant at a well-organized template and let it do the typing.

## 🚧 Roadmap (not there yet)

- [ ] Cover letter generator (same drag-and-drop-easy philosophy)
- [ ] A couple more built-in color themes/layouts to fork from
- [ ] Export/import your data as JSON (so switching machines doesn't mean starting over)

Is it perfect? Nope. Does it need improvements? Absolutely. But that's the point — a simple tool built to save time and make life a little easier.

## 📦 Getting started

No install, no dependencies:

```bash
git clone https://github.com/<your-username>/lazybygsupdate.git
cd lazybygsupdate
# just open index.html in your browser — that's the whole setup
```

Then: fill in the editor on the left, watch the CV build itself on the right, hit **Descargar / Imprimir PDF** when it looks right.

## 🙋 Why

Spend less time messing around with your CV and more time doing literally anything else.

It's not perfect, it's not magic, and it's definitely not trying to replace a professional career coach. It's just a practical little project for people who want to spend less time formatting documents.

**Built for the lazy. Powered by AI. Ready for your next update.**

Because sometimes, you just want to update your CV and get on with your life. 😎

#LazyBYGS #OpenSource #AI #ClaudeAI #Automation #JobSearch #DeveloperTools
