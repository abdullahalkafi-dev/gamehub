import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});
  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  Map<String, dynamic>? _stats;
  final _rounds = <Map<String, dynamic>>[];
  int? _next;
  bool _loading = true;
  bool _more = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final stats = await Api.instance.stats();
      final page = await Api.instance.history();
      if (!mounted) return;
      setState(() {
        _stats = stats;
        _rounds
          ..clear()
          ..addAll((page['rounds'] as List).cast<Map<String, dynamic>>());
        _next = page['nextBefore'] as int?;
        _error = null;
        _loading = false;
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => (_error = e.message, _loading = false));
    }
  }

  Future<void> _loadMore() async {
    setState(() => _more = true);
    try {
      final page = await Api.instance.history(before: _next);
      if (!mounted) return;
      setState(() {
        _rounds.addAll((page['rounds'] as List).cast<Map<String, dynamic>>());
        _next = page['nextBefore'] as int?;
      });
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _more = false);
    }
  }

  Color _tone(num n) => n > 0 ? win : (n < 0 ? loss : muted);

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(_error!, style: const TextStyle(color: loss)),
        const SizedBox(height: 10),
        OutlinedButton(onPressed: _load, child: const Text('Try again')),
      ]));
    }
    final s = _stats!;
    if ((s['rounds'] as int) == 0) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('No rounds yet.\nPlay a round in the Global room and your results show up here.', textAlign: TextAlign.center, style: TextStyle(color: muted)),
        ),
      );
    }
    Widget stat(String label, String value, {Color? color}) => Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: const TextStyle(color: muted, fontSize: 12)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
              ]),
            ),
          ),
        );
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        Row(children: [
          stat('Net result', signed(s['net'] as num), color: _tone(s['net'] as num)),
          const SizedBox(width: 10),
          stat('Rounds', coins(s['rounds'] as num)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          stat('Win rate', '${s['winRate']}%'),
          const SizedBox(width: 10),
          stat('Biggest win', coins(s['biggestWin'] as num)),
        ]),
        const SizedBox(height: 20),
        const Text('Rounds', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(children: [
            for (final r in _rounds)
              ExpansionTile(
                shape: const Border(),
                collapsedShape: const Border(),
                title: Text('${r['roomName']} · round ${r['round'] ?? '?'}', style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('result ${(r['result'] as List).join(', ')} · bet ${coins(r['bet'] as num)}', style: const TextStyle(color: muted, fontSize: 12)),
                trailing: Text(signed(r['net'] as num), style: TextStyle(color: _tone(r['net'] as num), fontWeight: FontWeight.w700)),
                children: [
                  if (r['bets'] == null)
                    const Padding(padding: EdgeInsets.all(12), child: Text('Option details are not available for older rounds.', style: TextStyle(color: muted)))
                  else
                    for (final b in (r['bets'] as List).cast<Map<String, dynamic>>())
                      ListTile(
                        dense: true,
                        title: Text((b['label'] ?? b['option']).toString()),
                        trailing: Text('staked ${coins(b['amount'] as num)} · won ${coins(b['win'] as num)}', style: TextStyle(color: (b['win'] as num) > 0 ? win : muted)),
                      ),
                ],
              ),
            if (_next != null)
              Padding(
                padding: const EdgeInsets.all(8),
                child: TextButton(onPressed: _more ? null : _loadMore, child: Text(_more ? 'Loading…' : 'Load older rounds')),
              ),
          ]),
        ),
      ]),
    );
  }
}
