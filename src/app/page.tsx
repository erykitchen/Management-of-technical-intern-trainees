"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// --- 1. ラベル・選択肢定義 ---
const labelMapCo: { [key: string]: string } = {
  companyName: "会社名", settlement: "決算時期", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "今回までの実習生受入の有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生配属事業所住所",
  responsiblePerson: "技能実習責任者名", instructor: "技能実習指導員名", lifeInstructor: "生活指導員名", planInstructor: "技能実習計画指導員名",
  memo: "備考（メモ）"
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

const endDisplayKeys = ["traineeName", "kana", "category", "nationality", "birthday", "age", "gender"];
const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
const nationalityOptions = ["ベトナム", "中国", "インドネシア", "フィリピン", "ミャンマー", "カンボジア", "タイ", "その他（手入力）"];
const statusOptions = ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "実習中", "一時帰国中", "その他"];
const genderOptions = ["男", "女"];
const acceptanceOptions = ["選択する", "受入中", "無し"];

const keysToClearOnNewPhase = [
  "status", "stayLimit", "cardNumber", "certificateNumber", 
  "applyDate", "certDate", "entryDate", "endDate", "renewStartDate"
];

// --- 2. 便利関数 ---

// 和暦→西暦変換
const convertToAD = (str: string) => {
  if (!str || typeof str !== 'string') return str;
  let text = str.trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  const eras: { [key: string]: number } = { '令和': 2018, '平成': 1988, '昭和': 1925, 'R': 2018, 'H': 1988, 'S': 1925 };
  for (let era in eras) {
    if (text.startsWith(era)) {
      const match = text.match(new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月.\\/-]?(\\d+)日?`));
      if (match) {
        const year = parseInt(match[1]) + eras[era];
        return `${year}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
      }
    }
  }
  const adMatch = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (adMatch) return `${adMatch[1]}/${adMatch[2].padStart(2, '0')}/${adMatch[3].padStart(2, '0')}`;
  return text;
};

