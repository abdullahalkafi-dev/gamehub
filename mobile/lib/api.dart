import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Backend address. Override with: flutter build apk --dart-define=API_URL=https://...
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://api.gamehub.joura.info');

class ApiError implements Exception {
  ApiError(this.message, [this.code]);
  final String message;
  final String? code;
  @override
  String toString() => message;
}

/// One place for every server call. The token lives in the Android keystore (secure storage).
class Api {
  Api._();
  static final Api instance = Api._();

  static const _storage = FlutterSecureStorage();
  String? _token;

  /// Latest known coin balance; the app bar listens to this.
  final ValueNotifier<int?> balance = ValueNotifier<int?>(null);
  Map<String, dynamic>? user;

  Future<bool> restore() async {
    _token = await _storage.read(key: 'token');
    if (_token == null) return false;
    try {
      await me();
      return true;
    } on ApiError catch (e) {
      if (e.code == 'unauthorized' || e.code == 'invalid_token') await logout();
      return false;
    }
  }

  Future<dynamic> _send(String method, String path, {Map<String, dynamic>? body, Map<String, String>? query}) async {
    final uri = Uri.parse('$apiUrl$path').replace(queryParameters: query);
    final headers = {
      'Content-Type': 'application/json',
      'X-Client': 'mobile',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
    http.Response res;
    try {
      final req = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(await req.send().timeout(const Duration(seconds: 20)));
    } catch (_) {
      throw ApiError('Cannot reach the server. Check your connection.', 'network');
    }
    final data = res.body.isEmpty ? <String, dynamic>{} : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    final err = (data is Map ? data['error'] : null) as Map<String, dynamic>?;
    throw ApiError((err?['message'] as String?) ?? 'Something went wrong.', err?['code'] as String?);
  }

  Future<void> _startSession(Map<String, dynamic> res) async {
    _token = res['token'] as String?;
    await _storage.write(key: 'token', value: _token);
    user = res['user'] as Map<String, dynamic>;
    await me();
  }

  Future<void> login(String email, String password) async =>
      _startSession(await _send('POST', '/auth/login', body: {'email': email, 'password': password}));

  Future<void> register(String email, String password, String name) async => _startSession(
      await _send('POST', '/auth/register', body: {'email': email, 'password': password, 'displayName': name}));

  Future<void> logout() async {
    _token = null;
    user = null;
    balance.value = null;
    await _storage.delete(key: 'token');
  }

  Future<void> me() async {
    final res = await _send('GET', '/auth/me');
    user = res['user'] as Map<String, dynamic>;
    balance.value = res['balance'] as int?;
  }

  Future<void> updateName(String name) async {
    final res = await _send('PATCH', '/auth/me', body: {'displayName': name});
    user = res['user'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> rooms() async =>
      ((await _send('GET', '/rooms'))['rooms'] as List).cast<Map<String, dynamic>>();

  Future<Map<String, dynamic>> createRoom(Map<String, dynamic> body) async =>
      (await _send('POST', '/rooms', body: body))['room'] as Map<String, dynamic>;

  Future<void> deleteRoom(String key) => _send('DELETE', '/rooms/$key');

  Future<Map<String, dynamic>> roomByCode(String code) async =>
      (await _send('GET', '/rooms/by-code/${Uri.encodeComponent(code)}'))['room'] as Map<String, dynamic>;

  Future<Map<String, dynamic>> join(String key, {String? inviteCode}) async =>
      await _send('POST', '/rooms/$key/join', body: {'inviteCode': ?inviteCode})
          as Map<String, dynamic>;

  Future<Map<String, dynamic>> history({int? before}) async => await _send('GET', '/history',
      query: {'limit': '20', if (before != null) 'before': '$before'}) as Map<String, dynamic>;

  Future<Map<String, dynamic>> stats() async => await _send('GET', '/history/stats') as Map<String, dynamic>;

  Future<List<Map<String, dynamic>>> packages() async =>
      ((await _send('GET', '/shop/packages'))['packages'] as List).cast<Map<String, dynamic>>();

  Future<void> purchase(String packageId, String clientKey) async {
    await _send('POST', '/shop/purchase', body: {'packageId': packageId, 'clientKey': clientKey});
    await me();
  }

  Future<Map<String, dynamic>> leaderboard(String period, String metric) async =>
      await _send('GET', '/leaderboard', query: {'period': period, 'metric': metric}) as Map<String, dynamic>;
}
