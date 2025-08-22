export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface TaskRequest {
  text: string;
  completed: boolean;
}

export interface TaskUpdateRequest {
  text?: string;
  completed?: boolean;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
}

export interface ErrorResponse {
  error: string;
  code: number;
  message: string;
}