const calculateAge = (birthday: string) => {
  const adBirthday = convertToAD(birthday);
  if (!adBirthday || adBirthday.length < 8) return "";
  const birthDate = new Date(adBirthday.replace(/\//g, '-'));
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) age--;
  return age.toString();
};

const calculateDates = (entryDateStr: string) => {
  const adDateStr = convertToAD(entryDateStr);
  const date = new Date(adDateStr.replace(/\//g, '-'));
  if (isNaN(date.getTime())) return { end: "", renew: "" };
  const nextYear = new Date(date);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const endDate = new Date(nextYear);
  endDate.setDate(nextYear.getDate() - 1);
  const renewDate = new Date(endDate);
  renewDate.setMonth(renewDate.getMonth() - 3);
  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return { end: fmt(endDate), renew: fmt(renewDate) };
};

// 初期フォーム
const initialTraineeForm = {
  targetCompanyId: "", status: "選択する", traineeName: "", kana: "", 
  traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム",
  birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", 
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: []
};

const initialCompanyForm = {
  ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}),
  investmentCount: "1口",
  investmentAmount: "10千円",
  acceptance: "選択する"
};

// --- 3. メインコンポーネント ---
export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);

  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C' };
  const sharpRadius = '4px';
  const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };
  const grayCBtn = { width: '20px', height: '20px', fontSize: '9px', cursor: 'pointer', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '3px', color: colors.gray, marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) {
      const updated = data.find(c => c.id === currentCo.id);
      setCurrentCo(updated || null);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  // 会社保存
  const handleSaveCompany = async () => {
    if (!coFormData.companyName) { alert("会社名は必須です"); return; }
    const cleanedData = { ...coFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') {
        cleanedData[key] = convertToAD(cleanedData[key]);
      }
    });
    try {
      if (isEditingCo && currentCo?.id) {
        await updateDoc(doc(db, "companies", currentCo.id), cleanedData);
      } else {
        await addDoc(collection(db, "companies"), { ...cleanedData, trainees: [], createdAt: serverTimestamp() });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("会社保存エラー"); }
  };

  // 会社削除
  const handleDeleteCompany = async () => {
    if (!currentCo?.id) return;
    if (!confirm(`会社「${currentCo.companyName}」を削除しますか？`)) return;
    if (!confirm(`本当に削除してもよろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, "companies", currentCo.id));
      setView('list');
      setCurrentCo(null);
      fetchCompanies();
    } catch (e) { alert("削除に失敗しました"); }
  };

  // 実習生保存
  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? currentCo.id : trFormData.targetCompanyId;
    if (!targetId) { alert("会社を選択してください"); return; }
    
    const cleanedData = { ...trFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') {
        cleanedData[key] = convertToAD(cleanedData[key]);
      }
    });

    try {
      const docRef = doc(db, "companies", targetId);
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      
      if (isEditingTr) {
        updatedTrainees = updatedTrainees.map((t: any) => {
          if (t.id === trFormData.id) {
            if (editingPhaseIdx !== null) {
              const newHistory = [...(t.phaseHistory || [])];
              newHistory[editingPhaseIdx] = { ...cleanedData };
              return { ...t, phaseHistory: newHistory };
            }
            return cleanedData;
          }
          return t;
        });
      } else {
        const { targetCompanyId, ...saveData } = cleanedData;
        updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now(), phaseHistory: [] }];
      }
      await updateDoc(docRef, { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("実習生保存エラー"); }
  };

  // 区分変更取り消し
  const handleUndoPhaseChange = async (traineeId: number) => {
    const trainee = currentCo.trainees.find((t: any) => t.id === traineeId);
    if (!trainee || !trainee.phaseHistory || trainee.phaseHistory.length === 0) return;
    if (!confirm("直前の区分変更を取り消し、一つ前の状態に戻しますか？")) return;
    try {
      const docRef = doc(db, "companies", currentCo.id);
      const newHistory = [...trainee.phaseHistory];
      const previousData = newHistory.pop();
      const updatedTrainees = currentCo.trainees.map((t: any) => {
        if (t.id === traineeId) return { ...previousData, phaseHistory: newHistory, id: t.id };
        return t;
      });
      await updateDoc(docRef, { trainees: updatedTrainees });
      setActiveTab('current');
      fetchCompanies();
    } catch (e) { alert("取り消し失敗"); }
  };

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '20px' }}>アシストねっと協同組合</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習実施者</button>
          </div>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: colors.gray, marginTop: '8px' }}>受入人数：{(c.trainees || []).filter((t: any) => t.category !== "実習終了").length} 名</div>
            </div>
          ))}
        </div>
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} editingPhaseIdx={editingPhaseIdx} />}
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} isEditing={isEditingCo} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
  const isTerminated = currentTrainee?.category === "実習終了";

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer' }}>← 一覧に戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleDeleteCompany} style={{ ...btnBase, backgroundColor: '#FFF', border: `1px solid ${colors.danger}`, color: colors.danger }}>会社削除</button>
          <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>会社編集</button>
          <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生追加</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, backgroundColor: colors.border, gap: '1px' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto', maxHeight: 'calc(100vh - 65px)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: `3px solid ${colors.main}`, paddingBottom: '10px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '12px', fontSize: '11px' }}>
              <span style={{ color: colors.gray, display: 'block' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: '600' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={grayCBtn}>C</button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ backgroundColor: '#FBFBFB', padding: '40px', overflowY: 'auto' }}>
          {!selectedTrId ? (
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '20px', color: colors.gray }}>実習生一覧</h3>
              {categoryOptions.map(cat => {
                const list = (currentCo.trainees || []).filter((t: any) => t.category === cat);
                if (list.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: cat === "実習終了" ? '#CCC' : colors.accent, marginBottom: '10px' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {list.map((t: any) => (
                        <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '10px 20px', backgroundColor: '#FFF', border: `1px solid ${colors.border}`, borderRadius: sharpRadius, cursor: 'pointer', color: cat === "実習終了" ? '#CCC' : colors.text }}>{t.traineeName}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFF', padding: '30px', border: `1px solid ${colors.border}`, borderRadius: sharpRadius }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{ (activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]).traineeName }</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {activeTab === 'current' && currentTrainee.phaseHistory?.length > 0 && (
                    <button onClick={() => handleUndoPhaseChange(currentTrainee.id)} style={{ ...btnBase, backgroundColor: '#FFF', border: `1px solid ${colors.danger}`, color: colors.danger }}>区分変更を取り消す</button>
                  )}
                  <button onClick={() => { setTrFormData(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集・区分変更</button>
                  <button onClick={() => setSelectedTrId(null)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>閉じる</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '8px 20px', border: 'none', background: activeTab === 'current' ? colors.main : 'none', color: colors.accent, fontWeight: 'bold', cursor: 'pointer' }}>最新</button>
                {[...(currentTrainee.phaseHistory || [])].reverse().map((h, idx) => {
                  const originalIdx = currentTrainee.phaseHistory.length - 1 - idx;
                  return <button key={idx} onClick={() => setActiveTab(originalIdx)} style={{ padding: '8px 20px', border: 'none', background: activeTab === originalIdx ? '#EEE' : 'none', color: '#999', cursor: 'pointer' }}>{h.category}時</button>;
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 40px' }}>
                {(isTerminated && activeTab === 'current' ? endDisplayKeys : Object.keys(labelMapTr)).map(k => {
                  const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number];
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid #F5F5F5`, padding: '8px 0', fontSize: '13px' }}>
                      <span style={{ color: colors.gray }}>{labelMapTr[k]}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{data[k] || '-'}</span>
                        <button onClick={() => copy(data[k])} style={grayCBtn}>C</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} editingPhaseIdx={editingPhaseIdx} />}
      {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} isEditing={isEditingCo} />}
    </main>
  );
}

