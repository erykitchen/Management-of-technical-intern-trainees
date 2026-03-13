"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";

// --- 1. ラベル・選択肢の定義（コンポーネントの外へ） ---
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

const initialCoForm = {
  settlement: "", companyName: "", representative: "", jobType: "", zipCode: "", address: "", tel: "",
  joinedDate: "", employeeCount: "", acceptance: "有", investmentCount: "", investmentAmount: "",
  investmentPayDate: "", corporateNumber: "", laborInsurance: "", employmentInsurance: "",
  implementationNumber: "", acceptanceDate: "", industryCategory: "", officeZip: "",
  officeAddress: "", responsiblePerson: "", instructor: "", lifeInstructor: "", planInstructor: ""
};

const initialTraineeForm = {
  targetCompanyId: "", status: "認定申請準備中", traineeName: "", kana: "", 
  traineeZip: "", traineeAddress: "", category: "技能実習1号",
  nationality: "", birthday: "", age: "", gender: "男", period: "", stayLimit: "",
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: "", phaseHistory: []
};

// --- 2. 便利関数 ---
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

const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold' };

// --- 3. メインコンポーネント ---
export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<any[]>([]);
  const [coFormData, setCoFormData] = useState<any>(initialCoForm);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [memoData, setMemoData] = useState({ date: new Date().toISOString().split('T')[0], text: "", author: "政所", id: null as number | null });

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) {
      const updated = data.find(c => c.id === currentCo.id);
      if (updated) setCurrentCo(updated);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return alert("会社名は必須です");
    try {
      if (isEditingCo && currentCo) {
        await updateDoc(doc(db, "companies", currentCo.id), coFormData);
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, createdAt: new Date(), history: [], trainees: [] });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? currentCo.id : trFormData.targetCompanyId;
    if (!targetId) return alert("所属先企業を選択してください");

    try {
      const docRef = doc(db, "companies", targetId);
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];

      if (isEditingTr) {
        const oldData = updatedTrainees.find((t: any) => t.id === trFormData.id);
        if (oldData && oldData.category !== trFormData.category) {
          const archiveEntry = { ...oldData, archivedAt: new Date().toISOString(), phaseHistory: undefined };
          trFormData.phaseHistory = [...(oldData.phaseHistory || []), archiveEntry];
        }
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
      } else {
        const { targetCompanyId, ...saveData } = trFormData;
        updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now(), phaseHistory: [] }];
      }

      await updateDoc(docRef, { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleSaveMemo = async () => {
    if (!memoData.text) return;
    try {
      const docRef = doc(db, "companies", currentCo.id);
      let newHistory = [...(currentCo.history || [])];
      if (memoData.id) {
        newHistory = newHistory.map(h => h.id === memoData.id ? { ...memoData } : h);
      } else {
        newHistory.push({ ...memoData, id: Date.now() });
      }
      await updateDoc(docRef, { history: newHistory });
      setMemoData({ date: new Date().toISOString().split('T')[0], text: "", author: "政所", id: null });
      fetchCompanies();
    } catch (e) { alert("メモ保存エラー"); }
  };

  const deleteMemo = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    const docRef = doc(db, "companies", currentCo.id);
    const newHistory = currentCo.history.filter((h: any) => h.id !== id);
    await updateDoc(docRef, { history: newHistory });
    fetchCompanies();
  };

  const cBtn = { width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', borderRadius: '4px', marginLeft: '5px' };

  if (view === 'list') {
    return (
      <main style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', borderLeft: '5px solid #1a73e8', paddingLeft: '15px' }}>監理団体 業務管理システム</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnStyle, backgroundColor: '#34a853', color: '#fff' }}>＋ 新規実習生登録</button>
            <button onClick={() => { setCoFormData(initialCoForm); setIsEditingCo(false); setShowCoForm(true); }} style={{ ...btnStyle, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 新規実施者登録</button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#1a73e8', fontSize: '17px' }}>{c.companyName}</div>
                <div style={{ fontSize: '12px', color: '#777' }}>実習生: {c.trainees?.length || 0}名</div>
              </div>
              <div style={{ color: '#999', fontSize: '12px' }}>詳細を見る ＞</div>
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <button onClick={() => { setView('list'); setSelectedTrId(null); setActiveTab('current'); }} style={{ marginBottom: '20px', cursor: 'pointer' }}>← 一覧に戻る</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h1>{currentCo.companyName}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btnStyle, backgroundColor: '#ff9800', color: '#fff' }}>企業編集</button>
          <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnStyle, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 実習生追加</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
        <aside>
          <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', color: '#1a73e8', marginTop: 0 }}>企業基本データ</h3>
            {Object.keys(labelMapCo).map(k => (
              <div key={k} style={{ fontSize: '11px', borderBottom: '1px solid #eee', padding: '4px 0' }}>
                <div style={{ color: '#888', fontWeight: 'bold' }}>{labelMapCo[k]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{currentCo[k] || '-'}</span><button onClick={() => copy(currentCo[k])} style={cBtn}>C</button></div>
              </div>
            ))}
          </section>
          <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ fontSize: '14px', color: '#34a853', marginTop: 0 }}>対応履歴</h3>
            <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                <input type="date" value={memoData.date} onChange={e => setMemoData({...memoData, date: e.target.value})} style={{ fontSize: '11px' }} />
                <select value={memoData.author} onChange={e => setMemoData({...memoData, author: e.target.value})} style={{ fontSize: '11px' }}>
                  <option value="政所">政所</option><option value="朝比奈">朝比奈</option>
                </select>
              </div>
              <textarea placeholder="メモを入力..." value={memoData.text} onChange={e => setMemoData({...memoData, text: e.target.value})} style={{ width: '100%', height: '50px', fontSize: '12px', marginBottom: '5px' }} />
              <button onClick={handleSaveMemo} style={{ ...btnStyle, backgroundColor: '#34a853', color: '#fff', width: '100%', fontSize: '11px' }}>{memoData.id ? '更新' : '追加'}</button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {(currentCo.history || []).slice().reverse().map((h: any) => (
                <div key={h.id} style={{ padding: '8px', borderLeft: '3px solid #34a853', backgroundColor: '#f0f4f0', fontSize: '12px', marginBottom: '5px' }}>
                  <div style={{ fontSize: '10px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{h.date} | {h.author}</span>
                    <span>
                      <button onClick={() => setMemoData(h)} style={{ fontSize: '10px', marginRight: '5px', border: 'none', background: 'none', cursor: 'pointer', color: '#1a73e8' }}>編集</button>
                      <button onClick={() => deleteMemo(h.id)} style={{ fontSize: '10px', border: 'none', background: 'none', cursor: 'pointer', color: 'red' }}>削除</button>
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{h.text}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0 }}>所属実習生</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {(currentCo.trainees || []).map((t: any) => (
              <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '8px 15px', borderRadius: '20px', border: selectedTrId === t.id ? '2px solid #1a73e8' : '1px solid #ccc', backgroundColor: selectedTrId === t.id ? '#e8f0fe' : '#fff', cursor: 'pointer' }}>{t.traineeName}</button>
            ))}
          </div>
          {currentTrainee && (
            <div>
              <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee', marginBottom: '15px' }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '10px', border: 'none', background: activeTab === 'current' ? '#1a73e8' : 'transparent', color: activeTab === 'current' ? '#fff' : '#666', fontWeight: 'bold', cursor: 'pointer' }}>最新</button>
                {(currentTrainee.phaseHistory || []).map((h: any, idx: number) => (
                  <button key={idx} onClick={() => setActiveTab(idx)} style={{ padding: '10px', border: 'none', background: activeTab === idx ? '#555' : 'transparent', color: activeTab === idx ? '#fff' : '#666', cursor: 'pointer' }}>{h.category}時</button>
                ))}
              </div>
              {(() => {
                const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab];
                return (
                  <div style={{ position: 'relative' }}>
                    {activeTab === 'current' && <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ position: 'absolute', right: 0, top: -45, backgroundColor: '#ff9800', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>編集・更新</button>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 30px' }}>
                      {Object.keys(labelMapTr).map(k => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', padding: '5px 0', fontSize: '13px' }}>
                          <span style={{ color: '#888', fontWeight: 'bold' }}>{labelMapTr[k]}</span>
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
      {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} />}
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} />}
    </main>
  );
}

// --- 4. モーダル用コンポーネント（Homeの外へ出すことで入力不具合を解消） ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>企業 登録/編集</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k}><label style={{ fontSize: '11px', fontWeight: 'bold' }}>{labelMapCo[k]}</label><input type={k.includes('Date') ? 'date' : 'text'} value={coFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} onChange={e => setCoFormData({...coFormData, [k]: e.target.value})} /></div>
          ))}
        </div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveCompany} style={{ ...btnStyle, backgroundColor: '#34a853', color: '#fff', flex: 2 }}>保存</button><button onClick={() => setShowCoForm(false)} style={{ ...btnStyle, backgroundColor: '#eee', flex: 1 }}>キャンセル</button></div>
      </div>
    </div>
  );
}

function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, isEditingTr, companies }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'endDate') newData.renewStartDate = calculateRenewDate(v);
    if (k === 'category' && isEditingTr) {
      if (confirm(`${v}へ変更しますか？現在の情報は履歴へ移動し、一部がリセットされます。`)) {
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
        {!isEditingTr && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #1a73e8' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>所属先企業</label>
            <select style={{ width: '100%', padding: '10px' }} value={trFormData.targetCompanyId} onChange={e => setTrFormData({...trFormData, targetCompanyId: e.target.value})}>
              <option value="">-- 企業を選択 --</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
        )}
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
                <input type={k.includes('Date') || k.includes('Limit') || k === 'birthday' ? 'date' : 'text'} value={trFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', backgroundColor: (k==='age' || k==='renewStartDate') ? '#f0f0f0' : '#fff' }} readOnly={k==='age' || k==='renewStartDate'} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveTrainee} style={{ ...btnStyle, backgroundColor: '#34a853', color: '#fff', flex: 2 }}>保存</button><button onClick={() => setShowTrForm(false)} style={{ ...btnStyle, backgroundColor: '#eee', flex: 1 }}>キャンセル</button></div>
      </div>
    </div>
  );
}