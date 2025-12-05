// src/admin/TemplatesManager.tsx
import React, { useEffect, useState } from 'react';
import { fetchTemplates, uploadTemplate } from './api';

export const TemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');

  useEffect(()=>{ fetchTemplates().then(setTemplates).catch(console.error); }, []);

  const handleUpload = async () => {
    if (!file) return alert('select file');
    const meta = { name, created_at: new Date().toISOString() };
    await uploadTemplate(meta, file);
    const t = await fetchTemplates(); setTemplates(t);
  }

  return (
    <div className="bg-white/5 rounded-lg p-4 mt-4">
      <h3 className="text-xl mb-4">Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input type="text" className="form-input mb-2" placeholder="Template name" value={name} onChange={(e)=>setName(e.target.value)} />
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
          <div className="mt-2"><button onClick={handleUpload} className="px-4 py-2 rounded bg-[#f28787] text-[#471212]">Upload</button></div>
        </div>
        {templates.map(t => (
          <div key={t.id} className="p-3 bg-[rgba(0,0,0,0.2)] rounded">
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-[#F3DADA]">{t.storage_path}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
