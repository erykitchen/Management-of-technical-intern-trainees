"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";

const labelMap: { [key: string]: string } = {
  settlement: "決算時期",
  companyName: "会社名",
  representative: "代表者氏名",
  jobType: "職種（小分類）",
  zipCode: "郵便番号",
  address: "住所",
  tel: "TEL",
  joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数",
  acceptance: "技能実習生受け入れの有無",
  investmentCount: "出資口数",
  investmentAmount: "出資金額",
  investmentPayDate: "出資金払込年月日",
  corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）",
  employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号",
  acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類",
  officeZip: "事業所郵便番号",
  officeAddress: "技能実習生が配属する事業所住所",
  responsiblePerson: "技能実習責任者名",
  instructor: "技能実習指導員名",
  lifeInstructor: "生活指導員名",
  planInstructor: "技能実習計画指導員名"
};

const initialForm = {
  settlement: "", companyName: "", representative: "", jobType: "", zipCode: "",
  address: "", tel: "", joinedDate: "", employeeCount: "", acceptance: "有",
  investmentCount: "", investmentAmount: "", investmentPayDate: "", corporateNumber: "",
  laborInsurance: "", employmentInsurance: "", implementationNumber: "", acceptanceDate: "",
  industryCategory: "", officeZip: "", officeAddress: "", responsiblePerson: "",
  instructor: "", lifeInstructor: "", planInstructor: ""
};

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    setCompanies(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleOpenNew = () => {
    setFormData(initialForm);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (company: any) => {
    setFormData({ ...company });
    setCurrentDocId(company.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.companyName) return alert("会社名は必須入力です");
    try {
      if (isEditing && currentDocId) {
        // 編集（更新）処理
        const docRef = doc(db, "companies", currentDocId);
        const { id, ...updateData } = formData as any; // idを除外して保存
        await updateDoc(docRef, updateData);
        alert("更新が完了しました");
      } else {
        // 新規登録処理
        await addDoc(collection(db, "companies"), { ...formData, createdAt: new Date() });
        alert("保存が完了しました");
      }
      setShowForm(false);
      fetchCompanies();
    } catch (e) {
      alert("エラーが発生しました。");
    }
  };

  const inputStyle = { width: '100%', padding: '8px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '4px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' as 'bold', color: '#444' };
  const sectionTitle = { fontSize: '14px', color: '#1a73e8', borderBottom: '2px solid #1a73e8', paddingBottom: '3px', marginBottom: '15px', marginTop: '15px' };

  return (
    <main style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px' }}>監理団体 業務管理システム</h1>
        <button onClick={handleOpenNew} style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          ＋ 新規実施者登録
        </button>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
            <h2 style={{ marginTop: 0 }}>{isEditing ? '実習実施者情報の編集' : '新規実習実施者登録'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
              <div>
                <h3 style={sectionTitle}>基本情報・所在地</h3>
                <label style={labelStyle}>会社名</label>
                <input style={inputStyle} type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                <label style={labelStyle}>代表者氏名</label>
                <input style={inputStyle} type="text" value={formData.representative} onChange={e => setFormData({...formData, representative: e.target.value})} />
                <label style={labelStyle}>郵便番号</label>
                <input style={inputStyle} type="text" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                <label style={labelStyle}>住所</label>
                <input style={inputStyle} type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                <label style={labelStyle}>TEL</label>
                <input style={inputStyle} type="text" value={formData.tel} onChange={e => setFormData({...formData, tel: e.target.value})} />
                <label style={labelStyle}>事業所郵便番号</label>
                <input style={inputStyle} type="text" value={formData.officeZip} onChange={e => setFormData({...formData, officeZip: e.target.value})} />
                <label style={labelStyle}>技能実習生が配属する事業所住所</label>
                <input style={inputStyle} type="text" value={formData.officeAddress} onChange={e => setFormData({...formData, officeAddress: e.target.value})} />
              </div>
              <div>
                <h3 style={sectionTitle}>運営・出資情報</h3>
                <label style={labelStyle}>決算時期</label>
                <input style={inputStyle} type="text" value={formData.settlement} onChange={e => setFormData({...formData, settlement: e.target.value})} />
                <label style={labelStyle}>職種（小分類）</label>
                <input style={inputStyle} type="text" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})} />
                <label style={labelStyle}>組合加入年月日</label>
                <input style={inputStyle} type="date" value={formData.joinedDate} onChange={e => setFormData({...formData, joinedDate: e.target.value})} />
                <label style={labelStyle}>常勤職員数</label>
                <input style={inputStyle} type="number" value={formData.employeeCount} onChange={e => setFormData({...formData, employeeCount: e.target.value})} />
                <label style={labelStyle}>技能実習生受け入れの有無</label>
                <select style={inputStyle} value={formData.acceptance} onChange={e => setFormData({...formData, acceptance: e.target.value})}>
                  <option value="有">有</option><option value="無">無</option>
                </select>
                <label style={labelStyle}>出資口数 / 金額</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input style={inputStyle} type="text" placeholder="口数" value={formData.investmentCount} onChange={e => setFormData({...formData, investmentCount: e.target.value})} />
                  <input style={inputStyle} type="text" placeholder="金額" value={formData.investmentAmount} onChange={e => setFormData({...formData, investmentAmount: e.target.value})} />
                </div>
                <label style={labelStyle}>出資金払込年月日</label>
                <input style={inputStyle} type="date" value={formData.investmentPayDate} onChange={e => setFormData({...formData, investmentPayDate: e.target.value})} />
              </div>
              <div>
                <h3 style={sectionTitle}>行政番号・指導員</h3>
                {["corporateNumber", "laborInsurance", "employmentInsurance", "implementationNumber", "acceptanceDate", "industryCategory", "responsiblePerson", "instructor", "lifeInstructor", "planInstructor"].map(key => (
                  <div key={key}>
                    <label style={labelStyle}>{labelMap[key]}</label>
                    <input style={inputStyle} type="text" value={(formData as any)[key]} onChange={e => setFormData({...formData, [key]: e.target.value})} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button onClick={handleSave} style={{ flex: 2, padding: '15px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isEditing ? '更新内容を保存' : '新規保存'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '15px', backgroundColor: '#eee', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        {companies.map(c => (
          <div key={c.id} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
            <div style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{c.companyName}</div>
                <div style={{ fontSize: '12px', color: '#777' }}>実施者番号: {c.implementationNumber || '-'}</div>
              </div>
              <button onClick={() => setSelectedId(selectedId === c.id ? null : c.id)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #1a73e8', color: '#1a73e8', cursor: 'pointer', background: 'none' }}>
                {selectedId === c.id ? '詳細を閉じる' : '詳細表示'}
              </button>
            </div>
            {selectedId === c.id && (
              <div style={{ padding: '20px', backgroundColor: '#fafafa', borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <button onClick={() => handleOpenEdit(c)} style={{ padding: '6px 15px', backgroundColor: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    このデータを編集する
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                  {Object.keys(labelMap).map(key => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                      <span style={{ color: '#666', fontWeight: 'bold' }}>{labelMap[key]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#333' }}>{c[key] || '-'}</span>
                        {c[key] && (
                          <button onClick={() => copy(c[key])} title="コピー" style={{ width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', borderRadius: '4px', color: '#01579b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            C
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}