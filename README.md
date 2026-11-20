# TRZ Orders

## الهيكل
- `public/index.html` — الواجهة الرئيسية للمستخدمين
- `api/order.js` — الخادم (Vercel Serverless) المتصل بـ Firestore
- `admin-local/admin.html` — لوحة الأدمن (محلية فقط، مستثناة من GitHub عبر .gitignore)
- `firestore.rules` — قواعد الأمان

## 1) إعداد Firebase (مرة واحدة)
1. من Firebase Console ← مشروع `tab-a11` ← **Firestore Database** ← Create database.
2. **Authentication** ← Sign-in method ← فعّل **Email/Password** ← Users ← Add user (إيميل وباسورد الأدمن).
3. انسخ محتوى `firestore.rules` في Firestore ← Rules ← Publish (حساب الأدمن فيه: zxcmax10@gmail.com، وأنشئ هذا الحساب في Authentication بنفس الإيميل).
4. **Firestore ← Indexes**: لا حاجة لفهارس إضافية.

## 2) الرفع على GitHub
```bash
git init
git add .
git commit -m "TRZ Orders"
git branch -M main
git remote add origin https://github.com/USERNAME/trz-orders.git
git push -u origin main
```
(مجلد `admin-local` لن يُرفع بسبب `.gitignore`.)

## 3) Vercel
Import المستودع من GitHub ← Deploy (بدون أي إعدادات إضافية).

## 4) تشغيل لوحة الأدمن على جهازك
```bash
cd admin-local
python -m http.server 5500
```
ثم افتح http://localhost:5500/admin.html وسجّل الدخول.
(يُفضّل التشغيل عبر localhost بدل فتح الملف مباشرة لأن Firebase Auth لا يعمل جيداً من file://)

## المنتجات
من لوحة الأدمن افتح قسم **المنتجات والأسعار** وأضف أول منتج قبل أن يستطيع المستخدمون تقديم طلبات.
