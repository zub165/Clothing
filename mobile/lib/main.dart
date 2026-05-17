import 'package:flutter/material.dart';
import 'api.dart';

void main() => runApp(const ClothifyApp());

class ClothifyApp extends StatelessWidget {
  const ClothifyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clothify',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE8B4B8),
          brightness: Brightness.dark,
          surface: const Color(0xFF1A1A22),
        ),
        fontFamily: 'Roboto',
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> products = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      final list = await ClothifyApi.products();
      setState(() { products = list; loading = false; });
    } catch (e) {
      setState(() { error = e.toString(); loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Clothify', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_bag_outlined),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!, textAlign: TextAlign.center))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.62,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: products.length,
                    itemBuilder: (_, i) {
                      final p = products[i];
                      return _ProductCard(
                        product: p,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => ProductScreen(productId: p['id'] as int)),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onTap});
  final Map<String, dynamic> product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Image.network(product['imageUrl'] ?? '', fit: BoxFit.cover),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product['name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(
                    '\$${(product['price'] as num).toStringAsFixed(2)}',
                    style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.productId});
  final int productId;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  Map<String, dynamic>? product;

  @override
  void initState() {
    super.initState();
    ClothifyApi.product(widget.productId).then((p) => setState(() => product = p));
  }

  @override
  Widget build(BuildContext context) {
    if (product == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: AppBar(title: Text(product!['name'] ?? '')),
      body: ListView(
        children: [
          AspectRatio(
            aspectRatio: 3 / 4,
            child: Image.network(product!['imageUrl'] ?? '', fit: BoxFit.cover),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('\$${(product!['price'] as num).toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(product!['description'] ?? ''),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    try {
                      await ClothifyApi.addToCart(widget.productId);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                      }
                    }
                  },
                  child: const Text('Add to cart'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  bool register = false;

  Future<void> _submit() async {
    try {
      final data = register
          ? await ClothifyApi.register(email.text, password.text, name.text)
          : await ClothifyApi.login(email.text, password.text);
      await ClothifyApi.saveToken(data['token']);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(register ? 'Register' : 'Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            if (register) TextField(controller: name, decoration: const InputDecoration(labelText: 'Full name')),
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            const SizedBox(height: 16),
            FilledButton(onPressed: _submit, child: Text(register ? 'Create account' : 'Sign in')),
            TextButton(onPressed: () => setState(() => register = !register), child: Text(register ? 'Sign in' : 'Register')),
          ],
        ),
      ),
    );
  }
}

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  Map<String, dynamic>? cart;
  final nameCtrl = TextEditingController();
  final addrCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final c = await ClothifyApi.cart();
      setState(() => cart = c);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _checkout() async {
    try {
      final r = await ClothifyApi.checkout(
        shippingName: nameCtrl.text,
        shippingAddress: addrCtrl.text,
        couponCode: 'WELCOME10',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order #${r['orderId']} placed')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = (cart?['items'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ...items.map((line) {
            final p = line['product'];
            return ListTile(
              leading: Image.network(p['imageUrl'], width: 48, height: 64, fit: BoxFit.cover),
              title: Text(p['name']),
              subtitle: Text('Qty ${line['quantity']}'),
              trailing: Text('\$${(line['lineTotal'] as num).toStringAsFixed(2)}'),
            );
          }),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Shipping name')),
          TextField(controller: addrCtrl, decoration: const InputDecoration(labelText: 'Address')),
          const SizedBox(height: 12),
          FilledButton(onPressed: _checkout, child: const Text('Checkout')),
        ],
      ),
    );
  }
}
