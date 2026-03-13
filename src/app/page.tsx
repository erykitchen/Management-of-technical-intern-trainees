"use client";
import { useState } from 'react';

export default function Home() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null);

  const companyColumns = ["会社名", "ステータス", "決算時期", "代表者職氏名", "職種", "郵便番号", "住所", "TEL", "組合加入日", "職員数", "受入有無", "出資口数", "出資金額", "出資年月日", "法人番号", "労働保険", "雇用保険", "実施者番号", "受理日", "産業分類", "事業所住所", "責任者", "指導員", "生活指導員", "計画指導員"];
  const traineeColumns = ["実習生氏名", "ステータス", "フリガナ", "住所", "区分", "国籍", "生年月日", "年齢", "性別", "期間", "在留期限", "カード番号", "パスポート期限", "番号", "認定番号", "申請日", "認定日", "入国日", "更新開始日", "配属日", "終了日", "移動日", "帰国日", "雇用届出日", "講習開始", "講習終了"];

  const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap', borderRight: '1px solid #eee', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 };
  const fixedColumnStyle: React.CSSProperties = { ...thStyle, position: 'sticky', left: 0, zIndex: 20, borderRight: '2px solid #ddd' };
  const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #eee' };
  const fixedTdStyle: React.CSSProperties = { ...tdStyle, position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 10, borderRight: '2px solid #ddd', fontWeight: 'bold', color: '#1a73e8', cursor: 'pointer' };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '22px', marginBottom: '20px' }}>監理団体 業務管理システム</h1>

      {/* --- 企業一覧 --- */}
      <section style={{ marginBottom: '30px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#555' }}>実習実施者一覧（会社名固定）</h2>
        <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #ddd' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
            <thead>
              <tr>
                {companyColumns.map((col, i) => (
                  <th key={col} style={i === 0 ? fixedColumnStyle : thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={fixedTdStyle} onClick={() => setSelectedCompany("〇〇建設株式会社")}>〇〇建設株式会社</td>
                <td style={tdStyle}>受入中</td>
                {Array(23).fill("-").map((v, i) => <td key={i} style={tdStyle}>{v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* --- 実習生一覧 --- */}
      <section style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#555' }}>実習生一覧（氏名固定）</h2>
        <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #ddd' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
            <thead>
              <tr>
                {traineeColumns.map((col, i) => (
                  <th key={col} style={i === 0 ? fixedColumnStyle : thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={fixedTdStyle} onClick={() => setSelectedTrainee("サンプル 太郎")}>サンプル 太郎</td>
                <td style={tdStyle}><span style={{ backgroundColor: '#e6f4ea', color: '#1e8e3e', padding: '2px 6px', borderRadius: '4px' }}>実習中</span></td>
                {Array(24).fill("-").map((v, i) => <td key={i} style={tdStyle}>{v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* --- 詳細表示（履歴書風モーダル） --- */}
      {(selectedCompany || selectedTrainee) && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '30px', borderRadius: '10px', position: 'relative' }}>
            <button onClick={() => { setSelectedCompany(null); setSelectedTrainee(null); }} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>{selectedCompany ? "企業詳細情報" : "実習生個票（履歴書風）"}</h3>
            <div style={{ marginTop: '20px' }}>
              {(selectedCompany ? companyColumns : traineeColumns).map(col => (
                <div key={col} style={{ display: 'flex', borderBottom: '1px solid #eee', padding: '8px 0' }}>
                  <div style={{ width: '150px', fontWeight: 'bold', color: '#666', fontSize: '13px' }}>{col}</div>
                  <div style={{ flex: 1, fontSize: '14px' }}>{selectedCompany === "〇〇建設株式会社" && col === "会社名" ? "〇〇建設株式会社" : (selectedTrainee === "サンプル 太郎" && col === "実習生氏名" ? "サンプル 太郎" : "-")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}