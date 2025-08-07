import React from 'react';
import { DOOR_COLORS } from '../constants/doorConstants';

export default function QuoteModal({ config, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full m-4">
        <h2 className="text-2xl font-bold mb-4">Your Custom Door Quote</h2>
        <p className="mb-6 text-gray-600">Here is a summary of your design. Please provide your contact information to receive a detailed quote.</p>
        <div className="bg-gray-50 p-4 rounded mb-6 space-y-2">
          <div className="flex justify-between"><strong>Style:</strong><span>{config.style}</span></div>
          <div className="flex justify-between"><strong>Size:</strong><span>{config.width / 12}' x {config.height / 12}'</span></div>
          <div className="flex justify-between"><strong>Color:</strong><span>{DOOR_COLORS[config.colorIndex].name}</span></div>
          <div className="flex justify-between"><strong>Windows:</strong><span>{config.windowStyle}</span></div>
          <div className="flex justify-between"><strong>Hardware:</strong><span>{config.hardwareStyle}</span></div>
        </div>
        <input type="email" placeholder="Enter your email" className="w-full p-2 border rounded mb-4" />
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={() => { alert('Thank you! A quote will be sent to your email.'); onClose(); }} className="px-6 py-2 rounded text-white bg-blue-600 hover:bg-blue-700">Submit</button>
        </div>
      </div>
    </div>
  );
}
