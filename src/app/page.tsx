"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// 項目名と日本語ラベルの対応表
const labelMap: { [key: string]: string } = {
  companyName: "実習実施者氏名又は名称",
  status: "ステータス",
  settlement: "決算時期",
  representative: "代表者職氏名",
  jobType: "職種",
  zipCode: "郵便番号",
  address: "住所",
  tel: "TEL",
  joinedDate: "組合加入日",
  employeeCount: "職員数",
  acceptance: "受入有無",
  investmentCount: "出資口数",
  investmentAmount: "出資金額",
  investmentDate: "出資年月日",
  corporateNumber: "法人番号",
  laborInsurance: "労働保険番号",
  employmentInsurance: "雇用保険番号",
  implementationNumber: "実習実施者番号",
  acceptanceDate: "受理日",
  industryCategory: "産業分類",
  officeZip: "事業所郵便番号",
  officeAddress: "事業所住所",
  responsiblePerson: "責任者",
  instructor: "指導員",
  lifeInstructor: "生活指導員",
  planInstructor: "計画指導員"
};

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
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

  const copy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // 小さな通知を出す代わりにアラート（実務ではトースト通知が理想ですが、まずはシンプルに）
  };

  const handleSave = async () => {
    if (!formData.companyName) return alert("会社名は必須です");
    await addDoc(collection(db, "companies"), { ...formData, createdAt: new Date() });
    alert("保存しました");
    setShowForm(false);
    fetchCompanies();
  };

  const copyBtnStyle = { marginLeft: '8px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', color: '#01579b', borderRadius: '3px' };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f5f7f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px' }}>監理団体 業務支援システム</h1>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px' }}>＋ 新規登録</button>
      </div>

      {/* 一覧 */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {companies.map(c => (
          <div key={c.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {c.companyName}
                <button onClick={() => copy(c.companyName)} style={copyBtnStyle}>コピー</button>
              </div>
              <button onClick={() => setSelectedCompanyId(selectedCompanyId === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                {selectedCompanyId === c.id ? '閉じる' : '詳細・コピー'}
              </button>
            </div>

            {selectedCompanyId === c.id && (
              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {Object.keys(labelMap).map(key => (
                  <div key={key} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', padding: '5px', backgroundColor: '#fafafa' }}>
                    <span style={{ color: '#666' }}>{labelMap[key]}</span>
                    <div>
                      <span>{c[key] || '-'}</span>
                      {c[key] && <button onClick={() => copy(c[key])} style={copyBtnStyle}>コピー</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 登録フォーム（省略：前回と同じロジック） */}
      {showForm && (
        <div style={{ /* モーダル表示のスタイル */ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>新規企業登録</h2>
            {/* ここに入力欄を配置（前回と同様） */}
            <button onClick={handleSave} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '5px' }}>保存する</button>
            <button onClick={() => setShowForm(false)} style={{ marginLeft: '10px' }}>キャンセル</button>
          </div>
        </div>
      )}
    </main>
  );
}