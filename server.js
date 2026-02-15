const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const sharp = require('sharp');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

const app = express();

const PORT = process.env.PORT || 3000;

// const PORT = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));
app.use(express.urlencoded({ extended: true }));

// Create necessary directories
['uploads', 'downloads'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Debug: Log received file order
    console.log('Files received in order:');
    req.files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.originalname}`);
    });

    const outputFileName = `${Date.now()}-converted.pdf`;
    const outputPath = path.join('downloads', outputFileName);

    // Create a new PDF document that will contain all files
    const finalPdfDoc = await PDFDocument.create();

    // Process each uploaded file IN ORDER
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`Processing file ${i + 1}/${req.files.length}: ${file.originalname}`);
      
      try {
        const filePath = file.path;
        const fileExt = path.extname(file.originalname).toLowerCase();

        let pdfBytes;
        
        switch (fileExt) {
          case '.txt':
            pdfBytes = await convertTextToPdf(filePath);
            break;
          case '.jpg':
          case '.jpeg':
          case '.png':
          case '.gif':
          case '.webp':
            pdfBytes = await convertImageToPdf(filePath);
            break;
          case '.docx':
            pdfBytes = await convertDocxToPdf(filePath);
            break;
          case '.xlsx':
          case '.xls':
            pdfBytes = await convertExcelToPdf(filePath);
            break;
          case '.csv':
            pdfBytes = await convertCsvToPdf(filePath);
            break;
          case '.pdf':
            // If it's already a PDF, just read it
            pdfBytes = fs.readFileSync(filePath);
            break;
          default:
            console.warn(`Skipping unsupported file type: ${fileExt} (${file.originalname})`);
            continue;
        }

        // Load the converted PDF and copy its pages
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await finalPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => finalPdfDoc.addPage(page));

        // Clean up individual file
        fs.unlinkSync(filePath);

      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        // Clean up file and continue with other files
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Check if we have any pages
    if (finalPdfDoc.getPageCount() === 0) {
      return res.status(400).json({ 
        error: 'No valid files could be converted. Supported formats: txt, jpg, jpeg, png, gif, webp, docx, xlsx, xls, csv, pdf' 
      });
    }

    // Save the final merged PDF
    const finalPdfBytes = await finalPdfDoc.save();
    fs.writeFileSync(outputPath, finalPdfBytes);

    const fileNames = req.files.map(f => f.originalname).join(', ');

    res.json({
      success: true,
      downloadUrl: `/downloads/${outputFileName}`,
      fileName: outputFileName,
      originalName: fileNames,
      fileCount: req.files.length
    });

  } catch (error) {
    console.error('Conversion error:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to convert files to PDF', 
      details: error.message 
    });
  }
});

// Conversion functions

async function convertTextToPdf(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const pdfDoc = await PDFDocument.create();
  
  const lines = text.split('\n');
  let page = pdfDoc.addPage([612, 792]); // Letter size
  let y = 750;
  const lineHeight = 15;
  const margin = 50;
  const maxWidth = 512;

  for (const line of lines) {
    if (y < 50) {
      page = pdfDoc.addPage([612, 792]);
      y = 750;
    }
    
    page.drawText(line.substring(0, 100), {
      x: margin,
      y: y,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

async function convertImageToPdf(filePath) {
  // Convert image to JPEG using sharp
  const imageBuffer = await sharp(filePath)
    .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  const pdfDoc = await PDFDocument.create();
  const image = await pdfDoc.embedJpg(imageBuffer);
  
  const { width, height } = image.scale(1);
  
  // Calculate dimensions to fit page
  let pageWidth = width;
  let pageHeight = height;
  
  if (width > 612 || height > 792) {
    const scale = Math.min(612 / width, 792 / height);
    pageWidth = width * scale;
    pageHeight = height * scale;
  }
  
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  return await pdfDoc.save();
}

async function convertDocxToPdf(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  const pdfDoc = await PDFDocument.create();
  const lines = text.split('\n');
  let page = pdfDoc.addPage([612, 792]);
  let y = 750;
  const lineHeight = 15;
  const margin = 50;

  for (const line of lines) {
    if (y < 50) {
      page = pdfDoc.addPage([612, 792]);
      y = 750;
    }
    
    const displayLine = line.trim().substring(0, 100);
    if (displayLine) {
      page.drawText(displayLine, {
        x: margin,
        y: y,
        size: 12,
        color: rgb(0, 0, 0),
      });
    }
    
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

async function convertExcelToPdf(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([792, 612]); // Landscape for tables
  let y = 560;
  const lineHeight = 15;
  const margin = 50;

  // Add sheet name as title
  page.drawText(`Sheet: ${sheetName}`, {
    x: margin,
    y: y,
    size: 14,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  for (const row of data) {
    if (y < 50) {
      page = pdfDoc.addPage([792, 612]);
      y = 560;
    }
    
    const rowText = row.map(cell => String(cell || '')).join(' | ').substring(0, 120);
    page.drawText(rowText, {
      x: margin,
      y: y,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

async function convertCsvToPdf(filePath) {
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const rows = csvContent.split('\n').map(row => row.split(','));

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([792, 612]);
  let y = 560;
  const lineHeight = 15;
  const margin = 50;

  for (const row of rows) {
    if (y < 50) {
      page = pdfDoc.addPage([792, 612]);
      y = 560;
    }
    
    const rowText = row.join(' | ').substring(0, 120);
    page.drawText(rowText, {
      x: margin,
      y: y,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight;
  }

  return await pdfDoc.save();
}

// Clean up old files periodically
setInterval(() => {
  const cleanupDirs = ['uploads', 'downloads'];
  const maxAge = 60 * 60 * 1000; // 1 hour

  cleanupDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (Date.now() - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });
}, 30 * 60 * 1000); // Run every 30 minutes

app.listen(PORT, () => {
  console.log(`PDF Maker server running on http://localhost:${PORT}`);
});