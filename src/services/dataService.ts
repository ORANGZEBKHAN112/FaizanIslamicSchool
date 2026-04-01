import axios from 'axios';

const API_BASE_URL = '/api';

const getEndpoint = (collectionName: string) => {
  switch (collectionName) {
    case 'students': return `${API_BASE_URL}/students`;
    case 'campuses': return `${API_BASE_URL}/campuses`;
    case 'classes': return `${API_BASE_URL}/classes`;
    case 'staff': return `${API_BASE_URL}/staff`;
    case 'users': return `${API_BASE_URL}/auth/register`; // For adding users
    case 'feevouchers': return `${API_BASE_URL}/fees`;
    case 'examterms': return `${API_BASE_URL}/exams/terms`;
    default: return `${API_BASE_URL}/${collectionName}`;
  }
};

export const dataService = {
  async add(collectionName: string, data: any) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await axios.post(endpoint, data);
      return response.data.id || response.data;
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
      throw error;
    }
  },

  async update(collectionName: string, id: string, data: any) {
    try {
      const endpoint = `${getEndpoint(collectionName)}/${id}`;
      await axios.put(endpoint, data);
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  },

  async delete(collectionName: string, id: string) {
    try {
      const endpoint = `${getEndpoint(collectionName)}/${id}`;
      await axios.delete(endpoint);
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      throw error;
    }
  },

  async getAll(collectionName: string, params?: any) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await axios.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
      throw error;
    }
  },

  // Mocking subscribe for now since we don't have real-time backend yet
  subscribe(collectionName: string, callback: (data: any[]) => void, filters?: any) {
    const fetchData = async () => {
      try {
        const data = await this.getAll(collectionName);
        callback(data);
      } catch (error) {
        console.error(`Error in subscription for ${collectionName}:`, error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }
};
