const baseProducts = [];

const STORAGE_KEY = 'novatech-custom-products';
const API_BASE_URL = String(window.NOVATECH_API_BASE_URL || '').replace(/\/$/, '');
const PRODUCTS_API_PATH = '/api/products';
const LEADS_API_PATH = '/api/leads';
const WHATSAPP_SALES_NUMBER = '+595982213504';

const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const batchSizeSelect = document.getElementById('batchSizeSelect');
const loadMoreProducts = document.getElementById('loadMoreProducts');
const shouldUseBatchControls = Boolean(batchSizeSelect && loadMoreProducts);
const uploadBatchSelect = document.getElementById('uploadBatchSelect');
const categoryButtons = [...document.querySelectorAll('[data-filter]')];
const brandButtons = [...document.querySelectorAll('[data-brand]')];
const cartDrawer = document.getElementById('cartDrawer');
const overlay = document.getElementById('overlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutCart = document.getElementById('checkoutCart');
const continueShopping = document.getElementById('continueShopping');
const pdfExportButton = document.getElementById('exportProductsPdf');
const openCart = document.getElementById('openCart');
const closeCart = document.getElementById('closeCart');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const productForm = document.getElementById('productForm');
const resetProducts = document.getElementById('resetProducts');
const bulkForm = document.getElementById('bulkForm');
const bulkInput = document.getElementById('bulkInput');
const bulkMarginInput = document.getElementById('bulkMarginPercent');
const fillSampleBulk = document.getElementById('fillSampleBulk');
const clearUploads = document.getElementById('clearUploads');
const deleteVisibleUploads = document.getElementById('deleteVisibleUploads');
const deleteSelectedBatch = document.getElementById('deleteSelectedBatch');
const refreshBatchList = document.getElementById('refreshBatchList');
const productFormMode = document.getElementById('productFormMode');
const cancelEditProduct = document.getElementById('cancelEditProduct');
const submitProductButton = document.querySelector('[data-submit-product]');
const businessContactForm = document.getElementById('businessContactForm');

const CONTACT_EMAIL = 'pierscotto3@gmail.com';
const isAdminView = hasAdminControls();

const cart = [];
let activeFilter = isAdminView ? 'all' : 'notebook';
let activeBrand = 'all';
let searchTerm = '';
let activeSort = isAdminView ? 'default' : 'price-asc';
let editingProductId = '';
let products = loadProducts();
let selectedBatchSize = 60;
let currentVisibleLimit = 60;

const DEFAULT_BULK_TAX_PERCENT = 10;
const DEFAULT_BULK_MARGIN_PERCENT = 17;
const GENERATED_IMAGE_CACHE = new Map();

function resetVisibleLimit() {
  currentVisibleLimit = selectedBatchSize;
}

function updateBatchControls(totalProducts, renderedCount) {
  if (!loadMoreProducts) return;

  const hasMore = renderedCount < totalProducts;
  loadMoreProducts.hidden = !hasMore;
  loadMoreProducts.disabled = !hasMore;

  if (!hasMore) return;

  const remaining = totalProducts - renderedCount;
  const arrow = loadMoreProducts.querySelector('[aria-hidden="true"]');
  const label = loadMoreProducts.querySelector('span:not([aria-hidden])');

  if (arrow) {
    arrow.textContent = '↓';
  }

  if (label) {
    label.textContent = `Quiero ver más (${remaining} restantes)`;
  }
}

function formatPrice(value) {
  return `U$ ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatBatchLabel(prefix, createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  return `${prefix} • ${date.toLocaleDateString('es-PY')} ${date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`;
}

function createUploadBatchMeta(prefix) {
  const createdAt = new Date().toISOString();
  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: formatBatchLabel(prefix === 'bulk' ? 'Carga masiva' : 'Carga simple', createdAt),
    createdAt,
  };
}

function getProductIdentifier(product) {
  return String(product?.id || product?.sku || product?.code || 'sin-id').trim();
}

function getProductDisplayId(product) {
  return getProductIdentifier(product).toUpperCase();
}

function getUploadBatchKey(product) {
  if (!product || product.id.startsWith('base-')) return '';
  return product.batchId || 'legacy-custom';
}

function getUploadBatchLabel(product) {
  if (!product || product.id.startsWith('base-')) return '';
  return product.batchLabel || (product.batchId ? 'Carga sin nombre' : 'Subidas anteriores');
}

function buildWhatsAppProductLink(product) {
  const cleanPhone = String(WHATSAPP_SALES_NUMBER).replace(/\D/g, '');
  const name = product.displayName || product.fullName || product.name;
  const identifier = getProductDisplayId(product);
  const message = `Hola! Me interesa este equipo: ${name}. ID: ${identifier}. Precio publicado: ${formatPrice(product.price)}. ¿Está disponible?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function buildWhatsAppCartLink() {
  const cleanPhone = String(WHATSAPP_SALES_NUMBER).replace(/\D/g, '');
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const lines = cart.map((item, index) => {
    const quantityLabel = item.quantity > 1 ? ` x${item.quantity}` : '';
    const lineTotal = formatPrice(item.price * item.quantity);
    return `${index + 1}. ${item.name}${quantityLabel} - ${lineTotal}`;
  });

  const message = [
    'Hola, quiero comprar estos productos de Pacto Store:',
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
    'Quedo atento para coordinar la compra.',
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

const CATEGORY_LABELS = {
  all: 'Todo',
  pc: 'PC',
  notebook: 'Notebook',
  tv: 'TV',
  smartphone: 'Smartphone',
  gaming: 'Gaming',
  audio: 'Audio',
  tablet: 'Tablet',
};

const BRAND_LABELS = {
  all: 'Todas las marcas',
  MSI: 'MSI',
  DELL: 'Dell',
  ACER: 'Acer',
  ASUS: 'ASUS',
  HP: 'HP',
  LENOVO: 'Lenovo',
  SAMSUNG: 'Samsung',
  XIAOMI: 'Xiaomi',
  APPLE: 'Apple',
  MICROSOFT: 'Microsoft',
  GIGABYTE: 'Gigabyte',
  JBL: 'JBL',
};

const SORT_LABELS = {
  default: 'Destacados',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  'name-asc': 'Nombre: A-Z',
  'name-desc': 'Nombre: Z-A',
};

function getVisibleFilterSummary() {
  return [
    `Categoría: ${CATEGORY_LABELS[activeFilter] || activeFilter}`,
    `Marca: ${BRAND_LABELS[activeBrand] || activeBrand}`,
    `Búsqueda: ${searchTerm ? searchTerm : 'Sin búsqueda'}`,
    `Orden: ${SORT_LABELS[activeSort] || SORT_LABELS.default}`,
  ].join(' | ');
}

function getPdfSpecsSummary(product) {
  const specs = product.specs || {};
  return [
    specs.processor && `Procesador: ${specs.processor}`,
    specs.ram && `RAM: ${specs.ram}`,
    specs.storage && `Almacenamiento: ${specs.storage}`,
    specs.color && `Color: ${specs.color}`,
    specs.screen && `Pantalla: ${specs.screen}`,
    specs.gpu && `GPU: ${specs.gpu}`,
    specs.os && `Sistema: ${specs.os}`,
  ].filter(Boolean).join(' | ');
}

function getPdfProductLine(product, index) {
  const productTitle = `${index + 1}. ${product.displayName || product.fullName || product.name}`;
  const productMeta = [
    `ID: ${getProductDisplayId(product)}`,
    `Categoría: ${(product.category || '').toUpperCase()}`,
    product.brand ? `Marca: ${product.brand}` : '',
    product.tag && product.tag.toUpperCase() !== 'WHATSAPP' ? `Etiqueta: ${product.tag}` : '',
    getPdfSpecsSummary(product),
    `Precio: ${formatPrice(product.price)}`,
  ].filter(Boolean).join(' | ');

  return { productTitle, productMeta };
}

function exportVisibleProductsToPdf() {
  const visibleProducts = getVisibleProducts();
  if (!visibleProducts.length) {
    window.alert('No hay productos para exportar con los filtros actuales.');
    return;
  }

  const pdfNamespace = window.jspdf;
  if (!pdfNamespace || !pdfNamespace.jsPDF) {
    window.alert('No se pudo cargar el generador de PDF.');
    return;
  }

  const { jsPDF } = pdfNamespace;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const cardPadding = 4;
  const lineHeight = 5;
  let cursorY = margin;

  const title = 'Pacto Store - Catálogo de productos';
  const subtitle = getVisibleFilterSummary();

  doc.setTextColor(7, 17, 29);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, margin, cursorY);

  cursorY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Exportado el ${new Date().toLocaleDateString('es-PY')}`, margin, cursorY);
  cursorY += 5;
  doc.text(subtitle, margin, cursorY, { maxWidth: contentWidth });
  cursorY += 10;

  visibleProducts.forEach((product, index) => {
    const { productTitle, productMeta } = getPdfProductLine(product, index);

    const titleLines = doc.splitTextToSize(productTitle, contentWidth - cardPadding * 2);
    const metaLines = doc.splitTextToSize(productMeta, contentWidth - cardPadding * 2);
    const blockHeight = (titleLines.length * 6) + (metaLines.length * 5) + 10;

    if (cursorY + blockHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setDrawColor(214, 226, 238);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, cursorY, contentWidth, blockHeight, 3, 3, 'FD');

    let blockY = cursorY + 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    titleLines.forEach((line) => {
      doc.text(line, margin + cardPadding, blockY);
      blockY += 6;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    metaLines.forEach((line) => {
      doc.text(line, margin + cardPadding, blockY);
      blockY += 5;
    });

    cursorY += blockHeight + 5;
  });

  const fileNameParts = [
    'pacto-store',
    activeBrand && activeBrand !== 'all' ? String(activeBrand).toLowerCase() : 'catalogo',
    activeFilter && activeFilter !== 'all' ? String(activeFilter).toLowerCase() : '',
    new Date().toISOString().slice(0, 10),
  ].filter(Boolean);

  doc.save(`${fileNameParts.join('-')}.pdf`);
}

const BRAND_LOGO_FILES = {
  MSI: 'MSI.png',
  DELL: 'DELL.jpg',
  ACER: 'ACER2.jpg',
  ASUS: 'ASUS.png',
  HP: 'HP.png',
  LENOVO: 'LENOVO.jpg',
  SAMSUNG: 'SAMSUNG.png',
  XIAOMI: 'Xiaomi.png',
  APPLE: 'APPLE.png',
  MICROSOFT: 'MICROSOFT.png',
  GIGABYTE: 'GIGABYTE.png',
  JBL: 'JBL.png',
};

const CATEGORY_LOGO_FILES = {
  ALL: 'PACTO STORE.png',
  PC: 'pc.jpg',
  NOTEBOOK: 'notebook.jpg',
  TV: 'TV.jpg',
  SMARTPHONE: 'SMARTPHONE.jpeg',
  GAMING: 'GAMIG.jpg',
  AUDIO: 'AUDIO.jpg',
};

function getBrandLogoPath(brand) {
  const fileName = BRAND_LOGO_FILES[brand];
  return fileName ? `LOGOS/${fileName}` : '';
}

function getCategoryLogoPath(category) {
  const fileName = CATEGORY_LOGO_FILES[category];
  return fileName ? `LOGOS/${fileName}` : '';
}

function decorateBrandButtons() {
  brandButtons.forEach((button) => {
    const brand = String(button.dataset.brand || '').toUpperCase();
    if (!brand || brand === 'ALL') return;
    if (button.querySelector('.brand-chip__logo')) return;

    const labelText = button.textContent.trim();
    button.classList.add('brand-chip');
    button.textContent = '';

    const logo = document.createElement('img');
    logo.className = 'brand-chip__logo';
    logo.alt = '';
    logo.loading = 'lazy';
    logo.decoding = 'async';
    logo.src = getBrandLogoPath(brand);
    logo.addEventListener('error', () => {
      logo.style.display = 'none';
    }, { once: true });

    const label = document.createElement('span');
    label.className = 'brand-chip__label';
    label.textContent = labelText;

    button.append(logo, label);
  });
}

function decorateCategoryButtons() {
  categoryButtons.forEach((button) => {
    const category = String(button.dataset.filter || '').toUpperCase();
    if (!category) return;
    if (button.querySelector('.category-chip__logo')) return;

    const labelText = button.textContent.trim();
    const logoPath = getCategoryLogoPath(category);
    if (!logoPath) return;

    button.classList.add('category-chip--with-logo');
    button.textContent = '';

    const logo = document.createElement('img');
    logo.className = 'category-chip__logo';
    logo.alt = '';
    logo.loading = 'lazy';
    logo.decoding = 'async';
    logo.src = logoPath;
    logo.addEventListener('error', () => {
      logo.style.display = 'none';
    }, { once: true });

    const label = document.createElement('span');
    label.className = 'category-chip__label';
    label.textContent = labelText;

    button.append(logo, label);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function canUseStorage() {
  try {
    const testKey = '__novatech_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function loadProducts() {
  if (!canUseStorage()) {
    return [...baseProducts];
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return [...baseProducts, ...(Array.isArray(stored) ? stored : [])];
  } catch {
    return [...baseProducts];
  }
}

function getApiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function requestApi(path, options = {}) {
  const nextOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  const response = await fetch(getApiUrl(path), nextOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return null;
}

async function saveCustomProductsRemote(customProducts) {
  try {
    await requestApi(PRODUCTS_API_PATH, {
      method: 'PUT',
      body: JSON.stringify({ products: customProducts }),
    });
  } catch (error) {
    console.info('No se pudo sincronizar productos en MySQL. Se mantiene guardado local.', error);
  }
}

async function hydrateProductsFromRemote() {
  try {
    const response = await requestApi(PRODUCTS_API_PATH, { method: 'GET' });
    const remoteProducts = Array.isArray(response?.products) ? response.products : null;
    if (!remoteProducts) return;

    if (canUseStorage()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteProducts));
    }

    products = [...baseProducts, ...remoteProducts];
    renderProducts();
    if (hasAdminControls()) {
      clearProductForm();
    }
  } catch (error) {
    console.info('Backend no disponible. Se usa modo local.', error);
  }
}

async function submitLeadToRemote(leadData) {
  try {
    await requestApi(LEADS_API_PATH, {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  } catch (error) {
    console.info('No se pudo guardar el lead en MySQL.', error);
  }
}

function saveCustomProducts(customProducts) {
  if (!canUseStorage()) {
    products = [...baseProducts, ...customProducts];
    void saveCustomProductsRemote(customProducts);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts));
  products = [...baseProducts, ...customProducts];
  void saveCustomProductsRemote(customProducts);
}

function getProductIcon(category) {
  if (category === 'notebook') return '💻';
  if (category === 'tv') return '📺';
  if (category === 'smartphone') return '📱';
  return '🛍️';
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function getImagePalette(seed) {
  const palettes = [
    ['#10243a', '#1b7db6', '#35d0ba'],
    ['#0f1c2e', '#2a5da8', '#59c2ff'],
    ['#1b1d3a', '#2d3db2', '#4fd1ff'],
    ['#16222f', '#1d8f9f', '#8be66f'],
    ['#271a33', '#8654d8', '#4ed6ff'],
    ['#2b1a1a', '#c24f4f', '#ffca5f'],
  ];
  return palettes[seed % palettes.length];
}

function buildGeneratedProductImage(product) {
  const name = String(product?.displayName || product?.fullName || product?.name || 'Producto').trim();
  const reference = getProductDisplayId(product);
  const line1 = name.length > 34 ? `${name.slice(0, 31).trim()}...` : name;
  const line2 = reference && reference !== 'SIN-ID'
    ? `REF: ${reference}`
    : `REF: ${(product?.brand || product?.category || 'EQUIPO').toString().toUpperCase()}`;

  const seedKey = `${product?.id || ''}|${name}|${product?.brand || ''}|${product?.category || ''}`;
  const seed = hashString(seedKey);
  const cacheKey = `${seed}|${line1}|${line2}`;
  const cached = GENERATED_IMAGE_CACHE.get(cacheKey);
  if (cached) return cached;

  const [startColor, endColor, accentColor] = getImagePalette(seed);
  const icon = escapeXml(product?.icon || getProductIcon(product?.category));
  const categoryText = escapeXml((product?.category || 'Producto').toString().toUpperCase());

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720" role="img" aria-label="${escapeXml(line1)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${startColor}"/>
      <stop offset="100%" stop-color="${endColor}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.2" r="0.6">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="960" height="720" fill="url(#bg)"/>
  <rect width="960" height="720" fill="url(#glow)"/>
  <rect x="48" y="48" width="864" height="624" rx="36" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <text x="78" y="158" fill="rgba(255,255,255,0.9)" font-size="78" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji">${icon}</text>
  <text x="78" y="244" fill="rgba(255,255,255,0.78)" font-size="28" font-family="Arial, Helvetica, sans-serif" letter-spacing="2">${categoryText}</text>
  <text x="78" y="560" fill="#ffffff" font-size="40" font-family="Arial, Helvetica, sans-serif" font-weight="700">${escapeXml(line1)}</text>
  <text x="78" y="612" fill="rgba(255,255,255,0.82)" font-size="26" font-family="Arial, Helvetica, sans-serif">${escapeXml(line2)}</text>
</svg>`;

  const encoded = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  GENERATED_IMAGE_CACHE.set(cacheKey, encoded);
  return encoded;
}

function getProductImageSource(product) {
  const image = String(product?.image || '').trim();
  if (image) return image;
  return buildGeneratedProductImage(product);
}

function compactSpecs(specs) {
  return Object.fromEntries(
    Object.entries(specs).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ''),
  );
}

function collectSpecsFromForm(formData) {
  return compactSpecs({
    processor: String(formData.get('processor') || '').trim(),
    ram: String(formData.get('ram') || '').trim(),
    storage: String(formData.get('storage') || '').trim(),
    screen: String(formData.get('screen') || '').trim(),
    gpu: String(formData.get('gpu') || '').trim(),
    os: String(formData.get('os') || '').trim(),
    language: String(formData.get('language') || '').trim(),
  });
}

function setProductFormMode(isEditing) {
  if (productFormMode) {
    productFormMode.textContent = isEditing
      ? 'Modo edición: guardá cambios del equipo seleccionado.'
      : 'Modo alta: cargá un producto nuevo.';
  }

  if (submitProductButton) {
    submitProductButton.textContent = isEditing ? 'Guardar cambios' : 'Agregar producto';
  }

  if (cancelEditProduct) {
    cancelEditProduct.hidden = !isEditing;
  }
}

function clearProductForm() {
  if (!productForm) return;
  productForm.reset();
  editingProductId = '';
  setProductFormMode(false);
}

function startProductEdit(productId) {
  if (!productForm) return;
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const specs = product.specs || {};
  editingProductId = productId;

  productForm.elements.name.value = product.fullName || product.name || '';
  productForm.elements.category.value = product.category || 'pc';
  if (productForm.elements.brand) productForm.elements.brand.value = product.brand || '';
  productForm.elements.tag.value = product.tag || '';
  productForm.elements.price.value = Number(product.price || 0);
  if (productForm.elements.imageUrl) {
    const imageValue = String(product.image || '');
    productForm.elements.imageUrl.value = imageValue.startsWith('http') ? imageValue : '';
  }

  if (productForm.elements.processor) productForm.elements.processor.value = specs.processor || '';
  if (productForm.elements.ram) productForm.elements.ram.value = specs.ram || '';
  if (productForm.elements.storage) productForm.elements.storage.value = specs.storage || '';
  if (productForm.elements.screen) productForm.elements.screen.value = specs.screen || '';
  if (productForm.elements.gpu) productForm.elements.gpu.value = specs.gpu || '';
  if (productForm.elements.os) productForm.elements.os.value = specs.os || '';
  if (productForm.elements.language) productForm.elements.language.value = specs.language || '';

  setProductFormMode(true);
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getProductVisual(product) {
  const imageSource = getProductImageSource(product);
  if (imageSource) {
    return `<img class="product-card__img" src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.name)}" />`;
  }

  return `<span>${escapeHtml(product.icon || '🛍️')}</span>`;
}

function getSpecsRows(product) {
  if (!product.specs) return [];

  const { processor, ram, storage, color, screen, gpu, os, language } = product.specs;
  return [
    processor && ['Procesador', processor],
    ram && ['Memoria RAM', ram],
    storage && ['Almacenamiento', storage],
    color && ['Color', color],
    screen && ['Pantalla', screen],
    gpu && ['GPU', gpu],
    os && ['Sistema', os],
    language && ['Teclado', language],
  ].filter(Boolean);
}

function ensureDetailModal() {
  const existing = document.getElementById('productDetailModal');
  if (existing) return existing;

  const modal = document.createElement('div');
  modal.className = 'detail-modal';
  modal.id = 'productDetailModal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="detail-modal__backdrop" data-detail-close></div>
    <article class="detail-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="detailModalTitle">
      <button class="detail-modal__close" type="button" data-detail-close aria-label="Cerrar">✕</button>
      <div class="detail-modal__media" id="detailModalMedia"></div>
      <div class="detail-modal__content">
        <div class="detail-modal__meta" id="detailModalMeta"></div>
        <h3 id="detailModalTitle"></h3>
        <div class="detail-modal__specs" id="detailModalSpecs"></div>
        <div class="detail-modal__footer">
          <strong id="detailModalPrice"></strong>
          <div class="detail-modal__actions" id="detailModalActions"></div>
        </div>
      </div>
    </article>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-detail-close]')) {
      closeDetailModal();
    }
  });

  return modal;
}

