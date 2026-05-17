import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';

class ClothifyApi {
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('clothify_token');
  }

  static Future<Map<String, String>> _headers({bool auth = false}) async {
    final h = {'Content-Type': 'application/json'};
    if (auth) {
      final t = await _token();
      if (t != null) h['Authorization'] = 'Bearer $t';
    }
    return h;
  }

  static Future<dynamic> _get(String path, {bool auth = false}) async {
    final res = await http.get(
      Uri.parse('$apiBaseUrl$path'),
      headers: await _headers(auth: auth),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['error'] ?? res.body);
    return jsonDecode(res.body);
  }

  static Future<dynamic> _post(String path, Map body, {bool auth = false}) async {
    final res = await http.post(
      Uri.parse('$apiBaseUrl$path'),
      headers: await _headers(auth: auth),
      body: jsonEncode(body),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['error'] ?? res.body);
    return jsonDecode(res.body);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('clothify_token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('clothify_token');
  }

  static Future<List<dynamic>> products({String? search, String? category}) async {
    final q = <String, String>{};
    if (search != null && search.isNotEmpty) q['search'] = search;
    if (category != null && category.isNotEmpty) q['category'] = category;
    final uri = Uri.parse('$apiBaseUrl/api/shop/products').replace(queryParameters: q);
    final res = await http.get(uri);
    return List<dynamic>.from(jsonDecode(res.body));
  }

  static Future<Map<String, dynamic>> product(int id) async =>
      Map<String, dynamic>.from(await _get('/api/shop/products/$id'));

  static Future<Map<String, dynamic>> login(String email, String password) async =>
      Map<String, dynamic>.from(await _post('/api/shop/login', {'email': email, 'password': password}));

  static Future<Map<String, dynamic>> register(String email, String password, String fullName) async =>
      Map<String, dynamic>.from(await _post('/api/shop/register', {
        'email': email,
        'password': password,
        'fullName': fullName,
      }));

  static Future<Map<String, dynamic>> cart() async =>
      Map<String, dynamic>.from(await _get('/api/shop/cart', auth: true));

  static Future<void> addToCart(int itemId, {String size = 'M', String color = 'Black'}) async {
    await _post('/api/shop/cart', {'itemId': itemId, 'quantity': 1, 'size': size, 'color': color}, auth: true);
  }

  static Future<Map<String, dynamic>> checkout({
    required String shippingName,
    required String shippingAddress,
    String? couponCode,
  }) async =>
      Map<String, dynamic>.from(await _post('/api/shop/checkout', {
        'shippingName': shippingName,
        'shippingAddress': shippingAddress,
        if (couponCode != null) 'couponCode': couponCode,
      }, auth: true));

  static Future<List<dynamic>> orders() async =>
      List<dynamic>.from(await _get('/api/shop/orders', auth: true));
}
