import React, { useState } from 'react';
import { TaskRequest } from '../types/task';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus } from 'lucide-react';

interface AddTaskFormProps {
  onTaskAdded: () => void;
}

export const AddTaskForm: React.FC<AddTaskFormProps> = ({ onTaskAdded }) => {
  const [taskText, setTaskText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (taskText.trim() === '') return;

    try {
      setIsLoading(true);
      const newTask: TaskRequest = {
        text: taskText.trim(),
        completed: false,
      };
      
      await api.createTask(newTask);
      setTaskText('');
      // Call the callback to refresh the task list
      onTaskAdded();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Add New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter task description..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || taskText.trim() === ''}
            className="px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
