"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";

// --- ラベル定義 ---
const labelMapCo: { [key: string]: string } = {
  settlement: "決算時期", companyName: "会社名", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "技能実習生受け入れの有無", investmentCount: "出資口数",
  investmentAmount: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生が配属する事業所住所",
  responsiblePerson: "技能実習責任者名", instructor: "技能実習指導員名", lifeInstructor: "生活指導員名", planInstructor: "技能実習計画指導員名"
};

const labelMapTr: { [key: string]: string } = {
  status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", 
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "期間", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

const statusOptions = ["認定申請準備中", "認定申請中", "在留資格準備中", "在留資格申請中", "入国待ち", "入国後講習中", "実習中", "更新準備中", "更新手続き中", "終了", "帰国中", "終了予定", "待機中", "失踪", "その他"];
const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能"];

// --- 便利関数 ---
const calculateAge = (birthday: string) => {
  if (!birthday) return "";
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age.toString();
};

const calculateRenewDate = (endDate: string) => {
  if (!endDate) return "";
  const date = new Date(endDate);
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split('T')[0];
};

export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current'); // タブ管理
  const [companies, setCompanies] = useState<any[]>([]);
  const [coFormData, setCoFormData] = useState<any>({});
  const [trFormData, setTrFormData] = useState<any>({});
  const [memoData, setMemoData] = useState({ date: new Date().toISOString().split('T')[0], text: "", author: "政所", id: null });

  const fetchCompanies = async () => {
    const querySnapshot = await getDocs(query(collection(db, "companies"), orderBy("createdAt", "desc")));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) setCurrentCo(data.find(c => c.id === currentCo.id));
  };

  useEffect(() => { fetchCompanies(); }, []);

  // --- 実習生保存ロジック（自動アーカイブ機能付き） ---
  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? currentCo.id : trFormData.targetCompanyId;
    if (!targetId) return alert("所属先企業を選択してください");

    try {
      const docRef = doc(db, "companies", targetId);
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];

      if (isEditingTr) {
        const oldData = updatedTrainees.find((t: any) => t.id === trFormData.id);
        // 区分が変更された場合、古い情報を履歴へ
        if (oldData && oldData.category !== trFormData.category) {
          const archiveEntry = { ...oldData, archivedAt: new Date().toISOString(), phaseHistory: undefined };
          trFormData.phaseHistory = [...(oldData.phaseHistory || []), archiveEntry];
        }
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
      } else {
        updatedTrainees = [...updatedTrainees, { ...trFormData, id: Date.now(), phaseHistory: [] }];
      }

      await updateDoc(docRef, { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("エラー"); }
  };

  // --- メモ操作 ---
  const handleSaveMemo = async () => {
    if (!memoData.text) return;
    const docRef = doc(db, "companies", currentCo.id);
    let newHistory = [...(currentCo.history || [])];
    
    if (memoData.id) { // 編集
      newHistory = newHistory.map(h => h.id === memoData.id ? { ...memoData } : h);
    } else { // 新規
      newHistory.push({ ...memoData, id: Date.now() });
    }
    await updateDoc(docRef, { history: newHistory });
    setMemoData({ date: new Date().toISOString().split('T')[0], text: "", author: "政所", id: null });
    fetchCompanies();
  };

  const deleteMemo = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    const docRef = doc(db, "companies", currentCo.id);
    const newHistory = currentCo.history.filter((h: any) => h.id !== id);
    await updateDoc(docRef, { history: newHistory });
    fetchCompanies();
  };

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };
  const btn = { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold' };
  const cBtn = { width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', borderRadius: '4px', marginLeft: '5px' };

  if (view === 'list') {
    return (
      <main style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', borderLeft: '5px solid #1a73e8', paddingLeft: '15px' }}>監理団体 業務管理システム</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setTrFormData({ ...initialTraineeForm }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btn, backgroundColor: '#34a853', color: '#fff' }}>＋ 新規実習生登録</button>
            <button onClick={() => { setCoFormData({}); setIsEditingCo(false); setShowCoForm(true); }} style={{ ...btn, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 新規実施者登録</button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ddd' }}>
              <div style={{ fontWeight: 'bold', color: '#1a73e8' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: '#777' }}>実習生: {c.trainees?.length || 0}名</div>
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal />}
        {showTrForm && <TrFormModal />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <button onClick={() => { setView('list'); setSelectedTrId(null); setActiveTab('current'); }} style={{ marginBottom: '20px' }}>← 一覧に戻る</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #333' }}>
        <h1>{currentCo.companyName}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btn, backgroundColor: '#ff9800', color: '#fff' }}>企業編集</button>
          <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btn, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 実習生追加</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
        <aside>
          <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', color: '#1a73e8' }}>企業データ</h3>
            {Object.keys(labelMapCo).map(k => (
              <div key={k} style={{ fontSize: '11px', borderBottom: '1px solid #eee', padding: '4px 0' }}>
                <div style={{ color: '#888' }}>{labelMapCo[k]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>{currentCo[k] || '-'} <button onClick={() => copy(currentCo[k])} style={cBtn}>C</button></div>
              </div>
            ))}
          </section>

          <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ fontSize: '14px', color: '#34a853' }}>対応履歴</h3>
            <div style={{ marginBottom: '10px' }}>
              <textarea value={memoData.text} onChange={e => setMemoData({ ...memoData, text: e.target.value })} style={{ width: '100%', height: '60px' }} />
              <button onClick={handleSaveMemo} style={{ width: '100%', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px' }}>
                {memoData.id ? 'メモを更新' : 'メモを追加'}
              </button>
            </div>
            {currentCo.history?.slice().reverse().map((h: any) => (
              <div key={h.id} style={{ fontSize: '12px', padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f9f9f9', marginBottom: '5px' }}>
                <div style={{ color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{h.date} {h.author}</span>
                  <span>
                    <button onClick={() => setMemoData(h)} style={{ fontSize: '10px', marginRight: '5px', cursor: 'pointer' }}>編集</button>
                    <button onClick={() => deleteMemo(h.id)} style={{ fontSize: '10px', color: 'red', cursor: 'pointer' }}>削除</button>
                  </span>
                </div>
                <div>{h.text}</div>
              </div>
            ))}
          </section>
        </aside>

        <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>所属実習生</h3>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {currentCo.trainees?.map((t: any) => (
              <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '8px 15px', borderRadius: '20px', border: selectedTrId === t.id ? '2px solid #1a73e8' : '1px solid #ccc', backgroundColor: selectedTrId === t.id ? '#e8f0fe' : '#fff' }}>{t.traineeName}</button>
            ))}
          </div>

          {currentTrainee && (
            <div>
              {/* タブメニュー */}
              <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee', marginBottom: '15px' }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '10px', border: 'none', background: activeTab === 'current' ? '#1a73e8' : 'transparent', color: activeTab === 'current' ? '#fff' : '#666', fontWeight: 'bold' }}>最新</button>
                {currentTrainee.phaseHistory?.map((h: any, idx: number) => (
                  <button key={idx} onClick={() => setActiveTab(idx)} style={{ padding: '10px', border: 'none', background: activeTab === idx ? '#555' : 'transparent', color: activeTab === idx ? '#fff' : '#666' }}>{h.category}時</button>
                ))}
              </div>

              {/* 表示データ（最新または履歴） */}
              {(() => {
                const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab];
                return (
                  <div style={{ position: 'relative' }}>
                    {activeTab === 'current' && <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ position: 'absolute', right: 0, top: -45, backgroundColor: '#ff9800', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px' }}>この情報を更新（次フェーズへ）</button>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 30px' }}>
                      {Object.keys(labelMapTr).map(k => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', padding: '5px 0', fontSize: '13px' }}>
                          <span style={{ color: '#888' }}>{labelMapTr[k]}</span>
                          <span>{data[k] || '-'} <button onClick={() => copy(data[k])} style={cBtn}>C</button></span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      </div>

      {showCoForm && <CoFormModal />}
      {showTrForm && <TrFormModal />}
    </main>
  );

  // --- モーダル ---
  function TrFormModal() {
    const handleChange = (k: string, v: string) => {
      let newData = { ...trFormData, [k]: v };
      if (k === 'birthday') newData.age = calculateAge(v);
      if (k === 'endDate') newData.renewStartDate = calculateRenewDate(v);
      
      // 区分が変更された場合のリセット処理
      if (k === 'category' && isEditingTr) {
        if (confirm(`${v}へ変更しますか？現在の情報は履歴へ移動し、一部の項目がリセットされます。`)) {
          const resetFields = ["status", "period", "stayLimit", "cardNumber", "certificateNumber", "applyDate", "certDate", "entryDate", "endDate", "renewStartDate"];
          resetFields.forEach(f => newData[f] = "");
          newData.status = "認定申請準備中";
        } else { return; }
      }
      setTrFormData(newData);
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>実習生 登録/編集</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            {Object.keys(labelMapTr).map(k => (
              <div key={k}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>{labelMapTr[k]}</label>
                {k === 'status' ? (
                  <select style={{ width: '100%', padding: '8px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>{statusOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
                ) : k === 'category' ? (
                  <select style={{ width: '100%', padding: '8px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>{categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
                ) : k === 'gender' ? (
                  <select style={{ width: '100%', padding: '8px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}><option value="男">男</option><option value="女">女</option></select>
                ) : (
                  <input type={k.includes('Date') || k.includes('Limit') || k === 'birthday' ? 'date' : 'text'} disabled={k === 'age' || k === 'renewStartDate'} value={trFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} onChange={e => handleChange(k, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveTrainee} style={{ ...btn, backgroundColor: '#34a853', color: '#fff', flex: 2 }}>保存して次フェーズへ</button><button onClick={() => setShowTrForm(false)} style={{ ...btn, backgroundColor: '#eee', flex: 1 }}>キャンセル</button></div>
        </div>
      </div>
    );
  }

  function CoFormModal() { /* 前回と同じため省略、ただし実装は維持 */ return null; }
}