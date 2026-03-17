import React, { useState } from 'react';
import { convertToAD, calculateAge, checkAlert } from '../lib/utils';
import Papa from 'papaparse';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  companyName?: string;
}

export const AddTraineeModal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, companyName }) => {
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [category, setCategory] = useState('第1号');

  if (!isOpen) return null;

  // CSV読み込み処理
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onConfirm({ type: 'csv', data: results.data });
          onClose();
        },
      });
    }
  };

  const handleSubmit = () => {
    if (!name) return alert('名前を入力してください');
    
    // 年齢を計算してデータを作成（既存の機能を維持）
    const age = calculateAge(convertToAD(birthday));
    
    onConfirm({
      type: 'single',
      data: {
        name,
        birthday: convertToAD(birthday),
        age,
        category,
        company: companyName
      }
    });
    onClose();
  };

  const handleInitialAction = () => {
    if (window.confirm('CSVファイルから一括登録しますか？\n[キャンセル]を押すと一人ずつ登録できます。')) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = (e: any) => handleCSVUpload(e);
      input.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">実習生の追加 ({companyName})</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">名前</label>
            <input 
              type="text" 
              className="w-full border rounded p-2" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：山田 太郎"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">生年月日</label>
            <input 
              type="text" 
              className="w-full border rounded p-2" 
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="例：S60/5/10 または 1985/05/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">区分</label>
            <select 
              className="w-full border rounded p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>第1号</option>
              <option>第2号</option>
              <option>第3号</option>
              <option>特定技能</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between gap-2">
          <button 
            onClick={handleInitialAction}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            CSV一括登録
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">キャンセル</button>
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
};