
// REPLACE existing getCloudinaryImage function
function getCloudinaryImage(url, fallbackEmoji) {
  if (url && typeof url === 'string' && url.trim() !== '') {
    return `<img
      src="${url}"
      alt="Menu"
      style="width:100%;height:100%;object-fit:cover;"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
    >
    <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:#f5f5f5;font-size:64px;">
      ${fallbackEmoji || '🍽️'}
    </div>`;
  }
  return `<div style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;background:#f5f5f5;font-size:64px;">
    ${fallbackEmoji || '🍽️'}
  </div>`;
}

// Format currency
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
};

// Global State
let cart = {};
let productsData = [];

// Wait for Firebase to initialize
let isFirebaseReady = false;
const checkFirebase = setInterval(() => {
  if (window.db) {
    clearInterval(checkFirebase);
    isFirebaseReady = true;
    initLandingPage();
  }
}, 500);

function initLandingPage() {
  // Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  const backdrop = document.getElementById('mobile-nav-backdrop');

  // Inject close button into nav panel
  if (navLinks && !navLinks.querySelector('.nav-close-btn')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'nav-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.setAttribute('aria-label', 'Tutup menu');
    navLinks.prepend(closeBtn);
    closeBtn.addEventListener('click', closeMobileMenu);
  }

  function openMobileMenu() {
    navLinks.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    navLinks.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileMenu);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeMobileMenu);
  }

  // Auto-close on nav link click
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });
  }

  // Listen to Settings from Syncro OS via Firestore
  window.fbOnSnapshot(window.fbDoc(window.db, 'settings', 'store'), (doc) => {
    if (doc.exists()) {
      const settings = doc.data();

      // Update Title & Brand Name
      document.title = `${settings.bizName} - ${settings.tagline}`;
      const navLogo = document.querySelector('.nav-logo');
      if (navLogo) {
        navLogo.innerHTML = `<img src="https://ui-avatars.com/api/?name=${settings.bizName.substring(0, 2).toUpperCase()}&background=0F6A4A&color=fff&rounded=true" alt="Logo">\n      ${settings.bizName}`;
      }

      const footerBrandName = document.querySelector('.footer-brand h3');
      if (footerBrandName) footerBrandName.textContent = settings.bizName;

      // Update Hero
      const heroBadge = document.querySelector('.hero-content .badge');
      if (heroBadge) heroBadge.textContent = settings.tagline;

      const heroDesc = document.querySelector('.hero-content p');
      if (heroDesc) heroDesc.textContent = settings.bizDesc;

      // Update Hero Image
      const heroImg = document.querySelector('.hero-image img');
      if (heroImg) {
        if (settings.heroImage && settings.heroImage.trim() !== '') {
          heroImg.src = settings.heroImage;
        } else {
          heroImg.src = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        }
      }

      // Update Why Us Image
      const whyImg = document.querySelector('.why-image img');
      if (whyImg) {
        if (settings.whyImage && settings.whyImage.trim() !== '') {
          whyImg.src = settings.whyImage;
        } else {
          whyImg.src = 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        }
      }

      // Update Footer Contacts
      const waLink = document.querySelector('.footer-links .fa-phone');
      if (waLink && waLink.parentNode) {
        waLink.parentNode.innerHTML = `<i class="fas fa-phone" style="color:var(--gold);margin-right:8px"></i> +${settings.waNumber}`;
      }

      const addrLink = document.querySelector('.footer-links .fa-map-marker-alt');
      if (addrLink && addrLink.parentNode) {
        addrLink.parentNode.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--gold);margin-right:8px"></i> ${settings.address}`;
      }

      const footerDesc = document.querySelector('.footer-brand p');
      if (footerDesc) footerDesc.textContent = `${settings.tagline}. ${settings.bizDesc}`;

      // Update Global WhatsApp for Checkout
      window.storeWaNumber = settings.waNumber;
    }
  });

  // Listen to Products in Realtime from Syncro OS via Firestore
  window.fbOnSnapshot(window.fbCollection(window.db, 'products'), (snapshot) => {
    const container = document.getElementById('menu-container');
    if (!container) return;

    container.innerHTML = ''; // Clear loading

    productsData = [];
    snapshot.forEach(doc => {
      productsData.push(doc.data());
    });

    // Filter only available foods
    const availableProducts = productsData; // Tampilkan semua produk

    if (availableProducts.length === 0) {
      container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color: var(--text-muted);">Belum ada menu saat ini.</p>';
      return;
    }

    availableProducts.forEach(product => {
      const mediaHtml = getCloudinaryImage(product.imageUrl, product.emoji);

      // Check Stock from Syncro OS Recipes/Ingredients if provided, or assume available if not explicitly tracked
      // Syncro OS uses `recipe` and `ingredients.stock` to calculate real stock, 
      // but without real-time backend calculations, we will rely on Syncro OS setting `available: false` when out of stock.
      // However, if the product explicitly has a stock property, we check it.
      let outOfStock = false;
      if (product.available === false) {
        outOfStock = true;
      }
      if (product.stock !== undefined && product.stock <= 0) {
        outOfStock = true;
      }

      const card = document.createElement('div');
      card.className = 'menu-card';
      card.innerHTML = `
        <div class="menu-img" style="height:200px;overflow:hidden;${outOfStock ? 'filter:grayscale(100%);opacity:0.6;' : ''}">
          ${mediaHtml}
        </div>
        <div class="menu-info">
          <h3 class="menu-name">${product.name}</h3>
          <p class="menu-desc">${product.desc || 'Sajian lezat dengan cita rasa otentik.'}</p>
          <div class="menu-footer">
            <div class="menu-price">${formatRupiah(product.price || 0)}</div>
            <div class="qty-control-wrapper" data-id="${product.id}" data-outofstock="${outOfStock}"></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    updateCartUI(); // Initial render for dynamic buttons
  });

  // Cart Logic
  const cartBubble = document.getElementById('cart-bubble');
  const cartCount = document.getElementById('cart-count');

  function addToCart(product) {
    if (!cart[product.id]) {
      cart[product.id] = { ...product, qty: 1 };
    } else {
      cart[product.id].qty++;
    }
    updateCartUI();
  }

  function removeFromCart(id) {
    if (cart[id]) {
      cart[id].qty--;
      if (cart[id].qty <= 0) {
        delete cart[id];
      }
      updateCartUI();
    }
  }

  window.handleQtyAction = function (action, id) {
    if (action === 'add') {
      const prod = productsData.find(p => p.id === id);
      if (prod) addToCart(prod);
    } else if (action === 'minus') {
      removeFromCart(id);
    }
  };

  function updateCartUI() {
    const totalItems = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    if (totalItems > 0) {
      cartBubble.style.display = 'flex';
      cartCount.textContent = totalItems;
    } else {
      cartBubble.style.display = 'none';
    }

    // Update individual product card controls
    document.querySelectorAll('.qty-control-wrapper').forEach(wrapper => {
      const id = wrapper.getAttribute('data-id');
      const cartItem = cart[id];
      const outOfStock = wrapper.getAttribute('data-outofstock') === 'true';

      if (outOfStock) {
        wrapper.innerHTML = `<span style="color:var(--danger);font-weight:600;font-size:13px;padding:4px 8px;background:var(--danger-light);border-radius:4px">Habis</span>`;
      } else if (cartItem && cartItem.qty > 0) {
        wrapper.innerHTML = `
              <div class="qty-wrapper">
                 <button class="btn-qty-minus" onclick="handleQtyAction('minus', '${id}')"><i class="fas fa-minus" style="font-size:12px;"></i></button>
                 <span class="qty-text">${cartItem.qty}</span>
                 <button class="btn-qty-plus" onclick="handleQtyAction('add', '${id}')"><i class="fas fa-plus" style="font-size:12px;"></i></button>
              </div>
           `;
      } else {
        wrapper.innerHTML = `<button class="btn-add" onclick="handleQtyAction('add', '${id}')" title="Tambah ke Keranjang"><i class="fas fa-plus"></i></button>`;
      }
    });
  }

  // Global state for checkout
  let checkoutLat = null;
  let checkoutLng = null;
  let checkoutMapsUrl = "";

  // Open Modal
  cartBubble.addEventListener('click', () => {
    if (Object.keys(cart).length === 0) return;
    document.getElementById('checkout-modal').style.display = 'flex';
    document.getElementById('checkout-step-1').style.display = 'block';
    document.getElementById('checkout-step-2').style.display = 'none';
    document.getElementById('modal-title').textContent = 'Data Pengiriman';
  });

  window.closeCheckoutModal = function () {
    document.getElementById('checkout-modal').style.display = 'none';
  };

  window.getLocation = function () {
    const btn = document.getElementById('btn-location');
    const status = document.getElementById('location-status');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendapatkan Lokasi...';
    btn.disabled = true;

    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung fitur lokasi.");
      btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 📍 Pilih Lokasi Saya';
      btn.disabled = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        checkoutLat = position.coords.latitude;
        checkoutLng = position.coords.longitude;
        checkoutMapsUrl = `https://maps.google.com/?q=${checkoutLat},${checkoutLng}`;

        btn.style.display = 'none';
        status.style.display = 'block';
      },
      (error) => {
        console.error(error);
        alert("Gagal mendapatkan lokasi. Pastikan Anda memberikan izin akses lokasi.");
        btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 📍 Pilih Lokasi Saya';
        btn.disabled = false;
      }
    );
  };

  window.proceedToPayment = function () {
    const name = document.getElementById('cust-name').value.trim();
    const wa = document.getElementById('cust-wa').value.trim();
    const address = document.getElementById('cust-address').value.trim();

    if (!name || !wa || !address) {
      alert("Mohon lengkapi Nama Lengkap, Nomor WhatsApp, dan Alamat Lengkap.");
      return;
    }

    // Render Summary
    let total = 0;
    const summaryContainer = document.getElementById('order-summary');
    summaryContainer.innerHTML = '';

    Object.values(cart).forEach(item => {
      const subtotal = item.qty * item.price;
      total += subtotal;
      summaryContainer.innerHTML += `
        <div class="order-summary-item">
          <span>${item.qty}x ${item.name}</span>
          <span>${formatRupiah(subtotal)}</span>
        </div>
      `;
    });

    document.getElementById('order-total-price').textContent = formatRupiah(total);

    document.getElementById('checkout-step-1').style.display = 'none';
    document.getElementById('checkout-step-2').style.display = 'block';
    document.getElementById('modal-title').textContent = 'Pembayaran QRIS';
  };

  window.backToForm = function () {
    document.getElementById('checkout-step-2').style.display = 'none';
    document.getElementById('checkout-step-1').style.display = 'block';
    document.getElementById('modal-title').textContent = 'Data Pengiriman';
  };

  window.confirmPayment = async function () {
    const name = document.getElementById('cust-name').value.trim();
    const wa = document.getElementById('cust-wa').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const notes = document.getElementById('cust-notes').value.trim();

    let total = 0;
    const itemsForDB = [];
    let listItemsText = '';

    Object.values(cart).forEach(item => {
      const subtotal = item.qty * item.price;
      total += subtotal;
      itemsForDB.push({ productId: item.id, qty: item.qty, price: item.price });
      listItemsText += `- ${item.name} x${item.qty}\n`;
    });

    // Pre-open window to bypass popup blocker
    const waWindow = window.open('about:blank', '_blank');

    try {
      const orderId = 'o' + Date.now();
      const newOrder = {
        id: orderId,
        customerName: name,
        phone: wa,
        wa: wa, // Backup for Syncro OS Dashboard
        address: address,
        notes: notes,
        latitude: checkoutLat || null,
        longitude: checkoutLng || null,
        mapsUrl: checkoutMapsUrl || "",
        googleMapsUrl: checkoutMapsUrl || "",
        shareLocation: checkoutMapsUrl || "",
        items: itemsForDB,
        total: total,
        paymentStatus: 'menunggu',
        status: 'pending', // Added for Syncro OS backwards compatibility
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(), // Backup for Syncro OS Dashboard
        source: 'landing-page',
        orderSource: 'landing-page'
      };

      await window.fbSetDoc(window.fbDoc(window.db, 'orders', orderId), newOrder);

      // Deduplicate Customer
      const waDigits = wa.replace(/\D/g, '');
      const qPhone = window.fbQuery(window.fbCollection(window.db, 'customers'), window.fbWhere('phone', '==', wa));
      const qWa = window.fbQuery(window.fbCollection(window.db, 'customers'), window.fbWhere('wa', '==', wa));
      const qWaDigits = window.fbQuery(window.fbCollection(window.db, 'customers'), window.fbWhere('wa', '==', waDigits));

      let custId = 'c_' + waDigits;
      const results1 = await window.fbGetDocs(qPhone);
      const results2 = await window.fbGetDocs(qWa);
      const results3 = await window.fbGetDocs(qWaDigits);

      if (!results1.empty) {
        custId = results1.docs[0].id;
      } else if (!results2.empty) {
        custId = results2.docs[0].id;
      } else if (!results3.empty) {
        custId = results3.docs[0].id;
      }

      await window.fbSetDoc(window.fbDoc(window.db, 'customers', custId), {
        id: custId,
        name: name,
        wa: wa,
        phone: wa,
        address: address,
        googleMapsUrl: checkoutMapsUrl || "",
        latitude: checkoutLat || null,
        longitude: checkoutLng || null
      }, { merge: true });

      cart = {};
      updateCartUI();
      window.closeCheckoutModal();

      const text = `Halo Sri Soengkem,

Saya ingin memesan:

${listItemsText}
Total: ${formatRupiah(total)}

Nama: ${name}
Nomor HP: ${wa}
Alamat: ${address}
Share Location: ${checkoutMapsUrl || '-'}

Terima kasih.`;

      const adminWa = window.storeWaNumber || '6281234567890';

      // Update location of the pre-opened tab
      waWindow.location.href = `https://wa.me/${adminWa}?text=${encodeURIComponent(text)}`;

      // Reset Form fields
      document.getElementById('cust-name').value = '';
      document.getElementById('cust-wa').value = '';
      document.getElementById('cust-address').value = '';
      document.getElementById('cust-notes').value = '';
      document.getElementById('btn-location').style.display = 'flex';
      document.getElementById('location-status').style.display = 'none';
      document.getElementById('btn-location').disabled = false;
      document.getElementById('btn-location').innerHTML = '<i class="fas fa-map-marker-alt"></i> 📍 Pilih Lokasi Saya';
      checkoutLat = null;
      checkoutLng = null;
      checkoutMapsUrl = "";

    } catch (err) {
      waWindow.close();
      console.error("Gagal mengirim pesanan:", err);
      alert("Terjadi kesalahan saat memproses pesanan Anda. Silakan coba lagi.");
    }
  };
}


