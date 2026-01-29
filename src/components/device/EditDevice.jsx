import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';

const EditDevice = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState({
    clientName: "",
    clientId: "",
    clientType: "",
    clientStatus: "",
    clientLogo: null,
  });

  useEffect(() => {
    // API call
    const fetchClient = async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();
      setClient(data);
    };

    fetchClient();
  }, [clientId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClient({
      ...client,
      [name]: value
    });
  };

  const handleFileInputChange = (e) => {
    setClient({
      ...client,
      clientLogo: e.target.files[0]
    });
  };

  const handleFileInputClick = () => {
    document.getElementById('client-logo').click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Perform update operation here
    // Replace with your API call
    const formData = new FormData();
    formData.append("clientName", client.clientName);
    formData.append("clientId", client.clientId);
    formData.append("clientType", client.clientType);
    formData.append("clientStatus", client.clientStatus);
    if (client.clientLogo) {
      formData.append("clientLogo", client.clientLogo);
    }

    await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      body: formData,
    });

    navigate("/client");
  };

  return (
    <div className="flex flex-col items-start justify-start pt-4 pl-1 2xl:gap-2 2xl:pt-6">
      <div className="font-bold text-2xl pb-2 pl-5 2xl:text-3xl select-none">
        <h1>Edit Client</h1>
      </div>
      <form className="w-full p-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="client-logo">
              Client Logo
            </label>
            <input
              type="file"
              id="client-logo"
              name="clientLogo"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={handleFileInputClick}
              className="h-[150px] w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent border rounded shadow flex flex-col items-center justify-center"
            >
              <FontAwesomeIcon icon={faUpload} size="2x" />
              <span className="mt-2">Upload Logo</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="client-id">
              Client ID
            </label>
            <input
              type="text"
              id="client-id"
              name="clientId"
              value={client.clientId}
              onChange={handleInputChange}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="client-name">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="client-name"
              name="clientName"
              value={client.clientName}
              onChange={handleInputChange}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="client-type">
              Client Type <span className="text-red-500">*</span>
            </label>
            <select
              id="client-type"
              name="clientType"
              value={client.clientType}
              onChange={handleInputChange}
              className="bg-transparent shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option>Direct</option>
              <option>Indirect</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="client-status">
              Status
            </label>
            <select
              id="client-status"
              name="clientStatus"
              value={client.clientStatus}
              onChange={handleInputChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-transparent"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className='p-3'>
            <button
              type="button"
              onClick={() => navigate('/client')}
              className="font-bold px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 hover:from-pink-500 hover:to-yellow-500 rounded-lg"
            >
              Cancel
            </button>
          </div>
          <div>
            <button
              type="submit"
              className="font-bold px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 hover:from-pink-500 hover:to-yellow-500 rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditDevice;
