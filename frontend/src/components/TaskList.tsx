import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Task } from '../types/task';
import { api } from '../services/api';
import { TaskItem } from './TaskItem';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

export interface TaskListRef {
  refresh: () => void;
}

export const TaskList = forwardRef<TaskListRef>((_, ref) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedTasks = await api.getTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
    setIsRefreshing(false);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: fetchTasks
  }));

  useEffect(() => {
    fetchTasks();
  }, []);

  if (isLoading && !isRefreshing) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive mb-4">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Tasks</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={isRefreshing}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No tasks yet. Add your first task above!</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});