function openDetailModal(product) {
  const modal = ensureDetailModal();
  const media = modal.querySelector('#detailModalMedia');
  const meta = modal.querySelector('#detailModalMeta');
  const title = modal.querySelector('#detailModalTitle');
  const specs = modal.querySelector('#detailModalSpecs');
  const price = modal.querySelector('#detailModalPrice');
  const actions = modal.querySelector('#detailModalActions');
  const rows = getSpecsRows(product);

  const imageSource = getProductImageSource(product);
  media.innerHTML = imageSource
    ? `<img src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.fullName || product.name)}" />`
    : `<span>${escapeHtml(product.icon || '🛍️')}</span>`;

  meta.innerHTML = `
    <span>ID ${escapeHtml(getProductDisplayId(product))}</span>
    <span>${escapeHtml((product.category || '').toUpperCase())}</span>
    ${product.brand ? `<span>${escapeHtml(product.brand)}</span>` : ''}
    ${product.tag && product.tag.toUpperCase() !== 'WHATSAPP' ? `<span>${escapeHtml(product.tag)}</span>` : ''}
  `;

  title.textContent = product.fullName || product.name;

  specs.innerHTML = rows.length
    ? `<ul>${rows.map(([k, v]) => `<li><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></li>`).join('')}</ul>`
    : '<p>No hay especificaciones detalladas para este equipo.</p>';

  price.textContent = formatPrice(product.price);

  const adminMode = hasAdminControls();
  actions.innerHTML = adminMode
    ? `<button type="button" data-detail-close>Cerrar</button>`
    : `<a href="${buildWhatsAppProductLink(product)}" target="_blank" rel="noopener noreferrer">Quiero comprar por WhatsApp</a>`;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-modal-open');
}

