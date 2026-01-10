import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GiftCardTemplateSelectorProps {
  onTemplateSelect: (template: string) => void;
  selectedTemplate: string;
  category?: 'love_letter' | 'gift_card' | 'poem' | 'general';
}

interface Template {
  id: string;
  name: string;
  preview_gradient: string;
  border_color: string;
  accent_color: string;
  image_url: string;
}

export default function GiftCardTemplateSelector({
  onTemplateSelect,
  selectedTemplate,
  category = 'general'
}: GiftCardTemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('design_templates')
        .select('id, name, preview_gradient, border_color, accent_color, image_url')
        .eq('is_active', true)
        .or(`category.eq.${category},category.eq.general`)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);

      if (data && data.length > 0 && !selectedTemplate) {
        onTemplateSelect(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#CC4F4E] animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-4 text-text-light">
        No templates available
      </div>
    );
  }

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
                  ? `${template.border_color} ring-2 ring-offset-2 ring-[#CC4F4E]`
                  : 'border-border hover:border-[#CC4F4E]'
              }`}
            >
              {template.image_url ? (
                <div className="h-24 rounded-md overflow-hidden mb-2">
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`${template.preview_gradient} h-24 rounded-md border ${template.border_color} mb-2 flex items-center justify-center`}
                >
                  <span className={`text-sm font-medium ${template.accent_color}`}>
                    {template.name}
                  </span>
                </div>
              )}
              <p className="text-sm text-text-dark text-center">{template.name}</p>
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
