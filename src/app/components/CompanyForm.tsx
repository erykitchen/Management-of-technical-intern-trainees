"use client";
import { Company } from '../types';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
}

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

export default function CompanyForm({ formData, setFormData, onSave, onClose }: Props) {
  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h2 style={modalTitle}>実習実施者（会社）情報入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={labelStyle}>{labelMapCo[k]}</label>
              {k === 'memo' ? (
                <textarea style={inputStyle} value={formData[k] || ''} onChange={e => setFormData({ ...formData, [k]: e.target.value })} />
              ) : (
                <input type="text" style={inputStyle} value={formData[k] || ''} onChange={e => setFormData({ ...formData, [k]: e.target.value })} />
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

// スタイル定義（共通）
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#fff', padding: '40px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' };
const modalTitle: React.CSSProperties = { marginTop: 0, marginBottom: '25px', borderBottom: '2px solid #F57C00', paddingBottom: '10px' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#7F8C8D', display: 'block', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', boxSizing: 'border-box' as 'border-box' };
const btnContainer = { marginTop: '30px', textAlign: 'right' as 'right', borderTop: '1px solid #eee', paddingTop: '20px' };
const btnSave = { background: '#F57C00', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '15px' };
const btnCancel = { background: '#fff', color: '#333', border: '1px solid #ccc', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };