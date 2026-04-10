import axios from 'axios';

const API_BASE_URL = '/api';

const getEndpoint = (collectionName: string) => {
  const name = collectionName.toLowerCase();
  switch (name) {
    case 'students': return `${API_BASE_URL}/students`;
    case 'campuses': return `${API_BASE_URL}/campuses`;
    case 'classes': return `${API_BASE_URL}/classes`;
    case 'staff': return `${API_BASE_URL}/staff`;
    case 'users': return `${API_BASE_URL}/auth/register`;
    case 'feevouchers': return `${API_BASE_URL}/feevouchers`;
    case 'feestructures': return `${API_BASE_URL}/feestructures`;
    case 'examterms': return `${API_BASE_URL}/examterms`;
    case 'exams': return `${API_BASE_URL}/exams`;
    case 'studentresults': return `${API_BASE_URL}/studentresults`;
    case 'transactions': return `${API_BASE_URL}/transactions`;
    default: return `${API_BASE_URL}/${name}`;
  }
};

export const dataService = {
  async add(collectionName: string, data: any) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await axios.post(endpoint, data);
      return response.data;
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
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
      return [];
    }
  },

  async upload(collectionName: string, formData: FormData) {
    try {
      const endpoint = getEndpoint(collectionName);
      const response = await axios.post(endpoint, formData, {
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
