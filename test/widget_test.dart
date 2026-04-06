// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:omnirent_app/main.dart';
import 'package:omnirent_app/features/auth/screens/login_screen.dart';

void main() {
  testWidgets('OmniRent App Logo Test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const OmniRentApp());

    // Verify that the app boots into the current authentication flow.
    expect(find.byType(OmniRentApp), findsOneWidget);
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
