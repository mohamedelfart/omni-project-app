import 'package:flutter/material.dart';

void main() => runApp(const OmniRentApp());

class OmniRentApp extends StatelessWidget {
  const OmniRentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF00E5FF),
        scaffoldBackgroundColor: const Color(0xFF001220),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF001220),
          elevation: 0,
        ),
      ),
      home: const PropertySearchScreen(),
    );
  }
}

class PropertySearchScreen extends StatefulWidget {
  const PropertySearchScreen({super.key});

  @override
  State<PropertySearchScreen> createState() => _PropertySearchScreenState();
}

class _PropertySearchScreenState extends State<PropertySearchScreen> {
  String _selectedBooking = "اختر موعد المعاينة من الزر أدناه";
  final Map<int, bool> _isFavorite = {};
  final Map<int, bool> _hoverStates = {1: false, 2: false};
  String _language = "ar"; // ar, en, ja, fr, de

  final Map<String, Map<String, String>> _translations = {
    "ar": {
      "title": "OmniRent - عقارات قطر",
      "selectDate": "اختر موعد المعاينة من الزر أدناه",
      "dateButton": "تحديد التاريخ والوقت",
      "confirmbooking": "تأكيد وحجز الموعد الآن",
      "booking": "موعدك: ",
      "villa": "فيلا فاخرة - اللؤلؤة",
      "apartment": "شقة مودرن - لوسيل",
      "sending": "جاري إرسال طلب المعاينة إلى مالك العقار...",
      "nationalAddress": "العنوان الوطني",
    },
    "en": {
      "title": "OmniRent - Qatar Properties",
      "selectDate": "Select a viewing appointment below",
      "dateButton": "Select Date & Time",
      "confirmbooking": "Confirm & Book Now",
      "booking": "Your appointment: ",
      "villa": "Luxury Villa - The Pearl",
      "apartment": "Modern Apartment - Lusail",
      "sending": "Sending viewing request to property owner...",
      "nationalAddress": "National Address",
    },
    "ja": {
      "title": "OmniRent - カタール不動産",
      "selectDate": "下のボタンから内覧日を選択してください",
      "dateButton": "日時を選択",
      "confirmbooking": "予約を確認して予約する",
      "booking": "ご予約日時: ",
      "villa": "高級ヴィラ - パール地区",
      "apartment": "モダンアパートメント - ルーサイル",
      "sending": "物件所有者への内覧リクエストを送信中...",
      "nationalAddress": "国家住所",
    },
    "fr": {
      "title": "OmniRent - Propriétés Qatar",
      "selectDate": "Sélectionnez une date de visite ci-dessous",
      "dateButton": "Sélectionner la date et l'heure",
      "confirmbooking": "Confirmer et réserver maintenant",
      "booking": "Votre rendez-vous: ",
      "villa": "Villa Luxe - La Perle",
      "apartment": "Appartement Moderne - Lusail",
      "sending": "Envoi de la demande de visite au propriétaire...",
      "nationalAddress": "Adresse Nationale",
    },
    "de": {
      "title": "OmniRent - Katar-Immobilien",
      "selectDate": "Wählen Sie einen Besichtigungstermin unten",
      "dateButton": "Datum & Uhrzeit wählen",
      "confirmbooking": "Bestätigen und jetzt buchen",
      "booking": "Ihr Termin: ",
      "villa": "Luxusvilla - Die Perle",
      "apartment": "Modernes Apartment - Lusail",
      "sending": "Besichtigungsanfrage wird an Eigentümer gesendet...",
      "nationalAddress": "Nationale Adresse",
    },
  };

  String _t(String key) => _translations[_language]?[key] ?? key;

