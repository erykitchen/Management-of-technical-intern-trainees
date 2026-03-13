"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";

// ラベル定義（省略なし）
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
  status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", traineeAddress: "住所",
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "期間", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

const initialCoForm = {
  settlement: "", companyName: "", representative: "", jobType: "", zipCode: "", address: "", tel: "",
  joinedDate: "", employeeCount: "", acceptance: "有", investmentCount: "", investmentAmount: "",
  investmentPayDate: "", corporateNumber: "", laborInsurance: "", employmentInsurance: "",
  implementationNumber: "", acceptanceDate: "", industryCategory: "", officeZip: "",
  officeAddress: "", responsiblePerson: "", instructor: "", lifeInstructor: "", planInstructor: ""
};

const initialTraineeForm = {
  targetCompanyId: "", // 所属先企業を選択するためのフィールド
  status: "実習中", traineeName: "", kana: "", traineeAddress: "", category: "1号",
  nationality: "", birthday: "", age: "", gender: "男", period: "", stayLimit: "",
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: ""
};

export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [coFormData, setCoFormData] = useState<any>(initialCoForm);
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

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return alert("会社名は必須です");
    try {
      if (isEditingCo && currentCo) {
        await updateDoc(doc(db, "companies", currentCo.id), coFormData);
        alert("更新しました");
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, createdAt: new Date(), history: [], trainees: [] });
        alert("企業を登録しました");
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("エラーが発生しました"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? currentCo.id : trFormData.targetCompanyId;
    if (!targetId) return alert("所属先企業を選択してください");
    if (!trFormData.traineeName) return alert("実習生氏名は必須です");

    try {
      const docRef = doc(db, "companies", targetId);
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = targetCo.trainees || [];

      if (isEditingTr) {
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
      } else {
        const { targetCompanyId, ...saveData } = trFormData; // 所属先IDを除いて保存
        updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now() }];
      }

      await updateDoc(docRef, { trainees: updatedTrainees });
      alert(isEditingTr ? "更新しました" : "実習生を登録しました");
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存に失敗しました"); }
  };

  const btn = { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold' };
  const cBtn = { width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e1f5fe', border: '1px solid #03a9f4', borderRadius: '4px', marginLeft: '5px' };

  // --- トップページ（一覧画面） ---
  if (view === 'list') {
    return (
      <main style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', borderLeft: '5px solid #1a73e8', paddingLeft: '15px' }}>監理団体 業務管理システム</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btn, backgroundColor: '#34a853', color: '#fff' }}>
              ＋ 新規実習生登録
            </button>
            <button onClick={() => { setCoFormData(initialCoForm); setIsEditingCo(false); setShowCoForm(true); }} style={{ ...btn, backgroundColor: '#1a73e8', color: '#fff' }}>
              ＋ 新規実施者登録
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1a73e8', fontSize: '18px' }}>{c.companyName}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>実施者番号: {c.implementationNumber || '-'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span style={{ backgroundColor: '#e8f0fe', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', color: '#1a73e8', fontWeight: 'bold' }}>
                    実習生: {c.trainees?.length || 0}名
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal />}
        {showTrForm && <TrFormModal />}
      </main>
    );
  }

  // --- 詳細画面（前回分を維持） ---
  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ marginBottom: '20px', cursor: 'pointer' }}>← 一覧に戻る</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>{currentCo.companyName}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btn, backgroundColor: '#ff9800', color: '#fff' }}>企業編集</button>
          <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btn, backgroundColor: '#1a73e8', color: '#fff' }}>＋ 実習生追加</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px' }}>
        <aside>
          <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ marginTop: 0 }}>企業基本情報</h3>
            {Object.keys(labelMapCo).map(k => (
              <div key={k} style={{ fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid #eee' }}>
                <div style={{ color: '#888' }}>{labelMapCo[k]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{currentCo[k] || '-'}</span>{currentCo[k] && <button onClick={() => copy(currentCo[k])} style={cBtn}>C</button>}</div>
              </div>
            ))}
          </section>
        </aside>
        <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>所属実習生</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {(currentCo.trainees || []).map((t: any) => (
              <button key={t.id} onClick={() => setSelectedTrId(t.id)} style={{ padding: '8px 15px', borderRadius: '20px', border: selectedTrId === t.id ? '2px solid #1a73e8' : '1px solid #ccc', backgroundColor: selectedTrId === t.id ? '#e8f0fe' : '#fff', cursor: 'pointer' }}>{t.traineeName}</button>
            ))}
          </div>
          {selectedTrId && (
            <div style={{ border: '1px solid #1a73e8', padding: '20px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>実習生詳細</h4>
                <button onClick={() => { setTrFormData(currentCo.trainees.find((t:any)=>t.id===selectedTrId)); setIsEditingTr(true); setShowTrForm(true); }} style={{ ...btn, backgroundColor: '#ff9800', color: '#fff', fontSize: '11px' }}>編集</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(labelMapTr).map(k => {
                  const val = currentCo.trainees.find((t:any)=>t.id===selectedTrId)[k];
                  return <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', fontSize: '13px' }}><span>{labelMapTr[k]}</span><span>{val || '-'} {val && <button onClick={() => copy(val)} style={cBtn}>C</button>}</span></div>;
                })}
              </div>
            </div>
          )}
        </section>
      </div>
      {showCoForm && <CoFormModal />}
      {showTrForm && <TrFormModal />}
    </main>
  );

  // --- モーダル ---
  function CoFormModal() {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>企業登録/編集</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            {Object.keys(labelMapCo).map(k => (
              <div key={k}><label style={{ fontSize: '11px' }}>{labelMapCo[k]}</label><input type={k.includes('Date') ? 'date' : 'text'} value={coFormData[k] || ''} style={{ width: '100%', padding: '5px' }} onChange={e => setCoFormData({...coFormData, [k]: e.target.value})} /></div>
            ))}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveCompany} style={{ ...btn, backgroundColor: '#34a853', color: '#fff', flex: 2 }}>保存</button><button onClick={() => setShowCoForm(false)} style={{ ...btn, backgroundColor: '#eee', flex: 1 }}>中止</button></div>
        </div>
      </div>
    );
  }

  function TrFormModal() {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>実習生登録/編集</h2>
          {!isEditingTr && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #1a73e8' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>所属先企業を選択してください</label>
              <select 
                style={{ width: '100%', padding: '10px', fontSize: '16px' }} 
                value={trFormData.targetCompanyId} 
                onChange={e => setTrFormData({...trFormData, targetCompanyId: e.target.value})}
              >
                <option value="">-- 企業を選択 --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            {Object.keys(labelMapTr).map(k => (
              <div key={k}><label style={{ fontSize: '11px' }}>{labelMapTr[k]}</label><input type={k.includes('Date') || k.includes('Limit') || k === 'birthday' ? 'date' : 'text'} value={trFormData[k] || ''} style={{ width: '100%', padding: '5px' }} onChange={e => setTrFormData({...trFormData, [k]: e.target.value})} /></div>
            ))}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveTrainee} style={{ ...btn, backgroundColor: '#34a853', color: '#fff', flex: 2 }}>保存</button><button onClick={() => setShowTrForm(false)} style={{ ...btn, backgroundColor: '#eee', flex: 1 }}>中止</button></div>
        </div>
      </div>
    );
  }
}