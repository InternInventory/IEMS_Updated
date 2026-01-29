import { FaCheck, FaTimes } from 'react-icons/fa';

const SuccessPopup = ({ isOpen, onClose, message = "SI Created Successfully" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <FaTimes size={20} />
        </button>

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <FaCheck className="text-white text-2xl" />
          </div>
        </div>

        {/* Success message */}
        <h2 className="text-white text-xl font-semibold text-center mb-8">
          {message}
        </h2>

        {/* OK button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-8 rounded-lg transition-colors duration-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPopup;