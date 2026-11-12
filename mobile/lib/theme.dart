import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

// Same palette as the website (docs/design.md).
const bg = Color(0xFF0A0A12);
const surface = Color(0xFF13131F);
const surface2 = Color(0xFF1B1B2B);
const line = Color(0xFF2A2A40);
const gold = Color(0xFFF6BD45);
const violet = Color(0xFF8467FF);
const muted = Color(0xFFA09FBA);
const win = Color(0xFF3DDC97);
const loss = Color(0xFFFF6B7A);

final _fmt = NumberFormat.decimalPattern('en_US');
String coins(num n) => _fmt.format(n);
String signed(num n) => (n > 0 ? '+' : n < 0 ? '−' : '') + _fmt.format(n.abs());
String money(num cents) => '\$${(cents / 100).toStringAsFixed(2)}';

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: violet, brightness: Brightness.dark).copyWith(
    primary: violet,
    secondary: gold,
    surface: surface,
    error: loss,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: bg,
    appBarTheme: const AppBarTheme(backgroundColor: bg, elevation: 0, scrolledUnderElevation: 0),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: line)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface2,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: bg,
      indicatorColor: const Color(0xFF3A2F14),
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12)),
    ),
  );
}

/// Gold pill with the balance; tapping opens the shop tab.
class CoinPill extends StatelessWidget {
  const CoinPill({super.key, required this.balance, this.onTap});
  final int? balance;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Balance ${balance ?? 'unknown'} coins',
        button: onTap != null,
        child: InkWell(
          borderRadius: BorderRadius.circular(40),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF3A2F14),
              borderRadius: BorderRadius.circular(40),
              border: Border.all(color: gold.withValues(alpha: 0.35)),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.monetization_on_outlined, size: 18, color: gold),
              const SizedBox(width: 6),
              Text(balance == null ? '—' : coins(balance!),
                  style: const TextStyle(color: gold, fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
      );
}

void toast(BuildContext context, String text, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(text),
      behavior: SnackBarBehavior.floating,
      backgroundColor: error ? const Color(0xFF3B1B22) : surface2,
    ));
}
