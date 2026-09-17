'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiUpload, HiColorSwatch, HiLightningBolt, HiChevronDoubleLeft, HiChevronDoubleRight, HiDownload } from 'react-icons/hi';
import CustomizeSection from '@/components/CustomizeSection';

export default function AdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState({
    title: '7th IT Congress Raffle',
    logo: '',
    theme: 'purple',
    background: 'gradient',
    backgroundImage: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('upload');
  const [previewData, setPreviewData] = useState<{
    participants: any[];
    schools: any[];
  } | null>(null);
  const [previewTab, setPreviewTab] = useState<'participants' | 'schools'>('participants');
  const [totalCounts, setTotalCounts] = useState({ participants: 0, schools: 0 });

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load config:', err));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      try {
        const XLSX = await import('xlsx');
        const reader = new FileReader();

        reader.onload = (event) => {
          try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });

            const participants: any[] = [];
            const schools: any[] = [];

            if (workbook.SheetNames.includes('Participants')) {
              const participantSheet = workbook.Sheets['Participants'];
              const participantData = XLSX.utils.sheet_to_json(participantSheet);
              participants.push(...participantData);
            }

            if (workbook.SheetNames.includes('Schools')) {
              const schoolSheet = workbook.Sheets['Schools'];
              const schoolData = XLSX.utils.sheet_to_json(schoolSheet);
              schools.push(...schoolData);
            }

            setPreviewData({
              participants: participants.slice(0, 10),
              schools: schools.slice(0, 10)
            });
            setTotalCounts({
              participants: participants.length,
              schools: schools.length
            });
          } catch (error) {
            setMessage('Failed to read Excel file');
          }
        };

        reader.readAsBinaryString(selectedFile);
      } catch (error) {
        setMessage('Failed to preview file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✓ Uploaded: ${data.participantsCount} participants, ${data.schoolsCount} schools`);
        setFile(null);
        
        const previewRes = await fetch('/api/data');
        const previewData = await previewRes.json();
        setPreviewData({
          participants: previewData.participants.slice(0, 10),
          schools: previewData.schools.slice(0, 10)
        });
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('✗ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleConfigUpdate = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      setMessage('✓ Configuration saved');
    } catch (error) {
      setMessage('✗ Failed to save configuration');
    }
  };

  const handleResetWinners = async () => {
    if (!confirm('Are you sure you want to reset all winners?')) return;

    try {
      await fetch('/api/winners', { method: 'DELETE' });
      setMessage('✓ Winners reset');
    } catch (error) {
      setMessage('✗ Failed to reset winners');
    }
  };

  const downloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const participantsData = [
        { Name: 'Juan Dela Cruz', School: 'Divine Word College of Calapan' }
      ];
      
      const schoolsData = [
        { School: 'Divine Word College of Calapan' }
      ];
      
      const wb = XLSX.utils.book_new();
      const wsParticipants = XLSX.utils.json_to_sheet(participantsData);
      const wsSchools = XLSX.utils.json_to_sheet(schoolsData);
      
      XLSX.utils.book_append_sheet(wb, wsParticipants, 'Participants');
      XLSX.utils.book_append_sheet(wb, wsSchools, 'Schools');
      
      XLSX.writeFile(wb, 'raffle-template.xlsx');
      setMessage('✓ Template downloaded');
    } catch (error) {
      setMessage('✗ Failed to download template');
    }
  };

  const navItems = [
    { id: 'upload', label: 'Upload Data', icon: HiUpload },
    { id: 'customize', label: 'Customize', icon: HiColorSwatch },
    { id: 'actions', label: 'Actions', icon: HiLightningBolt }
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-300 shadow-sm transition-all duration-300 ease-in-out z-20 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-6 border-b border-gray-200">
          {sidebarOpen && <h1 className="font-semibold text-gray-900 text-base">Admin Panel</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <HiChevronDoubleLeft className="w-5 h-5" /> : <HiChevronDoubleRight className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-2 ${
                  activeSection === item.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className={`p-8 ${activeSection === 'customize' ? 'max-w-7xl' : 'max-w-5xl'} mx-auto`}>
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm font-medium ${
                message.includes('✓')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {activeSection === 'upload' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Data</h2>
                  <p className="text-base text-gray-600">
                    Upload an Excel file with "Participants" and "Schools" sheets
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <HiDownload className="w-4 h-4" />
                    Download Template
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !file}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <HiUpload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors mb-6">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="block w-full text-base text-gray-700 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>

              {previewData && (
                <div>
                  <div className="border-b border-gray-200 mb-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewTab('participants')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                          previewTab === 'participants'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        Participants
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          {totalCounts.participants}
                        </span>
                      </button>
                      <button
                        onClick={() => setPreviewTab('schools')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                          previewTab === 'schools'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        Schools
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          {totalCounts.schools}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    {previewTab === 'participants' && previewData.participants.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">Showing first 10 of {totalCounts.participants} participants</p>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                                {previewData.participants[0] && Object.keys(previewData.participants[0]).map((key) => (
                                  <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {previewData.participants.map((participant, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                  {Object.values(participant).map((value: any, i) => (
                                    <td key={i} className="px-4 py-3 text-sm text-gray-900">{value}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {previewTab === 'schools' && previewData.schools.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">Showing first 10 of {totalCounts.schools} schools</p>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                                {previewData.schools[0] && Object.keys(previewData.schools[0]).map((key) => (
                                  <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {previewData.schools.map((school, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                  {Object.values(school).map((value: any, i) => (
                                    <td key={i} className="px-4 py-3 text-sm text-gray-900">{value}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {previewTab === 'participants' && previewData.participants.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No participants data found in the Excel file
                      </div>
                    )}

                    {previewTab === 'schools' && previewData.schools.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No schools data found in the Excel file
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'customize' && (
            <CustomizeSection 
              config={config} 
              setConfig={setConfig} 
              setMessage={setMessage}
              onSave={handleConfigUpdate}
            />
          )}

          {activeSection === 'actions' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h2>
              <p className="text-base text-gray-600 mb-6">Manage raffle operations</p>

              <div className="space-y-4">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3.5 bg-blue-600 text-white text-base font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Open Raffle Display
                </button>

                <button
                  onClick={handleResetWinners}
                  className="w-full py-3.5 bg-red-600 text-white text-base font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Reset All Winners
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
