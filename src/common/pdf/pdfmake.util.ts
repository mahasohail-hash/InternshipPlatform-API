import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Attach virtual file system (REQUIRED)
(pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;


export { pdfMake };