function closeDetailModal() {
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('detail-modal-open');
}

function normalizeNumber(text) {
  const cleaned = String(text || '').replace(/[^0-9,.-]/g, '');
  if (!cleaned) return NaN;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    const normalized = cleaned
      .split(thousandsSep).join('')
      .replace(decimalSep, '.');
    return Number(normalized);
  }

  if (hasComma || hasDot) {
    const sep = hasComma ? ',' : '.';
    const parts = cleaned.split(sep);
    const lastPart = parts[parts.length - 1] || '';

    // If last part has 1-2 digits, assume decimal separator; otherwise treat as thousands separator.
    if (parts.length > 1 && /^[0-9]{1,2}$/.test(lastPart)) {
      return Number(`${parts.slice(0, -1).join('')}.${lastPart}`);
    }

    return Number(parts.join(''));
  }

  return Number(cleaned);
}

function compactTitle(rawName) {
  const cleaned = String(rawName)
    .replace(/^NB\/?TAB\s+/i, '')
    .replace(/^NB\s+/i, '')
    .replace(/^TAB\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = cleaned.split(' ');
  const keep = parts.slice(0, 7);
  const title = keep.join(' ');

  return title.length > 64 ? `${title.slice(0, 61).trim()}...` : title;
}

function detectCategory(rawName) {
  const upper = rawName.toUpperCase();
  if (upper.startsWith('NB')) return 'notebook';
  if (upper.startsWith('TAB')) return 'tablet';
  if (upper.startsWith('CEL') || upper.includes('SMARTPHONE') || upper.includes('PHONE') || upper.startsWith('MOB')) return 'smartphone';
  if (upper.startsWith('AUD') || upper.includes('AUDIO') || upper.includes('SPEAKER') || upper.includes('HEADPHONE')) return 'audio';
  if (upper.includes('TV')) return 'tv';
  if (upper.includes('PC')) return 'pc';
  return 'notebook';
}

function parseMobileSpecs(rawName) {
  const upper = rawName.toUpperCase();
  const specs = {};
  const segments = upper.split('/').map((part) => part.trim()).filter(Boolean);

  const storageMatch = upper.match(/\b(\d{2,4})\s*GB\b/);
  if (storageMatch) {
    specs.storage = `${storageMatch[1]} GB`;
  }

  const ramSource = segments.length > 1 ? segments[1] : upper;
  const ramMatch = ramSource.match(/\b(\d{1,2})\s*GB\b/);
  if (ramMatch) {
    specs.ram = `${ramMatch[1]} GB`;
  }

  const colorSource = segments.length > 1 ? segments[1] : upper;
  const colorMatch = colorSource.match(/\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s-]*?)\s*(?:COLOR|COLOUR)?$/);
  if (colorMatch) {
    const color = colorMatch[1].replace(/\b(\d{1,2}\s*GB|RAM)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    if (color && !/^(GB|RAM)$/i.test(color)) {
      specs.color = color;
    }
  }

  return specs;
}

