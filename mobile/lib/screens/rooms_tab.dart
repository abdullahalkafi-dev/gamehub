import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../theme.dart';

typedef PlayCallback = void Function(String key, String name, {String? code});

class RoomsTab extends StatefulWidget {
  const RoomsTab({super.key, required this.onPlay});
  final PlayCallback onPlay;
  @override
  State<RoomsTab> createState() => _RoomsTabState();
}

class _RoomsTabState extends State<RoomsTab> {
  List<Map<String, dynamic>>? _rooms;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load(quiet: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool quiet = false}) async {
    try {
      final r = await Api.instance.rooms();
      if (mounted) setState(() => (_rooms = r, _error = null));
    } on ApiError catch (e) {
      if (mounted && !quiet) setState(() => _error = e.message);
    }
  }

  Future<void> _joinWithCode() async {
    final controller = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Join with a code'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          maxLength: 12,
          decoration: const InputDecoration(labelText: 'Invite code'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(100, 44)),
            onPressed: () => Navigator.pop(context, controller.text.trim().toUpperCase()),
            child: const Text('Find room'),
          ),
        ],
      ),
    );
    if (code == null || code.length < 4 || !mounted) return;
    try {
      final room = await Api.instance.roomByCode(code);
      if (mounted) widget.onPlay(room['key'] as String, room['name'] as String, code: code);
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
  }

  Future<void> _create() async {
    final made = await Navigator.of(context).push<Map<String, dynamic>>(MaterialPageRoute(builder: (_) => const CreateRoomPage()));
    if (made != null) _load();
  }

  Future<void> _delete(Map<String, dynamic> room) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete "${room['name']}"?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: loss))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.instance.deleteRoom(room['key'] as String);
      _load();
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_rooms == null && _error == null) return const Center(child: CircularProgressIndicator());
    if (_rooms == null) return _ErrorView(message: _error!, onRetry: _load);
    final global = _rooms!.firstWhere((r) => r['isGlobal'] == true, orElse: () => {});
    final others = _rooms!.where((r) => r['isGlobal'] != true).toList();
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        backgroundColor: violet,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Create room'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 96), children: [
          if (global.isNotEmpty) _GlobalCard(room: global, onPlay: () => widget.onPlay('main', 'Global room')),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _joinWithCode,
            icon: const Icon(Icons.vpn_key_outlined),
            label: const Text('Join with a code'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46), side: const BorderSide(color: line)),
          ),
          const SizedBox(height: 20),
          const Text('Player rooms', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (others.isEmpty)
            const _Empty(icon: Icons.groups_outlined, title: 'No player rooms yet', text: 'Create one and share its code, or play in the Global room.')
          else
            for (final r in others)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _RoomCard(room: r, onPlay: () => widget.onPlay(r['key'] as String, r['name'] as String), onDelete: () => _delete(r)),
              ),
        ]),
      ),
    );
  }
}

class _GlobalCard extends StatelessWidget {
  const _GlobalCard({required this.room, required this.onPlay});
  final Map<String, dynamic> room;
  final VoidCallback onPlay;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: gold.withValues(alpha: 0.35)),
          gradient: const LinearGradient(colors: [Color(0xFF2A1F4F), surface, Color(0xFF3A2A0C)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Chip(label: Text('Open to everyone'), avatar: Icon(Icons.public, size: 16, color: gold), side: BorderSide.none, backgroundColor: Color(0xFF3A2F14)),
          const SizedBox(height: 8),
          const Text('Global room', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Jump in instantly. Chips ${(room['chips'] as List).join(' · ')}.', style: const TextStyle(color: muted)),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: gold, foregroundColor: Colors.black),
                onPressed: onPlay,
                child: const Text('Play now', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 14),
            const Icon(Icons.people_outline, size: 18, color: muted),
            const SizedBox(width: 4),
            Text('${room['online']} playing', style: const TextStyle(color: muted)),
          ]),
        ]),
      );
}

class _RoomCard extends StatelessWidget {
  const _RoomCard({required this.room, required this.onPlay, required this.onDelete});
  final Map<String, dynamic> room;
  final VoidCallback onPlay;
  final VoidCallback onDelete;
  @override
  Widget build(BuildContext context) {
    final mine = room['isMine'] == true;
    final private = room['visibility'] == 'private';
    final cap = room['capacity'];
    final full = cap != null && (room['online'] as int) >= (cap as int);
    final owner = (room['owner'] as Map?)?['displayName'] ?? '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(room['name'] as String, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
            Icon(private ? Icons.lock_outline : Icons.public, size: 18, color: private ? gold : muted),
          ]),
          Text('by $owner${mine ? ' (you)' : ''}', style: const TextStyle(color: muted)),
          const SizedBox(height: 8),
          Text('${room['online']}${cap != null ? ' / $cap' : ''} playing · ${room['timing']?['betSeconds'] ?? '?'}s betting · chips ${(room['chips'] as List?)?.join(' · ') ?? ''}',
              style: const TextStyle(color: muted, fontSize: 13)),
          if (mine && room['inviteCode'] != null) ...[
            const SizedBox(height: 10),
            InkWell(
              onTap: () {
                Clipboard.setData(ClipboardData(text: room['inviteCode'] as String));
                toast(context, 'Invite code copied');
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(color: const Color(0xFF3A2F14), borderRadius: BorderRadius.circular(12), border: Border.all(color: gold.withValues(alpha: 0.4))),
                child: Row(children: [
                  Text(room['inviteCode'] as String, style: const TextStyle(color: gold, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 4)),
                  const Spacer(),
                  const Icon(Icons.copy, size: 16, color: gold),
                ]),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: FilledButton(onPressed: full ? null : onPlay, child: Text(full ? 'Room full' : 'Join'))),
            if (mine) ...[
              const SizedBox(width: 8),
              IconButton.outlined(onPressed: onDelete, tooltip: 'Delete room', icon: const Icon(Icons.delete_outline, color: loss)),
            ],
          ]),
        ]),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.icon, required this.title, required this.text});
  final IconData icon;
  final String title;
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: line)),
        child: Column(children: [
          Icon(icon, size: 36, color: gold),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(text, textAlign: TextAlign.center, style: const TextStyle(color: muted)),
        ]),
      );
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: loss)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ]),
        ),
      );
}

