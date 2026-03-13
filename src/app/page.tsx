"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";

// 企業項目ラベル
const labelMapCo: { [key: string]: string } = {
  settlement: "決算時期", companyName: "会社名", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "技能実習生受け入れの有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生が配属する事業所住所",
  responsiblePerson: "技能実習責任者名", instructor: "技能実習指導員名", lifeInstructor: "生活指導員名", planInstructor: "技能実習計画指導員名"
};

// 実習生項目ラベル（27項目）
const labelMapTr: { [key: string]: string } = {
  status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", traineeAddress: "住所",
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "期間", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

const initialTraineeForm = {
  status: "実習中", traineeName: "", kana: "", traineeAddress: "", category: "1号",
  nationality: "", birthday: "", age: "", gender: "男", period: "", stayLimit: "",
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: ""
};

export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [memoData, setMemoData] = useState({ date: new Date().toISOString().split('T')[0], text: "", author: "政所" });

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) setCurrentCo(data.find(c => c.id === currentCo.id));
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  // 実習生保存（新規・編集両対応）
  const handleSaveTrainee = async () => {
    if (!trFormData.traineeName) return alert("氏名は必須です");
    try {
      const docRef = doc(db, "companies", currentCo.id);
      let updatedTrainees = currentCo.trainees || [];

      if (isEditingTr) {
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
      } else {
        updatedTrainees = [...updatedTrainees, { ...trFormData, id: Date.now() }];
      }

      await updateDoc(docRef, { trainees: updatedTrainees });
      alert(isEditingTr ? "更新しました" : "登録しました");
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存に失敗しました"); }
  };

  const handleOpenEditTr = (trainee: any) => {
    setTrFormData(trainee);
    setIsEditingTr(true);
    setShowTrForm(true);
  };

  const handleAddMemo = async () => {
    if (!memoData.text) return alert("メモを入力");
    await updateDoc(doc(db, "companies", currentCo.id), { history: arrayUnion({ ...memoData, id: Date.now() }) });
    setMemoData({ ...memoData, text: "" });
    fetchCompanies();
  };

  const btn = { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold' };
  const cBtn = { width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', borderRadius: '4px', marginLeft: '5px' };

  if (view === 'detail' && currentCo) {
    return (
      <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ marginBottom: '20px', cursor: 'pointer' }}>← 企業一覧に戻る</button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          <h1>{currentCo.companyName} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>（実習実施者詳細）</span></h1>
          <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btn, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 新規実習生を登録</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px' }}>
          {/* 左：企業情報 & メモ */}
          <aside>
            <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>企業基本データ</h3>
              {["implementationNumber", "representative", "tel", "address"].map(k => (
                <div key={k} style={{ fontSize: '12px', marginBottom: '5px' }}>
                  <div style={{ color: '#888' }}>{labelMapCo[k]}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{currentCo[k] || '-'}</span>
                    <button onClick={() => copy(currentCo[k])} style={cBtn}>C</button>
                  </div>
                </div>
              ))}
            </section>

            <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>共有メモ</h3>
              <textarea value={memoData.text} onChange={e => setMemoData({...memoData, text: e.target.value})} style={{ width: '100%', height: '60px', marginBottom: '5px' }} />
              <button onClick={handleAddMemo} style={{ ...btn, backgroundColor: '#34a853', color: '#fff', width: '100%', fontSize: '12px' }}>メモ追加</button>
              <div style={{ marginTop: '10px', maxHeight: '300px', overflowY: 'auto', fontSize: '12px' }}>
                {(currentCo.history || []).slice().reverse().map((h: any) => (
                  <div key={h.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                    <span style={{ color: '#999' }}>{h.date} {h.author}</span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{h.text}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* 右：所属実習生一覧 & 詳細 */}
          <section>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ marginTop: 0 }}>所属実習生一覧</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {(currentCo.trainees || []).map((t: any) => (
                  <button 
                    key={t.id} 
                    onClick={() => setSelectedTrId(t.id)}
                    style={{ padding: '10px 15px', borderRadius: '20px', border: selectedTrId === t.id ? '2px solid #1a73e8' : '1px solid #ccc', backgroundColor: selectedTrId === t.id ? '#e8f0fe' : '#fff', cursor: 'pointer' }}
                  >
                    {t.traineeName}
                  </button>
                ))}
              </div>

              {selectedTrId && (
                <div style={{ border: '1px solid #1a73e8', borderRadius: '8px', padding: '20px', backgroundColor: '#fcfcfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#1a73e8' }}>実習生詳細：{currentCo.trainees.find((t:any)=>t.id===selectedTrId).traineeName}</h2>
                    <button onClick={() => handleOpenEditTr(currentCo.trainees.find((t:any)=>t.id===selectedTrId))} style={{ ...btn, backgroundColor: '#ff9800', color: '#fff', fontSize: '12px' }}>この実習生を編集</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 30px' }}>
                    {Object.keys(labelMapTr).map(k => {
                      const val = currentCo.trainees.find((t:any)=>t.id===selectedTrId)[k];
                      return (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '6px 0', fontSize: '13px' }}>
                          <span style={{ fontWeight: 'bold', color: '#555' }}>{labelMapTr[k]}</span>
                          <span>
                            {val || '-'}
                            {val && <button onClick={() => copy(val)} style={cBtn}>C</button>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 実習生フォームモーダル */}
        {showTrForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2>{isEditingTr ? '実習生情報の編集' : '実習生の新規登録'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                {Object.keys(labelMapTr).map(k => (
                  <div key={k}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>{labelMapTr[k]}</label>
                    <input 
                      type={k.includes('Date') || k.includes('Limit') || k === 'birthday' ? 'date' : 'text'} 
                      value={trFormData[k] || ''}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
                      onChange={e => setTrFormData({...trFormData, [k]: e.target.value})} 
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveTrainee} style={{ ...btn, backgroundColor: '#34a853', color: '#fff', flex: 2 }}>{isEditingTr ? '更新を保存' : '登録保存'}</button>
                <button onClick={() => setShowTrForm(false)} style={{ ...btn, backgroundColor: '#eee', flex: 1 }}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // 企業一覧
  return (
    <main style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', borderLeft: '5px solid #1a73e8', paddingLeft: '15px' }}>監理団体 業務管理システム</h1>
      <div style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
        {companies.map(c => (
          <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 'bold', color: '#1a73e8', fontSize: '18px' }}>{c.companyName}</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
              所属実習生: <span style={{ color: '#333', fontWeight: 'bold' }}>{c.trainees?.length || 0}名</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}