function detectBrand(rawName) {
  const upper = rawName.toUpperCase();
  const brands = [
    'MSI',
    'DELL',
    'ACER',
    'ASUS',
    'HP',
    'LENOVO',
    'SAMSUNG',
    'XIAOMI',
    'REDMI',
    'MICROSOFT',
    'GIGABYTE',
    'JBL',
    'ALIENWARE',
    'LG',
    'APPLE',
  ];

  const detectedBrand = brands.find((brand) => upper.includes(brand));
  return normalizeBrandKey(detectedBrand || 'OTRAS');
}

function normalizeBrandKey(brandValue) {
  const normalized = String(brandValue || '').trim().toUpperCase();
  if (!normalized) return '';
  if (normalized === 'REDMI') return 'XIAOMI';

  const brandAliases = {
    JBL: ['JBL', 'HARMAN'],
    HP: ['HP', 'HEWLETT PACKARD'],
    LENOVO: ['LENOVO', 'THINKPAD'],
    ASUS: ['ASUS', 'ROG'],
  };

  for (const [canonical, aliases] of Object.entries(brandAliases)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return canonical;
    }
  }

  return normalized;
}

function getProductBrandKey(product) {
  const explicit = normalizeBrandKey(product?.brand);
  if (explicit && explicit !== 'OTRAS') return explicit;

  const inferred = normalizeBrandKey(detectBrand(String(product?.fullName || product?.name || '')));
  if (inferred && inferred !== 'OTRAS') return inferred;

  return explicit || inferred;
}

