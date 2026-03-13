"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// 日本語ラベルの定義
const labelMap: { [key: string]: string } = {
  companyName: "実習実施者氏名又は名称",
  status: "ステータス",
  settlement: "決算時期",
  representative: "代表者職氏名",
  jobType: "職種（小分類）",
  zipCode: "郵便番号",
  address: "住所",
  tel: "TEL",
  joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数",
  acceptance: "受入有無",
  investmentCount: "出資口数",
  investmentAmount: "出資金額",
  investmentDate: "出資年月日",
  corporateNumber: "法人番号",
  laborInsurance: "労働保険番号(14桁)",
  employmentInsurance: "雇用保険事業所番号(11桁)",
  implementationNumber: "実習実施者番号",
  acceptanceDate: "受理日",
  industryCategory: "産業分類",
  officeZip: "事業所郵便番号",
  officeAddress: "事業所住所",
  responsiblePerson: "実習責任者名",
  instructor: "実習指導員名",
  lifeInstructor: "生活指導員名",
  planInstructor: "計画指導員名"
};

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  // 入力フォームの状態
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
    setCompanies(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string, label: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    alert(`【${label}】をコピーしました： ${text}`);
  };

  const handleSave = async () => {
    if (!formData.companyName) return alert("会社名は必須入力です");
    try {
      await addDoc(collection(db, "companies"), { ...formData, createdAt: new Date() });
      alert("データベースに保存しました！");
      setShowForm(false);
      fetchCompanies();
    } catch (e) {
      alert("保存に失敗しました。Firestoreのルールを確認してください。");
    }
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' as 'bold', color: '#555' };
  const sectionTitle = { fontSize: '15px', color: '#1a73e8', borderBottom: '2px solid #eef', paddingBottom: '5px', marginBottom: '15px', marginTop: '10px' };
  const copyBtnStyle = { marginLeft: '8px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', color: '#01579b', borderRadius: '3px' };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f5f7f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', color: '#333' }}>監理団体 業務管理システム</h1>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          ＋ 新規企業登録
        </button>
      </div>

      {/* --- 新規登録フォーム（全項目） --- */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>実習実施者 新規登録</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={sectionTitle}>■ 基本・所在地</h3>
                {["companyName", "representative", "zipCode", "address", "tel", "officeAddress"].map(key => (
                  <div key={key}>
                    <label style={labelStyle}>{labelMap[key]}</label>
                    <input style={inputStyle} type="text" onChange={e => setFormData({...formData, [key]: e.target.value})} />
                  </div>
                ))}
              </div>
              <div>
                <h3 style={sectionTitle}>■ 組合・運営情報</h3>
                <label style={labelStyle}>組合加入年月日</label>
                <input style={inputStyle} type="date" onChange={e => setFormData({...formData, joinedDate: e.target.value})} />
                <label style={labelStyle}>職種（小分類）</label>
                <input style={inputStyle} type="text" onChange={e => setFormData({...formData, jobType: e.target.value})} />
                <label style={labelStyle}>常勤職員数</label>
                <input style={inputStyle} type="number" onChange={e => setFormData({...formData, employeeCount: e.target.value})} />
                <label style={labelStyle}>出資口数 / 金額</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input style={inputStyle} type="text" placeholder="口数" onChange={e => setFormData({...formData, investmentCount: e.target.value})} />
                  <input style={inputStyle} type="text" placeholder="金額" onChange={e => setFormData({...formData, investmentAmount: e.target.value})} />
                </div>
                <label style={labelStyle}>出資年月日</label>
                <input style={inputStyle} type="date" onChange={e => setFormData({...formData, investmentDate: e.target.value})} />
              </div>
              <div>
                <h3 style={sectionTitle}>■ 行政番号・担当者</h3>
                {["corporateNumber", "laborInsurance", "employmentInsurance", "implementationNumber", "responsiblePerson", "instructor"].map(key => (
                  <div key={key}>
                    <label style={labelStyle}>{labelMap[key]}</label>
                    <input style={inputStyle} type="text" onChange={e => setFormData({...formData, [key]: e.target.value})} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={handleSave} style={{ flex: 2, padding: '15px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>保存する</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '15px', backgroundColor: '#eee', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 企業一覧 --- */}
      <div style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>登録済み企業一覧</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {companies.map(c => (
            <div key={c.id} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
              <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedCompanyId === c.id ? '#f0f7ff' : '#fff' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '17px' }}>
                    {c.companyName}
                    <button onClick={() => copy(c.companyName, "会社名")} style={copyBtnStyle}>コピー</button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    実施者番号: {c.implementationNumber || '-'} | 責任者: {c.responsiblePerson || '-'}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCompanyId(selectedCompanyId === c.id ? null : c.id)} 
                  style={{ padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #1a73e8', color: '#1a73e8', background: 'none' }}
                >
                  {selectedCompanyId === c.id ? '詳細を閉じる' : '詳細表示・コピー'}
                </button>
              </div>

              {selectedCompanyId === c.id && (
                <div style={{ padding: '15px', borderTop: '1px solid #eee', backgroundColor: '#fafafa', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {Object.keys(labelMap).map(key => (
                    <div key={key} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ color: '#666', fontWeight: 'bold' }}>{labelMap[key]}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>{c[key] || '-'}</span>
                        {c[key] && <button onClick={() => copy(c[key], labelMap[key])} style={copyBtnStyle}>Copy</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}