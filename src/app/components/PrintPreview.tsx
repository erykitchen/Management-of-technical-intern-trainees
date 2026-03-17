"use client";
import React from 'react';
import { Company, Trainee } from '../types';

interface Props {
  company: Company;
  trainee?: Trainee; // 単体印刷、または一括印刷用
}

export default function PrintPreview({ company, trainee }: Props) {
  // ラベル定義
  const labelMapCo: { [key: string]: string } = {
    companyName: "会社名", settlement: "決算時期", representative: "代表者氏名", jobType: "職種",
    address: "住所", tel: "TEL", joinedDate: "組合加入日", employeeCount: "職員数",
    implementationNumber: "実習実施者番号", officeAddress: "配属先住所"
  };

  const labelMapTr: { [key: string]: string } = {
    batch: "期生", category: "区分", traineeName: "氏名", kana: "フリガナ",
    birthday: "生年月日", age: "年齢", nationality: "国籍", stayLimit: "在留期限",
    entryDate: "入国日", endDate: "実習終了日", passportNumber: "旅券番号"
  };

  return (
    <div className="print-area" style={printPageStyle}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div style={{ borderBottom: '2px solid #333', marginBottom: '30px', paddingBottom: '10px' }}>
        <h1 style={{ textAlign: 'center', margin: 0 }}>技能実習生・企業情報管理表</h1>
        <p style={{ textAlign: 'right', margin: 0 }}>出力日: {new Date().toLocaleDateString('ja-JP')}</p>
      </div>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>🏢 企業情報</h2>
        <table style={tableStyle}>
          <tbody>
            {Object.keys(labelMapCo).map(k => (
              <tr key={k}>
                <th style={thStyle}>{labelMapCo[k]}</th>
                <td style={tdStyle}>{(company as any)[k] || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {trainee && (
        <section>
          <h2 style={sectionTitle}>👤 実習生個人情報</h2>
          <table style={tableStyle}>
            <tbody>
              {Object.keys(labelMapTr).map(k => (
                <tr key={k}>
                  <th style={thStyle}>{labelMapTr[k]}</th>
                  <td style={tdStyle}>{(trainee as any)[k] || '-'}</td>
                </tr>
              ))}
              <tr>
                <th style={thStyle}>備考</th>
                <td style={tdStyle}>{trainee.memo || '-'}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <div style={{ marginTop: '50px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        アシストねっと協同組合 管理システム
      </div>
    </div>
  );
}

// 印刷用スタイル
const printPageStyle: React.CSSProperties = {
  padding: '40px',
  background: '#fff',
  color: '#000',
  fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'
};

const sectionTitle: React.CSSProperties = {
  fontSize: '18px',
  borderLeft: '5px solid #333',
  paddingLeft: '10px',
  marginBottom: '15px',
  background: '#f9f9f9'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '20px'
};

const thStyle: React.CSSProperties = {
  width: '30%',
  textAlign: 'left',
  padding: '10px',
  border: '1px solid #ccc',
  backgroundColor: '#f2f2f2',
  fontSize: '14px'
};

const tdStyle: React.CSSProperties = {
  padding: '10px',
  border: '1px solid #ccc',
  fontSize: '14px'
};