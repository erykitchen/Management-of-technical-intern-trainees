"use client";
import { useState } from 'react';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  // 入力データを管理する変数
  const [formData, setFormData] = useState({
    companyName: "",
    representative: "",
    address: "",
  });

  const handleSave = () => {
    alert(`【仮保存】\n企業名: ${formData.companyName}\nをデータベースに送る準備ができました！`);
    setShowForm(false);
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', color: '#1a73e8' }}>監理団体 管理システム</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ＋ 新規企業登録
        </button>
      </div>

      {/* --- 入力フォーム（モーダル） --- */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '500px', padding: '30px', borderRadius: '10px' }}>
            <h3>実習実施者の新規登録</h3>
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>会社名</label>
              <input 
                type="text" 
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px' }} 
              />
              
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>代表者職氏名</label>
              <input 
                type="text" 
                value={formData.representative}
                onChange={(e) => setFormData({...formData, representative: e.target.value})}
                style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px' }} 
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={handleSave} style={{ flex: 1, padding: '10px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>保存する</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#999', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 以前作ったテーブル等はここに続く...（一旦省略していますが、実際は下に残せます） */}
      <p style={{ color: '#666' }}>※「＋ 新規企業登録」ボタンを押して動作を確認してください。</p>
    </main>
  );
}