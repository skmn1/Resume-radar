/**
 * Cover Letter Export Service
 * Exports cover letters to PDF, DOCX, TXT, and HTML formats
 */

import { CoverLetterExportOptions, ExportMetadata } from '@/types/jobMatching';

/**
 * Export cover letter as plain text
 */
export function exportAsText(content: string): string {
  console.log('📄 [Export] Generating plain text export...');
  
  // Remove HTML tags if any
  const plainText = content.replace(/<[^>]*>/g, '');
  
  // Normalize line breaks
  const normalized = plainText.replace(/\n{3,}/g, '\n\n');
  
  return normalized.trim();
}

/**
 * Export cover letter as HTML
 */
export function exportAsHTML(
  content: string,
  options: CoverLetterExportOptions
): string {
  console.log('🌐 [Export] Generating HTML export...');
  
  const {
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateAddress,
    companyName,
    companyAddress,
    hiringManagerName,
    includeDate
  } = options;
  
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cover Letter - ${candidateName}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      max-width: 8.5in;
      margin: 1in auto;
      padding: 0;
      color: #000;
    }
    .header {
      margin-bottom: 1em;
    }
    .header p {
      margin: 0.2em 0;
    }
    .date {
      margin: 1em 0;
    }
    .recipient {
      margin-bottom: 1em;
    }
    .recipient p {
      margin: 0.2em 0;
    }
    .greeting {
      margin-bottom: 1em;
    }
    .body {
      margin-bottom: 1em;
    }
    .body p {
      margin-bottom: 1em;
      text-align: justify;
    }
    .closing {
      margin-top: 2em;
    }
    .signature {
      margin-top: 3em;
    }
    @media print {
      body {
        margin: 1in;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <p><strong>${candidateName}</strong></p>
    ${candidateEmail ? `<p>${candidateEmail}</p>` : ''}
    ${candidatePhone ? `<p>${candidatePhone}</p>` : ''}
    ${candidateAddress ? `<p>${candidateAddress}</p>` : ''}
  </div>

  ${includeDate ? `<div class="date"><p>${date}</p></div>` : ''}

  ${hiringManagerName || companyName ? `
  <div class="recipient">
    ${hiringManagerName ? `<p>${hiringManagerName}</p>` : ''}
    ${companyName ? `<p>${companyName}</p>` : ''}
    ${companyAddress ? `<p>${companyAddress}</p>` : ''}
  </div>
  ` : ''}

  <div class="greeting">
    <p>${hiringManagerName ? `Dear ${hiringManagerName},` : 'Dear Hiring Manager,'}</p>
  </div>

  <div class="body">
    ${content.split('\n\n').map(para => `<p>${para.trim()}</p>`).join('\n    ')}
  </div>

  <div class="closing">
    <p>Sincerely,</p>
  </div>

  <div class="signature">
    <p><strong>${candidateName}</strong></p>
  </div>
</body>
</html>
  `.trim();
  
  return html;
}

/**
 * Create a download blob for the exported file
 */
export function createDownloadBlob(
  content: string,
  format: 'txt' | 'html'
): Blob {
  const mimeTypes = {
    txt: 'text/plain',
    html: 'text/html'
  };
  
  return new Blob([content], { type: mimeTypes[format] });
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  candidateName: string,
  companyName: string | undefined,
  format: string
): string {
  const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_');
  
  const parts = ['CoverLetter'];
  
  if (companyName) {
    parts.push(sanitize(companyName));
  }
  
  parts.push(sanitize(candidateName));
  
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  parts.push(timestamp);
  
  return `${parts.join('_')}.${format}`;
}

/**
 * Trigger browser download of exported file
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 */
export async function exportCoverLetter(
  content: string,
  options: CoverLetterExportOptions
): Promise<ExportMetadata> {
  console.log(`📥 [Export] Exporting cover letter as ${options.format.toUpperCase()}...`);
  
  const { format, candidateName, companyName } = options;
  
  let exportContent: string;
  let blob: Blob;
  let filename: string;
  
  switch (format) {
    case 'txt':
      exportContent = exportAsText(content);
      blob = createDownloadBlob(exportContent, 'txt');
      filename = generateExportFilename(candidateName, companyName, 'txt');
      break;
    
    case 'html':
      exportContent = exportAsHTML(content, options);
      blob = createDownloadBlob(exportContent, 'html');
      filename = generateExportFilename(candidateName, companyName, 'html');
      break;
    
    case 'pdf':
      // For PDF, we'll generate HTML and let the browser handle printing
      exportContent = exportAsHTML(content, options);
      blob = createDownloadBlob(exportContent, 'html');
      filename = generateExportFilename(candidateName, companyName, 'html');
      console.log('   💡 PDF export: Open the HTML file and use browser Print to PDF');
      break;
    
    case 'docx':
      // For DOCX, we'll provide HTML that can be opened in Word
      exportContent = exportAsHTML(content, options);
      blob = createDownloadBlob(exportContent, 'html');
      filename = generateExportFilename(candidateName, companyName, 'html');
      console.log('   💡 DOCX export: Open the HTML file in Microsoft Word and save as DOCX');
      break;
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
  
  // Trigger download
  downloadFile(blob, filename);
  
  const metadata: ExportMetadata = {
    filename,
    size: blob.size,
    format,
    createdAt: new Date()
  };
  
  console.log(`   ✅ Exported ${(blob.size / 1024).toFixed(2)} KB as ${filename}`);
  
  return metadata;
}

/**
 * Print cover letter (for PDF generation via browser)
 */
export function printCoverLetter(content: string, options: CoverLetterExportOptions): void {
  const html = exportAsHTML(content, options);
  
  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
