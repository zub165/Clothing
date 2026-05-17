const API = import.meta.env.VITE_API_URL || '';

function headers() {
  const token = localStorage.getItem('clothify_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  products: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/shop/products?${q}`);
  },
  product: (id) => request(`/api/shop/products/${id}`),
  categories: () => request('/api/shop/categories'),
  register: (body) => request('/api/shop/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/shop/login', { method: 'POST', body: JSON.stringify(body) }),
  cart: () => request('/api/shop/cart'),
  addToCart: (body) => request('/api/shop/cart', { method: 'POST', body: JSON.stringify(body) }),
  updateCart: (id, body) => request(`/api/shop/cart/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeCart: (id) => request(`/api/shop/cart/${id}`, { method: 'DELETE' }),
  wishlist: () => request('/api/shop/wishlist'),
  addWishlist: (id) => request(`/api/shop/wishlist/${id}`, { method: 'POST' }),
  removeWishlist: (id) => request(`/api/shop/wishlist/${id}`, { method: 'DELETE' }),
  checkout: (body) => request('/api/shop/checkout', { method: 'POST', body: JSON.stringify(body) }),
  orders: () => request('/api/shop/orders'),
};
