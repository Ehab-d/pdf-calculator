
const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PDFFile {
  id: string;
  name: string;
  pageCount: number;
  size: number;
}

const state: {
  files: PDFFile[];
  pricePerPaper: number;
  isDuplex: boolean;
  pagesPerSide: number;
} = {
  files: [],
  pricePerPaper: 1,
  isDuplex: false,
  pagesPerSide: 1,
};

const elements = {
  priceInput: document.getElementById('price-input') as HTMLInputElement,
  duplexToggle: document.getElementById('duplex-toggle') as HTMLButtonElement,
  duplexDot: document.getElementById('duplex-dot') as HTMLElement,
  pagesPerSideSelect: document.getElementById('pages-per-side-select') as HTMLSelectElement,
  dropZone: document.getElementById('drop-zone') as HTMLElement,
  fileInput: document.getElementById('file-input') as HTMLInputElement,
  fileList: document.getElementById('file-list') as HTMLElement,
  emptyState: document.getElementById('empty-state') as HTMLElement,
  loadingIndicator: document.getElementById('loading-indicator') as HTMLElement,
  clearAllBtn: document.getElementById('clear-all-btn') as HTMLButtonElement,
  statPages: document.getElementById('stat-total-pages') as HTMLElement,
  statSheets: document.getElementById('stat-total-sheets') as HTMLElement,
  statCost: document.getElementById('stat-total-cost') as HTMLElement,
};

const getPDFPageCount = async (file: File): Promise<number> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  return pdf.numPages;
};

const updateUI = () => {
  let totalPages = 0;
  let totalSheets = 0;

  state.files.forEach(f => {
    totalPages += f.pageCount;
    // Calculate occupied "sides" (each side can have N pages)
    const sidesNeeded = Math.ceil(f.pageCount / state.pagesPerSide);
    
    // Calculate physical sheets
    let sheets = 0;
    if (state.isDuplex) {
      // 2 sides = 1 paper
      sheets = Math.ceil(sidesNeeded / 2);
    } else {
      // 1 side = 1 paper
      sheets = sidesNeeded;
    }
    totalSheets += sheets;
  });

  const totalCost = totalSheets * state.pricePerPaper;

  // Update Stats
  if (elements.statPages) elements.statPages.textContent = totalPages.toLocaleString();
  if (elements.statSheets) elements.statSheets.textContent = totalSheets.toLocaleString();
  if (elements.statCost) elements.statCost.textContent = totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Update List
  if (elements.fileList) {
    elements.fileList.innerHTML = '';
    if (state.files.length === 0) {
      elements.emptyState?.classList.remove('hidden');
      elements.clearAllBtn?.classList.add('hidden');
    } else {
      elements.emptyState?.classList.add('hidden');
      elements.clearAllBtn?.classList.remove('hidden');
      
      state.files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'p-5 flex items-center bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors animate-fade-in';
        item.innerHTML = `
          <div class="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
            <i class="fas fa-file-pdf text-xl"></i>
          </div>
          <div class="flex-grow min-w-0">
            <p class="font-bold text-gray-900 truncate" title="${file.name}">${file.name}</p>
            <p class="text-sm text-gray-500">${file.pageCount} Pages • ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button type="button" onclick="window.removePDF('${file.id}')" class="ml-4 p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <i class="fas fa-trash-alt"></i>
          </button>
        `;
        elements.fileList.appendChild(item);
      });
    }
  }
};

(window as any).removePDF = (id: string) => {
  state.files = state.files.filter(f => f.id !== id);
  updateUI();
};

const handleFiles = async (fileList: FileList | null) => {
  if (!fileList || fileList.length === 0) return;
  const filesArray = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  
  if (filesArray.length > 0) {
    elements.loadingIndicator?.classList.remove('hidden');
    elements.emptyState?.classList.add('hidden');
    
    for (const file of filesArray) {
      try {
        const count = await getPDFPageCount(file);
        state.files.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          pageCount: count,
          size: file.size
        });
      } catch (e) {
        console.error("Error processing file", file.name, e);
      }
    }
    elements.loadingIndicator?.classList.add('hidden');
    updateUI();
  }
};

// Listeners
elements.fileInput?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  handleFiles(target.files);
  target.value = ''; // Reset for re-selection
});

elements.priceInput?.addEventListener('input', (e) => {
  state.pricePerPaper = parseFloat((e.target as HTMLInputElement).value) || 0;
  updateUI();
});

elements.duplexToggle?.addEventListener('click', (e) => {
  e.preventDefault();
  state.isDuplex = !state.isDuplex;
  elements.duplexToggle?.classList.toggle('bg-indigo-600', state.isDuplex);
  elements.duplexToggle?.classList.toggle('bg-gray-200', !state.isDuplex);
  if (elements.duplexDot) {
    elements.duplexDot.style.transform = state.isDuplex ? 'translateX(1.25rem)' : 'translateX(0rem)';
  }
  updateUI();
});

elements.pagesPerSideSelect?.addEventListener('change', (e) => {
  state.pagesPerSide = parseInt((e.target as HTMLSelectElement).value);
  updateUI();
});

elements.clearAllBtn?.addEventListener('click', () => {
  state.files = [];
  updateUI();
});

// Drag & Drop visual feedback
if (elements.dropZone) {
  ['dragenter', 'dragover'].forEach(n => elements.dropZone.addEventListener(n, () => elements.dropZone.classList.add('drop-zone--over')));
  ['dragleave', 'drop'].forEach(n => elements.dropZone.addEventListener(n, () => elements.dropZone.classList.remove('drop-zone--over')));
  
  elements.dropZone.addEventListener('dragover', (e) => e.preventDefault());
  elements.dropZone.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer?.files || null);
  });

  // REMOVED the manually triggered .click() here to prevent double dialogs.
  // The input already covers the dropZone with z-10 and inset-0.
}

updateUI();
