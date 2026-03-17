"use client";
import { Trainee } from '../types';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  editIdx: number | null;
}

const labelMapTr: { [key: string]: string } = {
  batch: "期生", status: "ステータス", traineeName: "氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", category: "区分", nationality: "国籍", 
  birthday: "生年月日", age: "年齢", gender: "性別", period: "期間", stayLimit: "在留期限", 
  cardNumber: "在留カード番号", passportLimit: "パスポート期限", passportNumber: "パスポート番号", 
  certificateNumber: "認定番号", applyDate: "申請日", certDate: "認定日", entryDate: "入国日", 
  renewStartDate: "更新手続開始日", assignDate: "配属日", endDate: "実習終了日", 
  moveDate: "配属移動日", returnDate: "帰国日", employmentReportDate: "雇用条件届出日", 
  trainingStartDate: "講習開始日", trainingEndDate: "講習終了日", memo: "実習生備考"
};

export default function TraineeForm({ formData, setFormData, onSave, onClose, isEditing, editIdx }: Props) {
  
  // 西暦変換
  const convertToAD = (str: string) => {
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

  const handleChange = (k: string, v: string) => {
    let nd = { ...formData, [k]: v };

    // 年齢自動計算
    if (k === 'birthday') {
      const ad = convertToAD(v);
      const birth = new Date(ad.replace(/\//g, '-'));
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
        nd.age = age.toString();
      }
    }

    // 入国日からの自動計算 (終了日/更新開始日)
    if (k === 'entryDate') {
      const ad = convertToAD(v);
      const date = new Date(ad.replace(/\//g, '-'));
      if (!isNaN(date.getTime())) {
        const end = new Date(date); end.setFullYear(end.getFullYear() + 1); end.setDate(end.getDate() - 1);
        const renew = new Date(end); renew.setMonth(renew.setMonth(renew.getMonth() - 3));
        const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        nd.endDate = fmt(end);
        nd.renewStartDate = fmt(renew);
      }
    }

    // ★区分変更時の履歴保存ロジック
    if (k === 'category' && isEditing && editIdx === null) {
      if (confirm("区分を変更しますか？現在のデータは履歴に保存され、期限等の項目がリセットされます。")) {
        const arch = { ...formData }; delete arch.phaseHistory;
        nd.phaseHistory = [...(formData.phaseHistory || []), arch];
        // リセット項目
        ['status', 'stayLimit', 'cardNumber', 'certificateNumber', 'applyDate', 'certDate', 'entryDate', 'endDate', 'renewStartDate'].forEach(key => {
          nd[key] = (key === 'status' ? '選択する' : '');
        });
      }
    }

    setFormData(nd);
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h2 style={modalTitle}>技能実習生情報入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={labelStyle}>{labelMapTr[k]}</label>
              {['status', 'category', 'batch', 'gender'].includes(k) ? (
                <select style={inputStyle} value={formData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {(k === 'status' ? ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "入国後講習中", "実習中", "一時帰国中", "その他", "失踪"] : 
                    k === 'category' ? ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"] : 
                    k === 'batch' ? ["なし", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"] : ["男", "女"]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" style={inputStyle} value={formData[k] || ''} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={btnContainer}>
          <button onClick={onClose} style={btnCancel}>キャンセル</button>
          <button onClick={onSave} style={btnSave}>保存する</button>
        </div>
      </div>
    </div>
  );
}

// スタイルはCompanyFormと同じ（省略可だが、ファイル単体で動くよう内部に持つのが安全）
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', padding: '40px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' };
const modalTitle: React.CSSProperties = { marginTop: 0, marginBottom: '25px', borderBottom: '2px solid #F57C00', paddingBottom: '10px' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#7F8C8D', display: 'block', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', boxSizing: 'border-box' as 'border-box' };
const btnContainer = { marginTop: '30px', textAlign: 'right' as 'right', borderTop: '1px solid #eee', paddingTop: '20px' };
const btnSave = { background: '#F57C00', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '15px' };
const btnCancel = { background: '#fff', color: '#333', border: '1px solid #ccc', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };