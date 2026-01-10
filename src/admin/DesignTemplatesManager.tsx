import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, Edit2, Check, X, Eye, EyeOff } from 'lucide-react';

interface DesignTemplate {
  id: string;
  name: string;
  description: string | null;
  category: 'love_letter' | 'gift_card' | 'poem' | 'general';
  image_url: string;
  storage_path: string;
  thumbnail_url: string | null;
  preview_gradient: string;
  border_color: string;
  accent_color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function DesignTemplatesManager() {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'love_letter' as const,
    preview_gradient: 'bg-gradient-to-br from-pink-50 to-red-50',
    border_color: 'border-red-200',
    accent_color: 'text-red-600',
    display_order: 0,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('design_templates')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<{ url: string; path: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('design-templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('design-templates')
        .getPublicUrl(filePath);

      return { url: publicUrl, path: filePath };
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageData = { url: '', path: '' };

      if (imageFile) {
        const uploadResult = await uploadImage(imageFile);
        if (!uploadResult) {
          alert('Failed to upload image');
          return;
        }
        imageData = uploadResult;
      }

      if (editingId) {
        const updateData: any = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          preview_gradient: formData.preview_gradient,
          border_color: formData.border_color,
          accent_color: formData.accent_color,
          display_order: formData.display_order,
          updated_at: new Date().toISOString(),
        };

        if (imageData.url) {
          updateData.image_url = imageData.url;
          updateData.storage_path = imageData.path;
        }

        const { error } = await supabase
          .from('design_templates')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('design_templates')
          .insert({
            ...formData,
            image_url: imageData.url,
            storage_path: imageData.path,
          });

        if (error) throw error;
      }

      resetForm();
      fetchTemplates();
      alert(editingId ? 'Template updated successfully!' : 'Template created successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (template: DesignTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      preview_gradient: template.preview_gradient,
      border_color: template.border_color,
      accent_color: template.accent_color,
      display_order: template.display_order,
    });
    setImagePreview(template.image_url);
    setShowUploadForm(true);
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      if (storagePath) {
        await supabase.storage.from('design-templates').remove([storagePath]);
      }

      const { error } = await supabase
        .from('design_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTemplates();
      alert('Template deleted successfully!');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('design_templates')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error updating status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'love_letter',
      preview_gradient: 'bg-gradient-to-br from-pink-50 to-red-50',
      border_color: 'border-red-200',
      accent_color: 'text-red-600',
      display_order: 0,
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowUploadForm(false);
  };

  if (loading) {
    return <div className="p-4">Loading templates...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-text-dark">Design Templates</h2>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-[#CC4F4E] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
        >
          {showUploadForm ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {showUploadForm ? 'Cancel' : 'Add New Template'}
        </button>
      </div>

      {showUploadForm && (
        <form onSubmit={handleSubmit} className="bg-panel rounded-lg p-6 mb-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-text-dark">
            {editingId ? 'Edit Template' : 'Create New Template'}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                placeholder="e.g., Romantic Hearts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
              >
                <option value="love_letter">Love Letter</option>
                <option value="gift_card">Gift Card</option>
                <option value="poem">Poem</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
              placeholder="Brief description of the template..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Preview Gradient CSS
              </label>
              <input
                type="text"
                value={formData.preview_gradient}
                onChange={(e) => setFormData({ ...formData, preview_gradient: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                placeholder="Tailwind classes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Border Color CSS
              </label>
              <input
                type="text"
                value={formData.border_color}
                onChange={(e) => setFormData({ ...formData, border_color: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                placeholder="border-color-xxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Accent Color CSS
              </label>
              <input
                type="text"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                placeholder="text-color-xxx"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-dark mb-2">
              Template Image {!editingId && '*'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required={!editingId}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-48 h-32 object-cover rounded-lg border border-border"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-[#CC4F4E] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? 'Saving...' : (editingId ? 'Update Template' : 'Create Template')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-background border border-border text-text-light rounded-lg hover:bg-panel transition-all"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-panel rounded-lg p-4 border border-border"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-text-dark">{template.name}</h3>
                <span className="text-xs text-text-light px-2 py-1 bg-background rounded">
                  {template.category.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(template.id, template.is_active)}
                  className={`p-1 rounded ${
                    template.is_active ? 'text-green-500' : 'text-gray-500'
                  }`}
                  title={template.is_active ? 'Active' : 'Inactive'}
                >
                  {template.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {template.image_url ? (
              <img
                src={template.image_url}
                alt={template.name}
                className="w-full h-32 object-cover rounded-lg mb-3 border border-border"
              />
            ) : (
              <div
                className={`${template.preview_gradient} h-32 rounded-lg mb-3 border ${template.border_color} flex items-center justify-center`}
              >
                <span className={`text-sm font-medium ${template.accent_color}`}>
                  {template.name}
                </span>
              </div>
            )}

            {template.description && (
              <p className="text-sm text-text-light mb-3">{template.description}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(template)}
                className="flex-1 px-3 py-2 bg-background border border-border text-text-light rounded hover:bg-panel transition-all flex items-center justify-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(template.id, template.storage_path)}
                className="px-3 py-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-text-light">
          No templates yet. Click "Add New Template" to create one.
        </div>
      )}
    </div>
  );
}