function parseSpecs(rawName) {
  const upper = rawName.toUpperCase();
  const specs = {};

  // ── Procesador ────────────────────────────────────────────────
  const procPatterns = [
    [/ULTRA\s*(\d+)-([A-Z0-9]+)/, (m) => `Intel Core Ultra ${m[1]} ${m[2]}`],
    [/CORE\s*I([3579])-(\d+[A-Z0-9]*)/, (m) => `Intel Core i${m[1]}-${m[2]}`],
    [/\bI([3579])-(\d+[A-Z0-9]*)/, (m) => `Intel Core i${m[1]}-${m[2]}`],
    [/RYZEN\s*([3579])\s+(\d+[A-Z0-9]*)/, (m) => `AMD Ryzen ${m[1]} ${m[2]}`],
    [/\bR([3579])-(\d+[A-Z0-9]*)/, (m) => `AMD Ryzen ${m[1]} ${m[2]}`],
    [/CELERON\s+([A-Z0-9]+)/, (m) => `Intel Celeron ${m[1]}`],
    [/PENTIUM\s+([A-Z0-9]+)/, (m) => `Intel Pentium ${m[1]}`],
    [/SNAPDRAGON\s*([A-Z0-9+]+)/, (m) => `Qualcomm Snapdragon ${m[1]}`],
  ];
  for (const [re, fn] of procPatterns) {
    const m = upper.match(re);
    if (m) { specs.processor = fn(m); break; }
  }

  // ── Memoria RAM ───────────────────────────────────────────────
  const ramDDR = upper.match(/(\d+)GBD(\d)/);
  if (ramDDR) {
    specs.ram = `${ramDDR[1]} GB DDR${ramDDR[2]}`;
  } else {
    for (const tok of upper.split('/').slice(1)) {
      const t = tok.trim();
      if (/SSD|HDD|NVME|TB/.test(t)) continue;
      const m = t.match(/^(\d+)\s*GB$/);
      if (m) { specs.ram = `${m[1]} GB`; break; }
    }
  }

  // ── Almacenamiento ────────────────────────────────────────────
  const tbSSD = upper.match(/(\d+)\s*TBSSD/) || upper.match(/(\d+)\s*TB\s*SSD/);
  if (tbSSD) {
    specs.storage = `${tbSSD[1]} TB SSD`;
  } else {
    const gbSSD = upper.match(/(\d+)\s*(?:GB)?\s*SSD/);
    if (gbSSD) {
      specs.storage = `${gbSSD[1]} GB SSD`;
    } else {
      const tbRaw = upper.match(/(\d+)\s*TB\b/);
      if (tbRaw) specs.storage = `${tbRaw[1]} TB SSD`;
    }
  }

  // ── Tamaño de pantalla ────────────────────────────────────────
  const sizeM = rawName.match(/(\d{2,3}(?:\.\d+?)?)"/) ;
  if (sizeM) specs.screenSize = `${sizeM[1]}"`;

  // ── Tipo de panel ─────────────────────────────────────────────
  const panels = ['OLED', 'AMOLED', 'QLED', 'IPS', 'VA', 'TN'];
  for (const p of panels) {
    if (upper.includes(p)) { specs.screenType = p; break; }
  }

  // ── Resolución ────────────────────────────────────────────────
  const resolutions = [
    ['WUXGA', 'WUXGA'], ['2.8K', '2.8K'], ['2.5K', '2.5K'],
    ['4K', '4K'], ['QHD', 'QHD'], ['2K', '2K'], ['FHD', 'Full HD'],
  ];
  for (const [key, label] of resolutions) {
    if (upper.includes(key)) { specs.resolution = label; break; }
  }

  // ── Frecuencia de refresco ────────────────────────────────────
  const hzM = upper.match(/(\d{2,3})\s*HZ/);
  if (hzM && Number(hzM[1]) > 30) specs.refreshRate = `${hzM[1]} Hz`;

  // ── Tactil ───────────────────────────────────────────────────
  if (/\bTOUCH\b/.test(upper)) specs.touch = true;

  // ── GPU ──────────────────────────────────────────────────────
  const nvidiaM = upper.match(/\b(RTX|GTX)\s*(\d+)\s*(TI)?\s*(?:(\d+)\s*GB)?/);
  if (nvidiaM) {
    const ti = nvidiaM[3] ? ' Ti' : '';
    const vram = nvidiaM[4] ? ` ${nvidiaM[4]} GB` : '';
    specs.gpu = `NVIDIA ${nvidiaM[1]} ${nvidiaM[2]}${ti}${vram}`;
  } else {
    const amdM = upper.match(/\bRX\s*(\d+[A-Z]*)\s*(?:(\d+)\s*GB)?/);
    if (amdM) {
      const vram = amdM[2] ? ` ${amdM[2]} GB` : '';
      specs.gpu = `AMD Radeon RX ${amdM[1]}${vram}`;
    } else {
      const arcM = upper.match(/\bARC\s+([A-Z0-9]+)/);
      if (arcM) specs.gpu = `Intel Arc ${arcM[1]}`;
    }
  }

  // ── Sistema Operativo ─────────────────────────────────────────
  if (/\bW11\b/.test(upper)) specs.os = 'Windows 11';
  else if (/\bW10\b/.test(upper)) specs.os = 'Windows 10';
  else if (/NOOS|FDOS/.test(upper)) specs.os = 'Sin sistema';
  else if (/MACOS|OSX/.test(upper)) specs.os = 'macOS';

  // ── Idioma del teclado ────────────────────────────────────────
  if (/\/ING\b|\/ING$|\bING$/.test(upper)) specs.language = 'Inglés';
  else if (/\/ESP\b|\/ESP$|\bESP$/.test(upper)) specs.language = 'Español';
  else if (/\/LAT\b|\/LAT$/.test(upper)) specs.language = 'Español Latino';

  // ── Pantalla compuesta ────────────────────────────────────────
  const screenParts = [
    specs.screenSize,
    specs.resolution,
    specs.screenType,
    specs.refreshRate,
    specs.touch ? 'Touch' : null,
  ].filter(Boolean);
  if (screenParts.length) specs.screen = screenParts.join(' ');

  return specs;
}

function extractDisplayName(rawName, category = '') {
  const upper = rawName.toUpperCase();

  if (category === 'smartphone') {
    return rawName
      .replace(/^CEL\s+/i, '')
      .replace(/^MOB\s+/i, '')
      .replace(/\b\d{2,4}\s*GB\b.*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (category === 'audio') {
    return rawName
      .replace(/^AUD\s+/i, '')
      .replace(/^AUDIO\s+/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return rawName
    .split('/')[0]
    .replace(/^(NB\/?TAB|NB|TAB)\s+/i, '')
    .replace(/\bULTRA\s*\d+-[A-Z0-9]+/gi, '')
    .replace(/\bCORE\s*I[3579]-\d+[A-Z0-9]*/gi, '')
    .replace(/\bI[3579]-\d+[A-Z0-9]*/gi, '')
    .replace(/\bR[3579]-\d+[A-Z0-9]*/gi, '')
    .replace(/\bRYZEN\s*[3579]\s+\d+[A-Z0-9]*/gi, '')
    .replace(/\d+\.\d+\s*GHZ/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripLeadingSupplierCode(rawName) {
  return String(rawName || '').replace(/^\s*\d[\d-]*\s+/, '').trim();
}

function extractSupplierPrice(trimmedLine) {
  const line = String(trimmedLine || '').trim();
  if (!line) return null;

  // Accept both formats: "... $975,00" and "... 706.00 |"
  const match = line.match(/(?:\$\s*)?([0-9][0-9.,]*)\s*(?:\|\s*)?$/);
  if (!match) return null;

  const value = normalizeNumber(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  return {
    value,
    rawName: line.slice(0, match.index).trim(),
  };
}

function sanitizePercent(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(500, Math.max(0, numeric));
}

function getBulkPricingConfig() {
  return {
    taxPercent: DEFAULT_BULK_TAX_PERCENT,
    marginPercent: sanitizePercent(bulkMarginInput?.value, DEFAULT_BULK_MARGIN_PERCENT),
  };
}

function parseSupplierLine(line, batchMeta = null, pricingConfig = null) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const extracted = extractSupplierPrice(trimmed);
  if (!extracted) return null;

  const rawPrice = extracted.value;
  const cleanedName = stripLeadingSupplierCode(extracted.rawName);
  if (!cleanedName) return null;

  const category = detectCategory(cleanedName);
  const brand = detectBrand(cleanedName);
  const specs = {
    ...parseSpecs(cleanedName),
    ...(category === 'smartphone' || category === 'audio' ? parseMobileSpecs(cleanedName) : {}),
  };
  const displayName = extractDisplayName(cleanedName, category);
  const taxPercent = sanitizePercent(pricingConfig?.taxPercent, DEFAULT_BULK_TAX_PERCENT);
  const marginPercent = sanitizePercent(pricingConfig?.marginPercent, DEFAULT_BULK_MARGIN_PERCENT);
  const costWithTax = rawPrice * (1 + taxPercent / 100);
  const salePrice = costWithTax * (1 + marginPercent / 100);

  return {
    id: `bulk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: cleanedName,
    fullName: cleanedName,
    displayName,
    specs,
    category,
    brand,
    tag: 'WHATSAPP',
    price: Math.round(salePrice),
    oldPrice: Math.round(costWithTax),
    icon: getProductIcon(category),
    sourceName: cleanedName,
    sourcePrice: rawPrice,
    sourceMarginPercent: marginPercent,
    image: '',
    batchId: batchMeta?.id || `legacy-bulk-${Date.now()}`,
    batchLabel: batchMeta?.label || formatBatchLabel('Carga masiva', batchMeta?.createdAt || new Date().toISOString()),
    batchCreatedAt: batchMeta?.createdAt || new Date().toISOString(),
  };
}

function importSupplierList(text, pricingConfig = null) {
  const batchMeta = createUploadBatchMeta('bulk');
  const parsedProducts = String(text)
    .split(/\r?\n/)
    .map((line) => parseSupplierLine(line, batchMeta, pricingConfig))
    .filter(Boolean);

  if (!parsedProducts.length) {
    alert('No encontré productos válidos. Pegá líneas con nombre y precio, por ejemplo: NB ACER ... $975,00');
    return;
  }

  const customProducts = products.filter((product) => !product.id.startsWith('base-'));
  const nextCustomProducts = [...parsedProducts.reverse(), ...customProducts];
  saveCustomProducts(nextCustomProducts);
  renderProducts();
}

function removeCustomProduct(productId) {
  const customProducts = products.filter((product) => !product.id.startsWith('base-') && product.id !== productId);
  saveCustomProducts(customProducts);
  if (editingProductId === productId) {
    clearProductForm();
  }
  renderProducts();
}

function clearUploadedProducts() {
  const confirmed = window.confirm('¿Querés borrar todo lo que subiste y dejar el catálogo vacío?');
  if (!confirmed) return;

  saveCustomProducts([]);
  cart.length = 0;
  activeFilter = 'all';
  activeBrand = 'all';
  searchTerm = '';
  activeSort = 'default';
  resetVisibleLimit();

  categoryButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === 'all');
  });

  brandButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.brand === 'all');
  });

  clearProductForm();
  bulkForm.reset();
  if (searchInput) searchInput.value = '';
  if (sortSelect) {
    sortSelect.value = 'default';
  }
  bulkInput.value = '';
  renderProducts();
  renderCart();
  renderUploadBatchSelect();
}

function getVisibleProducts() {
  const filteredProducts = products.filter((product) => {
    const matchesFilter = activeFilter === 'all' || product.category === activeFilter;
    const matchesBrand = activeBrand === 'all' || getProductBrandKey(product) === normalizeBrandKey(activeBrand);
    const searchValue = searchTerm.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchValue)
      || String(product.displayName || '').toLowerCase().includes(searchValue)
      || getProductIdentifier(product).toLowerCase().includes(searchValue);
    return matchesFilter && matchesBrand && matchesSearch;
  });

  const sortedProducts = [...filteredProducts];

  switch (activeSort) {
    case 'price-asc':
      sortedProducts.sort((left, right) => left.price - right.price);
      break;
    case 'price-desc':
      sortedProducts.sort((left, right) => right.price - left.price);
      break;
    case 'name-asc':
      sortedProducts.sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }));
      break;
    case 'name-desc':
      sortedProducts.sort((left, right) => right.name.localeCompare(left.name, 'es', { sensitivity: 'base' }));
      break;
    default:
      break;
  }

  return sortedProducts;
}

function getCustomProducts() {
  return products.filter((product) => !product.id.startsWith('base-'));
}

function getUploadBatches() {
  const batches = new Map();

  getCustomProducts().forEach((product) => {
    const batchId = getUploadBatchKey(product) || 'legacy-custom';
    const createdAt = product.batchCreatedAt || '';
    const label = getUploadBatchLabel(product) || 'Subidas anteriores';

    if (!batches.has(batchId)) {
      batches.set(batchId, {
        id: batchId,
        label,
        createdAt,
        count: 0,
      });
    }

    const batch = batches.get(batchId);
    batch.count += 1;
    if (!batch.createdAt || createdAt > batch.createdAt) {
      batch.createdAt = createdAt;
    }
  });

  return [...batches.values()].sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

function renderUploadBatchSelect() {
  if (!uploadBatchSelect) return;

  const batches = getUploadBatches();
  const currentValue = uploadBatchSelect.value;

  uploadBatchSelect.innerHTML = batches.length
    ? batches.map((batch) => `<option value="${escapeHtml(batch.id)}">${escapeHtml(batch.label)} (${batch.count})</option>`).join('')
    : '<option value="">No hay tandas para borrar</option>';

  if (batches.length) {
    const nextValue = batches.some((batch) => batch.id === currentValue) ? currentValue : batches[0].id;
    uploadBatchSelect.value = nextValue;
  }
}

function removeProductsByIds(productIds) {
  const idsToRemove = new Set(productIds);
  const nextCustomProducts = getCustomProducts().filter((product) => !idsToRemove.has(product.id));
  saveCustomProducts(nextCustomProducts);
  renderProducts();
}

function deleteVisibleUploadedProducts() {
  const visibleIds = getVisibleProducts()
    .filter((product) => !product.id.startsWith('base-'))
    .map((product) => product.id);

  if (!visibleIds.length) {
    window.alert('No hay productos subidos visibles para borrar con los filtros actuales.');
    return;
  }

  const confirmed = window.confirm(`¿Querés eliminar ${visibleIds.length} producto(s) filtrado(s) en pantalla?`);
  if (!confirmed) return;

  removeProductsByIds(visibleIds);
}

function deleteSelectedUploadBatch() {
  if (!uploadBatchSelect) return;

  const batchId = uploadBatchSelect.value;
  if (!batchId) {
    window.alert('Seleccioná una tanda para eliminar.');
    return;
  }

  const selectedBatch = getUploadBatches().find((batch) => batch.id === batchId);
  if (!selectedBatch) {
    window.alert('No encontré esa tanda.');
    return;
  }

  const confirmed = window.confirm(`¿Querés eliminar la tanda "${selectedBatch.label}" con ${selectedBatch.count} producto(s)?`);
  if (!confirmed) return;

  const idsToRemove = getCustomProducts()
    .filter((product) => getUploadBatchKey(product) === batchId)
    .map((product) => product.id);

  if (!idsToRemove.length) {
    window.alert('Esa tanda ya no tiene productos.');
    return;
  }

  removeProductsByIds(idsToRemove);
}

function renderSpecsBlock(product) {
  if (!product.specs || !Object.keys(product.specs).length) return '';
  const { processor, ram, storage, screen, gpu, os } = product.specs;
  const rows = [
    processor && ['Procesador', processor],
    ram       && ['Memoria',     ram],
    storage   && ['Almacenamiento', storage],
    screen    && ['Pantalla',    screen],
    gpu       && ['GPU',         gpu],
    os        && ['Sistema',     os],
  ].filter(Boolean);
  if (!rows.length) return '';
  return `<ul class="product-card__specs">${rows.map(([k, v]) => `<li><span>${k}</span>${escapeHtml(v)}</li>`).join('')}</ul>`;
}

function renderProducts() {
  if (!productGrid) return;
  const allVisibleProducts = getVisibleProducts();
  const visibleProducts = shouldUseBatchControls
    ? allVisibleProducts.slice(0, currentVisibleLimit)
    : allVisibleProducts;
  const adminMode = hasAdminControls();

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card reveal">
          <div class="product-card__image">${getProductVisual(product)}</div>
          <div class="product-card__meta">
            ${product.tag && product.tag.toUpperCase() !== 'WHATSAPP' ? `<span title="${escapeHtml(product.tag)}">${escapeHtml(product.tag)}</span>` : ''}
            <span title="${escapeHtml(product.category.toUpperCase())}">${escapeHtml(product.category.toUpperCase())}</span>
            ${product.brand ? `<span title="${escapeHtml(product.brand)}">${escapeHtml(product.brand)}</span>` : ''}
          </div>
          <h3 title="${escapeHtml(product.fullName || product.name)}">${escapeHtml(product.displayName || product.fullName || product.name)}</h3>
          ${renderSpecsBlock(product)}
          <div class="product-card__price">
            <strong>${formatPrice(product.price)}</strong>
          </div>
          <div class="product-card__actions">
            ${adminMode
              ? `<button class="product-card__edit" data-edit="${product.id}">Editar</button>
                 <button data-detail="${product.id}">Ver</button>
                 ${!product.id.startsWith('base-') ? `<button class="product-card__delete" data-remove="${product.id}">Eliminar</button>` : ''}`
              : `<button data-add="${product.id}">Agregar</button>
                 <button data-detail="${product.id}">Ver</button>
                 <a class="product-card__buy" href="${buildWhatsAppProductLink(product)}" target="_blank" rel="noopener noreferrer">Quiero comprar</a>`}
          </div>
        </article>
      `,
    )
    .join('');

  if (!visibleProducts.length) {
    const emptyMessage = products.length
      ? 'Probá con otra categoría, marca o término de búsqueda.'
      : 'Todavía no cargaste productos. Pegá tu listado o usá el formulario para empezar.';

    productGrid.innerHTML = `
      <article class="product-card" style="grid-column: 1 / -1; text-align: center;">
        <h3>No hay productos para mostrar.</h3>
        <p style="color: var(--muted);">${emptyMessage}</p>
      </article>
    `;
  }

  [...document.querySelectorAll('[data-add]')].forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.add));
  });

  if (shouldUseBatchControls) {
    updateBatchControls(allVisibleProducts.length, visibleProducts.length);
  }
  renderUploadBatchSelect();
}

function renderCart() {
  if (!cartItems) return;
  cartItems.innerHTML = cart.length
    ? cart
        .map(
          (item) => `
            <div class="cart-drawer__item">
              <div class="cart-drawer__thumb">${item.icon}</div>
              <div>
                <h4>${item.name}</h4>
                <p>${formatPrice(item.price)} x ${item.quantity}</p>
                <div class="cart-drawer__controls">
                  <button type="button" class="cart-drawer__control" data-cart-action="decrease" data-cart-id="${item.id}">−</button>
                  <span class="cart-drawer__quantity">${item.quantity}</span>
                  <button type="button" class="cart-drawer__control" data-cart-action="increase" data-cart-id="${item.id}">+</button>
                  <button type="button" class="cart-drawer__remove" data-cart-action="remove" data-cart-id="${item.id}">Quitar</button>
                </div>
              </div>
              <strong>${formatPrice(item.price * item.quantity)}</strong>
            </div>
          `,
        )
        .join('')
    : '<p style="color: var(--muted);">Tu carrito está vacío. Agregá productos desde la vitrina.</p>';

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  cartCount.textContent = String(count);
  cartTotal.textContent = formatPrice(total);

  if (checkoutCart) {
    checkoutCart.disabled = count === 0;
    checkoutCart.setAttribute('aria-disabled', String(count === 0));
  }

}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  renderCart();
  openDrawer();
}

function removeFromCart(productId) {
  const index = cart.findIndex((item) => item.id === productId);
  if (index === -1) return;

  cart.splice(index, 1);
  renderCart();
}

function changeCartQuantity(productId, delta) {
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  renderCart();
}

function hasAdminControls() {
  return Boolean(productForm && resetProducts && bulkForm && bulkInput && fillSampleBulk && clearUploads);
}

function openDrawer() {
  if (!cartDrawer || !overlay) return;
  cartDrawer.classList.add('is-open');
  overlay.classList.add('is-visible');
  cartDrawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  if (!cartDrawer || !overlay) return;
  cartDrawer.classList.remove('is-open');
  overlay.classList.remove('is-visible');
  cartDrawer.setAttribute('aria-hidden', 'true');
}

function checkoutViaWhatsApp() {
  if (!cart.length) {
    window.alert('Tu carrito está vacío. Agregá productos antes de ir a WhatsApp.');
    return;
  }

  const whatsappUrl = buildWhatsAppCartLink();
  const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.href = whatsappUrl;
  }
}

function setActiveFilter(filter) {
  activeFilter = filter;
  resetVisibleLimit();
  categoryButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === filter);
  });
  renderProducts();
}

