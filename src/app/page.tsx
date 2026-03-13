"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);

  // データを読み込む機能
  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
  };

  useEffect(() => { fetchCompanies(); }, []);

  // 保存する機能
  const handleSave = async () => {
    if (!companyName) return;
    try {
      await addDoc(collection(db, "companies"), {
        name: companyName,
        createdAt: new Date()
      });
      alert("保存しました！");
      setCompanyName("");
      setShowForm(false);
      fetchCompanies(); // 一覧を更新
    } catch (e) {
      alert("エラー: Firestoreのルールを確認してください");
    }
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>監理団体 管理システム</h1>
      <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px' }}>
        ＋ 新規企業登録
      </button>

      {showForm && (
        <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0', borderRadius: '8px' }}>
          <h3>企業登録</h3>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="会社名" style={{ padding: '8px', marginRight: '10px' }} />
          <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '4px' }}>保存</button>
          <button onClick={() => setShowForm(false)} style={{ marginLeft: '10px' }}>キャンセル</button>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>登録済み企業一覧</h2>
        <ul>
          {companies.map(c => <li key={c.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{c.name}</li>)}
        </ul>
      </div>
    </main>
  );
}