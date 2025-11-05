// src/common/pdf/pdfmake.util.ts
// 1. Import pdfMake core (the main library)
const pdfMake = require('pdfmake/build/pdfmake');

// 2. Import the vfs_fonts.js module DIRECTLY.
//    In Node.js context, this often directly exposes the fonts object or modifies global.
//    However, to be safe, we'll try to get the 'vfs' property directly from its exports.
const pdfFonts = require('pdfmake/build/vfs_fonts');

// CRITICAL FIX: Ensure pdfmake.vfs is initialized AND assigned the actual font data.
// The `vfs_fonts` module is intended to attach itself or export the raw vfs data.
// We get the vfs object which is often exported as `pdfFonts.pdfMake.vfs` OR is the `pdfFonts` object itself
// We then merge this into pdfMake.vfs.

// Initialize pdfMake.vfs if it doesn't exist (robustness)
if (!pdfMake.vfs) {
  pdfMake.vfs = {};
}

// Check for the most common export patterns of vfs_fonts
let actualVfsData = null;
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  // Common case: pdfFonts exports { pdfMake: { vfs: { ... } } }
  actualVfsData = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && pdfFonts.vfs) {
  // Alternative case: pdfFonts exports { vfs: { ... } } directly
  actualVfsData = pdfFonts.vfs;
} else {
  // Safest fallback: Assume pdfFonts is the VFS object itself
  actualVfsData = pdfFonts;
}

if (actualVfsData) {
  Object.assign(pdfMake.vfs, actualVfsData); // Merge new fonts into the vfs object
} else {
  console.error("CRITICAL ERROR: pdfmake fonts (vfs_fonts) could not be loaded or accessed correctly.");
}


// 4. Export the fully configured pdfMake instance
export { pdfMake };

// Optional: Debugging logs to verify vfs content
// console.log("[pdfmake.util] pdfMake initialized and vfs attached.");
// console.log("[pdfmake.util] Sample vfs keys:", Object.keys(pdfMake.vfs).slice(0,5));