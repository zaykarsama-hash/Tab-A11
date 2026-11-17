import { db } from './_db.js';
import { collection, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const snap = await getDocs(collection(db, 'products'));
    const list = snap.docs
      .map(d => d.data())
      .filter(p => p.active !== false)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map(p => ({ id: p.id, name: p.name, price: p.price }));
    return res.status(200).json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'تعذر تحميل المنتجات' });
  }
}
