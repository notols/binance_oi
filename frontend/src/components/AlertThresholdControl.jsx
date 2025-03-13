import React, { useState } from 'react';
import axios from 'axios';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const AlertThresholdControl = () => {
  const [threshold, setThreshold] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await axios.post(`${SOCKET_URL}/api/alerts/threshold`, {
        threshold: Number(threshold)
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `알림 임계값이 ${threshold}%로 설정되었습니다.`
        });
      } else {
        throw new Error('설정에 실패했습니다');
      }
    } catch (error) {
      console.error('Error setting threshold:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '알림 임계값 설정 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-dark-100 rounded-lg p-4 mb-6 shadow-md">
      <h2 className="text-lg font-semibold mb-3">OI 변화 알림 설정</h2>
      
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label htmlFor="threshold" className="text-sm text-gray-400 mb-1">
            알림 임계값 (%)
          </label>
          <input
            id="threshold"
            type="number"
            min="0"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="bg-dark-400 border border-gray-700 rounded p-2 w-32 text-white"
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? '처리 중...' : '설정 저장'}
        </button>
        
        {message && (
          <div className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </div>
        )}
      </form>
      
      <p className="text-sm text-gray-400 mt-3">
        설정한 임계값(%) 이상 OI가 증가할 경우 텔레그램 알림이 발송됩니다.
      </p>
    </div>
  );
};

export default AlertThresholdControl;