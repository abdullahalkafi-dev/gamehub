import 'package:flutter/material.dart';

import 'api.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'theme.dart';

void main() => runApp(const GameHubApp());

class GameHubApp extends StatelessWidget {
  const GameHubApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'GameHub',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: const Root(),
      );
}

/// Decides between login and home using the stored token, and owns the signed-in state.
class Root extends StatefulWidget {
  const Root({super.key});
  @override
  State<Root> createState() => _RootState();
}

class _RootState extends State<Root> {
  late Future<bool> _signedIn = Api.instance.restore();

  @override
  Widget build(BuildContext context) => FutureBuilder<bool>(
        future: _signedIn,
        builder: (context, snap) {
          if (!snap.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator()));
          if (snap.data!) {
            return HomeScreen(onLogout: () => setState(() => _signedIn = Future.value(false)));
          }
          return AuthScreen(onDone: () => setState(() => _signedIn = Future.value(true)));
        },
      );
}
