import 'package:flutter/material.dart';
import '../../entry/screens/app_entry_screen.dart';
import '../../home/screens/tenant_home_screen.dart';
import '../../vendor/screens/vendor_assignments_screen.dart';
// import '../../command_center/screens/command_center_home_screen.dart';
import '../../../shared/widgets/premium_visual_asset.dart';

// ============================================================================
// LOGIN SCREEN — OmniRent
// ============================================================================

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.role = UserRole.tenant});

  final UserRole role;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    setState(() => _isLoading = false);
    final Widget destination = switch (widget.role) {
      UserRole.tenant => const TenantHomeScreen(),
      UserRole.vendor => const VendorAssignmentsScreen(vendorId: 'VENDOR-DEMO-001'),
      UserRole.admin  => const TenantHomeScreen(), // Disabled Command Center
    };
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => destination),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // Background wave at bottom
          Positioned.fill(
            child: CustomPaint(painter: _WavePainter()),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const SizedBox(height: 60),

                  const SizedBox(
                    width: 122,
                    child: PremiumVisualAsset(
                      imageUrl: PremiumVisualCatalog.login,
                      semanticLabel: 'OmniRent',
                      aspectRatio: 1,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── App Name ───────────────────────────────────
                  const Text(
                    'OmniRent',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E3A5F),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'منصة خدماتك الكاملة',
                    style: TextStyle(
                      fontSize: 15,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // ── Form Card ──────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x0D000000),
                          blurRadius: 40,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'تسجيل الدخول',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'أدخل بياناتك للمتابعة',
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Email field
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'البريد الإلكتروني',
                              hintText: 'example@email.com',
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) {
                                return 'يرجى إدخال البريد الإلكتروني';
                              }
                              if (!v.contains('@')) {
                                return 'البريد الإلكتروني غير صحيح';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password field
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'كلمة المرور',
                              hintText: '••••••••',
                              suffixIcon: TextButton(
                                onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword,
                                ),
                                child: Text(
                                  _obscurePassword ? 'Show' : 'Hide',
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) {
                                return 'يرجى إدخال كلمة المرور';
                              }
                              if (v.length < 6) {
                                return 'كلمة المرور قصيرة جداً';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),

                          // Forgot password
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              onPressed: () {},
                              child: const Text(
                                'نسيت كلمة المرور؟',
                                style: TextStyle(
                                  color: Color(0xFFF97316),
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Login button
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _login,
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                          Colors.white,
                                        ),
                                      ),
                                    )
                                  : const Text('دخول'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Register link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'ليس لديك حساب؟',
                        style: TextStyle(color: Color(0xFF6B7280)),
                      ),
                      TextButton(
                        onPressed: () {},
                        child: const Text(
                          'إنشاء حساب',
                          style: TextStyle(
                            color: Color(0xFF1E3A5F),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Wave Painter ─────────────────────────────────────────────────────────────

class _WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF1E3A5F).withValues(alpha: 0.06)
      ..style = PaintingStyle.fill;

    final path = Path();
    path.moveTo(0, size.height * 0.75);
    path.quadraticBezierTo(
      size.width * 0.25,
      size.height * 0.65,
      size.width * 0.5,
      size.height * 0.75,
    );
    path.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.85,
      size.width,
      size.height * 0.72,
    );
    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();
    canvas.drawPath(path, paint);

    final paint2 = Paint()
      ..color = const Color(0xFFF97316).withValues(alpha: 0.05)
      ..style = PaintingStyle.fill;

    final path2 = Path();
    path2.moveTo(0, size.height * 0.82);
    path2.quadraticBezierTo(
      size.width * 0.3,
      size.height * 0.72,
      size.width * 0.6,
      size.height * 0.83,
    );
    path2.quadraticBezierTo(
      size.width * 0.8,
      size.height * 0.9,
      size.width,
      size.height * 0.8,
    );
    path2.lineTo(size.width, size.height);
    path2.lineTo(0, size.height);
    path2.close();
    canvas.drawPath(path2, paint2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
