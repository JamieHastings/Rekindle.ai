import React, { useState } from 'react';
import { Save, UserPlus, Shield, Settings as SettingsIcon } from 'lucide-react';

export const AdminSettingsView: React.FC = () => {
  const [defaultTokens, setDefaultTokens] = useState(5);
  const [defaultCharacterLength, setDefaultCharacterLength] = useState('medium');
  const [emailToPromote, setEmailToPromote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Error saving settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!emailToPromote.trim()) {
      setMessage('Please enter an email address');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage(`User ${emailToPromote} promoted to admin successfully!`);
      setEmailToPromote('');
    } catch (error) {
      setMessage('Error promoting user');
      console.error('Error promoting user:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Platform Settings</h2>
        <p className="text-[#F3DADA]">Configure system-wide settings and manage administrators</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') || message.includes('error') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {message}
        </div>
      )}

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold">Content Generation Settings</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Default Token Amount for New Users</label>
            <input
              type="number"
              value={defaultTokens}
              onChange={(e) => setDefaultTokens(parseInt(e.target.value) || 0)}
              className="w-full md:w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
              min="0"
            />
            <p className="text-sm text-[#F3DADA] mt-1">Tokens given to new users upon registration</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Character Length</label>
            <select
              value={defaultCharacterLength}
              onChange={(e) => setDefaultCharacterLength(e.target.value)}
              className="w-full md:w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
            <p className="text-sm text-[#F3DADA] mt-1">Default length for generated content</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tokens per Generation</label>
            <input
              type="number"
              value={2}
              disabled
              className="w-full md:w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/50 cursor-not-allowed"
            />
            <p className="text-sm text-[#F3DADA] mt-1">Tokens required to generate one message</p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold">Admin Management</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Promote User to Admin</label>
            <div className="flex gap-3">
              <input
                type="email"
                value={emailToPromote}
                onChange={(e) => setEmailToPromote(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              />
              <button
                onClick={handlePromoteToAdmin}
                disabled={saving}
                className="px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Promote
              </button>
            </div>
            <p className="text-sm text-[#F3DADA] mt-1">Enter user email to grant admin privileges</p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Current Administrators</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <div className="font-medium">admin@rekindle.ai</div>
                  <div className="text-sm text-[#F3DADA]">Super Admin</div>
                </div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-orange-400" />
          </div>
          <h3 className="text-xl font-bold">Feature Flags</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="font-medium">Gift Card Messages</div>
              <div className="text-sm text-[#F3DADA]">Enable gift card message generation</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="font-medium">Preview Mode</div>
              <div className="text-sm text-[#F3DADA]">Allow non-authenticated users to preview messages</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="font-medium">Multi-Factor Authentication</div>
              <div className="text-sm text-[#F3DADA]">Require MFA for admin accounts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Audit Log</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <div>
              <div className="text-sm">Settings updated</div>
              <div className="text-xs text-[#F3DADA]">Default tokens changed to 5</div>
            </div>
            <div className="text-xs text-[#F3DADA]">2 hours ago</div>
          </div>
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <div>
              <div className="text-sm">User promoted to admin</div>
              <div className="text-xs text-[#F3DADA]">user@example.com</div>
            </div>
            <div className="text-xs text-[#F3DADA]">1 day ago</div>
          </div>
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <div>
              <div className="text-sm">Template uploaded</div>
              <div className="text-xs text-[#F3DADA]">romantic-hearts.png</div>
            </div>
            <div className="text-xs text-[#F3DADA]">3 days ago</div>
          </div>
        </div>
      </div>
    </div>
  );
};
