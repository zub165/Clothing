import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { api } from './api';

const ShopContext = createContext(null);

function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop outside provider');
  return ctx;
}

const SHIPPING_FREE_MIN = 75;
const SHIPPING_COST = 8.99;

function calcTotals(subtotal, couponCode) {
  const discount = couponCode?.toUpperCase() === 'WELCOME10' ? subtotal * 0.1 : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= SHIPPING_FREE_MIN ? 0 : SHIPPING_COST;
  return { discount, shipping, total: afterDiscount + shipping };
}

function sortProducts(list, sort) {
  const items = [...list];
  if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconHeart({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ProductCard({ product, onQuickAdd }) {
  const hasSale = product.compareAt && product.compareAt > product.price;
  return (
    <Link to={`/product/${product.id}`} className="card">
      <div className="card-media">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        <div className="card-badges">
          {product.featured && <span className="badge badge-featured">Featured</span>}
          {hasSale && <span className="badge badge-sale">Value</span>}
          {product.stock > 0 && product.stock <= 5 && <span className="badge badge-low">Low stock</span>}
        </div>
        {onQuickAdd && (
          <div className="card-quick">
            <button
              type="button"
              className="btn btn-sm"
              onClick={(e) => {
                e.preventDefault();
                onQuickAdd(product);
              }}
            >
              Quick add
            </button>
          </div>
        )}
      </div>
      <div className="card-body">
        <p className="muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {product.category}
        </p>
        <h3>{product.name}</h3>
        <div className="card-meta">
          <span>
            <span className="price">${product.price.toFixed(2)}</span>
            {hasSale && <span className="price-compare">${product.compareAt.toFixed(2)}</span>}
          </span>
          <span className="muted">{product.stock} left</span>
        </div>
      </div>
    </Link>
  );
}

function Nav() {
  const { cartCount, search, setSearch } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const token = localStorage.getItem('clothify_token');

  const linkClass = (path) => `nav-link${location.pathname === path ? ' active' : ''}`;

  return (
    <header className="nav-wrap">
      <div className="promo-bar">
        Free shipping on orders over <strong>${SHIPPING_FREE_MIN}</strong> · Use code <strong>WELCOME10</strong> for 10% off
      </div>
      <div className="layout nav">
        <Link to="/" className="logo">
          Clothify
        </Link>
        <div className="nav-search">
          <IconSearch />
          <input
            placeholder="Search styles, categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <div className="nav-links desktop">
          <Link to="/" className={linkClass('/')}>
            Shop
          </Link>
          <Link to="/wishlist" className={linkClass('/wishlist')}>
            Wishlist
          </Link>
          {token ? (
            <>
              <Link to="/orders" className={linkClass('/orders')}>
                Orders
              </Link>
              <button
                type="button"
                className="nav-link"
                style={{ background: 'none', border: 'none' }}
                onClick={() => {
                  localStorage.removeItem('clothify_token');
                  window.location.href = '/shop/';
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className={linkClass('/login')}>
              Sign in
            </Link>
          )}
        </div>
        <Link to="/cart" className="nav-icon-btn" aria-label="Cart">
          <IconBag />
          {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
        </Link>
        <button type="button" className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          ☰
        </button>
      </div>
      <div className={`layout mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>
          Shop
        </Link>
        <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
          Wishlist
        </Link>
        <Link to="/cart" onClick={() => setMenuOpen(false)}>
          Cart {cartCount > 0 && `(${cartCount})`}
        </Link>
        {token ? (
          <>
            <Link to="/orders" onClick={() => setMenuOpen(false)}>
              Orders
            </Link>
            <button
              type="button"
              className="nav-link"
              onClick={() => {
                localStorage.removeItem('clothify_token');
                window.location.href = '/shop/';
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="layout footer">
      <div className="footer-brand">
        <span className="logo">Clothify</span>
        <p>Premium clothing with live inventory sync. Shop smart, dress modern.</p>
      </div>
      <div>
        <h4>Shop</h4>
        <Link to="/">All products</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/wishlist">Wishlist</Link>
      </div>
      <div>
        <h4>Account</h4>
        <Link to="/login">Sign in</Link>
        <Link to="/orders">Order history</Link>
        <a href="/database_manager.html" target="_blank" rel="noreferrer">
          Admin panel
        </a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Clothify. All rights reserved.</span>
        <span>Synced with your business database</span>
      </div>
    </footer>
  );
}

function Toasts() {
  const { toasts } = useShop();
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Layout() {
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const refreshCart = useCallback(() => {
    if (!localStorage.getItem('clothify_token')) {
      setCartCount(0);
      return;
    }
    api
      .cart()
      .then((c) => setCartCount(c.items.reduce((n, i) => n + i.quantity, 0)))
      .catch(() => setCartCount(0));
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const value = useMemo(
    () => ({ search, setSearch, cartCount, refreshCart, toast }),
    [search, cartCount, refreshCart, toast]
  );

  return (
    <ShopContext.Provider value={value}>
      <Nav />
      <Outlet />
      <Footer />
      <Toasts />
    </ShopContext.Provider>
  );
}

function Home() {
  const { search, setSearch, toast, refreshCart } = useShop();
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (category) params.category = category;
    if (search) params.search = search;
    if (featuredOnly) params.featured = 'true';
    api
      .products(params)
      .then((list) => {
        setProducts(list);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [category, search, featuredOnly]);

  const sorted = useMemo(() => sortProducts(products, sort), [products, sort]);
  const heroProduct = products.find((p) => p.featured) || products[0];

  const quickAdd = async (product) => {
    if (!localStorage.getItem('clothify_token')) {
      nav('/login');
      return;
    }
    try {
      await api.addToCart({
        itemId: product.id,
        quantity: 1,
        size: product.sizes?.[0] || 'M',
        color: product.colors?.[0] || 'Black',
      });
      refreshCart();
      toast(`Added ${product.name} to cart`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <section className="layout hero">
        <div className="hero-content">
          <h1>
            Curated style for <em>every season</em>
          </h1>
          <p>
            Discover premium pieces with real-time stock from your store. AI-curated layouts, seamless checkout, and
            instant order sync.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-lg" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>
              Shop collection
            </button>
            <Link to="/login" className="btn btn-lg btn-ghost">
              Join & save 10%
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{products.length || '—'}</strong>
              <span>Styles live</span>
            </div>
            <div className="hero-stat">
              <strong>24h</strong>
              <span>Fast dispatch</span>
            </div>
            <div className="hero-stat">
              <strong>4.9★</strong>
              <span>Customer rated</span>
            </div>
          </div>
        </div>
        {heroProduct && (
          <div className="hero-visual">
            <img src={heroProduct.imageUrl} alt={heroProduct.name} />
            <span className="hero-tag">Trending · {heroProduct.name}</span>
          </div>
        )}
      </section>

      <section className="layout" id="catalog">
        <div className="toolbar">
          <h2>{category || 'All collections'}</h2>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="">Sort: Featured</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="filters">
          <span className={`chip ${!category && !featuredOnly ? 'active' : ''}`} onClick={() => { setCategory(''); setFeaturedOnly(false); }}>
            All
          </span>
          <span className={`chip ${featuredOnly ? 'active' : ''}`} onClick={() => { setFeaturedOnly(!featuredOnly); setCategory(''); }}>
            Featured
          </span>
          {categories.map((c) => (
            <span
              key={c}
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => {
                setCategory(c);
                setFeaturedOnly(false);
              }}
            >
              {c}
            </span>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : sorted.length ? (
          <div className="grid">
            {sorted.map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={quickAdd} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No pieces found</h3>
            <p className="muted">Try another category or add inventory in the admin panel.</p>
            <button type="button" className="btn mt-1" onClick={() => { setSearch(''); setCategory(''); setFeaturedOnly(false); }}>
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast, refreshCart } = useShop();
  const [product, setProduct] = useState(null);
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('Black');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    api.product(id).then((p) => {
      setProduct(p);
      setSize(p.sizes?.[0] || 'M');
      setColor(p.colors?.[0] || 'Black');
    });
  }, [id]);

  if (!product) {
    return (
      <div className="layout">
        <div className="skeleton-card" style={{ maxWidth: 600, margin: '2rem auto' }} />
      </div>
    );
  }

  const addCart = async () => {
    if (!localStorage.getItem('clothify_token')) return nav('/login');
    try {
      await api.addToCart({ itemId: product.id, quantity: 1, size, color });
      refreshCart();
      toast('Added to cart');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const addWish = async () => {
    if (!localStorage.getItem('clothify_token')) return nav('/login');
    try {
      await api.addWishlist(product.id);
      toast('Saved to wishlist');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem('clothify_token')) return nav('/login');
    try {
      await api.addReview(product.id, { rating, comment });
      const updated = await api.product(id);
      setProduct(updated);
      setComment('');
      toast('Review submitted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const reviews = product.reviews || [];
  const stockClass = product.stock <= 5 ? 'low' : 'in-stock';

  return (
    <div className="layout detail">
      <div className="detail-gallery">
        <img src={product.imageUrl} alt={product.name} />
      </div>
      <div className="detail-info">
        <p className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>
          {product.category}
        </p>
        <h1>{product.name}</h1>
        <div className={`stock-pill ${stockClass}`}>
          {product.stock > 0 ? `● ${product.stock} in stock` : 'Out of stock'}
        </div>
        <div className="detail-price-row">
          <span className="price">${product.price.toFixed(2)}</span>
          {product.compareAt && product.compareAt > product.price && (
            <span className="price-compare">${product.compareAt.toFixed(2)}</span>
          )}
        </div>
        <p className="muted" style={{ marginBottom: '1.5rem', lineHeight: 1.7 }}>
          {product.description || 'Premium piece from our curated collection.'}
        </p>

        <div className="option-group">
          <label>Size</label>
          <div className="pill-row">
            {product.sizes.map((s) => (
              <button key={s} type="button" className={`pill ${size === s ? 'active' : ''}`} onClick={() => setSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="option-group">
          <label>Color</label>
          <div className="pill-row">
            {product.colors.map((c) => (
              <button key={c} type="button" className={`pill ${color === c ? 'active' : ''}`} onClick={() => setColor(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-actions">
          <button type="button" className="btn btn-lg" onClick={addCart} disabled={product.stock < 1}>
            Add to cart
          </button>
          <button type="button" className="btn btn-lg btn-outline" onClick={addWish}>
            <IconHeart /> Save
          </button>
        </div>

        <section className="reviews-section">
          <h2 className="page-title" style={{ fontSize: '1.5rem' }}>
            Reviews ({reviews.length})
          </h2>
          {reviews.length === 0 && <p className="muted">No reviews yet — be the first.</p>}
          {reviews.map((r, i) => (
            <div key={i} className="review-card">
              <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              <strong>{r.full_name}</strong>
              <p className="muted" style={{ marginTop: '0.35rem' }}>{r.comment}</p>
            </div>
          ))}

          <form className="review-form" onSubmit={submitReview}>
            <label>Your rating</label>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>
                  ★
                </button>
              ))}
            </div>
            <textarea rows={3} placeholder="Share your thoughts…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button type="submit" className="btn">
              Submit review
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Cart() {
  const { toast, refreshCart } = useShop();
  const nav = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [couponCode, setCouponCode] = useState('WELCOME10');
  const [checkingOut, setCheckingOut] = useState(false);

  const load = useCallback(() => {
    api
      .cart()
      .then(setCart)
      .catch(() => nav('/login'));
  }, [nav]);

  useEffect(() => {
    load();
  }, [load]);

  const updateQty = async (cartId, quantity) => {
    if (quantity < 1) return;
    try {
      await api.updateCart(cartId, { quantity });
      load();
      refreshCart();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const removeLine = async (cartId) => {
    try {
      await api.removeCart(cartId);
      load();
      refreshCart();
      toast('Removed from cart');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const checkout = async () => {
    if (!shippingName.trim() || !shippingAddress.trim()) {
      toast('Please enter shipping details', 'error');
      return;
    }
    setCheckingOut(true);
    try {
      const r = await api.checkout({ shippingName, shippingAddress, couponCode });
      refreshCart();
      toast(`Order #${r.orderId} placed — $${r.total.toFixed(2)}`);
      nav('/orders');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const { discount, shipping, total } = calcTotals(cart.subtotal || 0, couponCode);

  if (!cart.items?.length) {
    return (
      <div className="layout">
        <h1 className="page-title">Your bag</h1>
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p className="muted">Explore our collection and add your favorites.</p>
          <Link to="/" className="btn mt-1">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <h1 className="page-title">Your bag</h1>
      <p className="page-sub">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</p>

      <div className="two-col">
        <div>
          {cart.items.map((line) => (
            <div key={line.cartId} className="cart-line">
              <img src={line.product.imageUrl} alt="" />
              <div>
                <Link to={`/product/${line.product.id}`}>
                  <strong>{line.product.name}</strong>
                </Link>
                <p className="muted">
                  {line.size} / {line.color}
                </p>
                <div className="qty-control" style={{ marginTop: '0.65rem' }}>
                  <button type="button" onClick={() => updateQty(line.cartId, line.quantity - 1)} aria-label="Decrease">
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button type="button" onClick={() => updateQty(line.cartId, line.quantity + 1)} aria-label="Increase">
                    +
                  </button>
                </div>
                <button type="button" className="btn-ghost btn" style={{ marginTop: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => removeLine(line.cartId)}>
                  Remove
                </button>
              </div>
              <p className="price">${line.lineTotal.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="summary-card">
          <h3 style={{ marginBottom: '1rem' }}>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${(cart.subtotal || 0).toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row">
              <span>Discount (10%)</span>
              <span style={{ color: 'var(--success)' }}>−${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span className="price">${total.toFixed(2)}</span>
          </div>

          <div className="field" style={{ marginTop: '1.25rem' }}>
            <label>Full name</label>
            <input value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="field" style={{ marginTop: '0.85rem' }}>
            <label>Shipping address</label>
            <textarea rows={3} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street, city, ZIP" />
          </div>
          <div className="field" style={{ marginTop: '0.85rem' }}>
            <label>Coupon code</label>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="WELCOME10" />
            <p className="coupon-hint">WELCOME10 gives 10% off your order</p>
          </div>

          <button type="button" className="btn btn-lg w-full mt-1" onClick={checkout} disabled={checkingOut}>
            {checkingOut ? 'Processing…' : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { toast, refreshCart } = useShop();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = register
        ? await api.register({ email, password, fullName })
        : await api.login({ email, password });
      localStorage.setItem('clothify_token', data.token);
      refreshCart();
      toast(register ? 'Account created' : 'Welcome back');
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <h2>Style that moves with you</h2>
        <p className="muted">
          Create an account for wishlists, faster checkout, order tracking, and exclusive offers like WELCOME10.
        </p>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <h1 className="page-title">{register ? 'Create account' : 'Welcome back'}</h1>
          <p className="page-sub" style={{ marginBottom: '0.5rem' }}>
            {register ? 'Join Clothify in seconds' : 'Sign in to your account'}
          </p>
          {register && (
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-lg w-full" disabled={loading}>
            {loading ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setRegister(!register)}>
            {register ? 'Have an account? Sign in' : 'New here? Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Wishlist() {
  const { toast, refreshCart } = useShop();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .wishlist()
      .then(setItems)
      .catch(() => nav('/login'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [nav]);

  const remove = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.removeWishlist(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast('Removed from wishlist');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const moveToCart = async (p, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.addToCart({
        itemId: p.id,
        quantity: 1,
        size: p.sizes?.[0] || 'M',
        color: p.colors?.[0] || 'Black',
      });
      refreshCart();
      toast('Added to cart');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="layout">
      <h1 className="page-title">Wishlist</h1>
      <p className="page-sub">Pieces you love, saved for later</p>
      {loading ? (
        <div className="skeleton-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid">
          {items.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className="card">
              <div className="card-media">
                <img src={p.imageUrl} alt={p.name} />
                <div className="card-quick" style={{ opacity: 1, transform: 'none', display: 'flex', gap: '0.35rem' }}>
                  <button type="button" className="btn" style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }} onClick={(e) => moveToCart(p, e)}>
                    Add to cart
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }} onClick={(e) => remove(p.id, e)}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="card-body">
                <h3>{p.name}</h3>
                <p className="price">${p.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Your wishlist is empty</h3>
          <p className="muted">Tap the heart on any product to save it here.</p>
          <Link to="/" className="btn mt-1">
            Browse shop
          </Link>
        </div>
      )}
    </div>
  );
}

function Orders() {
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .orders()
      .then(setOrders)
      .catch(() => nav('/login'))
      .finally(() => setLoading(false));
  }, [nav]);

  return (
    <div className="layout">
      <h1 className="page-title">Order history</h1>
      <p className="page-sub">Track your purchases and delivery status</p>
      {loading ? (
        <div className="skeleton-card" style={{ height: 120 }} />
      ) : orders.length ? (
        orders.map((o) => (
          <div key={o.id} className="order-card">
            <div>
              <strong>Order #{o.id}</strong>
              <p className="muted">{new Date(o.created_at).toLocaleString()}</p>
              {o.shipping_name && <p className="muted" style={{ fontSize: '0.8rem' }}>{o.shipping_name}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`status-pill status-${o.status === 'paid' ? 'paid' : 'pending'}`}>{o.status}</span>
              <p className="price" style={{ marginTop: '0.5rem' }}>
                ${Number(o.total).toFixed(2)}
              </p>
              {o.coupon_code && <p className="muted" style={{ fontSize: '0.75rem' }}>Coupon: {o.coupon_code}</p>}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p className="muted">Your completed checkouts will appear here.</p>
          <Link to="/" className="btn mt-1">
            Start shopping
          </Link>
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="layout empty-state" style={{ marginTop: '3rem' }}>
      <h1 className="page-title">Page not found</h1>
      <p className="muted">This page doesn’t exist in our collection.</p>
      <Link to="/" className="btn mt-1">
        Back to shop
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/shop">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
