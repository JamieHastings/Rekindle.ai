import React, { useState } from 'react';
import { TemplatesManager } from '../TemplatesManager';
import DesignTemplatesManager from '../DesignTemplatesManager';

export const AdminTemplatesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'message' | 'design'>('design');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Template Management</h2>
        <p className="text-[#F3DADA]">Upload, edit, and manage templates</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('design')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'design'
              ? 'text-[#CC4F4E] border-b-2 border-[#CC4F4E]'
              : 'text-text-light hover:text-text-dark'
          }`}
        >
          Design Templates
        </button>
        <button
          onClick={() => setActiveTab('message')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'message'
              ? 'text-[#CC4F4E] border-b-2 border-[#CC4F4E]'
              : 'text-text-light hover:text-text-dark'
          }`}
        >
          Message Templates
        </button>
      </div>

      {activeTab === 'design' ? (
        <DesignTemplatesManager />
      ) : (
        <TemplatesManager />
      )}
    </div>
  );
};
