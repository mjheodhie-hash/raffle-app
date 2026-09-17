'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CustomizeSectionProps {
  config: any;
  setConfig: (config: any) => void;
  setMessage: (message: string) => void;
  onSave: () => void;
}

export default function CustomizeSection({ config, setConfig, setMessage, onSave }: CustomizeSectionProps) {
  const [logos, setLogos] = useState<string[]>([]);
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const [logosRes, bgsRes] = await Promise.all([
        fetch('/api/upload-image?type=logo'),
        fetch('/api/upload-image?type=background')
      ]);
      const logosData = await logosRes.json();
      const bgsData = await bgsRes.json();
      setLogos(logosData.files || []);
      setBackgrounds(bgsData.files || []);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    type === 'logo' ? setUploadingLogo(true) : setUploadingBg(true);

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        if (type === 'logo') {
          setConfig({ ...config, logo: data.path });
          setLogos([...logos, data.path]);
        } else {
          setConfig({ ...config, background: 'image', backgroundImage: data.path });
          setBackgrounds([...backgrounds, data.path]);
        }
        setMessage(`✓ ${type === 'logo' ? 'Logo' : 'Background'} uploaded successfully`);
      } else {
        setMessage(`✗ Failed to upload ${type}`);
      }
    } catch (error) {
      setMessage(`✗ Upload failed`);
    } finally {
      type === 'logo' ? setUploadingLogo(false) : setUploadingBg(false);
    }
  };

  const getThemeColors = () => {
    const themes: any = {
      purple: 'from-purple-900 via-blue-900 to-indigo-900',
      blue: 'from-blue-900 via-cyan-900 to-teal-900',
      green: 'from-green-900 via-emerald-900 to-teal-900',
      red: 'from-red-900 via-pink-900 to-rose-900',
      orange: 'from-orange-900 via-red-900 to-pink-900',
      cyber: 'from-gray-900 via-cyan-900 to-gray-900',
      neon: 'from-pink-900 via-purple-900 to-blue-900',
      matrix: 'from-black via-green-900 to-black',
      bitcoin: 'from-orange-900 via-yellow-900 to-orange-900',
      ethereum: 'from-indigo-900 via-purple-900 to-pink-900'
    };
    return themes[config.theme] || themes.purple;
  };

  const getBackgroundClass = () => {
    if (config.background === 'image' && config.backgroundImage) {
      return '';
    } else if (config.background === 'solid') {
      return `bg-${config.theme}-900`;
    } else if (config.background === 'animated') {
      return `bg-gradient-to-br ${getThemeColors()} animate-gradient`;
    }
    return `bg-gradient-to-br ${getThemeColors()}`;
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Title</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Theme Color</label>
                <select
                  value={config.theme}
                  onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="purple">Purple</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="red">Red</option>
                  <option value="orange">Orange</option>
                  <option value="cyber">Cyber</option>
                  <option value="neon">Neon</option>
                  <option value="matrix">Matrix</option>
                  <option value="bitcoin">Bitcoin</option>
                  <option value="ethereum">Ethereum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Background</label>
                <select
                  value={config.background}
                  onChange={(e) => setConfig({ ...config, background: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gradient">Gradient</option>
                  <option value="solid">Solid</option>
                  <option value="animated">Animated</option>
                  <option value="image">Image</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo</h3>
          
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logo')}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
              disabled={uploadingLogo}
            />
          </div>

          {logos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {logos.map((logo, idx) => (
                <button
                  key={idx}
                  onClick={() => setConfig({ ...config, logo })}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                    config.logo === logo ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image src={logo} alt="Logo" fill className="object-contain p-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {config.background === 'image' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Background Image</h3>
            
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'background')}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                disabled={uploadingBg}
              />
            </div>

            {backgrounds.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {backgrounds.map((bg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setConfig({ ...config, backgroundImage: bg })}
                    className={`relative aspect-video rounded-lg border-2 overflow-hidden transition-all ${
                      config.backgroundImage === bg ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Image src={bg} alt="Background" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onSave}
          className="w-full py-3 bg-blue-600 text-white text-base font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Save Changes
        </button>
      </div>

      <div className="sticky top-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
          
          <div className={`relative rounded-lg overflow-hidden border-2 border-gray-200 aspect-video ${getBackgroundClass()}`}
            style={config.background === 'image' && config.backgroundImage ? {
              backgroundImage: `url(${config.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {config.logo && (
                <div className="relative w-16 h-16 mb-2">
                  <Image src={config.logo} alt="Logo" fill className="object-contain" />
                </div>
              )}
              
              <h1 className="text-2xl font-bold text-white text-center drop-shadow-lg mb-4">
                {config.title}
              </h1>

              <div className="flex gap-2 mb-4">
                <button className="px-4 py-2 bg-white text-purple-900 rounded-full text-xs font-semibold shadow-md">
                  Participant Raffle
                </button>
                <button className="px-4 py-2 bg-white/20 text-white rounded-full text-xs font-semibold">
                  School Raffle
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 w-full max-w-xs">
                <div className="text-center text-white text-xs mb-2">Press "Pick Winner" to start</div>
                <button className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-bold shadow-lg">
                  Pick Winner
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