function setActiveBrand(brand) {
  activeBrand = brand;
  resetVisibleLimit();
  brandButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.brand === brand);
  });
  renderProducts();
}

function syncCatalogControls() {
  categoryButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === activeFilter);
  });

  brandButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.brand === activeBrand);
  });

  if (sortSelect) {
    sortSelect.value = activeSort;
  }
}

decorateBrandButtons();
decorateCategoryButtons();
syncCatalogControls();

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveFilter(button.dataset.filter));
});

brandButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveBrand(button.dataset.brand));
});

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    searchTerm = event.target.value;
    resetVisibleLimit();
    renderProducts();
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', (event) => {
    activeSort = event.target.value;
    resetVisibleLimit();
    renderProducts();
  });
}

if (batchSizeSelect) {
  selectedBatchSize = Number(batchSizeSelect.value) || 60;
  currentVisibleLimit = selectedBatchSize;

  batchSizeSelect.addEventListener('change', (event) => {
    selectedBatchSize = Number(event.target.value) || 60;
    resetVisibleLimit();
    renderProducts();
  });
}

if (loadMoreProducts) {
  loadMoreProducts.addEventListener('click', () => {
    currentVisibleLimit += selectedBatchSize;
    renderProducts();
  });
}

if (openCart) {
  openCart.addEventListener('click', openDrawer);
}