// --- 4. 会社追加・編集用モーダル ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, isEditing }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '4px', width: '90%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '30px', borderLeft: `4px solid ${colors.accent}`, paddingLeft: '15px' }}>{isEditing ? '会社情報の編集' : '新規実習実施者の登録'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ padding: '8px 12px', backgroundColor: '#FBFBFB', border: '1px solid #EEE', gridColumn: k === 'memo' ? 'span 3' : 'auto' }}>
              <label style={{ fontSize: '11px', color: colors.gray, fontWeight: 'bold', display: 'block' }}>{labelMapCo[k]}</label>
              {k === 'acceptance' ? (
                <select style={{ width: '100%', padding: '6px' }} value={coFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {acceptanceOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'memo' ? (
                <textarea style={{ width: '100%', padding: '6px', minHeight: '80px', border: '1px solid #ddd' }} value={coFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} />
              ) : (
                <input type="text" value={coFormData[k] || ''} style={{ width: '100%', padding: '6px', border: '1px solid #ddd' }} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', flex: 2 }}>保存する</button>
          <button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, color: colors.text, flex: 1 }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// --- 5. 実習生用モーダル ---
function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, isEditingTr, companies, colors, editingPhaseIdx }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') {
      const { end, renew } = calculateDates(v);
      newData.endDate = end;
      newData.renewStartDate = renew;
    }
    if (k === 'category' && isEditingTr && editingPhaseIdx === null) {
      if (confirm("区分を変更します。現在のデータは履歴に保存されます。")) {
        const archiveEntry = { ...trFormData };
        delete archiveEntry.phaseHistory;
        newData.phaseHistory = [...(trFormData.phaseHistory || []), archiveEntry];
        keysToClearOnNewPhase.forEach(key => {
          newData[key] = (key === "status") ? "選択する" : "";
        });
        newData.period = "1年"; 
      }
    }
    setTrFormData(newData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '4px', width: '90%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '30px', borderLeft: `4px solid ${colors.accent}`, paddingLeft: '15px' }}>実習生情報の登録・編集</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {!isEditingTr && (
            <div style={{ gridColumn: 'span 3', padding: '10px', backgroundColor: '#F0F7FF', marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>受入企業</label>
              <select style={{ width: '100%', padding: '8px' }} value={trFormData.targetCompanyId} onChange={e => handleChange('targetCompanyId', e.target.value)}>
                <option value="">選択してください</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
          )}
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ padding: '8px 12px', backgroundColor: '#FBFBFB', border: '1px solid #EEE' }}>
              <label style={{ fontSize: '11px', color: colors.gray, fontWeight: 'bold' }}>{labelMapTr[k]}</label>
              { k === 'status' ? (
                <select style={{ width: '100%', padding: '6px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'category' ? (
                <select style={{ width: '100%', padding: '6px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)} disabled={editingPhaseIdx !== null}>
                  {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'nationality' ? (
                <select style={{ width: '100%', padding: '6px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {nationalityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'gender' ? (
                <select style={{ width: '100%', padding: '6px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {genderOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" value={trFormData[k] || ''} style={{ width: '100%', padding: '6px', border: '1px solid #ddd' }} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', flex: 2 }}>保存する</button>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, color: colors.text, flex: 1 }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}