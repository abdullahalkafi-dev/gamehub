import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../api.dart';
import '../theme.dart';
import 'shop_tab.dart';

/// Full-screen game. The play link is requested when the screen opens (it lasts 15 minutes).
class PlayScreen extends StatefulWidget {
  const PlayScreen({super.key, required this.roomKey, required this.roomName, this.inviteCode});
  final String roomKey;
  final String roomName;
  final String? inviteCode;
  @override
  State<PlayScreen> createState() => _PlayScreenState();
}

class _PlayScreenState extends State<PlayScreen> {
  WebViewController? _web;
  String? _error;
  bool _loading = true;

  static const _friendly = {
    'room_full': 'This room is full right now. Try again in a moment.',
    'room_not_found': 'This room has closed. Empty rooms close after 30 minutes.',
    'invalid_invite_code': 'The invite code is wrong.',
  };

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await Api.instance.join(widget.roomKey, inviteCode: widget.inviteCode);
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        // The game posts JSON strings to this channel: {type, data}
        ..addJavaScriptChannel('MiniGames', onMessageReceived: (m) => _onGameEvent(m.message))
        ..loadRequest(Uri.parse(res['playUrl'] as String));
      if (mounted) setState(() => _web = controller);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = _friendly[e.code] ?? e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onGameEvent(String raw) {
    try {
      final msg = jsonDecode(raw) as Map<String, dynamic>;
      switch (msg['type']) {
        case 'needCoins':
          showModalBottomSheet<void>(
            context: context,
            backgroundColor: surface,
            isScrollControlled: true,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            builder: (_) => const QuickShopSheet(),
          );
        case 'round':
          Api.instance.me().catchError((Object _) {});
        case 'exit':
          if (mounted) Navigator.of(context).pop();
      }
    } catch (_) {
      // Ignore messages that are not JSON.
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(widget.roomName, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
          actions: [
            IconButton(tooltip: 'Reload game', onPressed: _start, icon: const Icon(Icons.refresh)),
            ValueListenableBuilder<int?>(
              valueListenable: Api.instance.balance,
              builder: (context, b, _) => Padding(padding: const EdgeInsets.only(right: 12), child: CoinPill(balance: b)),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: loss)),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _start, child: const Text('Try again')),
                        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back to the lobby')),
                      ]),
                    ),
                  )
                : WebViewWidget(controller: _web!),
      );
}