// ---- Create room ---------------------------------------------------------

class CreateRoomPage extends StatefulWidget {
  const CreateRoomPage({super.key});
  @override
  State<CreateRoomPage> createState() => _CreateRoomPageState();
}

class _CreateRoomPageState extends State<CreateRoomPage> {
  static const _chipChoices = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  final _name = TextEditingController();
  bool _private = false;
  double _capacity = 20;
  final Set<int> _chips = {1, 5, 10, 25, 100};
  int _maxBet = 500;
  int _betSeconds = 20;
  bool _busy = false;
  Map<String, dynamic>? _made;

  Future<void> _submit() async {
    if (_chips.length < 2) return toast(context, 'Pick at least 2 chip values.', error: true);
    setState(() => _busy = true);
    try {
      final room = await Api.instance.createRoom({
        'name': _name.text.trim(),
        'visibility': _private ? 'private' : 'public',
        'capacity': _capacity.round(),
        'chips': (_chips.toList()..sort()),
        'maxPerTarget': _maxBet,
        'timing': {'betSeconds': _betSeconds, 'spinSeconds': 6, 'resultSeconds': 6},
      });
      if (mounted) setState(() => _made = room);
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final made = _made;
    if (made != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Room created')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.check_circle, color: win, size: 64),
            const SizedBox(height: 12),
            Text('${made['name']} is ready', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (made['inviteCode'] != null && made['visibility'] == 'private') ...[
              const Text('Share this code with friends:', style: TextStyle(color: muted)),
              const SizedBox(height: 8),
              SelectableText(made['inviteCode'] as String, style: const TextStyle(color: gold, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: 6)),
            ] else
              const Text('It now appears in the lobby for everyone.', style: TextStyle(color: muted)),
            const SizedBox(height: 8),
            const Text('Empty rooms close by themselves after 30 minutes.', style: TextStyle(color: muted, fontSize: 12)),
            const SizedBox(height: 24),
            FilledButton(onPressed: () => Navigator.pop(context, made), child: const Text('Back to rooms')),
          ]),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Create a room')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(controller: _name, maxLength: 40, decoration: const InputDecoration(labelText: 'Room name'), onChanged: (_) => setState(() {})),
        SwitchListTile(
          value: _private,
          onChanged: (v) => setState(() => _private = v),
          title: const Text('Private room'),
          subtitle: Text(_private ? 'Only people with the invite code can join' : 'Listed in the lobby for everyone'),
          activeThumbColor: gold,
        ),
        const SizedBox(height: 8),
        Text('Player limit: ${_capacity.round()}', style: const TextStyle(fontWeight: FontWeight.w600)),
        Slider(value: _capacity, min: 2, max: 50, divisions: 48, onChanged: (v) => setState(() => _capacity = v)),
        const Text('Chip values (2 to 5)', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 4, children: [
          for (final c in _chipChoices)
            FilterChip(
              label: Text('$c'),
              selected: _chips.contains(c),
              selectedColor: gold,
              labelStyle: TextStyle(color: _chips.contains(c) ? Colors.black : Colors.white, fontWeight: FontWeight.w600),
              checkmarkColor: Colors.black,
              onSelected: (on) => setState(() {
                if (on && _chips.length < 5) _chips.add(c);
                if (!on) _chips.remove(c);
              }),
            ),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<int>(
              initialValue: _maxBet,
              decoration: const InputDecoration(labelText: 'Max bet per option'),
              items: [for (final m in [50, 100, 250, 500, 1000, 2500]) DropdownMenuItem(value: m, child: Text('$m'))],
              onChanged: (v) => setState(() => _maxBet = v!),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: DropdownButtonFormField<int>(
              initialValue: _betSeconds,
              decoration: const InputDecoration(labelText: 'Betting time'),
              items: [for (final m in [15, 20, 30, 45, 60]) DropdownMenuItem(value: m, child: Text('$m s'))],
              onChanged: (v) => setState(() => _betSeconds = v!),
            ),
          ),
        ]),
        const SizedBox(height: 24),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: gold, foregroundColor: Colors.black),
          onPressed: _busy || _name.text.trim().length < 3 ? null : _submit,
          child: _busy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Create room'),
        ),
      ]),
    );
  }
}
