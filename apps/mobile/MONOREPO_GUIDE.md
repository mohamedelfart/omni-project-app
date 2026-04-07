# 📱 Expo Mobile Monorepo (pnpm) — Best Practices Guide

## 🎯 الأساسيات والنقاط المهمة

### **1. فهم مشكلة Workspace Symlinks في Metro**

**المشكلة:**
```
TypeError: Cannot read properties of undefined (reading 's')
```

**السبب:**
- pnpm ينشئ **symlinks** للحزم الموجودة في `packages/`
- Metro bundler **افتراضياً** لا يتابع الـ symlinks
- عندما ينسى Metro symlink، يُرجع `require()` قيمة `undefined`
- الكود يحاول الوصول إلى خاصية في `undefined` → الخطأ

**الحل:**
```javascript
// metro.config.js
config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [workspaceRoot];
```

---

### **2. مسار Resolution في Metro**

Metro يبحث عن modules بهذا الترتيب:

```
1. apps/mobile/node_modules       ← Local = Priority
2. root/node_modules              ← Hoisted (pnpm)
3. packages/*/src                 ← Workspace packages (symlinks)
```

سبب الأولوية للـ local:
- تأمين versions محددة للتطبيق
- منع conflicts بين versions المختلفة

---

### **3. الملفات الحساسة وتأثيرها**

| الملف | التأثير على Web Build |
|---|---|
| **metro.config.js** | 🔴 حرج — بدونه workspace undefined |
| **app.json** (web section) | 🟡 مهم — عدم تحديد bundler يفشل build |
| **babel.config.js** | 🟡 مهم — بدونه JSX لا ينترجم |
| **tsconfig.json** (paths) | 🟡 مهم — للـ dev experience فقط (Metro لا يعتمد عليه) |
| **.env.local** | 🟢 تحسين — للـ environment flags |

---

## 🛠️ الخطوات الآمنة عند التعديل

### **عند تعديل حزمة في `packages/`:**

```bash
# ✅ الطريقة الصحيحة
pnpm --filter @quickrent/design-system build   # Build الحزمة
pnpm --filter @quickrent/mobile dev:web        # Restart Metro

# ❌ تجنب هذا:
# لا تُعدّل ملفات .ts في packages/ أثناء build
# قد تترك Metro في حالة inconsistent
```

### **عند إضافة dependency جديد:**

```bash
# ✅ صحيح
pnpm --filter @quickrent/mobile add lodash   # يضيفها للـ local package.json
pnpm --filter @quickrent/design-system add react-icons  # للـ workspace package

# ثم Restart dev server:
pnpm --filter @quickrent/mobile dev:web

# ❌ تجنب
# لا تستخدم npm أو yarn (بيعطّلون pnpm workspace)
```

---

## 🐛 تحديد Errors الشائعة

### **Error 1: "Cannot read properties of undefined"**

```javascript
// ❌ يحدث عند:
const shadows = undefined;
const x = shadows.card;  // TypeError!

// ✓ الحالات الشائعة:
// - symlink resolver fail
// - missing metro.config.js
// - circular dependency
```

**الحل:**
```bash
# 1. تحقق metro.config.js موجود
ls apps/mobile/metro.config.js

# 2. Clear cache وRestart
pnpm --filter @quickrent/mobile dev:web

# 3. تحقق من هيكل workspace.yaml
cat pnpm-workspace.yaml
```

---

### **Error 2: "Module not found '@quickrent/design-system'**

```bash
# السبب: tsconfig paths لم تُترجم لـ Metro
# Metro لا يستخدم tsconfig paths — يستخدم nodeModulesPaths فقط

# ✓ الحل: تأكد من:
1. design-system/package.json: "main": "src/index.ts"
2. metro.config.js extraNodeModules
3. pnpm install تنفيذ صحيح
```

---

### **Error 3: "Web socket connection failed"**

```bash
# السبب: Metro server لم يبدأ بنجاح
# أو المتصفح blocked الـ ws:// protocol

# ✓ الحل:
# 1. تأكد from PORT 8085 free
lsof -i :8085  # (macOS/Linux)
netstat -ano | findstr :8085  # (Windows)

# 2. Hard reset
pnpm --filter @quickrent/mobile dev:web --reset-cache
```

---

## ✅ Checklist قبل الـ Production

- [ ] metro.config.js يحتوي على `watchFolders`, `nodeModulesPaths`, `unstable_enableSymlinks`
- [ ] app.json يحتوي على `"bundler": "metro"` في web section
- [ ] babel.config.js يحتوي على `babel-preset-expo`
- [ ] جميع workspace packages لهم `main` صحيح في package.json
- [ ] لا توجد circular dependencies بين packages
- [ ] `pnpm typecheck` ينجح بدون errors
- [ ] `pnpm lint` ينجح بدون warnings
- [ ] Web build ينجح: `pnpm --filter @quickrent/mobile build:web`

---

## 📚 مراجع إضافية

### **Monorepo Best Practices:**
- [pnpm Workspaces Docs](https://pnpm.io/workspaces)
- [Expo Web Guide](https://docs.expo.dev/guides/web/)
- [Metro Documentation](https://facebook.github.io/metro/)

### **Debugging Tools:**
```bash
# رؤية شجرة dependencies
pnpm list --depth=0

# رؤية symlinks في node_modules
ls -la apps/mobile/node_modules/@quickrent

# رؤية Cache state
du -sh .expo node_modules/.cache
```

---

## 🚀 Performance Tips

1. **استخدم `dev:web` بدلاً من `dev:win`** — الأول يوضّح API URL
2. **Clear cache أسبوعياً** — بيقلل build time
3. **استخدم `--reset-cache` عند إضافة deps** — يفرض recompile
4. **لا تشارك web build بين أجهزة** — build مرة واحدة لكل environment

---

## 🔗 الملفات المرتبطة

- [metro.config.js](./metro.config.js) — تكوين Metro bundler
- [app.json](./app.json) — إعدادات Expo
- [babel.config.js](./babel.config.js) — إعدادات Babel transpiler
- [.env.local](./.env.local) — Environment variables
- [pnpm-workspace.yaml](../../pnpm-workspace.yaml) — Workspace definition
