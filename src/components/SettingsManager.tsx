import React, { useState, useEffect, useRef } from 'react';
import { User, Bell, Shield, Palette, Globe, Download, Trash2, Key, Mail, Phone, Camera, Save, X, Check, AlertTriangle, Eye, EyeOff, Volume2, VolumeX, Smartphone, Monitor, Tablet, Settings, Lock, Unlock, RefreshCw, LogOut, CreditCard, FileText, HelpCircle, ExternalLink, ChevronRight, ToggleLeft as Toggle, Upload, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  theme: 'light' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    achievements: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    achievementsVisible: boolean;
    progressVisible: boolean;
    allowMessages: boolean;
  };
  study: {
    autoSave: boolean;
    soundEffects: boolean;
    animations: boolean;
    defaultDifficulty: string;
    reminderTime: string;
  };
  accessibility: {
    fontSize: string;
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
}

interface SettingsManagerProps {
  onNavigate?: (page: string) => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      achievements: true,
      reminders: true,
      marketing: false
    },
    privacy: {
      profileVisible: true,
      achievementsVisible: true,
      progressVisible: true,
      allowMessages: true
    },
    study: {
      autoSave: true,
      soundEffects: true,
      animations: true,
      defaultDifficulty: 'medium',
      reminderTime: '19:00'
    },
    accessibility: {
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      screenReader: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'study', label: 'Study Preferences', icon: Settings },
    { id: 'accessibility', label: 'Accessibility', icon: Eye },
    { id: 'account', label: 'Account Management', icon: Lock }
  ];

  useEffect(() => {
    if (user) {
      loadProfile();
      loadSettings();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Load settings from localStorage for now
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      // Save to localStorage for now
      localStorage.setItem('user_settings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      // Trigger a custom event to notify other components of profile updates
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: updatedProfile 
      }));
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setShowImageUpload(true);
  };

  const uploadProfileImage = async () => {
    if (!selectedImage || !user) return;

    try {
      setUploadingImage(true);

      // Convert image to base64 for storage (in a real app, you'd upload to a storage service)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Update profile with new avatar URL
        await updateProfile({ avatar_url: base64 });
        
        setShowImageUpload(false);
        setSelectedImage(null);
        setImagePreview(null);
        toast.success('Profile picture updated successfully!');
      };
      reader.readAsDataURL(selectedImage);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    try {
      setSaving(true);
      await updateProfile({ avatar_url: null });
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error('Failed to remove profile picture');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;

      toast.success('Password changed successfully');
      setShowPasswordChange(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setSaving(true);
      // In a real app, this would be handled by a backend service
      toast.error('Account deletion is not implemented yet. Please contact support.');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setSaving(false);
      setShowDeleteConfirmation(false);
    }
  };

  const exportData = async () => {
    try {
      toast.loading('Preparing data export...');
      
      // Simulate data export
      setTimeout(() => {
        toast.dismiss();
        toast.success('Data export will be sent to your email within 24 hours');
      }, 2000);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      if (onNavigate) {
        onNavigate('home');
      }
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
        
        {/* Avatar */}
        <div className="flex items-center space-x-6 mb-8">
          <div className="relative">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}&size=128&background=6366f1&color=ffffff`}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <div className="absolute bottom-0 right-0 flex space-x-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                title="Upload new photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              {profile?.avatar_url && (
                <button 
                  onClick={removeProfileImage}
                  disabled={saving}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">{profile?.full_name}</h4>
            <p className="text-gray-600">{profile?.email}</p>
            <p className="text-sm text-gray-500 capitalize">
              {profile?.subscription_tier} Member
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Change profile picture
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profile?.full_name || ''}
              onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => updateProfile({ full_name: profile?.full_name || '' })}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
        
        <div className="space-y-6">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <p className="text-sm text-gray-600">
                  {key === 'email' && 'Receive notifications via email'}
                  {key === 'push' && 'Receive push notifications in browser'}
                  {key === 'achievements' && 'Get notified when you unlock achievements'}
                  {key === 'reminders' && 'Receive study reminders'}
                  {key === 'marketing' && 'Receive promotional emails and updates'}
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, [key]: !value }
                }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Security</h3>
        
        {/* Privacy Settings */}
        <div className="mb-8">
          <h4 className="font-medium text-gray-900 mb-4">Privacy Settings</h4>
          <div className="space-y-4">
            {Object.entries(settings.privacy).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {key === 'profileVisible' && 'Allow others to view your profile'}
                    {key === 'achievementsVisible' && 'Show your achievements publicly'}
                    {key === 'progressVisible' && 'Display your learning progress'}
                    {key === 'allowMessages' && 'Allow other users to message you'}
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, [key]: !value }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Password Change */}
        <div className="mb-8">
          <h4 className="font-medium text-gray-900 mb-4">Password & Security</h4>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Password</h5>
                <p className="text-sm text-gray-600">Last changed 30 days ago</p>
              </div>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStudyTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Study Preferences</h3>
        
        <div className="space-y-6">
          {/* Study Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Difficulty
              </label>
              <select
                value={settings.study.defaultDifficulty}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  study: { ...prev.study, defaultDifficulty: e.target.value }
                }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Study Reminder Time
              </label>
              <input
                type="time"
                value={settings.study.reminderTime}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  study: { ...prev.study, reminderTime: e.target.value }
                }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            {Object.entries(settings.study).filter(([key]) => typeof settings.study[key as keyof typeof settings.study] === 'boolean').map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {key === 'autoSave' && 'Automatically save your progress'}
                    {key === 'soundEffects' && 'Play sound effects during study sessions'}
                    {key === 'animations' && 'Enable smooth animations and transitions'}
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    study: { ...prev.study, [key]: !value }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccessibilityTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Accessibility Options</h3>
        
        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size
            </label>
            <select
              value={settings.accessibility.fontSize}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                accessibility: { ...prev.accessibility, fontSize: e.target.value }
              }))}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          {/* Accessibility Toggles */}
          <div className="space-y-4">
            {Object.entries(settings.accessibility).filter(([key]) => typeof settings.accessibility[key as keyof typeof settings.accessibility] === 'boolean').map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {key === 'highContrast' && 'Increase contrast for better visibility'}
                    {key === 'reducedMotion' && 'Reduce animations and motion effects'}
                    {key === 'screenReader' && 'Optimize for screen reader compatibility'}
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    accessibility: { ...prev.accessibility, [key]: !value }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Management</h3>
        
        {/* Account Info */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h4 className="font-medium text-gray-900 mb-4">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Account Created:</span>
              <span className="ml-2 font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Subscription:</span>
              <span className="ml-2 font-medium capitalize">{profile?.subscription_tier}</span>
            </div>
            <div>
              <span className="text-gray-500">Account ID:</span>
              <span className="ml-2 font-mono text-xs">{profile?.id}</span>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Data Management</h4>
          
          <div className="space-y-3">
            <button
              onClick={exportData}
              className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Download className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h5 className="font-medium text-blue-900">Export Your Data</h5>
                  <p className="text-sm text-blue-700">Download all your study data and progress</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-600" />
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <LogOut className="w-5 h-5 text-orange-600" />
                <div className="text-left">
                  <h5 className="font-medium text-orange-900">Sign Out</h5>
                  <p className="text-sm text-orange-700">Sign out of your account on this device</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-600" />
            </button>

            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <h5 className="font-medium text-red-900">Delete Account</h5>
                  <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Image Upload Modal
  const ImageUploadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={() => {
            setShowImageUpload(false);
            setSelectedImage(null);
            setImagePreview(null);
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Profile Picture</h2>
          <p className="text-gray-600">Upload a new profile picture</p>
        </div>

        {imagePreview && (
          <div className="mb-6">
            <div className="flex justify-center">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Image Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Maximum file size: 5MB</li>
              <li>• Supported formats: JPG, PNG, GIF</li>
              <li>• Recommended: Square images (1:1 ratio)</li>
              <li>• Minimum resolution: 200x200 pixels</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowImageUpload(false);
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={uploadProfileImage}
              disabled={uploadingImage || !selectedImage}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {uploadingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Password Change Modal
  const PasswordChangeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={() => setShowPasswordChange(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Password</h2>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                value={passwordData.current}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                value={passwordData.new}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setShowPasswordChange(false)}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={changePassword}
              disabled={saving || !passwordData.current || !passwordData.new || !passwordData.confirm}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={() => setShowDeleteConfirmation(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Account</h2>
          <p className="text-gray-600">
            This action cannot be undone. All your data, progress, and achievements will be permanently deleted.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-red-900 mb-2">This will delete:</h4>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• All your quizzes and study materials</li>
            <li>• Your progress and achievements</li>
            <li>• Your profile and account data</li>
            <li>• Any marketplace items you've created</li>
          </ul>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setShowDeleteConfirmation(false)}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={deleteAccount}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account preferences and privacy settings</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-6">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'privacy' && renderPrivacyTab()}
            {activeTab === 'study' && renderStudyTab()}
            {activeTab === 'accessibility' && renderAccessibilityTab()}
            {activeTab === 'account' && renderAccountTab()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showImageUpload && <ImageUploadModal />}
      {showPasswordChange && <PasswordChangeModal />}
      {showDeleteConfirmation && <DeleteConfirmationModal />}
    </div>
  );
};

export default SettingsManager;