USE clothing_business;

INSERT IGNORE INTO inventory (name, stock, purchase_price, selling_price, category, description, slug, featured, sizes, colors)
VALUES
  ('Linen Summer Shirt', 24, 28.00, 59.99, 'Tops', 'Breathable linen for warm days.', 'linen-summer-shirt', 1, 'S,M,L,XL', 'White,Sand,Navy'),
  ('Slim Fit Chinos', 18, 32.00, 72.00, 'Bottoms', 'Tailored stretch chinos.', 'slim-chinos', 1, '30,32,34,36', 'Khaki,Black,Olive'),
  ('Merino Crew Sweater', 12, 45.00, 98.00, 'Knitwear', 'Soft merino wool layer.', 'merino-crew', 0, 'S,M,L', 'Charcoal,Cream,Burgundy'),
  ('Classic Denim Jacket', 8, 55.00, 120.00, 'Outerwear', 'Timeless medium-wash denim.', 'denim-jacket', 1, 'S,M,L,XL', 'Indigo');
