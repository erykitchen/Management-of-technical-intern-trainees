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

const acceptanceOptions = ["選択する", "受入中", "無し"];

// --- 2. 便利関数 (和暦変換など) ---
const convertToAD = (str: string) => {
  if (!str) return "";
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

const initialCompanyForm = {
  ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}),
  investmentCount: "1口",
  investmentAmount: "10千円",
  acceptance: "選択する"
};

// --- 3. メインコンポーネント ---
export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);

  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C' };
  const sharpRadius = '4px';
  const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };

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
    } catch (e) { alert("保存エラー"); }
  };

  // 会社削除処理
  const handleDeleteCompany = async () => {
    if (!currentCo?.id) return;
    if (!confirm(`会社「${currentCo.companyName}」を削除しますか？所属する実習生データもすべて消去されます。`)) return;
    if (!confirm(`本当に削除してもよろしいですか？この操作は取り消せません。`)) return;

    try {
      await deleteDoc(doc(db, "companies", currentCo.id));
      setView('list');
      setCurrentCo(null);
      fetchCompanies();
    } catch (e) { alert("削除に失敗しました"); }
  };

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '20px' }}>アシストねっと協同組合</h1>
          <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習実施者</button>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
              <div style={{ fontWeight: 'bold' }}>{c.companyName}</div>
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} isEditing={isEditingCo} />}
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setView('list'); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer' }}>← 会社一覧に戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleDeleteCompany} style={{ ...btnBase, backgroundColor: '#FFF', border: `1px solid ${colors.danger}`, color: colors.danger }}>会社を削除</button>
          <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>会社情報を編集</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, backgroundColor: colors.border, gap: '1px' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto', maxHeight: 'calc(100vh - 65px)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: `3px solid ${colors.main}`, paddingBottom: '10px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '12px', fontSize: '11px' }}>
              <span style={{ color: colors.gray, display: 'block' }}>{labelMapCo[k]}</span>
              <span style={{ fontWeight: '600' }}>{currentCo[k] || '-'}</span>
            </div>
          ))}
        </aside>
        <section style={{ backgroundColor: '#FBFBFB', padding: '40px' }}>
          {/* ここに実習生一覧のロジックが続きます */}
          <p style={{ color: colors.gray }}>※実習生の管理機能はサイドメニューやこのエリアで操作可能です</p>
        </section>
      </div>
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