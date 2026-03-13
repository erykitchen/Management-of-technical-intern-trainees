"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: "", status: "受入中", settlement: "", representative: "", jobType: "",
    zipCode: "", address: "", tel: "", joinedDate: "", employeeCount: "",
    acceptance: "有", investmentCount: "", investmentAmount: "", investmentDate: "",
    corporateNumber: "", laborInsurance: "", employmentInsurance: "", implementationNumber: "",
    acceptanceDate: "", industryCategory: "", officeZip: "", officeAddress: "",
    responsiblePerson: "", instructor: "", lifeInstructor: "", planInstructor: ""
  });

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
  };

  useEffect(() => { fetchCompanies(); }, []);

  // クリップボードにコピーする関数
  const copyToClipboard = (text: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    alert(`コピーしました: ${text}`);
  };

  const handleSave = async () => {
    if (!formData.companyName) {
      alert("会社名は必須入力です");
      return;
    }
    try {
      await addDoc(collection(db, "companies"), { ...formData, createdAt: new Date() });
      alert("保存しました！");
      setShowForm(false);
      fetchCompanies();
    } catch (e) {
      alert("保存エラーが発生しました");
    }
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' as 'bold', color: '#555' };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f5f7f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px' }}>監理団体 統合管理システム</h1>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          ＋ 新規企業登録
        </button>
      </div>

      {/* --- 新規登録フォーム（中略：前回と同じ） --- */}
      {/* ... (showForm && <div>...</div>) ... */}

      {/* 企業一覧 */}
      <div style={{ marginTop: '20px' }}>
        <h2>登録済み企業一覧</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {companies.map(c => (
            <div key={c.id} style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {c.companyName}
                    <button onClick={() => copyToClipboard(c.companyName)} style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '3px' }}>コピー</button>
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                    実施者番号: {c.implementationNumber || '-'} 
                    <button onClick={() => copyToClipboard(c.implementationNumber)} style={{ fontSize: '10px', marginLeft: '5px', cursor: 'pointer' }}>📋</button>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCompany(c)}
                  style={{ padding: '5px 15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  詳細表示
                </button>
              </div>

              {/* 詳細が選ばれた時に、コピーボタン付きのリストを表示 */}
              {selectedCompany?.id === c.id && (
                <div style={{ marginTop: '15px', padding: '15px', borderTop: '1px solid #eee', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#fafafa' }}>
                  {Object.entries(c).map(([key, value]) => {
                    if (key === 'id' || key === 'createdAt') return null;
                    return (
                      <div key={key} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ color: '#888' }}>{key}:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{String(value) || '-'}</span>
                          {value && <button onClick={() => copyToClipboard(String(value))} style={{ fontSize: '10px', cursor: 'pointer', border: 'none', background: '#e1f5fe', color: '#01579b', borderRadius: '2px' }}>Copy</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}