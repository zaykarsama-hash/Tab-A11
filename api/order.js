import { db } from './_db.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PRICE = 100;
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

    // ===== إنشاء طلب =====
    if (req.method === 'POST') {
      const name = clean(body.name, 60);
      const phone = clean(body.phone, 20).replace(/[^\d+]/g, '');
      const qty = parseInt(body.qty, 10);
      if (name.length < 2) return res.status(400).json({ error: 'الاسم مطلوب' });
      if (phone.length < 10 || phone.length > 15) return res.status(400).json({ error: 'رقم هاتف التحويل غير صحيح' });
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) return res.status(400).json({ error: 'الكمية يجب أن تكون بين 1 و 100' });

      let id = null;
      for (let i = 0; i < 6; i++) {
        const c = genId();
        const s = await getDoc(doc(db, 'orders', c));
        if (!s.exists()) { id = c; break; }
      }
      if (!id) return res.status(500).json({ error: 'تعذر إنشاء رقم الطلب، حاول مجدداً' });

      const now = Date.now();
      const order = {
        id, name, phone, qty,
        total: qty * PRICE,
        teacher: clean(body.teacher, 60),
        note: clean(body.note, 500),
        status: 'pending',
        adminNote: '',
        history: [],
        createdAt: now,
        updatedAt: now
      };
      await setDoc(doc(db, 'orders', id), order);
      return res.status(201).json(order);
    }

    // ===== تعديل طلب (الاسم / المعلم / الملاحظات فقط) =====
    if (req.method === 'PUT') {
      const id = normId(body.id);
      const ref = doc(db, 'orders', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return res.status(404).json({ error: 'الطلب غير موجود' });
      const old = snap.data();
      if (old.status === 'delivered') return res.status(403).json({ error: 'لا يمكن تعديل طلب تم تسليمه' });

      const name = clean(body.name, 60);
      if (name.length < 2) return res.status(400).json({ error: 'الاسم مطلوب' });
      const teacher = clean(body.teacher, 60);
      const note = clean(body.note, 500);

      if (name === old.name && teacher === old.teacher && note === old.note)
        return res.status(200).json(old);

      const now = Date.now();
      const history = [...(old.history || []), { at: now, name: old.name, teacher: old.teacher, note: old.note }];
      await updateDoc(ref, { name, teacher, note, history, updatedAt: now });
      return res.status(200).json({ ...old, name, teacher, note, history, updatedAt: now });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'خطأ في الخادم أو قاعدة البيانات' });
  }
}
