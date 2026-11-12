import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key, required this.onLogout});
  final Future<void> Function() onLogout;
  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  late final _name = TextEditingController(text: Api.instance.user?['displayName'] as String?);
  bool _busy = false;

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await Api.instance.updateName(_name.text.trim());
      if (mounted) toast(context, 'Name updated');
    } on ApiError catch (e) {
      if (mounted) toast(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
        Text(Api.instance.user?['email'] as String? ?? '', style: const TextStyle(color: muted)),
        const SizedBox(height: 16),
        TextField(controller: _name, maxLength: 24, decoration: const InputDecoration(labelText: 'Display name', helperText: 'Other players see this name')),
        const SizedBox(height: 8),
        FilledButton(onPressed: _busy ? null : _save, child: const Text('Save name')),
        const SizedBox(height: 32),
        OutlinedButton.icon(
          onPressed: widget.onLogout,
          icon: const Icon(Icons.logout, color: loss),
          label: const Text('Log out', style: TextStyle(color: loss)),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), side: BorderSide(color: loss.withValues(alpha: 0.5))),
        ),
      ]);
}
