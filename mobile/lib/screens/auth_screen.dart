import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onDone});
  final VoidCallback onDone;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _register = false;
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final email = _email.text.trim().toLowerCase();
      if (_register) {
        await Api.instance.register(email, _password.text, _name.text.trim());
      } else {
        await Api.instance.login(email, _password.text);
      }
      widget.onDone();
    } on ApiError catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _form,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.emoji_events, color: gold, size: 32),
                      SizedBox(width: 8),
                      Text('GameHub', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
                    ]),
                    const SizedBox(height: 28),
                    Text(_register ? 'Create your account' : 'Welcome back',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(_register ? 'Get 100 free coins to start playing.' : 'Log in to see the rooms.',
                        style: const TextStyle(color: muted)),
                    const SizedBox(height: 20),
                    if (_register) ...[
                      TextFormField(
                        controller: _name,
                        decoration: const InputDecoration(labelText: 'Display name'),
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.nickname],
                        validator: (v) => (v ?? '').trim().length < 2 ? 'At least 2 characters' : null,
                      ),
                      const SizedBox(height: 14),
                    ],
                    TextFormField(
                      controller: _email,
                      decoration: const InputDecoration(labelText: 'Email'),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.email],
                      validator: (v) => (v ?? '').contains('@') ? null : 'Enter a valid email',
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _password,
                      decoration: InputDecoration(labelText: 'Password', helperText: _register ? 'At least 8 characters' : null),
                      obscureText: true,
                      autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                      onFieldSubmitted: (_) => _submit(),
                      validator: (v) => (v ?? '').length < 8 ? 'At least 8 characters' : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: loss.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                        child: Text(_error!, style: const TextStyle(color: loss)),
                      ),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: gold, foregroundColor: Colors.black),
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(_register ? 'Create account' : 'Log in'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => setState(() {
                        _register = !_register;
                        _error = null;
                      }),
                      child: Text(_register ? 'Already have an account? Log in' : 'New here? Create an account'),
                    ),
                  ]),
                ),
              ),
            ),
          ),
        ),
      );
}
