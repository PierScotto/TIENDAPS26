const baseProducts = [];

const STORAGE_KEY = 'novatech-custom-products';
const API_BASE_URL = String(window.NOVATECH_API_BASE_URL || '').replace(/\/$/, '');
const PRODUCTS_API_PATH = '/api/products';
const LEADS_API_PATH = '/api/leads';
const WHATSAPP_SALES_NUMBER = '+595983159658';

const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const categoryButtons = [...document.querySelectorAll('[data-filter]')];
const brandButtons = [...document.querySelectorAll('[data-brand]')];
const cartDrawer = document.getElementById('cartDrawer');
const overlay = document.getElementById('overlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const openCart = document.getElementById('openCart');
const closeCart = document.getElementById('closeCart');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const productForm = document.getElementById('productForm');
const resetProducts = document.getElementById('resetProducts');
const bulkForm = document.getElementById('bulkForm');
const bulkInput = document.getElementById('bulkInput');
const fillSampleBulk = document.getElementById('fillSampleBulk');
const clearUploads = document.getElementById('clearUploads');
const productFormMode = document.getElementById('productFormMode');
const cancelEditProduct = document.getElementById('cancelEditProduct');
const submitProductButton = document.querySelector('[data-submit-product]');
const businessContactForm = document.getElementById('businessContactForm');

const CONTACT_EMAIL = 'pierscotto3@gmail.com';

const cart = [];
let activeFilter = 'all';
let activeBrand = 'all';
let searchTerm = '';
let activeSort = 'default';
let editingProductId = '';
let products = loadProducts();

function formatPrice(value) {
  return `U$ ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function buildWhatsAppProductLink(product) {
  const cleanPhone = String(WHATSAPP_SALES_NUMBER).replace(/\D/g, '');
  const name = product.displayName || product.fullName || product.name;
  const message = `Hola! Me interesa este equipo: ${name}. Precio publicado: ${formatPrice(product.price)}. ¿Está disponible?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

const BRAND_LOGO_FILES = {
  MSI: 'MSI.png',
  DELL: 'DELL.jpg',
  ACER: 'ACER.png',
  ASUS: 'ASUS.png',
  HP: 'HP.png',
  LENOVO: 'LENOVO.jpg',
  SAMSUNG: 'SAMSUNG.png',
  MICROSOFT: 'MICROSOFT.png',
  GIGABYTE: 'GIGABYTE.png',
};

function getBrandLogoPath(brand) {
  const fileName = BRAND_LOGO_FILES[brand];
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
  if (product.image) {
    return `<img class="product-card__img" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />`;
  }

  return `<span>${escapeHtml(product.icon || '🛍️')}</span>`;
}

function getSpecsRows(product) {
  if (!product.specs) return [];

  const { processor, ram, storage, screen, gpu, os, language } = product.specs;
  return [
    processor && ['Procesador', processor],
    ram && ['Memoria RAM', ram],
    storage && ['Almacenamiento', storage],
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

  media.innerHTML = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.fullName || product.name)}" />`
    : `<span>${escapeHtml(product.icon || '🛍️')}</span>`;

  meta.innerHTML = `
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
  return Number(String(text).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.'));
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
  if (upper.includes('SMARTPHONE') || upper.includes('PHONE')) return 'smartphone';
  if (upper.includes('TV')) return 'tv';
  if (upper.includes('PC')) return 'pc';
  return 'notebook';
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
    'MICROSOFT',
    'GIGABYTE',
    'ALIENWARE',
    'LG',
    'APPLE',
  ];

  return brands.find((brand) => upper.includes(brand)) || 'OTRAS';
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

function extractDisplayName(rawName) {
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

function parseSupplierLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const priceMatch = trimmed.match(/\$\s*([0-9.,]+)/);
  if (!priceMatch) return null;

  const rawPrice = normalizeNumber(priceMatch[1]);
  if (!rawPrice || Number.isNaN(rawPrice)) return null;

  const rawName = trimmed.slice(0, priceMatch.index).trim();
  const category = detectCategory(rawName);
  const brand = detectBrand(rawName);
  const specs = parseSpecs(rawName);
  const displayName = extractDisplayName(rawName);
  const costWithTax = rawPrice * 1.10;
  const salePrice = costWithTax * 1.17;

  return {
    id: `bulk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: rawName,
    fullName: rawName,
    displayName,
    specs,
    category,
    brand,
    tag: 'WHATSAPP',
    price: Math.round(salePrice),
    oldPrice: Math.round(costWithTax),
    icon: getProductIcon(category),
    sourceName: rawName,
    sourcePrice: rawPrice,
    image: '',
  };
}

function importSupplierList(text) {
  const parsedProducts = String(text)
    .split(/\r?\n/)
    .map(parseSupplierLine)
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
}

function getVisibleProducts() {
  const filteredProducts = products.filter((product) => {
    const matchesFilter = activeFilter === 'all' || product.category === activeFilter;
    const matchesBrand = activeBrand === 'all' || product.brand === activeBrand;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
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
  const visibleProducts = getVisibleProducts();
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

function setActiveFilter(filter) {
  activeFilter = filter;
  categoryButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === filter);
  });
  renderProducts();
}

function setActiveBrand(brand) {
  activeBrand = brand;
  brandButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.brand === brand);
  });
  renderProducts();
}

decorateBrandButtons();

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveFilter(button.dataset.filter));
});

brandButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveBrand(button.dataset.brand));
});

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    searchTerm = event.target.value;
    renderProducts();
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', (event) => {
    activeSort = event.target.value;
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
    importSupplierList(bulkInput.value);
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
