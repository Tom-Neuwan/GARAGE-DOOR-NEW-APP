import React, { useState, useEffect } from 'react';
import ThreeVisualization from './components/ThreeVisualization';
import QuoteModal from './components/QuoteModal';
import {
  DOOR_STYLES,
  DOOR_COLORS,
  WINDOW_STYLES,
  HARDWARE_STYLES,
} from './constants/doorConstants';

export default function GarageDoorConfigurator() {
  const [config, setConfig] = useState({
    width: 192,
    height: 84,
    style: 'Carriage House',
    colorIndex: 3,
    windowStyle: 'Top Row (4)',
    hardwareStyle: 'Handles & Hinges',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [is3D, setIs3D] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`h-screen bg-gray-100 flex ${isMobile ? 'flex-col' : 'flex-row'} font-sans overflow-hidden`}>
      {isModalOpen && <QuoteModal config={config} onClose={() => setIsModalOpen(false)} />}
      <div className={`flex-1 relative bg-gray-800 ${isMobile ? 'h-1/2' : 'min-h-0'}`}>
        <ThreeVisualization config={config} is3D={is3D} />
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => setIs3D(!is3D)} className="px-4 py-2 bg-white/70 rounded-md text-lg font-bold flex items-center justify-center shadow-md hover:bg-white transition-colors">
            {is3D ? '2D View' : '3D View'}
          </button>
        </div>
      </div>
      <div className={`${isMobile ? 'w-full h-1/2' : 'w-96'} flex-shrink-0 bg-white shadow-lg p-6 overflow-y-auto`}>
        <h1 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Door Designer</h1>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">1. Dimensions</h2>
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm font-medium mb-2">Width: <span className="font-bold text-gray-900">{(config.width / 12)}'</span></label>
                <input type="range" min="96" max="216" step="12" value={config.width} onChange={e => updateConfig('width', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <label className="flex justify-between text-sm font-medium mb-2">Height: <span className="font-bold text-gray-900">{(config.height / 12)}'</span></label>
                <input type="range" min="84" max="120" step="12" value={config.height} onChange={e => updateConfig('height', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">2. Style</label>
            <div className="grid grid-cols-2 gap-2">
              {DOOR_STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => updateConfig('style', s)}
                  className={`p-3 rounded-md text-sm font-semibold transition-colors ${config.style === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">3. Color</h2>
            <div className="grid grid-cols-6 gap-2">
              {DOOR_COLORS.map((c, i) => (
                <div
                  key={c.name}
                  onClick={() => updateConfig('colorIndex', i)}
                  className={`h-12 rounded-md cursor-pointer border-2 transition-all ${config.colorIndex === i ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">4. Windows</label>
            <select value={config.windowStyle} onChange={e => updateConfig('windowStyle', e.target.value)} className="w-full p-2 border rounded-md bg-gray-50">
              {WINDOW_STYLES.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">5. Hardware</label>
            <select
              value={config.hardwareStyle}
              onChange={e => updateConfig('hardwareStyle', e.target.value)}
              className="w-full p-2 border rounded-md bg-gray-50"
              disabled={config.style !== 'Carriage House'}
            >
              {HARDWARE_STYLES.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="pt-6 border-t">
            <button onClick={() => setIsModalOpen(true)} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105">Get a Quote</button>
          </div>
        </div>
      </div>
    </div>
  );
}
