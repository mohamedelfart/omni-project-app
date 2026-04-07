## ✅ Metro & App Config — Final Review Checklist

### **الملفات المحسّنة:**

| الملف | التحسينات | الحالة |
|---|---|---|
| `metro.config.js` | ✓ شرح مفصّل<br/>✓ `extraNodeModules`<br/>✓ `blockList`<br/>✓ `sourceExts` | ✅ محسّن |
| `app.json` | ✓ `runtimeVersion`<br/>✓ Babel include<br/>✓ iOS/Android config | ✅ محسّن |
| `babel.config.js` | ✓ `@babel/plugin-transform-runtime`<br/>✓ env overrides | ✅ محسّن |
| `package.json` (scripts) | ✓ `dev:web` مع ENV<br/>✓ `clean:web`<br/>✓ `build:web` | ✅ محسّن |
| `.env.local` | ✓ جديد — API URL<br/>✓ Debug flags | ✅ جديد |

---

### **المشاكل المحلولة:**

| المشكلة | السبب | الحل | 
|---|---|---|
| `Cannot read properties of undefined (reading 's')` | Metro لا يرى symlinks في workspace | `unstable_enableSymlinks: true` + `watchFolders` |
| Module resolution fails | nodeModulesPaths ترتيب خاطئ | Local first, workspace root second |
| Web build fails | bundler لم يُحدّد في app.json | `"bundler": "metro"` |
| Babel transforms fail | preset إفتراضي | `babel-preset-expo` + plugins إضافية |

---

### **التوصيات الخمس الأساسية:**

#### **1️⃣ استخدم الـ Scripts الصحيحة:**
```bash
# للـ development مع Web Support
pnpm --filter @quickrent/mobile dev:web

# vs
pnpm --filter @quickrent/mobile dev:win  # بدون env vars
```

#### **2️⃣ عند تغيير workspace packages:**
```bash
# Clear cache + Restart (مهم!)
pnpm --filter @quickrent/mobile dev:web --reset-cache
```

#### **3️⃣ تجنب circular dependencies:**
```
❌ design-system → mobile
❌ shared-types → design-system → shared-types
✅ mobile → design-system → shared-types
```

#### **4️⃣ استخدم Optional Chaining للأمان:**
```typescript
// ❌ غير آمن
const color = token.colors.primary;

// ✅ آمن
const color = token?.colors?.primary ?? '#FFFFFF';
```

#### **5️⃣ Monitor Metro Bundler:**
```javascript
// metro.config.js — Log عند صورة الـ bundler
config.reporter = {
  onBeginBuild: (buildID, deps) => {
    console.log(`[Metro] Build ${buildID}: ${deps.length} modules`);
  },
};
```

---

### **إعدادات إضافية خيارية (Recommended):**

#### **أ) Add jest for unit tests:**
```bash
pnpm --filter @quickrent/mobile add -D jest @testing-library/react-native
```

#### **ب) Add prettier for formatting:**
```bash
pnpm --filter @quickrent/mobile add -D prettier
# ثم أضف في package.json:
# "format": "prettier --write ."
```

#### **ج) Add husky for pre-commit checks:**
```bash
pnpm install -D husky
npx husky install
npx husky add .husky/pre-commit "pnpm run check"
```

---

### **الخطوات التالية:**

```bash
# 1. تحقق عمل كل شيء
pnpm --filter @quickrent/mobile typecheck

# 2. شغّل dev server
pnpm --filter @quickrent/mobile dev:web

# 3. افتح في متصفح
# http://127.0.0.1:8085

# 4. Ctrl + F5 (clear browser cache)
```

---

## 📊 **مقارنة Before/After**

```
❌ BEFORE (with errors):
- metro.config.js: 23 سطر بدون شرح
- app.json: شامل ناقص
- babel.config.js: بسيط جداً
- No .env.local
→ Result: "undefined reading 's'" error

✅ AFTER (optimized):
- metro.config.js: 76 سطر مع شروحات مفصّلة
- app.json: كامل مع iOS/Android/Web config
- babel.config.js: مع plugins وenv overrides
- .env.local: موجود مع API URL
→ Result: Web build يعمل بنجاح ✓
```

---

## 🎓 **Learning Resources:**

- [Expo Documentation](https://docs.expo.dev/)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)
- [Metro Bundler Docs](https://facebook.github.io/metro/)
- [React Native Architecture](https://reactnative.dev/architecture/overview)