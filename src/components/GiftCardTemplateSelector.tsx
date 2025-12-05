import { Check } from 'lucide-react';

interface GiftCardTemplateSelectorProps {
  onTemplateSelect: (template: string) => void;
  selectedTemplate: string;
}

const templates = [
  {
    id: 'romantic-hearts',
    name: 'Romantic Hearts',
    preview: 'bg-gradient-to-br from-pink-50 to-red-50',
    border: 'border-red-200',
    accent: 'text-red-600'
  },
  {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    preview: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    border: 'border-amber-300',
    accent: 'text-amber-700'
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    preview: 'bg-gradient-to-br from-gray-50 to-slate-100',
    border: 'border-gray-300',
    accent: 'text-gray-700'
  },
  {
    id: 'floral-spring',
    name: 'Floral Spring',
    preview: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-green-300',
    accent: 'text-green-700'
  }
];

export default function GiftCardTemplateSelector({
  onTemplateSelect,
  selectedTemplate
}: GiftCardTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-text-dark mb-3">
          Select a Design Template
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateSelect(template.id)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedTemplate === template.id
                  ? `${template.border} ring-2 ring-offset-2 ring-[#CC4F4E]`
                  : 'border-border hover:border-[#CC4F4E]'
              }`}
            >
              <div
                className={`${template.preview} h-24 rounded-md border ${template.border} mb-2 flex items-center justify-center`}
              >
                <span className={`text-sm font-medium ${template.accent}`}>
                  {template.name}
                </span>
              </div>
              {selectedTemplate === template.id && (
                <div className="absolute top-2 right-2 bg-[#CC4F4E] text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