function syncLogo() {
  // Priority: 1. Firebase Config, 2. App Config, 3. Local Cache, 4. Default
  const defaultLogo = 'https://ui-avatars.com/api/?name=SS&background=0F6A4A&color=fff&rounded=true';

  let logoUrl = defaultLogo;

  // Check local cache first (sync)
  try {
    const cached = localStorage.getItem('syncro_settings');
    if (cached) {
      const s = JSON.parse(cached);
      // Prioritaskan landingLogoUrl, lalu fallback ke logoUrl utama
      if (s.landingLogoUrl && s.landingLogoUrl.trim() !== '') {
        logoUrl = s.landingLogoUrl;
      } else if (s.logoUrl && s.logoUrl.trim() !== '') {
        logoUrl = s.logoUrl;
      } else if (s.bizName) {
        logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.bizName.substring(0, 2).toUpperCase())}&background=0F6A4A&color=fff&rounded=true`;
      }
    }
  } catch (e) { }

  // Apply to all logo elements
  function applyLogo(url) {
    document.querySelectorAll('.nav-logo img, .logo img, #brand-logo').forEach(img => {
      img.src = url;
      img.onerror = function () {
        this.src = defaultLogo;
        this.onerror = null;
      };
    });
  }

  applyLogo(logoUrl);

  // Async: override with Firebase if available
  if (window.db && window.fbDoc && window.fbOnSnapshot) {
    try {
      window.fbOnSnapshot(window.fbDoc(window.db, 'settings', 'store'), (doc) => {
        if (doc.exists()) {
          const settings = doc.data();
          // Cache for next load
          localStorage.setItem('syncro_settings', JSON.stringify(settings));

          let firebaseLogo = defaultLogo;
          if (settings.landingLogoUrl && settings.landingLogoUrl.trim() !== '') {
            firebaseLogo = settings.landingLogoUrl;
          } else if (settings.logoUrl && settings.logoUrl.trim() !== '') {
            firebaseLogo = settings.logoUrl;
          } else if (settings.bizName) {
            firebaseLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(settings.bizName.substring(0, 2).toUpperCase())}&background=0F6A4A&color=fff&rounded=true`;
          }

          applyLogo(firebaseLogo);
        }
      });
    } catch (e) {
      console.warn('[Syncro] Logo sync from Firebase failed, using cached logo.');
    }
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncLogo);
} else {
  syncLogo();
}
