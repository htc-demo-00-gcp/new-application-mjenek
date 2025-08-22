package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"sync"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"google.golang.org/api/iterator"
)

type Task struct {
	ID        string    `json:"id"`
	Text      string    `json:"text"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"createdAt"`
}

type TaskRequest struct {
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

type TaskUpdateRequest struct {
	Text      *string `json:"text,omitempty"`
	Completed *bool   `json:"completed,omitempty"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Storage interface for different backends
type StorageBackend interface {
	ListTasks(ctx context.Context) ([]Task, error)
	CreateTask(ctx context.Context, task Task) error
	UpdateTask(ctx context.Context, task Task) error
	DeleteTask(ctx context.Context, taskID string) error
	GetTask(ctx context.Context, taskID string) (*Task, error)
}

// In-memory storage implementation
type InMemoryStorage struct {
	tasks map[string]Task
	mutex sync.RWMutex
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		tasks: make(map[string]Task),
	}
}

func (s *InMemoryStorage) ListTasks(ctx context.Context) ([]Task, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	tasks := make([]Task, 0, len(s.tasks))
	for _, task := range s.tasks {
		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (s *InMemoryStorage) CreateTask(ctx context.Context, task Task) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.tasks[task.ID] = task
	return nil
}

func (s *InMemoryStorage) UpdateTask(ctx context.Context, task Task) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if _, exists := s.tasks[task.ID]; !exists {
		return fmt.Errorf("task not found")
	}

	s.tasks[task.ID] = task
	return nil
}

func (s *InMemoryStorage) DeleteTask(ctx context.Context, taskID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if _, exists := s.tasks[taskID]; !exists {
		return fmt.Errorf("task not found")
	}

	delete(s.tasks, taskID)
	return nil
}

func (s *InMemoryStorage) GetTask(ctx context.Context, taskID string) (*Task, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return nil, fmt.Errorf("task not found")
	}

	return &task, nil
}

// Google Cloud Storage implementation
type GCSStorage struct {
	client     *storage.Client
	bucketName string
}

func NewGCSStorage(client *storage.Client, bucketName string) *GCSStorage {
	return &GCSStorage{
		client:     client,
		bucketName: bucketName,
	}
}

func (s *GCSStorage) ListTasks(ctx context.Context) ([]Task, error) {
	var tasks []Task
	query := &storage.Query{
		Prefix: "task-",
	}

	it := s.client.Bucket(s.bucketName).Objects(ctx, query)
	for {
		obj, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error iterating objects: %v", err)
		}

		// Read the object content
		reader, err := s.client.Bucket(s.bucketName).Object(obj.Name).NewReader(ctx)
		if err != nil {
			log.Printf("Error reading object %s: %v", obj.Name, err)
			continue
		}

		var task Task
		if err := json.NewDecoder(reader).Decode(&task); err != nil {
			log.Printf("Error decoding task %s: %v", obj.Name, err)
			reader.Close()
			continue
		}
		reader.Close()
		tasks = append(tasks, task)
	}

	return tasks, nil
}

func (s *GCSStorage) CreateTask(ctx context.Context, task Task) error {
	taskJSON, err := json.Marshal(task)
	if err != nil {
		return fmt.Errorf("error marshaling task: %v", err)
	}

	objectName := fmt.Sprintf("task-%s.json", task.ID)
	writer := s.client.Bucket(s.bucketName).Object(objectName).NewWriter(ctx)
	writer.ContentType = "application/json"

	if _, err := writer.Write(taskJSON); err != nil {
		return fmt.Errorf("error writing to GCS: %v", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("error closing writer: %v", err)
	}

	return nil
}

func (s *GCSStorage) UpdateTask(ctx context.Context, task Task) error {
	return s.CreateTask(ctx, task) // Overwrite existing task
}

func (s *GCSStorage) DeleteTask(ctx context.Context, taskID string) error {
	objectName := fmt.Sprintf("task-%s.json", taskID)

	// Check if object exists
	_, err := s.client.Bucket(s.bucketName).Object(objectName).Attrs(ctx)
	if err != nil {
		return fmt.Errorf("task not found")
	}

	// Delete the object
	if err := s.client.Bucket(s.bucketName).Object(objectName).Delete(ctx); err != nil {
		return fmt.Errorf("error deleting object: %v", err)
	}

	return nil
}

func (s *GCSStorage) GetTask(ctx context.Context, taskID string) (*Task, error) {
	objectName := fmt.Sprintf("task-%s.json", taskID)
	reader, err := s.client.Bucket(s.bucketName).Object(objectName).NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("task not found")
	}
	defer reader.Close()

	var task Task
	if err := json.NewDecoder(reader).Decode(&task); err != nil {
		return nil, fmt.Errorf("error decoding task: %v", err)
	}

	return &task, nil
}

var (
	storageBackend  StorageBackend
	bucketName      string
	port            string
	useLocalStorage bool
)

func init() {
	// Check if we should use local storage
	useLocalStorage = os.Getenv("USE_LOCAL_STORAGE") == "true"

	if useLocalStorage {
		log.Println("Using in-memory storage for local development")
		storageBackend = NewInMemoryStorage()
	} else {
		bucketName = os.Getenv("BUCKET_NAME")
		if bucketName == "" {
			log.Fatal("BUCKET_NAME environment variable is required when not using local storage")
		}

		// Initialize Google Cloud Storage client
		// This will use the pod's ServiceAccount credentials via Workload Identity
		ctx := context.Background()
		client, err := storage.NewClient(ctx)
		if err != nil {
			log.Fatalf("Failed to create storage client: %v", err)
		}
		storageBackend = NewGCSStorage(client, bucketName)
	}

	port = os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
}

func main() {
	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/tasks", getTasks).Methods("GET")
	api.HandleFunc("/tasks", createTask).Methods("POST")
	api.HandleFunc("/tasks/{id}", updateTask).Methods("PUT")
	api.HandleFunc("/tasks/{id}", deleteTask).Methods("DELETE")

	// Health check
	r.HandleFunc("/health", healthCheck).Methods("GET")

	// Bucket information endpoint
	r.HandleFunc("/api/bucket-info", getBucketInfo).Methods("GET")

	// CORS middleware
	r.Use(corsMiddleware)

	storageType := "in-memory"
	if !useLocalStorage {
		storageType = "Google Cloud Storage"
	}

	log.Printf("Starting To-Do App backend on port %s", port)
	log.Printf("Using storage backend: %s", storageType)
	if !useLocalStorage {
		log.Printf("Using bucket: %s", bucketName)
	}
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	data := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"storage":   "in-memory",
	}

	if !useLocalStorage {
		data["storage"] = "google-cloud-storage"
		data["bucket"] = bucketName
	}

	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "Backend is healthy",
		Data:    data,
	})
}

func getBucketInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	var data map[string]interface{}
	if useLocalStorage {
		data = map[string]interface{}{
			"storage":       "in-memory",
			"bucket":        nil,
			"gcsConsoleUrl": nil,
			"isLocal":       true,
		}
	} else {
		// For GCS mode, construct the console URL
		// Note: We don't have the project ID, so we'll provide the bucket name
		// The frontend can construct the full URL or use a relative path
		data = map[string]interface{}{
			"storage":       "google-cloud-storage",
			"bucket":        bucketName,
			"gcsConsoleUrl": fmt.Sprintf("https://console.cloud.google.com/storage/browser/%s", bucketName),
			"isLocal":       false,
		}
	}

	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "Bucket information retrieved successfully",
		Data:    data,
	})
}

func getTasks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tasks, err := storageBackend.ListTasks(ctx)
	if err != nil {
		log.Printf("Error listing tasks: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "Tasks retrieved successfully",
		Data:    tasks,
	})
}

func createTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req TaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Text == "" {
		http.Error(w, "Task text is required", http.StatusBadRequest)
		return
	}

	// Generate UUID for the task
	taskID := uuid.New().String()
	task := Task{
		ID:        taskID,
		Text:      req.Text,
		Completed: req.Completed,
		CreatedAt: time.Now(),
	}

	// Store the task
	if err := storageBackend.CreateTask(ctx, task); err != nil {
		log.Printf("Error creating task: %v", err)
		if isPermissionError(err) {
			http.Error(w, "Forbidden: Insufficient permissions to access storage", http.StatusForbidden)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "Task created successfully",
		Data:    task,
	})
}

func updateTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	taskID := vars["id"]

	var req TaskUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get existing task
	existingTask, err := storageBackend.GetTask(ctx, taskID)
	if err != nil {
		if isPermissionError(err) {
			http.Error(w, "Forbidden: Insufficient permissions to access storage", http.StatusForbidden)
			return
		}
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// Update fields if provided
	if req.Text != nil {
		existingTask.Text = *req.Text
	}
	if req.Completed != nil {
		existingTask.Completed = *req.Completed
	}

	// Update the task
	if err := storageBackend.UpdateTask(ctx, *existingTask); err != nil {
		log.Printf("Error updating task: %v", err)
		if isPermissionError(err) {
			http.Error(w, "Forbidden: Insufficient permissions to access storage", http.StatusForbidden)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "Task updated successfully",
		Data:    existingTask,
	})
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	taskID := vars["id"]

	if err := storageBackend.DeleteTask(ctx, taskID); err != nil {
		log.Printf("Error deleting task: %v", err)
		if isPermissionError(err) {
			http.Error(w, "Forbidden: Insufficient permissions to access storage", http.StatusForbidden)
			return
		}
		if err.Error() == "task not found" {
			http.Error(w, "Task not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "Task deleted successfully",
	})
}

func isPermissionError(err error) bool {
	// Check for common GCS permission errors
	return err != nil && (path.Base(err.Error()) == "403" ||
		path.Base(err.Error()) == "forbidden" ||
		path.Base(err.Error()) == "permission denied")
}
