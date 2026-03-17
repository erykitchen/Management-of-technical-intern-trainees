"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// 修正後のインポート文
import { Company, Trainee } from './types'; // index.tsはフォルダ名だけでOK
import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, 
  statusOptions, genderOptions, batchColorMap, keysToClearOnNewPhase 
} from './constants/forms';
import { convertToAD, calculateAge, calculateDates } from './utils/dateUtils';
// --- 初期値設定 ---
const initialCompanyForm = {
  ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}),
  investmentCount: "1口", investmentAmount: "10千円", acceptance: "選択する"
};

const initialTraineeForm: Partial<Trainee> = {
  targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", 
  traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム",
  birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", 
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: []
};

// --- スタイル判定 ---
const getAlertStyle = (dateStr: string, category: string): any => {
  if (!dateStr || category === "実習終了") return { color: '#2C3E50', border: '1px solid #E0E0E0' };
  const ad = convertToAD(dateStr);
  const target = new Date(ad.replace(/\//g, '-'));
  if (isNaN(target.getTime())) return { color: '#2C3E50', border: '1px solid #E0E0E0' };
  const today = new Date();
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return { border: '4px double #FFD700', outline: '2px solid #E74C3C', outlineOffset: '-4px', backgroundColor: '#FFF5F5' };
  else if (diffDays <= 60) return { border: '2px solid #E74C3C', backgroundColor: '#FFF5F5' };
  else if (diffDays <= 90) return { border: '2px solid #FFD700', backgroundColor: '#FFFFF0' };
  return { border: '1px solid #E0E0E0' };
};

const hasAlert = (t: any) => {
  const dates = [t.stayLimit, t.passportLimit, t.endDate];
  return dates.some(d => {
    const style = getAlertStyle(d, t.category);
    return style.border && style.border !== '1px solid #E0E0E0';
  });
};

// --- メインコンポーネント ---
export default function Home() {
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showTrMethodModal, setShowTrMethodModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
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
  const [filterBatch, setFilterBatch] = useState<string>('すべて');

  // 印刷用
  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'individual' | 'table'>('individual');
  const [isPreview, setIsPreview] = useState(false);

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

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) { alert("会社名は必須です"); return; }
    const cleanedData = { ...coFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]);
    });
    try {
      if (isEditingCo && currentCo?.id) await updateDoc(doc(db, "companies", currentCo.id), cleanedData);
      else await addDoc(collection(db, "companies"), { ...cleanedData, trainees: [], createdAt: serverTimestamp() });
      setShowCoForm(false); fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleDeleteCompany = async () => {
    if (!currentCo?.id) return;
    if (!confirm(`会社「${currentCo.companyName}」を削除しますか？\n所属する実習生もすべて削除されます。`)) return;
    try {
      await deleteDoc(doc(db, "companies", currentCo.id));
      setView('list'); setCurrentCo(null); fetchCompanies();
    } catch (e) { alert("削除エラー"); }
  };

  const handleDeleteTrainee = async () => {
    if (!selectedTrId || !currentCo?.id) return;
    if (!confirm("この実習生の情報を完全に削除しますか？")) return;
    try {
      const updatedTrainees = currentCo.trainees.filter((t: any) => t.id !== selectedTrId);
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setSelectedTrId(null); fetchCompanies();
    } catch (e) { alert("削除エラー"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? (trFormData.targetCompanyId || currentCo.id) : trFormData.targetCompanyId;
    if (!targetId) { alert("会社を選択してください"); return; }
    const cleanedData = { ...trFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]);
    });
    try {
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      if (isEditingTr && trFormData.id) {
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
      await updateDoc(doc(db, "companies", targetId), { trainees: updatedTrainees });
      setShowTrForm(false); fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleCsvImport = async (companyId: string, file: File) => {
    if (!companyId) { alert("会社を選択してください"); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) return;
      const newTrainees: any[] = [];
      const headers = lines[0].split(/[,\t]/).map(h => h.trim());
      const nameIdxInCsv = headers.indexOf("実習生氏名");
      const csvToKeyMap: any = {
        "バッチ(期生)": "batch", "ステータス": "status", "実習生氏名": "traineeName", "フリガナ": "kana",
        "郵便番号": "traineeZip", "住所": "traineeAddress", "国籍": "nationality", "生年月日": "birthday",
        "性別": "gender", "在留期限": "stayLimit", "在留カード番号": "cardNumber", "パスポート期限": "passportLimit",
        "パスポート番号": "passportNumber", "認定番号": "certificateNumber", "申請日": "applyDate",
        "認定年月日": "certDate", "実習開始日(入国日)": "entryDate", "配属日": "assignDate",
        "外国人雇用条件届出日": "employmentReportDate"
      };
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,\t]/);
        if (nameIdxInCsv !== -1) { if (!values[nameIdxInCsv] || values[nameIdxInCsv].trim() === "") continue; }
        else if (!values.some(v => v.trim() !== "")) continue;
        let trainee: any = { ...initialTraineeForm, id: Date.now() + i, category: "技能実習1号" };
        headers.forEach((h, idx) => {
          const key = csvToKeyMap[h];
          if (key) {
            let val = values[idx]?.trim() || "";
            if (!['traineeName', 'kana', 'traineeAddress', 'cardNumber', 'passportNumber', 'certificateNumber', 'memo'].includes(key)) val = convertToAD(val);
            trainee[key] = val;
          }
        });
        if (trainee.birthday) trainee.age = calculateAge(trainee.birthday);
        if (trainee.entryDate) { const { end, renew } = calculateDates(trainee.entryDate); trainee.endDate = end; trainee.renewStartDate = renew; }
        newTrainees.push(trainee);
      }
      try {
        const targetCo = companies.find(c => c.id === companyId);
        await updateDoc(doc(db, "companies", companyId), { trainees: [...(targetCo.trainees || []), ...newTrainees] });
        alert(`${newTrainees.length}名取り込み完了`); setShowCsvModal(false); fetchCompanies();
      } catch (err) { alert("エラー"); }
    };
    reader.readAsText(file);
  };

  const totalActiveTrainees = companies.reduce((sum, c) => sum + (c.trainees || []).filter((t: any) => t.category !== "実習終了").length, 0);

  // --- 印刷プレビュー表示 ---
  if ((view === 'print_tr' || view === 'print_co') && isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    const selectedTrainees = selectedCompany?.trainees.filter((t: any) => printTrIds.includes(t.id)) || [];
    
    return (
      <div className="print-area" style={{ padding: '0', backgroundColor: '#fff', minHeight: '100vh' }}>
        <style>{`
          @media print { 
            .no-print { display: none !important; } 
            body { background: #fff; margin: 0; }
            .page-break { page-break-after: always; }
            @page { size: ${printMode === 'table' ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm; }
          }
          .individual-table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          .individual-table th, .individual-table td { border: 1px solid #000; padding: 8px 12px; font-size: 13px; text-align: left; }
          .individual-table th { background-color: #f2f2f2; width: 30%; }
          .list-table { border-collapse: collapse; width: 100%; table-layout: auto; }
          .list-table th, .list-table td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; text-align: left; word-break: break-all; }
          .list-table th { background-color: #f2f2f2; }
        `}</style>
        
        <div className="no-print" style={{ padding: '20px', display: 'flex', gap: '10px', background: '#eee', borderBottom: '1px solid #ccc', alignItems: 'center' }}>
          <button onClick={() => setIsPreview(false)} style={{ ...btnBase, backgroundColor: colors.gray, color: '#fff' }}>設定に戻る</button>
          <button onClick={() => window.print()} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>印刷を実行</button>
        </div>
        
        <div style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', textAlign: 'center', borderBottom: '2px solid #000' }}>
            {view === 'print_tr' ? (printMode === 'individual' ? '技能実習生管理簿' : '実習生一覧表') : '実習実施者情報詳細'}
          </h2>

          {view === 'print_tr' && printMode === 'individual' ? (
            selectedTrainees.map((t: any) => (
              <div key={t.id} className="page-break" style={{ marginBottom: '50px' }}>
                <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '5px' }}>所属: {selectedCompany?.companyName}</div>
                <table className="individual-table">
                  <tbody>
                    {printFields.map(key => (
                      <tr key={key}>
                        <th>{labelMapTr[key]}</th>
                        <td>{t[key] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : view === 'print_tr' && printMode === 'table' ? (
            <table className="list-table">
              <thead>
                <tr>
                  {printFields.map(key => <th key={key}>{labelMapTr[key]}</th>)}
                </tr>
              </thead>
              <tbody>
                {selectedTrainees.map((t: any) => (
                  <tr key={t.id}>
                    {printFields.map(key => <td key={key}>{t[key] || '-'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="individual-table">
              <tbody>
                {printFields.map(key => (
                  <tr key={key}>
                    <th>{labelMapCo[key]}</th>
                    <td>{selectedCompany?.[key] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // --- 印刷設定画面 ---
  if ((view === 'print_tr' || view === 'print_co') && !isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    const labels = view === 'print_tr' ? labelMapTr : labelMapCo;
    
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh' }}>
        <header style={{ marginBottom: '30px' }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← キャンセルして戻る</button>
          <h1 style={{ fontSize: '24px', marginTop: '10px' }}>印刷設定</h1>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ marginBottom: '15px' }}>1. 対象を選択</h3>
            <select style={{ width: '100%', padding: '10px', borderRadius: '4px' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
              <option value="">会社を選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
            {view === 'print_tr' && selectedCompany && (
              <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto', border: `1px solid ${colors.border}`, padding: '10px' }}>
                {selectedCompany.trainees?.map((t: any) => (
                  <label key={t.id} style={{ display: 'block', padding: '5px' }}>
                    <input type="checkbox" checked={printTrIds.includes(t.id)} onChange={(e) => {
                      if (e.target.checked) setPrintTrIds([...printTrIds, t.id]);
                      else setPrintTrIds(printTrIds.filter(id => id !== t.id));
                    }} /> {t.traineeName}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ marginBottom: '15px' }}>2. 項目を選択</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {Object.keys(labels).map(key => (
                <label key={key} style={{ fontSize: '13px' }}>
                  <input type="checkbox" checked={printFields.includes(key)} onChange={(e) => {
                    if (e.target.checked) setPrintFields([...printFields, key]);
                    else setPrintFields(printFields.filter(f => f !== key));
                  }} /> {labels[key]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button onClick={() => setIsPreview(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>プレビューを表示</button>
        </div>
      </main>
    );
  }

  // --- メイン一覧画面 ---
  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>実習生管理システム</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setView('print_tr')} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>印刷設定</button>
            <button onClick={() => setShowTrMethodModal(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規会社</button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
              <div style={{ fontWeight: 'bold' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: colors.gray }}>受入人数: {(c.trainees || []).length}名</div>
            </div>
          ))}
        </div>

        {showTrMethodModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px' }}>
              <button onClick={() => { setShowTrMethodModal(false); setShowTrForm(true); setTrFormData(initialTraineeForm); }} style={btnBase}>手入力</button>
              <button onClick={() => { setShowTrMethodModal(false); setShowCsvModal(true); }} style={btnBase}>CSV</button>
            </div>
          </div>
        )}
        
        {showCsvModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px' }}>
               <select id="csvCompany" style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
                 {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
               </select>
               <input type="file" onChange={(e) => {
                 const file = e.target.files?.[0];
                 const coId = (document.getElementById('csvCompany') as HTMLSelectElement).value;
                 if (file) handleCsvImport(coId, file);
               }} />
               <button onClick={() => setShowCsvModal(false)}>閉じる</button>
            </div>
          </div>
        )}

        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} companies={companies} />}
      </main>
    );
  }

  // --- 詳細画面 ---
  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setView('list')}>← 戻る</button>
        <div>
          {!selectedTrId ? (
            <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }}>会社編集</button>
          ) : (
            <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }}>実習生編集</button>
          )}
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1 }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', borderRight: `1px solid ${colors.border}` }}>
          <h2>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: colors.gray }}>{labelMapCo[k]}</span>
              <div style={{ fontSize: '13px' }}>{currentCo[k] || '-'}</div>
            </div>
          ))}
        </aside>

        <section style={{ padding: '40px' }}>
          {!selectedTrId ? (
             <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               {currentCo.trainees?.map((t: any) => (
                 <button key={t.id} onClick={() => setSelectedTrId(t.id)} style={{ padding: '15px', background: '#fff', border: `1px solid ${colors.border}` }}>
                   {t.traineeName}
                 </button>
               ))}
             </div>
          ) : (
            <div style={{ background: '#fff', padding: '30px' }}>
               <h3>{currentTrainee.traineeName}</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                 {Object.keys(labelMapTr).map(k => (
                   <div key={k} style={{ borderBottom: '1px solid #eee', padding: '5px' }}>
                     <span style={{ fontSize: '11px', color: colors.gray }}>{labelMapTr[k]}</span>
                     <div>{currentTrainee[k] || '-'}</div>
                   </div>
                 ))}
               </div>
               <button onClick={() => setSelectedTrId(null)} style={{ marginTop: '20px' }}>一覧に戻る</button>
            </div>
          )}
        </section>
      </div>
      {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} />}
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} companies={companies} />}
    </main>
  );
}

// --- サブコンポーネント (モーダル) ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '80%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2>会社情報入力</h2>
        {Object.keys(labelMapCo).map(k => (
          <div key={k} style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px' }}>{labelMapCo[k]}</label>
            <input type="text" value={coFormData[k] || ''} style={{ width: '100%' }} onChange={e => setCoFormData({...coFormData, [k]: e.target.value})} />
          </div>
        ))}
        <button onClick={handleSaveCompany}>保存</button>
        <button onClick={() => setShowCoForm(false)}>閉じる</button>
      </div>
    </div>
  );
}

function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, companies }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') { const { end, renew } = calculateDates(v); newData.endDate = end; newData.renewStartDate = renew; }
    setTrFormData(newData);
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '80%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2>実習生情報入力</h2>
        <select value={trFormData.targetCompanyId} onChange={e => setTrFormData({...trFormData, targetCompanyId: e.target.value})}>
          <option value="">会社選択</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
        {Object.keys(labelMapTr).map(k => (
          <div key={k} style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px' }}>{labelMapTr[k]}</label>
            {['status', 'category', 'batch', 'gender'].includes(k) ? (
              <select style={{ width: '100%' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                {(k === 'status' ? statusOptions : k === 'category' ? categoryOptions : k === 'batch' ? batchOptions : genderOptions).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type="text" value={trFormData[k] || ''} style={{ width: '100%' }} onChange={e => handleChange(k, e.target.value)} />
            )}
          </div>
        ))}
        <button onClick={handleSaveTrainee}>保存</button>
        <button onClick={() => setShowTrForm(false)}>閉じる</button>
      </div>
    </div>
  );
}