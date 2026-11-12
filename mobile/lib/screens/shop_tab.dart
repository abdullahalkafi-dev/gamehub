import 'dart:math';

import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

String _newKey() {
  final r = Random.secure();
  return List.generate(24, (_) => 'abcdefghijklmnopqrstuvwxyz0123456789'[r.nextInt(36)]).join();
}

/// Packs with Buy buttons. Each press gets its own key that is kept until it succeeds,
/// so a retry after a network error can never pay twice.
class PackageList extends StatefulWidget {
  const PackageList({super.key, this.limit});
  final int? limit;
  @override
  State<PackageList> createState() => _PackageListState();
}

class _PackageListState extends State<PackageList> {
  List<Map<String, dynamic>>? _packs;
  String? _error;
  String? _busy;
  final _keys = <String, String>{};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await Api.instance.packages();
      if (mounted) setState(() => _packs = p);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _buy(Map<String, dynamic> p) async {
    if (_busy != null) return;
    setState(() => _busy = p['id'] as String);
    final key = _keys.putIfAbsent(p['id'] as String, _newKey);
    try {
      await Api.instance.purchase(p['id'] as String, key);
      _keys.remove(p['id']);
      if (mounted) toast(context, '+${coins(p['coins'] as num)} coins added');
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Center(child: Text(_error!, style: const TextStyle(color: loss)));
    final packs = _packs;
    if (packs == null) return const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()));
    final shown = widget.limit == null ? packs : packs.take(widget.limit!).toList();
    return Column(children: [
      for (final p in shown)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: BorderSide(color: p['highlight'] != null ? gold.withValues(alpha: 0.6) : line),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(color: gold.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.monetization_on_outlined, color: gold),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text(p['name'] as String, style: const TextStyle(color: muted)),
                      if (p['highlight'] != null) ...[
                        const SizedBox(width: 8),
                        Text(p['highlight'] == 'popular' ? 'MOST POPULAR' : 'BEST VALUE', style: const TextStyle(color: gold, fontSize: 10, fontWeight: FontWeight.w700)),
                      ],
                    ]),
                    Text(coins(p['coins'] as num), style: const TextStyle(color: gold, fontSize: 22, fontWeight: FontWeight.w800)),
                    if ((p['bonusPercent'] as num) > 0) Text('+${p['bonusPercent']}% bonus', style: const TextStyle(color: win, fontSize: 12)),
                  ]),
                ),
                FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size(84, 44), backgroundColor: p['highlight'] != null ? gold : violet, foregroundColor: p['highlight'] != null ? Colors.black : Colors.white),
                  onPressed: _busy == null ? () => _buy(p) : null,
                  child: _busy == p['id'] ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(money(p['priceCents'] as num)),
                ),
              ]),
            ),
          ),
        ),
    ]);
  }
}

class ShopTab extends StatelessWidget {
  const ShopTab({super.key});
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: const Color(0xFF2A2250), borderRadius: BorderRadius.circular(14), border: Border.all(color: violet.withValues(alpha: 0.4))),
          child: const Row(children: [
            Icon(Icons.info_outline, size: 18),
            SizedBox(width: 10),
            Expanded(child: Text('Demo shop: nobody is charged. Coins appear instantly and have no real-world value.')),
          ]),
        ),
        const SizedBox(height: 14),
        const PackageList(),
      ]);
}

/// Opens over the game when the player runs out of coins.
class QuickShopSheet extends StatelessWidget {
  const QuickShopSheet({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Out of coins', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            const Text('Grab a demo pack. Your balance in the game updates right away.', style: TextStyle(color: muted)),
            const SizedBox(height: 14),
            const PackageList(limit: 3),
            OutlinedButton(onPressed: () => Navigator.pop(context), style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)), child: const Text('Back to the game')),
          ]),
        ),
      );
}
