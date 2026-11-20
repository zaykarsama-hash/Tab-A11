import { db } from './_db.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genId = () => {
  let s = '';
  for (let i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return 'TRZ-' + s;
};
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const normId = (v) => clean(v, 20).toUpperCase().replace(/\s+/g, '');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    // ===== جلب طلب =====
    if (req.method === 'GET') {
      const id = normId(req.query.id);
      if (!id) return res.status(400).json({ error: 'أدخل رقم الطلب' });
      const snap = await getDoc(doc(db, 'orders', id));
      if (!snap.exists()) return res.status(404).json({ error: 'لم يتم العثور على طلب بهذا الرقم' });
      return res.status(200).json(snap.data());
    }

    const body = req.body || {};

    // ===== إنشاء طلب (حتى 5 منتجات مختلفة) =====
    if (req.method === 'POST') {
      const name = clean(body.name, 60);
      const phone = clean(body.phone, 20).replace(/[^\d+]/g, '');
      if (name.length < 2) return res.status(400).json({ error: 'الاسم مطلوب' });
      if (phone.length < 10 || phone.length > 15) return res.status(400).json({ error: 'رقم هاتف التحويل غير صحيح' });

      const raw = Array.isArray(body.items) ? body.items : (body.productId ? [{ productId: body.productId, qty: body.qty }] : []);
      const merged = new Map();
      for (const it of raw) {
        const pid = clean(it && it.productId, 60);
        const q = parseInt(it && it.qty, 10);
        if (!pid) continue;
        if (!Number.isInteger(q) || q < 1 || q > 100) return res.status(400).json({ error: 'الكمية يجب أن تكون بين 1 و 100' });
        merged.set(pid, Math.min(100, (merged.get(pid) || 0) + q));
      }
      if (!merged.size) return res.status(400).json({ error: 'اختر منتجاً واحداً على الأقل' });
      if (merged.size > 5) return res.status(400).json({ error: 'الحد الأقصى 5 منتجات مختلفة في الطلب الواحد' });

      const items = [];
      for (const [pid, q] of merged) {
        const pSnap = await getDoc(doc(db, 'products', pid));
        if (!pSnap.exists() || pSnap.data().active === false)
          return res.status(400).json({ error: 'أحد المنتجات غير متاح حالياً' });
        const p = pSnap.data();
        items.push({ productId: pid, productName: p.name, unitPrice: Number(p.price), qty: q });
      }
      const qty = items.reduce((s, i) => s + i.qty, 0);
      const total = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

      let id = null;
      for (let i = 0; i < 6; i++) {
        const c = genId();
        const s = await getDoc(doc(db, 'orders', c));
        if (!s.exists()) { id = c; break; }
      }
      if (!id) return res.status(500).json({ error: 'تعذر إنشاء رقم الطلب، حاول مجدداً' });

      const now = Date.now();
      const order = {
        id, name, phone, qty, total, items,
        teacher: clean(body.teacher, 60),
        note: clean(body.note, 500),
        status: 'pending',
        adminNote: '',
        adminNotes: [{ id: 'auto', text: `في انتظار إتمام الدفع بقيمة ${total} جنيه مصري للموافقة على طلبك`, at: now, auto: true }],
        history: [],
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(db, 'orders', id), order);
      return res.status(201).json(order);
    }

    // ===== تعديل طلب (الاسم / الهاتف / المعلم / الملاحظات فقط) =====
    if (req.method === 'PUT') {
      const id = normId(body.id);
      const ref = doc(db, 'orders', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return res.status(404).json({ error: 'الطلب غير موجود' });
      const old = snap.data();
      if (old.status === 'delivered') return res.status(403).json({ error: 'لا يمكن تعديل طلب تم تسليمه' });

      const name = clean(body.name, 60);
      if (name.length < 2) return res.status(400).json({ error: 'الاسم مطلوب' });
      const phone = clean(body.phone, 20).replace(/[^\d+]/g, '');
      if (phone.length < 10 || phone.length > 15) return res.status(400).json({ error: 'رقم هاتف التحويل غير صحيح' });
      const teacher = clean(body.teacher, 60);
      const note = clean(body.note, 500);

      if (name === old.name && phone === old.phone && teacher === old.teacher && note === old.note)
        return res.status(200).json(old);

      const now = Date.now();
      const history = [...(old.history || []), { at: now, name: old.name, phone: old.phone, teacher: old.teacher, note: old.note }];
      await updateDoc(ref, { name, phone, teacher, note, history, updatedAt: now });
      return res.status(200).json({ ...old, name, phone, teacher, note, history, updatedAt: now });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'خطأ في الخادم أو قاعدة البيانات' });
  }
}
