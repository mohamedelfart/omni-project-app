import 'package:flutter_test/flutter_test.dart';

import 'package:omnirent_app/main.dart';

void main() {
  testWidgets('OmniRentApp builds', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniRentApp());
    // Property list uses a 1s delayed mock load in ServiceManager.searchProperties.
    await tester.pump(const Duration(milliseconds: 1100));
  });
}
