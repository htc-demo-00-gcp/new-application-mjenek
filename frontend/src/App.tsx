import { AddTaskForm } from './components/AddTaskForm';
import { TaskList, TaskListRef } from './components/TaskList';
import { BucketLink } from './components/BucketLink';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Cloud, Database, Shield } from 'lucide-react';
import { useRef } from 'react';

function App() {
  const taskListRef = useRef<TaskListRef>(null);

  const handleTaskAdded = () => {
    // Refresh the task list when a new task is added
    if (taskListRef.current) {
      taskListRef.current.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            To-Do App
          </h1>
          <p className="text-lg text-muted-foreground">
            Google Cloud Storage Demo with Kubernetes Service Accounts
          </p>
        </div>

        {/* Feature highlights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Platform Orchestrator Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Cloud className="h-8 w-8 text-blue-500" />
                <h3 className="font-semibold">Google Cloud Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Tasks stored as JSON files in GCS bucket
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Shield className="h-8 w-8 text-green-500" />
                <h3 className="font-semibold">Workload Identity</h3>
                <p className="text-sm text-muted-foreground">
                  Secure access via pod ServiceAccount
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Database className="h-8 w-8 text-purple-500" />
                <h3 className="font-semibold">Kubernetes Native</h3>
                <p className="text-sm text-muted-foreground">
                  Deployed with Helm on K8s cluster
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GCS Bucket Link */}
        <BucketLink />

        {/* Add Task Form */}
        <AddTaskForm onTaskAdded={handleTaskAdded} />

        {/* Task List */}
        <TaskList ref={taskListRef} />
      </div>
    </div>
  );
}

export default App;
