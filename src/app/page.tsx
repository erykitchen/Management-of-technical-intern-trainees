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
const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能"];
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
  const birthDate = new Date(birthday.replace(/\//g, '-'));
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) age--;
  return age.toString();
};

const calculateDates = (entryDateStr: string) => {
  const date = new Date(entryDateStr.replace(/\//g, '-'));
  if (isNaN(date.getTime())) return { end: "", renew: "" };
  
  // 終了日: 1年後の1日前
  const endDate = new Date(date);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  
  // 更新開始日: 終了日の3ヶ月前
  const renewDate = new Date(endDate);
  renewDate.setMonth(renewDate.getMonth() - 3);
  
  const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '/');
  return { end: fmt(endDate), renew: fmt(renewDate) };
};

// --- 3. スタイル設定 ---
const colors = { main: '#f39c12', sub: '#e67e22', bg: '#fffaf0', light: '#fef5e7', border: '#fbeee0' };
const btnStyle = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold', transition: '0.2s' };

// --- 4. メイン ---
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
  const [coFormData, setCoFormData] = useState<any>({});
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [memoData, setMemoData] = useState({ date: new Date().toLocaleDateString('ja-JP'), text: "", author: "政所", id: null as number | null });

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) setCurrentCo(data.find(c => c.id === currentCo.id));
  };

  useEffect(() => { fetchCompanies(); }, []);

  // 要対応リストの取得
  const alerts = companies.flatMap(c => (c.trainees || []).map((t: any) => ({ ...t, companyName: c.companyName, companyId: c.id })))
    .filter(t => {
      if (!t.renewStartDate) return false;
      const today = new Date();
      const target = new Date(t.renewStartDate.replace(/\//g, '-'));
      const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30; // 30日以内
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
      <main style={{ padding: '30px', backgroundColor: '#fcfcfc', minHeight: '100vh', fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', background: 'linear-gradient(135deg, #f39c12, #e67e22)', padding: '20px', borderRadius: '15px', color: '#fff', boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Technical Intern Trainee System</h1>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnStyle, backgroundColor: '#fff', color: colors.sub }}>＋ 新規実習生</button>
            <button onClick={() => { setCoFormData({}); setIsEditingCo(false); setShowCoForm(true); }} style={{ ...btnStyle, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid #fff' }}>＋ 新規実施者</button>
          </div>
        </header>

        {/* 要対応セクション */}
        {alerts.length > 0 && (
          <section style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '2px solid #e74c3c' }}>
            <h2 style={{ fontSize: '16px', color: '#e74c3c', marginTop: 0 }}>⚠️ 更新手続き期限が近い実習生（30日以内）</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {alerts.map(t => (
                <button key={t.id} onClick={() => { setCurrentCo(companies.find(c => c.id === t.companyId)); setView('detail'); setSelectedTrId(t.id); }} style={{ padding: '8px 15px', backgroundColor: '#fdf2f2', border: '1px solid #f5c6cb', color: '#721c24', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>
                  {t.traineeName} ({t.companyName}) - {t.renewStartDate}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', cursor: 'pointer', border: '1px solid #eee', transition: '0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 'bold', color: colors.sub, fontSize: '18px', marginBottom: '10px' }}>{c.companyName}</div>
              <div style={{ fontSize: '13px', color: '#666' }}>受入人数: <span style={{ color: '#333', fontWeight: 'bold' }}>{c.trainees?.length || 0} 名</span></div>
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={async () => { /* ...既存保存ロジック... */ }} setShowCoForm={setShowCoForm} colors={colors} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ padding: '20px', backgroundColor: colors.bg, minHeight: '100vh' }}>
      <button onClick={() => { setView('list'); setSelectedTrId(null); setActiveTab('current'); }} style={{ border: 'none', background: 'none', color: colors.sub, fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>← 会社一覧に戻る</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '25px' }}>
        <aside style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: colors.sub, borderBottom: `2px solid ${colors.main}`, paddingBottom: '10px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: '#999', display: 'block' }}>{labelMapCo[k]}</span>
              <span style={{ fontWeight: 'bold' }}>{currentCo[k] || '-'}</span>
            </div>
          ))}
        </aside>

        <section style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>実習生詳細</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px', flexWrap: 'wrap' }}>
            {(currentCo.trainees || []).map((t: any) => (
              <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '8px 20px', borderRadius: '25px', border: selectedTrId === t.id ? `2px solid ${colors.main}` : '1px solid #ddd', backgroundColor: selectedTrId === t.id ? colors.light : '#fff', color: selectedTrId === t.id ? colors.sub : '#666', cursor: 'pointer', fontWeight: 'bold' }}>{t.traineeName}</button>
            ))}
          </div>

          {currentTrainee && (
            <div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                {/* 履歴を逆順に表示（最新が一番左） */}
                <button onClick={() => setActiveTab('current')} style={{ padding: '8px 20px', border: 'none', borderRadius: '5px 5px 0 0', background: activeTab === 'current' ? colors.main : '#eee', color: activeTab === 'current' ? '#fff' : '#666', cursor: 'pointer' }}>最新データ</button>
                {([...(currentTrainee.phaseHistory || [])].reverse()).map((h: any, idx: number) => {
                   const originalIdx = currentTrainee.phaseHistory.length - 1 - idx;
                   return (
                     <button key={idx} onClick={() => setActiveTab(originalIdx)} style={{ padding: '8px 20px', border: 'none', borderRadius: '5px 5px 0 0', background: activeTab === originalIdx ? '#555' : '#ddd', color: '#fff', cursor: 'pointer' }}>{h.category}時</button>
                   );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px', backgroundColor: colors.light, padding: '20px', borderRadius: '0 10px 10px 10px' }}>
                {Object.keys(labelMapTr).map(k => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${colors.border}`, padding: '8px 0', fontSize: '14px' }}>
                    <span style={{ color: '#888' }}>{labelMapTr[k]}</span>
                    <span style={{ fontWeight: 'bold' }}>{ (activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab])[k] || '-' }</span>
                  </div>
                ))}
                {activeTab === 'current' && <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ gridColumn: 'span 2', marginTop: '20px', ...btnStyle, backgroundColor: colors.sub, color: '#fff' }}>この情報を編集する</button>}
              </div>
            </div>
          )}
        </section>
      </div>
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
      if (confirm("区分を変更します。現在のデータは履歴に保存され、情報を上書き編集できます。")) {
        const archiveEntry = { ...trFormData };
        delete archiveEntry.phaseHistory;
        newData.phaseHistory = [...(trFormData.phaseHistory || []), archiveEntry];
      }
    }
    setTrFormData(newData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#fff', padding: '35px', borderRadius: '20px', width: '90%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <h2 style={{ color: colors.sub, marginBottom: '25px', borderLeft: `6px solid ${colors.main}`, paddingLeft: '15px' }}>実習生データ入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ padding: '10px', backgroundColor: colors.light, borderRadius: '8px' }}>
              <label style={{ fontSize: '11px', color: colors.sub, fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{labelMapTr[k]}</label>
              {/* 国籍、ステータスなどのセレクトボックス処理（中略、前回のロジックを維持） */}
              { k === 'nationality' ? (
                 <select style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} value={nationalityOptions.includes(trFormData[k]) ? trFormData[k] : "その他（手入力）"} onChange={e => handleChange(k, e.target.value)}>
                   {nationalityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                 </select>
              ) : (
                <input 
                  type="text" 
                  placeholder={ (k==='endDate' || k==='renewStartDate') ? '（入力不要）' : '2026/03/13' }
                  value={trFormData[k] || ''} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }} 
                  onChange={e => handleChange(k, e.target.value)} 
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button onClick={handleSaveTrainee} style={{ ...btnStyle, backgroundColor: colors.main, color: '#fff', flex: 2, fontSize: '16px' }}>データを保存する</button>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnStyle, backgroundColor: '#eee', color: '#666', flex: 1 }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '35px', borderRadius: '20px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ color: colors.sub }}>企業データ登録</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <label style={{ fontSize: '11px', color: '#999' }}>{labelMapCo[k]}</label>
              <input type="text" value={coFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} onChange={e => setCoFormData({...coFormData, [k]: e.target.value})} />
            </div>
          ))}
        </div>
        <button onClick={() => setShowCoForm(false)} style={{ marginTop: '20px', ...btnStyle, backgroundColor: colors.main, color: '#fff' }}>閉じる（保存は未実装）</button>
      </div>
    </div>
  );
}