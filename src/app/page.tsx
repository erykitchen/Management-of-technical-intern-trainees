"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";

// --- 1. 定義・ラベル ---
const labelMapCo: { [key: string]: string } = {
  settlement: "決算時期", companyName: "会社名", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "技能実習生受け入れの有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生住所",
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
const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
const nationalityOptions = ["ベトナム", "中国", "インドネシア", "フィリピン", "ミャンマー", "カンボジア", "タイ", "その他（手入力）"];

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
  const cleanDate = birthday.replace(/\//g, '-');
  const birthDate = new Date(cleanDate);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) age--;
  return age.toString();
};

const calculateDates = (entryDateStr: string) => {
  const date = new Date(entryDateStr.replace(/\//g, '-'));
  if (isNaN(date.getTime())) return { end: "", renew: "" };
  const endDate = new Date(date);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  const renewDate = new Date(endDate);
  renewDate.setMonth(renewDate.getMonth() - 3);
  const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '/');
  return { end: fmt(endDate), renew: fmt(renewDate) };
};

// --- 3. スタイル設定 ---
const colors = { main: '#ffe0b2', sub: '#f57c00', bg: '#fdfdfd', light: '#fff8f0', border: '#ffcc80', accentRed: '#d32f2f' };
const sharpRadius = '6px';
const btnStyle = { padding: '10px 20px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold', transition: '0.2s' };
const cBtn = { width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #ffcc80', borderRadius: '4px', color: '#f57c00', marginLeft: '8px' };

// --- 4. メイン ---
export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<any[]>([]);
  const [coFormData, setCoFormData] = useState<any>({});
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) setCurrentCo(data.find(c => c.id === currentCo.id));
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  const alerts = companies.flatMap(c => (c.trainees || []).map((t: any) => ({ ...t, companyName: c.companyName, companyId: c.id })))
    .filter(t => {
      if (t.category === "実習終了" || !t.renewStartDate) return false;
      const today = new Date();
      const target = new Date(t.renewStartDate.replace(/\//g, '-'));
      const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    });

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? currentCo.id : trFormData.targetCompanyId;
    try {
      const docRef = doc(db, "companies", targetId);
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      if (isEditingTr) {
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

  if (view === 'list') {
    return (
      <main style={{ padding: '30px', backgroundColor: '#f9f9f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', background: colors.main, padding: '20px', borderRadius: sharpRadius, color: '#5d4037' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>アシストねっと協同組合　技能実習生管理システム</h1>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnStyle, backgroundColor: '#fff', color: colors.sub }}>＋ 新規実習生</button>
            <button onClick={() => { setCoFormData({}); setShowCoForm(true); }} style={{ ...btnStyle, backgroundColor: 'rgba(255,255,255,0.4)', color: '#5d4037' }}>＋ 新規実施者</button>
          </div>
        </header>

        {alerts.length > 0 && (
          <section style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: sharpRadius, border: `1px solid ${colors.accentRed}` }}>
            <h2 style={{ fontSize: '15px', color: colors.accentRed, marginTop: 0 }}>⚠️ 確認必須リスト</h2>
            <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
              {alerts.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px' }}>
                  <button onClick={() => { setCurrentCo(companies.find(c => c.id === t.companyId)); setView('detail'); setSelectedTrId(t.id); }} style={{ padding: '5px 12px', background: colors.accentRed, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {t.traineeName} ({t.companyName})
                  </button>
                  <span style={{ color: colors.accentRed }}>理由：更新手続き期限が近い実習生（30日以内）</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {companies.map(c => {
            const activeCount = (c.trainees || []).filter((t: any) => t.category !== "実習終了").length;
            return (
              <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: sharpRadius, cursor: 'pointer', border: '1px solid #eee' }}>
                <div style={{ fontWeight: 'bold', color: '#000', fontSize: '16px', marginBottom: '10px' }}>{c.companyName}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>現在受入人数：<span style={{ color: colors.sub, fontWeight: 'bold' }}>{activeCount} 名</span></div>
              </div>
            );
          })}
        </div>
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ padding: '20px', backgroundColor: colors.bg, minHeight: '100vh' }}>
      <button onClick={() => { setView('list'); setSelectedTrId(null); setActiveTab('current'); }} style={{ border: 'none', background: 'none', color: '#666', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>← 会社一覧に戻る</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        <aside style={{ backgroundColor: '#fff', padding: '20px', borderRadius: sharpRadius, border: '1px solid #eee' }}>
          <h2 style={{ color: '#000', fontSize: '18px', borderBottom: `2px solid ${colors.main}`, paddingBottom: '10px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '8px', fontSize: '11px' }}>
              <span style={{ color: '#999', display: 'block' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#333' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={cBtn}>C</button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ backgroundColor: '#fff', padding: '25px', borderRadius: sharpRadius, border: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>所属実習生一覧</h3>
          
          {categoryOptions.map(cat => {
            const list = (currentCo.trainees || []).filter((t: any) => t.category === cat);
            if (list.length === 0) return null;
            const isFinished = cat === "実習終了";
            return (
              <div key={cat} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: isFinished ? '#bbb' : colors.sub, marginBottom: '8px', borderLeft: `3px solid ${isFinished ? '#ddd' : colors.main}`, paddingLeft: '8px' }}>{cat}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {list.map((t: any) => (
                    <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '6px 15px', borderRadius: sharpRadius, border: selectedTrId === t.id ? `2px solid ${colors.sub}` : '1px solid #ddd', backgroundColor: selectedTrId === t.id ? colors.light : '#fff', color: isFinished ? '#aaa' : (selectedTrId === t.id ? colors.sub : '#666'), cursor: 'pointer', fontSize: '13px' }}>{t.traineeName}</button>
                  ))}
                </div>
              </div>
            );
          })}

          {currentTrainee && (
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '-1px' }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '8px 20px', border: '1px solid #eee', borderBottom: activeTab === 'current' ? 'none' : '1px solid #eee', borderRadius: `${sharpRadius} ${sharpRadius} 0 0`, background: activeTab === 'current' ? colors.light : '#f9f9f9', color: colors.sub, fontWeight: 'bold', cursor: 'pointer', zIndex: 1 }}>最新</button>
                {([...(currentTrainee.phaseHistory || [])].reverse()).map((h: any, idx: number) => {
                   const originalIdx = currentTrainee.phaseHistory.length - 1 - idx;
                   return (
                     <button key={idx} onClick={() => setActiveTab(originalIdx)} style={{ padding: '8px 20px', border: '1px solid #eee', borderBottom: activeTab === originalIdx ? 'none' : '1px solid #eee', borderRadius: `${sharpRadius} ${sharpRadius} 0 0`, background: activeTab === originalIdx ? '#eee' : '#f9f9f9', color: '#999', cursor: 'pointer' }}>{h.category}時</button>
                   );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 30px', backgroundColor: colors.light, padding: '20px', borderRadius: `0 ${sharpRadius} ${sharpRadius} ${sharpRadius}`, border: '1px solid #eee' }}>
                {Object.keys(labelMapTr).map(k => {
                  const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab];
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, padding: '6px 0', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>{labelMapTr[k]}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: currentTrainee.category === "実習終了" ? "#888" : "#333" }}>{ data[k] || '-' }</span>
                        <button onClick={() => copy(data[k])} style={cBtn}>C</button>
                      </div>
                    </div>
                  );
                })}
                {activeTab === 'current' && <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ gridColumn: 'span 2', marginTop: '15px', ...btnStyle, backgroundColor: colors.sub, color: '#fff' }}>編集・区分変更</button>}
              </div>
            </div>
          )}
        </section>
      </div>
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} />}
    </main>
  );
}

