"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";

const labelMap: { [key: string]: string } = {
  settlement: "決算時期", companyName: "会社名", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "技能実習生受け入れの有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生が配属する事業所住所",
  responsiblePerson: "技能実習責任者名", instructor: "技能実習指導員名", lifeInstructor: "生活指導員名", planInstructor: "技能実習計画指導員名"
};

const initialForm = {
  settlement: "", companyName: "", representative: "", jobType: "", zipCode: "", address: "", tel: "",
  joinedDate: "", employeeCount: "", acceptance: "有", investmentCount: "", investmentAmount: "",
  investmentPayDate: "", corporateNumber: "", laborInsurance: "", employmentInsurance: "",
  implementationNumber: "", acceptanceDate: "", industryCategory: "", officeZip: "",
  officeAddress: "", responsiblePerson: "", instructor: "", lifeInstructor: "", planInstructor: ""
};

export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState(initialForm);

  // メモ入力用
  const [memoData, setMemoData] = useState({ date: new Date().toISOString().split('T')[0], text: "", author: "政所" });

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    // 詳細表示中の場合、最新データに更新
    if (currentCompany) {
      const updated = data.find(c => c.id === currentCompany.id);
      if (updated) setCurrentCompany(updated);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  const handleSaveCompany = async () => {
    if (!formData.companyName) return alert("会社名は必須です");
    try {
      if (isEditing && currentCompany) {
        await updateDoc(doc(db, "companies", currentCompany.id), formData);
        alert("更新しました");
      } else {
        await addDoc(collection(db, "companies"), { ...formData, createdAt: new Date(), history: [] });
        alert("保存しました");
      }
      setShowForm(false);
      fetchCompanies();
    } catch (e) { alert("エラーが発生しました"); }
  };

  const handleAddMemo = async () => {
    if (!memoData.text) return alert("メモを入力してください");
    try {
      const docRef = doc(db, "companies", currentCompany.id);
      await updateDoc(docRef, { history: arrayUnion({ ...memoData, id: Date.now() }) });
      setMemoData({ ...memoData, text: "" });
      fetchCompanies();
    } catch (e) { alert("メモの保存に失敗しました"); }
  };

  const commonBtn = { padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold' };
  const cBtn = { width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', borderRadius: '4px', color: '#01579b' };

  if (view === 'detail' && currentCompany) {
    return (
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <button onClick={() => setView('list')} style={{ marginBottom: '20px', cursor: 'pointer' }}>← 一覧に戻る</button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <h1>{currentCompany.companyName}</h1>
          <button onClick={() => { setFormData(currentCompany); setIsEditing(true); setShowForm(true); }} style={{ ...commonBtn, backgroundColor: '#ff9800', color: '#fff' }}>情報を編集する</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
          {/* 左側：企業詳細（履歴書風） */}
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', border: '1px solid #ddd' }}>
            <h3 style={{ borderBottom: '2px solid #1a73e8', paddingBottom: '10px' }}>企業基本情報</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {Object.keys(labelMap).map(key => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <span style={{ color: '#666', fontWeight: 'bold' }}>{labelMap[key]}</span>
                  <div>
                    <span style={{ marginRight: '8px' }}>{currentCompany[key] || '-'}</span>
                    {currentCompany[key] && <button onClick={() => copy(currentCompany[key])} style={cBtn}>C</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：履歴・共有事項 */}
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', border: '1px solid #ddd' }}>
            <h3 style={{ borderBottom: '2px solid #34a853', paddingBottom: '10px' }}>対応履歴・共有事項</h3>
            
            {/* メモ入力エリア */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="date" value={memoData.date} onChange={e => setMemoData({...memoData, date: e.target.value})} style={{ padding: '5px' }} />
                <select value={memoData.author} onChange={e => setMemoData({...memoData, author: e.target.value})} style={{ padding: '5px' }}>
                  <option value="政所">政所</option>
                  <option value="朝比奈">朝比奈</option>
                </select>
              </div>
              <textarea placeholder="共有事項を入力..." value={memoData.text} onChange={e => setMemoData({...memoData, text: e.target.value})} style={{ width: '100%', height: '80px', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <button onClick={handleAddMemo} style={{ ...commonBtn, backgroundColor: '#34a853', color: '#fff', width: '100%' }}>メモを追加</button>
            </div>

            {/* 履歴リスト */}
            <div style={{ display: 'grid', gap: '10px' }}>
              {(currentCompany.history || []).slice().reverse().map((h: any) => (
                <div key={h.id} style={{ padding: '10px', borderLeft: '4px solid #34a853', backgroundColor: '#f0f4f0', fontSize: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{h.date} | 記入者: {h.author}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{h.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 編集用モーダルは一覧画面と共通 */}
        {showForm && <EditModal />}
      </main>
    );
  }

  // 一覧画面
  return (
    <main style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px' }}>監理団体 業務管理システム</h1>
        <button onClick={handleOpenNew} style={{ ...commonBtn, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 新規実施者登録</button>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {companies.map(c => (
          <div key={c.id} onClick={() => { setCurrentCompany(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', transition: '0.2s' }}>
            <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#1a73e8' }}>{c.companyName}</div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '5px' }}>
              実施者番号: {c.implementationNumber || '-'} | 最新履歴: {c.history?.length > 0 ? c.history[c.history.length-1].text.substring(0, 30) + "..." : "なし"}
            </div>
          </div>
        ))}
      </div>
      {showForm && <EditModal />}
    </main>
  );

  function handleOpenNew() { setFormData(initialForm); setIsEditing(false); setShowForm(true); }

  function EditModal() {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
        <div style={{ backgroundColor: '#fff', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
          <h2>{isEditing ? '情報の編集' : '新規登録'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            {/* フォーム項目（前回のロジックと同じ） */}
            <div>
              <h3 style={sectionTitle}>基本・所在地</h3>
              {["companyName", "representative", "zipCode", "address", "tel", "officeZip", "officeAddress"].map(k => (
                <div key={k}><label style={labelStyle}>{labelMap[k]}</label><input style={inputStyle} type="text" value={(formData as any)[k]} onChange={e => setFormData({...formData, [k]: e.target.value})} /></div>
              ))}
            </div>
            <div>
              <h3 style={sectionTitle}>運営・出資</h3>
              {["settlement", "jobType", "joinedDate", "employeeCount", "acceptance", "investmentCount", "investmentAmount", "investmentPayDate"].map(k => (
                <div key={k}><label style={labelStyle}>{labelMap[k]}</label><input style={inputStyle} type={k.includes('Date') ? 'date' : 'text'} value={(formData as any)[k]} onChange={e => setFormData({...formData, [k]: e.target.value})} /></div>
              ))}
            </div>
            <div>
              <h3 style={sectionTitle}>行政番号・指導員</h3>
              {["corporateNumber", "laborInsurance", "employmentInsurance", "implementationNumber", "acceptanceDate", "industryCategory", "responsiblePerson", "instructor", "lifeInstructor", "planInstructor"].map(k => (
                <div key={k}><label style={labelStyle}>{labelMap[k]}</label><input style={inputStyle} type="text" value={(formData as any)[k]} onChange={e => setFormData({...formData, [k]: e.target.value})} /></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button onClick={handleSaveCompany} style={{ ...commonBtn, flex: 2, backgroundColor: '#34a853', color: '#fff' }}>保存</button>
            <button onClick={() => setShowForm(false)} style={{ ...commonBtn, flex: 1, backgroundColor: '#eee' }}>キャンセル</button>
          </div>
        </div>
      </div>
    );
  }
}

const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px' };
const labelStyle = { display: 'block', marginBottom: '2px', fontSize: '11px', fontWeight: 'bold' as 'bold', color: '#555' };
const sectionTitle = { fontSize: '14px', color: '#1a73e8', borderBottom: '2px solid #eef', paddingBottom: '5px', marginBottom: '10px' };