if (closeCart) {
  closeCart.addEventListener('click', closeDrawer);
}

if (overlay) {
  overlay.addEventListener('click', closeDrawer);
}

if (deleteVisibleUploads) {
  deleteVisibleUploads.addEventListener('click', deleteVisibleUploadedProducts);
}

if (deleteSelectedBatch) {
  deleteSelectedBatch.addEventListener('click', deleteSelectedUploadBatch);
}

if (refreshBatchList) {
  refreshBatchList.addEventListener('click', renderUploadBatchSelect);
}

if (checkoutCart) {
  checkoutCart.addEventListener('click', checkoutViaWhatsApp);
}

if (continueShopping) {
  continueShopping.addEventListener('click', closeDrawer);
}

if (pdfExportButton) {
  pdfExportButton.addEventListener('click', exportVisibleProductsToPdf);
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
  });
}

if (businessContactForm) {
  businessContactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(businessContactForm);
    const name = String(formData.get('name') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const company = String(formData.get('company') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const fullName = [name, lastName].filter(Boolean).join(' ');
    const whatsappText = [
      'Hola, quiero una propuesta tecnológica para mi empresa.',
      `Nombre: ${fullName || name}`,
      `Empresa: ${company || 'No especificada'}`,
      `Teléfono: ${phone}`,
      `Correo: ${email}`,
      `Mensaje: ${message || 'Sin mensaje adicional'}`,
    ].join('\n');

    const waPhone = String(WHATSAPP_SALES_NUMBER).replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappText)}`;

    const emailSubject = 'Consulta empresarial NovaTech';
    const emailBody = whatsappText;
    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    void submitLeadToRemote({
      name,
      lastName,
      company,
      phone,
      email,
      message,
    });

    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = mailtoUrl;
    }

    businessContactForm.reset();
  });
}

document.addEventListener('click', (event) => {
  const cartControl = event.target.closest('[data-cart-action]');
  if (cartControl) {
    const productId = cartControl.dataset.cartId;
    const action = cartControl.dataset.cartAction;

    if (action === 'increase') {
      changeCartQuantity(productId, 1);
      return;
    }

    if (action === 'decrease') {
      changeCartQuantity(productId, -1);
      return;
    }

    if (action === 'remove') {
      removeFromCart(productId);
    }

    return;
  }

  const detailButton = event.target.closest('[data-detail]');
  if (!detailButton) return;

  const productId = detailButton.dataset.detail;
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  openDetailModal(product);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDetailModal();
  }
});

if (hasAdminControls()) {
  setProductFormMode(false);

  document.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit]');
    if (editButton) {
      startProductEdit(editButton.dataset.edit);
      return;
    }

    const removeButton = event.target.closest('[data-remove]');
    if (!removeButton) return;

    const productId = removeButton.dataset.remove;
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const confirmed = window.confirm(`¿Querés eliminar este producto?\n\n${product.fullName || product.name}`);
    if (!confirmed) return;

    removeCustomProduct(productId);
  });

  bulkForm.addEventListener('submit', (event) => {
    event.preventDefault();
    importSupplierList(bulkInput.value, getBulkPricingConfig());
  });

  clearUploads.addEventListener('click', clearUploadedProducts);

  fillSampleBulk.addEventListener('click', () => {
    bulkInput.value = `NB ACER ASPIRE 14 A14-52MT-94H5 ULTRA 9-288V/32GBD5/1TBSSD/14"/IPS/TOUCH/W11/ING/BK\t $975,00\nNB ASUS VIVOBOOK GO E1504FA-AS52 R5-7520U 4.3GHZ/8GBD5/512SSD/15.6"/FHD/W11/ING/BLACK\t $434,00\nNB DELL XPS 14 DA14250 ULTRA X7 358H 4.8/32GBD5/1TB/14"/2.8K/TOUCH/OLED/W11/ING\t $2.630,00`;
  });

  if (cancelEditProduct) {
    cancelEditProduct.addEventListener('click', () => {
      clearProductForm();
    });
  }

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(productForm);
    const file = formData.get('image');
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || 'pc');
    const manualSpecs = collectSpecsFromForm(formData);
    const parsedSpecs = parseSpecs(name);
    const mergedSpecs = compactSpecs({ ...parsedSpecs, ...manualSpecs });
    const brand = String(formData.get('brand') || '').trim() || detectBrand(name);
    const imageUrl = String(formData.get('imageUrl') || '').trim();

    let image = '';
    if (file && file instanceof File && file.size > 0) {
      image = await readFileAsDataUrl(file);
    }
    if (!image && imageUrl) {
      image = imageUrl;
    }

    const customProducts = products.filter((product) => !product.id.startsWith('base-'));
    const existingProduct = editingProductId
      ? customProducts.find((product) => product.id === editingProductId)
      : null;

    const nextProduct = {
      ...existingProduct,
      id: editingProductId || `custom-${Date.now()}`,
      name,
      fullName: name,
      displayName: extractDisplayName(name) || name,
      category,
      brand,
      tag: String(formData.get('tag') || 'NEW').trim() || 'NEW',
      price: Number(formData.get('price') || 0),
      image: image || existingProduct?.image || '',
      specs: Object.keys(mergedSpecs).length ? mergedSpecs : (existingProduct?.specs || {}),
      icon: getProductIcon(category),
    };

    if (!existingProduct) {
      const batchMeta = createUploadBatchMeta('single');
      nextProduct.batchId = batchMeta.id;
      nextProduct.batchLabel = batchMeta.label;
      nextProduct.batchCreatedAt = batchMeta.createdAt;
    }

    if (editingProductId) {
      const nextCustomProducts = customProducts.map((product) => (product.id === editingProductId ? nextProduct : product));
      saveCustomProducts(nextCustomProducts);
    } else {
      customProducts.unshift(nextProduct);
      saveCustomProducts(customProducts);
    }
    clearProductForm();
    renderProducts();
  });

  resetProducts.addEventListener('click', () => {
    const confirmed = window.confirm('¿Querés borrar los productos cargados y dejar el catálogo vacío?');
    if (!confirmed) return;

    saveCustomProducts([]);
    clearProductForm();
    renderProducts();
  });
}

renderProducts();
renderCart();
void hydrateProductsFromRemote();
