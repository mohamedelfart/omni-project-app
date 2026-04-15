import 'package:flutter_test/flutter_test.dart';

import 'package:omnirent_app/main.dart';

void main() {
  testWidgets('OmniRentApp builds', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniRentApp());
    await tester.pump();
  });
}