  Future<void> _pickDateTime(BuildContext context) async {
    final DateTime? date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2027),
    );

    if (date != null) {
      if (!mounted) return;
      final TimeOfDay? time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.now(),
      );

      if (time != null) {
        setState(() {
          _selectedBooking = "${_t('booking')}${date.day}/${date.month}/${date.year} - ${time.format(context)}";
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedBooking == "اختر موعد المعاينة من الزر أدناه") {
      _selectedBooking = _t('selectDate');
    }
    return Directionality(
      textDirection: _language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          // الصورة تتحرك تلقائياً حسب اتجاه اللغة (RTL/LTR)
          leading: const Padding(
            padding: EdgeInsets.all(8.0),
            child: CircleAvatar(
              radius: 20,
              backgroundImage: NetworkImage('https://i.pravatar.cc/150?u=mohamed'),
            ),
          ),
          title: const Text("OmniRent", style: TextStyle(fontWeight: FontWeight.bold)),
          centerTitle: true,
          actions: [
            // قائمة اللغات الخمس التي طلبتها
            PopupMenuButton<String>(
              icon: const Icon(Icons.language, color: Color(0xFF00E5FF)),
              onSelected: (String langCode) {
                setState(() {
                  _language = langCode;
                  print("اللغة المختارة: $langCode");
                });
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: "ar", child: Text("العربية")),
                const PopupMenuItem(value: "en", child: Text("English")),
                const PopupMenuItem(value: "fr", child: Text("Français")),
                const PopupMenuItem(value: "de", child: Text("Deutsch")),
                const PopupMenuItem(value: "ja", child: Text("日本語")),
              ],
            ),
          ],
        ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(15),
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: Colors.white10,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF00E5FF), width: 0.5),
            ),
            child: Row(
              children: [
                const Icon(Icons.event_available, color: Color(0xFF00E5FF)),
                const SizedBox(width: 15),
                Expanded(
                  child: Text(
                    _selectedBooking,
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: () => _pickDateTime(context),
            icon: const Icon(Icons.calendar_month, color: Colors.black),
            label: Text(
              _t('dateButton'),
              style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
            ),
          ),
          if (_selectedBooking != _t('selectDate'))
            Padding(
              padding: const EdgeInsets.only(top: 10.0),
              child: TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(_t('sending')),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
                child: Text(
                  _t('confirmbooking'),
                  style: const TextStyle(
                    color: Color(0xFF00E5FF),
                    decoration: TextDecoration.underline,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(color: Colors.white10),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 15),
              children: [
                _buildPropertyCard(
                  1,
                  _t('villa'),
                  "18,000 ر.ق",
                  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=500",
                  "303/45A-2023",
                ),
                _buildPropertyCard(
                  2,
                  _t('apartment'),
                  "8,500 ر.ق",
                  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500",
                  "101/23B-2024",
                ),
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildPropertyCard(int id, String title, String price, String imageUrl, String nationalAddress) {
    return Card(
      margin: const EdgeInsets.only(bottom: 20),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      color: const Color(0xFF1A1A1A),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 3D Interactive Image Container with Positioned Heart
          Stack(
            children: [
              MouseRegion(
                onEnter: (_) {
                  setState(() => _hoverStates[id] = true);
                },
                onExit: (_) {
                  setState(() => _hoverStates[id] = false);
                },
                child: AnimatedScale(
                  scale: (_hoverStates[id] ?? false) ? 1.08 : 1.0,
                  duration: const Duration(milliseconds: 300),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: 150,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00E5FF).withValues(alpha: 
                            (_hoverStates[id] ?? false) ? 0.9 : 0.4,
                          ),
                          blurRadius: (_hoverStates[id] ?? false) ? 30 : 15,
                          spreadRadius: (_hoverStates[id] ?? false) ? 3 : 0,
                          offset: Offset(0, (_hoverStates[id] ?? false) ? 10 : 5),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        Image.network(
                          imageUrl,
                          height: 150,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 150,
                            color: Colors.white10,
                            child: const Icon(Icons.apartment, size: 50, color: Colors.white24),
                          ),
                        ),
                        // 3D Gradient Overlay
                        Container(
                          height: 150,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Colors.transparent,
                                Colors.black.withValues(alpha: 
                                  (_hoverStates[id] ?? false) ? 0.3 : 0.15,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 15,
                right: 15, // سيتحرك لليسار تلقائياً في اللغات الأخرى بفضل Flutter
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      // عكس الحالة الحالية عند النقر
                      _isFavorite[id] = !(_isFavorite[id] ?? false);
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: (_isFavorite[id] ?? false) ? Colors.red.withValues(alpha: 0.2) : Colors.black45,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      (_isFavorite[id] ?? false) ? Icons.favorite : Icons.favorite_border,
                      color: (_isFavorite[id] ?? false) ? Colors.red : Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  price,
                  style: const TextStyle(color: Color(0xFF00E5FF), fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 14, color: Colors.white54),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        "${_t('nationalAddress')}: $nationalAddress",
                        style: const TextStyle(fontSize: 12, color: Colors.white54),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}