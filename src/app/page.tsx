"use client";
import { useState } from 'react';
import { db } from './firebase'; // さっき作ったファイルを読み込む
import { collection, addDoc } from "firebase/firestore"; 

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const handleSave = async () => {
    try {
      // Firebaseにデータを送る命令
      await addDoc(collection(db, "companies"), {
        name: companyName,
        createdAt: new Date()
      });
      alert("データベースに保存しました！");
      setCompanyName("");
      setShowForm(false);
    } catch (e) {
      console.error("エラーが出ました: ", e);
      alert("保存に失敗しました。Firestoreの『ルール』がテストモードになっているか確認してください。");
    }
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>監理団体 管理システム</h1>
      <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        ＋ 新規企業登録
      </button>

      {showForm && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
          <h3>企業登録</h3>
          <input 
            type="text" 
            placeholder="会社名を入力" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={{ padding: '8px', width: '200px', marginRight: '10px' }}
          />
          <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '4px' }}>
            保存
          </button>
          <button onClick={() => setShowForm(false)} style={{ marginLeft: '10px' }}>キャンセル</button>
        </div>
      )}
    </main>
  );
}