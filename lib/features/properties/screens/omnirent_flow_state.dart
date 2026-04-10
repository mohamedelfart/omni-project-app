import 'package:flutter/material.dart';

import '../../../core/models/models.dart';

class OmniRentFlowState {
  static final ValueNotifier<Map<String, Property>> cart =
      ValueNotifier<Map<String, Property>>(<String, Property>{});

  static final ValueNotifier<bool> isLoggedIn = ValueNotifier<bool>(false);
  static final ValueNotifier<Locale> locale = ValueNotifier<Locale>(
    const Locale('en'),
  );

  static bool inCart(String id) => cart.value.containsKey(id);

  static int cartCount() => cart.value.length;

  static List<Property> cartItems() => cart.value.values.toList();

  static void toggleCart(Property property) {
    final Map<String, Property> next = Map<String, Property>.from(cart.value);
    if (next.containsKey(property.id)) {
      next.remove(property.id);
    } else {
      next[property.id] = property;
    }
    cart.value = next;
  }

  static void clearCart() {
    cart.value = <String, Property>{};
  }

  static void setLoggedIn(bool value) {
    isLoggedIn.value = value;
  }

  static void setLocale(String languageCode) {
    locale.value = Locale(languageCode);
  }
}