"use client";
import React from 'react';

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
  
  // 和暦・ドット・スラッシュ混在対応の西暦変換 (convertToAD)
  const convertToAD = (str: string) => {
    if (!str) return "";
    let text = str.trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    const eras: { [key: string]: number } = { '令和': 2018, '平成': 1988, '昭和': 1925, 'R': 2018, 'H': 1988, 'S': 1925 };
    for (let era in eras) {
      if (text.startsWith(era)) {
        const match = text.match(new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月.\\/-]?(\\d+)日?`));
        if (match) return `${parseInt(match[1]) + eras[era]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
      }
    }
    return text.replace(/\./g, '/');
  };

  const handleChange = (k: string, v: string) => {
    let nd = { ...formData, [k]: v };

    // 【年齢自動計算】
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

    // 【入国日から終了日・更新時期を自動計算】
    if (k === 'entryDate') {
      const ad = convertToAD(v);
      const date = new Date(ad.replace(/\//g, '-'));
      if (!isNaN(date.getTime())) {
        const end = new Date(date); end.setFullYear(end.getFullYear() + 1); end.setDate(end.getDate() - 1);
        const renew = new Date(end); renew.setMonth(renew.getMonth() - 3);
        const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        nd.endDate = fmt(end);
        nd.renewStartDate = fmt(renew);
      }
    }

    // 【区分変更時の自動バックアップ】
    if (k === 'category' && isEditing && editIdx === null) {
      if (window.confirm("区分（1号→2号など）を変更しますか？現在のデータは履歴に保存され、新しい区分のために日付項目等がリセットされます。")) {
        const historyEntry = { ...formData };
        delete historyEntry.phaseHistory;
        nd.phaseHistory = [...(formData.phaseHistory || []), historyEntry];
        // リセット処理
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', borderBottom: '2px solid #F57C00', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '22px' }}>実習生情報の登録・編集</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '28px', cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 25px' }}>
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={labelStyle}>{labelMapTr[k]}</label>
              {['status', 'category', 'batch', 'gender'].includes(k) ? (
                <select style={inputStyle} value={formData[k] || ''} onChange={e => handleChange(k, e.target.value)}>
                  {(k === 'status' ? ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "入国後講習中", "実習中", "一時帰国中", "失踪", "その他"] : 
                    k === 'category' ? ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"] : 
                    k === 'batch' ? ["なし", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"] : ["男", "女"]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input 
                  type="text" 
                  style={inputStyle} 
                  value={formData[k] || ''} 
                  onChange={e => handleChange(k, e.target.value)} 
                  placeholder={k.includes('Date') || k.includes('Limit') ? '例: R5.10.1 または 2023/10/01' : ''}
                />
              )}
            </div>
          ))}
        </div>

        <div style={btnContainer}>
          <button onClick={onClose} style={btnCancel}>キャンセル</button>
          <button onClick={onSave} style={btnSave}>実習生情報を保存する</button>
        </div>
      </div>
    </div>
  );
}

// スタイルはCompanyFormと共通（一貫性を持たせています）
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContent: React.CSSProperties = { background: '#fff', padding: '40px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '15px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const labelStyle = { fontSize: '13px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as 'border-box' };
const btnContainer = { marginTop: '40px', textAlign: 'right' as 'right', borderTop: '1px solid #eee', paddingTop: '25px' };
const btnSave = { background: '#F57C00', color: '#fff', border: 'none', padding: '15px 45px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' };
const btnCancel = { background: '#fff', color: '#666', border: '1px solid #ccc', padding: '15px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginRight: '15px' };