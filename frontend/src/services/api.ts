import { Task, TaskRequest, TaskUpdateRequest, ApiResponse } from '../types/task';

const API_BASE = '/api';

export const api = {
  async getTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE}/tasks`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Forbidden: Insufficient permissions to access bucket');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<Task[]> = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  async createTask(task: TaskRequest): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Forbidden: Insufficient permissions to access bucket');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<Task> = await response.json();
      return result.data!;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  async updateTask(id: string, updates: TaskUpdateRequest): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Forbidden: Insufficient permissions to access bucket');
        }
        if (response.status === 404) {
          throw new Error('Task not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<Task> = await response.json();
      return result.data!;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  async deleteTask(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Forbidden: Insufficient permissions to access bucket');
        }
        if (response.status === 404) {
          throw new Error('Task not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },
};
