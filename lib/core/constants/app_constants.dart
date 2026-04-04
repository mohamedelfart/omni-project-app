// ============================================================================
// OMNI-RESILIENT GLOBAL LIFESTYLE OS
// Application Constants & Configuration
// ============================================================================

class AppConstants {
  // App Information
  static const String appName = 'OmniRent';
  static const String appVersion = '1.0.0';
  static const String appDescription = 'Global Lifestyle Services Platform';

  // Supported Languages
  static const List<String> supportedLanguages = ['ar', 'en', 'fr', 'de', 'ja'];

  // Supported Regions & Currencies
  static const Map<String, String> regionCurrencies = {
    'QA': 'QAR', // Qatar
    'AE': 'AED', // UAE
    'SA': 'SAR', // Saudi Arabia
    'US': 'USD', // USA
    'GB': 'GBP', // UK
    'FR': 'EUR', // France
    'DE': 'EUR', // Germany
    'JP': 'JPY', // Japan
  };

  // Supported Services
  static const List<String> services = [
    'PROPERTIES',
    'RIDES',
    'FOOD',
    'TRAVEL',
    'HEALTH',
    'DELIVERY',
    'HOTEL_SERVICES',
    'SERVICES',
  ];

  // Service Names
  static const Map<String, String> serviceNames = {
    'PROPERTIES': 'Real Estate',
    'RIDES': 'Transportation',
    'FOOD': 'Food Delivery',
    'TRAVEL': 'Travel',
    'HEALTH': 'Healthcare',
    'DELIVERY': 'Delivery Services',
    'HOTEL_SERVICES': 'Hotel Services',
    'SERVICES': 'Paid Services',
  };

  // Service Icons (Unicode)
  static const Map<String, String> serviceIcons = {
    'PROPERTIES': '🏠',
    'RIDES': '🚗',
    'FOOD': '🍕',
    'TRAVEL': '✈️',
    'HEALTH': '🏥',
    'DELIVERY': '🚚',
    'HOTEL_SERVICES': '🏨',
    'SERVICES': '🛍️',
  };

  // API Timeouts
  static const int apiTimeoutSeconds = 30;
  static const int socketTimeoutSeconds = 60;

  // Cache Duration
  static const Duration cacheDuration = Duration(hours: 1);

  // Request Status
  static const Map<String, String> requestStatus = {
    'PENDING': 'Pending',
    'CONFIRMED': 'Confirmed',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'FAILED': 'Failed',
    'CANCELLED': 'Cancelled',
  };
}

class CountryConfig {
  static const Map<String, Map<String, dynamic>> countries = {
    'QA': {
      'name': 'Qatar',
      'currency': 'QAR',
      'flag': '🇶🇦',
      'timeZone': 'Asia/Qatar',
      'providers': ['Karwa', 'Talabat', 'Uber'],
    },
    'AE': {
      'name': 'United Arab Emirates',
      'currency': 'AED',
      'flag': '🇦🇪',
      'timeZone': 'Asia/Dubai',
      'providers': ['Uber', 'Careem', 'Zomato'],
    },
    'SA': {
      'name': 'Saudi Arabia',
      'currency': 'SAR',
      'flag': '🇸🇦',
      'timeZone': 'Asia/Riyadh',
      'providers': ['Uber', 'Buxi', 'Deliveroo'],
    },
    'US': {
      'name': 'United States',
      'currency': 'USD',
      'flag': '🇺🇸',
      'timeZone': 'America/New_York',
      'providers': ['Uber', 'Lyft', 'DoorDash'],
    },
    'GB': {
      'name': 'United Kingdom',
      'currency': 'GBP',
      'flag': '🇬🇧',
      'timeZone': 'Europe/London',
      'providers': ['Uber', 'Bolt', 'Deliveroo'],
    },
    'FR': {
      'name': 'France',
      'currency': 'EUR',
      'flag': '🇫🇷',
      'timeZone': 'Europe/Paris',
      'providers': ['Uber', 'Bolt', 'Uber Eats'],
    },
    'DE': {
      'name': 'Germany',
      'currency': 'EUR',
      'flag': '🇩🇪',
      'timeZone': 'Europe/Berlin',
      'providers': ['Uber', 'Bolt', 'Lieferando'],
    },
    'JP': {
      'name': 'Japan',
      'currency': 'JPY',
      'flag': '🇯🇵',
      'timeZone': 'Asia/Tokyo',
      'providers': ['Uber', 'Local Taxis', 'Wolt'],
    },
  };
}

class LocalizationKeys {
  // Common
  static const String appName = 'app_name';
  static const String home = 'home';
  static const String search = 'search';
  static const String book = 'book';
  static const String confirm = 'confirm';
  static const String cancel = 'cancel';
  
  // Services
  static const String properties = 'properties';
  static const String rides = 'rides';
  static const String food = 'food';
  static const String travel = 'travel';
  static const String health = 'health';
  
  // Actions
  static const String selectDate = 'select_date';
  static const String selectTime = 'select_time';
  static const String selectLocation = 'select_location';
  static const String bookNow = 'book_now';
  static const String viewDetails = 'view_details';
  
  // Status
  static const String pending = 'pending';
  static const String confirmed = 'confirmed';
  static const String inProgress = 'in_progress';
  static const String completed = 'completed';
}
