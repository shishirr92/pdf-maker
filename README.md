📄 PDF Maker

A simple web app to convert multiple files into a single PDF.
Built with Node.js, Express, EJS, and Bootstrap.

🔗 Live Demo: https://pdf-maker-a896.onrender.com/

✨ What it does
Upload multiple files and merge them into one PDF
Drag & drop to reorder files
Supports images, text, DOCX, Excel, CSV, and PDFs
Preview before downloading
Share directly (WhatsApp, Gmail, Telegram, etc.)
Auto compression for faster processing
Files auto-delete after 1 hour
📁 Supported formats
Images: JPG, PNG, GIF, WEBP
Text: TXT
Docs: DOCX
Sheets: XLSX, XLS, CSV
PDFs (merge)
🚀 Run locally
git clone <your-repo-url>
cd pdf-maker
npm install
npm start

Open: http://localhost:3000

⚙️ Tech stack
Node.js + Express
EJS + Bootstrap
pdf-lib, Sharp, Mammoth, XLSX
Multer (file upload)
⚠️ Notes
Max file size: 50MB
Max files: 20
Processing may be slower on mobile
👨‍💻 Author

Made by Shishir Adhikari

🚧 Future ideas
PDF password protection
OCR support
Cloud upload (Drive, Dropbox)
Basic PDF editing
