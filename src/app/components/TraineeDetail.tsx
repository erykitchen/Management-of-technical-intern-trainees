"use client";
import { Company, Trainee } from '../types';

interface Props {
  company: Company;
  selectedTrId: number | null;
  onSelectTrainee: (id: number) => void;
  activeTab: 'current' | number;
  setActiveTab: (tab: 'current' | number) => void;
  onEdit: (trainee: Trainee, phaseIdx: number | null) => void;
  onDelete: () => void;
}

// --- ラベル定義 ---
const labelMapTr: { [key: string]: string } = {
  batch: "期生", status: "ステータス", traineeName: "氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", category: "区分", nationality: "国籍", 
  birthday: "生年月日", age: "年齢", gender: "性別", period: "期間", stayLimit: "在留期限", 
  cardNumber: "在留カード番号", passportLimit: "パスポート期限", passportNumber: "パスポート番号", 
  certificateNumber: "認定番号", applyDate: "申請日", certDate: "認定日", entryDate: "入国日", 
  renewStartDate: "更新手続開始日", assignDate: "配属日", endDate: "実習終了日", 
  moveDate: "配属移動日", returnDate: "帰国日", employmentReportDate: "雇用条件届出日", 
  trainingStartDate: "講習開始日", trainingEndDate: "講習終了日", memo: "備考（メモ）"
};

const batchColorMap: { [key: string]: string } = { "①": "#E3F2FD", "②": "#FFFDE7", "③": "#FFEBEE", "④": "#F3E5F5", "⑤": "#E8F5E9" };

export default function TraineeDetail({ company, selectedTrId, onSelectTrainee, activeTab, setActiveTab, onEdit, onDelete }: Props) {
  
  // 日付変換（和暦対応）
  const convertToAD = (str: string) => {
    if (!str || typeof str !== 'string') return str;
    let text = str.trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const eras: { [key: string]: number } = { '令和': 2018, '平成': 1988, '昭和': 1925, 'R': 2018, 'H': 1988, 'S': 1925 };
    for (let era in eras) {
      if (text.startsWith(era)) {
        const match = text.match(new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月.\\/-]?(\\d+)日?`));
        if (match) return `${parseInt(match[1]) + eras[era]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
      }
    }
    return text;
  };

  // ★アラートロジックの復元
  const getAlertStyle = (dateStr: string, category: string): React.CSSProperties => {
    if (!dateStr || category === "実習終了") return { border: '1px solid #E0E0E0' };
    const ad = convertToAD(dateStr);
    const target = new Date(ad.replace(/\//g, '-'));
    if (isNaN(target.getTime())) return { border: '1px solid #E0E0E0' };
    
    const diffDays = Math.ceil((target.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return { border: '2px solid #E74C3C', backgroundColor: '#FFF5F5', color: '#E74C3C', fontWeight: 'bold' };
    if (diffDays <= 90) return { border: '2px solid #F1C40F', backgroundColor: '#FFFFF0', color: '#856404', fontWeight: 'bold' };
    return { border: '1px solid #E0E0E0' };
  };

  const hasAlert = (t: Trainee) => [t.stayLimit, t.passportLimit, t.endDate].some(d => {
    const s = getAlertStyle(d, t.category);
    return s.border !== '1px solid #E0E0E0';
  });

  const selTr = company.trainees?.find(t => t.id === selectedTrId);
  const data = activeTab === 'current' ? selTr : selTr?.phaseHistory[activeTab as number];

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      {/* 実習生選択バッジ一覧 */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        {company.trainees?.map(t => (
          <button 
            key={t.id} 
            onClick={() => { onSelectTrainee(t.id); setActiveTab('current'); }}
            style={{
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
              border: selectedTrId === t.id ? '2px solid #F57C00' : '1px solid #ddd',
              backgroundColor: hasAlert(t) ? '#FFF0F0' : (batchColorMap[t.batch] || '#fff'),
              boxShadow: selectedTrId === t.id ? '0 4px 10px rgba(245, 124, 0, 0.2)' : 'none'
            }}
          >
            {t.traineeName} {hasAlert(t) && '⚠️'}
          </button>
        ))}
      </div>

      {selTr && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '26px', color: '#2C3E50' }}>{selTr.traineeName}</h2>
              <p style={{ color: '#95A5A6', margin: '5px 0' }}>{selTr.kana} / {selTr.nationality}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => onEdit(data, activeTab === 'current' ? null : (activeTab as number))} style={btnStyle}>編集・区分変更</button>
              <button onClick={onDelete} style={{ ...btnStyle, backgroundColor: '#fff', color: '#E74C3C', border: '1px solid #E74C3C' }}>削除</button>
            </div>
          </div>

          {/* 履歴切り替えタブ */}
          <div style={{ display: 'flex', gap: '10px', margin: '25px 0', background: '#F8F9FA', padding: '5px', borderRadius: '30px', width: 'fit-content' }}>
            <button onClick={() => setActiveTab('current')} style={tabStyle(activeTab === 'current')}>最新 ({selTr.category})</button>
            {selTr.phaseHistory?.map((h, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={tabStyle(activeTab === i)}>履歴 {i+1} ({h.category})</button>
            ))}
          </div>

          {/* 詳細グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 40px' }}>
            {Object.keys(labelMapTr).map(k => {
              const val = (data as any)?.[k] || '-';
              const alertStyle = ['stayLimit', 'passportLimit', 'endDate'].includes(k) && activeTab === 'current' ? getAlertStyle(val, data.category) : {};
              
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0F2F5' }}>
                  <span style={{ color: '#7F8C8D', fontSize: '13px' }}>{labelMapTr[k]}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', ...alertStyle, padding: alertStyle.border !== '1px solid #E0E0E0' ? '2px 8px' : '0', borderRadius: '4px' }}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const btnStyle = { background: '#F57C00', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
  background: active ? '#2C3E50' : 'transparent', color: active ? '#fff' : '#7F8C8D', transition: '0.2s'
});