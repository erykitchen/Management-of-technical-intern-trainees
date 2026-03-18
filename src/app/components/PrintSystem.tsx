"use client";
import { useState } from 'react';
import { labelMapCo, labelMapTr } from '../constants/labels';
import { convertToAD } from '../utils/dateUtils';

export default function PrintSystem({ view, companies, onBack }: any) {
  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'individual' | 'table'>('individual');
  const [isPreview, setIsPreview] = useState(false);

  const colors = { accent: '#F57C00', gray: '#95A5A6', border: '#E0E0E0', lightGray: '#F2F2F2' };
  const btnBase = { padding: '10px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '600' as any, fontSize: '13px' };

  const selectedCompany = companies.find((c: any) => c.id === printCoId);
  const labels = view === 'print_tr' ? labelMapTr : labelMapCo;
  const selectedTrainees = selectedCompany?.trainees?.filter((t: any) => printTrIds.includes(t.id)) || [];

  if (isPreview) {
    return (
      <div className="print-area" style={{ padding: '0', backgroundColor: '#fff', minHeight: '100vh' }}>
        <style>{`
          @media print { .no-print { display: none !important; } .page-break { page-break-after: always; }
            @page { size: ${printMode === 'table' ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm; } }
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
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>モード: {printMode === 'individual' ? '管理簿（1人1枚）' : '一覧表（5人/枚）'}</span>
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
                    {printFields.map(key => (<tr key={key}><th>{labelMapTr[key]}</th><td>{t[key] || '-'}</td></tr>))}
                  </tbody>
                </table>
              </div>
            ))
          ) : view === 'print_tr' && printMode === 'table' ? (
            <table className="list-table">
              <thead><tr>{printFields.map(key => <th key={key}>{labelMapTr[key]}</th>)}</tr></thead>
              <tbody>
                {selectedTrainees.map((t: any) => (<tr key={t.id}>{printFields.map(key => <td key={key}>{t[key] || '-'}</td>)}</tr>))}
              </tbody>
            </table>
          ) : (
            <table className="individual-table">
              <tbody>
                {printFields.map(key => (<tr key={key}><th>{labelMapCo[key]}</th><td>{selectedCompany?.[key] || '-'}</td></tr>))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← キャンセルして戻る</button>
        <h1 style={{ fontSize: '24px', marginTop: '10px' }}>{view === 'print_tr' ? '実習生情報の印刷設定' : '会社情報の印刷設定'}</h1>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          <h3>1. 対象を選択</h3>
          <select style={{ width: '100%', padding: '10px', marginBottom: '20px' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
            <option value="">会社を選択してください</option>
            {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
          {view === 'print_tr' && selectedCompany && (
            <>
              <label style={{ fontSize: '12px', color: colors.gray, display: 'block', marginBottom: '10px' }}>印刷する実習生（複数選択可）</label>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: `1px solid ${colors.border}`, padding: '10px' }}>
                {selectedCompany.trainees?.map((t: any) => (
                  <label key={t.id} style={{ display: 'block', padding: '8px', borderBottom: `1px solid #f2f2f2`, cursor: 'pointer' }}>
                    <input type="checkbox" checked={printTrIds.includes(t.id)} onChange={(e) => {
                      if (e.target.checked) setPrintTrIds([...printTrIds, t.id]);
                      else setPrintTrIds(printTrIds.filter(id => id !== t.id));
                    }} /> {t.traineeName} ({t.batch})
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
          <h3>2. 印刷項目を選択</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {Object.keys(labels).map(key => (
              <label key={key} style={{ fontSize: '13px', cursor: 'pointer' }}>
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
        <button disabled={!printCoId || printFields.length === 0} onClick={() => setIsPreview(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', padding: '15px 60px' }}>
          プレビューを表示する
        </button>
      </div>
    </main>
  );
}