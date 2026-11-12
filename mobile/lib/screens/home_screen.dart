import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';
import 'history_tab.dart';
import 'play_screen.dart';
import 'profile_tab.dart';
import 'rooms_tab.dart';
import 'shop_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onLogout});
  final VoidCallback onLogout;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  static const _titles = ['Rooms', 'My history', 'Coin shop', 'Profile'];

  void _refreshBalance() => Api.instance.me().catchError((Object _) {});

  void _play(String key, String name, {String? code}) {
    Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => PlayScreen(roomKey: key, roomName: name, inviteCode: code)))
        .then((_) => _refreshBalance());
  }

  @override
  Widget build(BuildContext context) {
    final tabs = <Widget>[
      RoomsTab(onPlay: _play),
      const HistoryTab(),
      const ShopTab(),
      ProfileTab(onLogout: () async {
        await Api.instance.logout();
        widget.onLogout();
      }),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_index], style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          ValueListenableBuilder<int?>(
            valueListenable: Api.instance.balance,
            builder: (context, b, _) => Padding(
              padding: const EdgeInsets.only(right: 12),
              child: CoinPill(balance: b, onTap: () => setState(() => _index = 2)),
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) {
          setState(() => _index = i);
          _refreshBalance();
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home, color: gold), label: 'Rooms'),
          NavigationDestination(icon: Icon(Icons.history), selectedIcon: Icon(Icons.history, color: gold), label: 'History'),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag, color: gold), label: 'Shop'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: gold), label: 'Profile'),
        ],
      ),
    );
  }
}
