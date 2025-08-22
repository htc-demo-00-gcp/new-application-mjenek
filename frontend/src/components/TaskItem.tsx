import React, { useState } from 'react';
import { Task } from '../types/task';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent } from './ui/card';
import { Edit2, Trash2, Save, X } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleComplete = async () => {
    try {
      setIsLoading(true);
      const updatedTask = await api.updateTask(task.id, { completed: !task.completed });
      onUpdate(updatedTask);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editText.trim() === '') return;
    
    try {
      setIsLoading(true);
      const updatedTask = await api.updateTask(task.id, { text: editText.trim() });
      onUpdate(updatedTask);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(task.text);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await api.deleteTask(task.id);
      onDelete(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleComplete}
            disabled={isLoading}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isLoading || editText.trim() === ''}
                  className="h-8 px-2"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span
                  className={`flex-1 ${
                    task.completed
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {task.text}
                </span>
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                    className="h-8 px-2"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          Created: {new Date(task.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
