import React, { useEffect, useState } from 'react';
import { Upload, Trash2, Edit2, Eye, EyeOff, X } from 'lucide-react';
import { supabase, DesignTemplate } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const TemplatesManager: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as 'love_letter' | 'gift_card' | 'poem' | 'general',
    file: null as File | null
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (formData.file) {
      const url = URL.createObjectURL(formData.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [formData.file]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('design_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file || !user) {
      alert('Please select a file');
      return;
    }

    setUploading(true);

    try {
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('design-templates')
        .upload(filePath, formData.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('design-templates')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('design_templates')
        .insert({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          image_url: urlData.publicUrl,
          storage_path: filePath,
          created_by: user.id,
          is_active: true
        });

      if (insertError) throw insertError;

      setFormData({
        name: '',
        description: '',
        category: 'general',
        file: null
      });
      setShowUploadForm(false);
      await fetchTemplates();
      alert('Template uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading template:', error);
      alert(error.message || 'Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (template: DesignTemplate) => {
    try {
      const { error } = await supabase
        .from('design_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      await fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      alert('Failed to update template');
    }
  };

  const deleteTemplate = async (template: DesignTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('design-templates')
        .remove([template.storage_path]);

      if (storageError) console.error('Storage delete error:', storageError);

      const { error: dbError } = await supabase
        .from('design_templates')
        .delete()
        .eq('id', template.id);

      if (dbError) throw dbError;

      await fetchTemplates();
      alert('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const filteredTemplates = filterCategory === 'all'
    ? templates
    : templates.filter(t => t.category === filterCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#F3DADA]">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E]"
          >
            <option value="all">All Categories</option>
            <option value="love_letter">Love Letter</option>
            <option value="gift_card">Gift Card</option>
            <option value="poem">Poem</option>
            <option value="general">General</option>
          </select>
        </div>

        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-6 py-2 bg-[#CC4F4E] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Upload size={20} />
          Upload Template
        </button>
      </div>

      {showUploadForm && (
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Upload New Template</h3>
            <button onClick={() => setShowUploadForm(false)}>
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E]"
                  placeholder="e.g., Romantic Hearts"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E]"
                >
                  <option value="general">General</option>
                  <option value="love_letter">Love Letter</option>
                  <option value="gift_card">Gift Card</option>
                  <option value="poem">Poem</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E] resize-none"
                placeholder="Template description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image File</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                required
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E]"
              />
              <p className="text-sm text-[#F3DADA] mt-1">Max 5MB. Formats: JPG, PNG, WebP</p>
            </div>

            {previewUrl && (
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-sm max-h-64 rounded-lg border border-white/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-[#CC4F4E] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Template'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#F3DADA]">
            No templates found
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
            >
              <img
                src={template.image_url}
                alt={template.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-lg">{template.name}</h4>
                    <span className="text-xs px-2 py-1 bg-[#CC4F4E]/20 text-[#CC4F4E] rounded">
                      {template.category.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    template.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {template.description && (
                  <p className="text-sm text-[#F3DADA] mb-3 line-clamp-2">{template.description}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(template)}
                    className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {template.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => deleteTemplate(template)}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
