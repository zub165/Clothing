import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import './index.css';

function Nav() {
  const token = localStorage.getItem('clothify_token');
  return (
    <nav className="nav layout">
      <Link to="/" className="logo">
        Clothify
      </Link>
      <div className="nav-links">
        <Link to="/">Shop</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/wishlist">Wishlist</Link>
        {token ? (
          <>
            <Link to="/orders">Orders</Link>
            <button
              type="button"
              className="btn-ghost btn"
              onClick={() => {
                localStorage.removeItem('clothify_token');
                window.location.href = '/shop/';
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </div>
    </nav>
  );
}

function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (category) params.category = category;
    if (search) params.search = search;
    api
      .products(params)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [category, search]);

  return (
    <div className="layout">
      <section className="hero">
        <h1>Modern style, delivered.</h1>
        <p>Curated clothing with real-time inventory from your business database.</p>
        <input
          placeholder="Search styles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320, margin: '0 auto' }}
        />
      </section>
      <div className="filters">
        <span className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>
          All
        </span>
        {categories.map((c) => (
          <span key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </span>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {products.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="card">
            <img src={p.imageUrl} alt={p.name} loading="lazy" />
            <div className="card-body">
              <h3>{p.name}</h3>
              <p className="muted">{p.category}</p>
              <p className="price">${p.price.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
      {!products.length && !error && <p className="muted">No products yet — add items in the admin inventory.</p>}
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('Black');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.product(id).then((p) => {
      setProduct(p);
      setSize(p.sizes[0] || 'M');
      setColor(p.colors[0] || 'Black');
    });
  }, [id]);

  if (!product) return <p className="layout muted">Loading…</p>;

  const addCart = async () => {
    try {
      if (!localStorage.getItem('clothify_token')) return nav('/login');
      await api.addToCart({ itemId: product.id, quantity: 1, size, color });
      setMsg('Added to cart');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const addWish = async () => {
    try {
      if (!localStorage.getItem('clothify_token')) return nav('/login');
      await api.addWishlist(product.id);
      setMsg('Saved to wishlist');
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="layout detail">
      <img src={product.imageUrl} alt={product.name} />
      <div>
        <h1>{product.name}</h1>
        <p className="price" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
          ${product.price.toFixed(2)}
        </p>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          {product.description || 'Premium piece from our collection.'}
        </p>
        <p className="muted">In stock: {product.stock}</p>
        <label className="muted">Size</label>
        <select value={size} onChange={(e) => setSize(e.target.value)} style={{ marginBottom: '0.75rem' }}>
          {product.sizes.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="muted">Color</label>
        <select value={color} onChange={(e) => setColor(e.target.value)} style={{ marginBottom: '1rem' }}>
          {product.colors.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn" onClick={addCart}>
            Add to cart
          </button>
          <button type="button" className="btn btn-ghost" onClick={addWish}>
            ♥ Wishlist
          </button>
        </div>
        {msg && <p className="muted" style={{ marginTop: '0.75rem' }}>{msg}</p>}
      </div>
    </div>
  );
}

function Cart() {
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const nav = useNavigate();

  const load = () => api.cart().then(setCart).catch(() => nav('/login'));

  useEffect(() => {
    load();
  }, []);

  const checkout = async () => {
    try {
      const r = await api.checkout({ shippingName, shippingAddress, couponCode });
      alert(`Order #${r.orderId} placed — $${r.total.toFixed(2)}`);
      nav('/orders');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="layout">
      <h1>Your cart</h1>
      {cart.items.map((line) => (
        <div key={line.cartId} className="cart-line">
          <img src={line.product.imageUrl} alt="" />
          <div>
            <strong>{line.product.name}</strong>
            <p className="muted">
              {line.size} / {line.color} × {line.quantity}
            </p>
            <p className="price">${line.lineTotal.toFixed(2)}</p>
          </div>
        </div>
      ))}
      <p className="price" style={{ margin: '1rem 0' }}>
        Subtotal: ${cart.subtotal?.toFixed(2) || '0.00'}
      </p>
      <input placeholder="Full name" value={shippingName} onChange={(e) => setShippingName(e.target.value)} />
      <textarea
        placeholder="Shipping address"
        rows={3}
        value={shippingAddress}
        onChange={(e) => setShippingAddress(e.target.value)}
        style={{ marginTop: '0.75rem' }}
      />
      <input
        placeholder="Coupon (e.g. WELCOME10)"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        style={{ marginTop: '0.75rem' }}
      />
      <button type="button" className="btn" style={{ marginTop: '1rem', width: '100%' }} onClick={checkout}>
        Checkout
      </button>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = register
        ? await api.register({ email, password, fullName })
        : await api.login({ email, password });
      localStorage.setItem('clothify_token', data.token);
      nav('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="form layout" onSubmit={submit}>
      <h1>{register ? 'Create account' : 'Welcome back'}</h1>
      {register && (
        <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      )}
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn">
        {register ? 'Register' : 'Sign in'}
      </button>
      <button type="button" className="btn-ghost btn" onClick={() => setRegister(!register)}>
        {register ? 'Have an account? Sign in' : 'New here? Register'}
      </button>
    </form>
  );
}

function Wishlist() {
  const [items, setItems] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    api.wishlist().then(setItems).catch(() => nav('/login'));
  }, [nav]);
  return (
    <div className="layout">
      <h1>Wishlist</h1>
      <div className="grid">
        {items.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="card">
            <img src={p.imageUrl} alt={p.name} />
            <div className="card-body">
              <h3>{p.name}</h3>
              <p className="price">${p.price.toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    api.orders().then(setOrders).catch(() => nav('/login'));
  }, [nav]);
  return (
    <div className="layout">
      <h1>Orders</h1>
      {orders.map((o) => (
        <div key={o.id} className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <strong>Order #{o.id}</strong>
          <p className="muted">{new Date(o.created_at).toLocaleString()}</p>
          <p className="price">
            ${Number(o.total).toFixed(2)} — {o.status}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/shop">
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </BrowserRouter>
  );
}