// --- 5. モーダル ---
function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, isEditingTr, companies, colors }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') {
      const { end, renew } = calculateDates(v);
      newData.endDate = end;
      newData.renewStartDate = renew;
    }
    if (k === 'category' && isEditingTr) {
      if (confirm("区分を変更します。現在のデータは履歴に保存され、情報を最新状態で編集できるようになります。")) {
        const archiveEntry = { ...trFormData };
        delete archiveEntry.phaseHistory;
        newData.phaseHistory = [...(trFormData.phaseHistory || []), archiveEntry];
      }
    }
    setTrFormData(newData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: sharpRadius, width: '90%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ color: colors.sub, fontSize: '18px', marginBottom: '20px' }}>実習生データ登録/編集</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ padding: '10px', backgroundColor: colors.light, borderRadius: sharpRadius }}>
              <label style={{ fontSize: '11px', color: colors.sub, fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{labelMapTr[k]}</label>
              { k === 'nationality' ? (
                <select style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} value={nationalityOptions.includes(trFormData[k]) ? trFormData[k] : "その他（手入力）"} onChange={e => handleChange(k, e.target.value)}>
                  {nationalityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'category' ? (
                <select style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input 
                  type="text" 
                  placeholder={ (k==='endDate' || k==='renewStartDate') ? '（入力不要）' : '2026/03/13' }
                  value={trFormData[k] || ''} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
                  onChange={e => handleChange(k, e.target.value)} 
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '25px', display: 'flex', gap: '15px' }}>
          <button onClick={handleSaveTrainee} style={{ ...btnStyle, backgroundColor: colors.sub, color: '#fff', flex: 2 }}>保存する</button>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnStyle, backgroundColor: '#eee', color: '#666', flex: 1 }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}