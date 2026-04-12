import axios from 'axios';

const API_BASE_URL = '/api';

// Create a pre-configured axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add interceptor for authentication if needed in the future
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getEndpoint = (collectionName: string) => {
  const name = collectionName.toLowerCase();
  switch (name) {
    case 'students': return `/students`;
    case 'campuses': return `/campuses`;
    case 'classes': return `/classes`;
    case 'users': return `/auth/register`;
    case 'fees':
    case 'feevouchers': return `/fees`;
    case 'feestructures': return `/feestructures`;
    case 'transactions': return `/transactions`;
    default: return `/${name}`;
  }
};

export const dataService = {
  async add(collectionName: string, data: any) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await api.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
      throw error;
    }
  },

  async update(collectionName: string, id: string, data: any) {
    try {
      const endpoint = `${getEndpoint(collectionName)}/${id}`;
      await api.put(endpoint, data);
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  },

  async delete(collectionName: string, id: string) {
    try {
      const endpoint = `${getEndpoint(collectionName)}/${id}`;
      await api.delete(endpoint);
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      throw error;
    }
  },

  async getAll(collectionName: string, params?: any) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await api.get(endpoint, { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
      return [];
    }
  },

  async fetchStudents() {
    return this.getAll('students');
  },

  async fetchCampuses() {
    const data = await this.getAll('campuses');
    console.log('Campuses from API:', data);
    return data;
  },

  async fetchClasses() {
    return this.getAll('classes');
  },

  async fetchFeeSettings() {
    return this.getAll('fee-settings');
  },

  async fetchGenerateFees() {
    try {
      const response = await api.post(`/generate-monthly-fees`);
      return response.data;
    } catch (error) {
      console.error('Error generating fees:', error);
      throw error;
    }
  },

  async upload(collectionName: string, formData: FormData) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error uploading to ${collectionName}:`, error);
      throw error;
    }
  },

  // Mocking subscribe for now since we don't have real-time backend yet
  subscribe(collectionName: string, callback: (data: any[]) => void, filters?: any) {
    const fetchData = async () => {
      try {
        const data = await this.getAll(collectionName);
        // Apply basic client-side filtering if filters are provided
        let filteredData = data;
        if (filters && Array.isArray(filters)) {
          filters.forEach(filter => {
            if (filter.operator === '==') {
              filteredData = filteredData.filter((item: any) => item[filter.field] === filter.value);
            }
          });
        }
        callback(filteredData);
      } catch (error) {
        console.error(`Error in subscription for ${collectionName}:`, error);
        callback([]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }
};
