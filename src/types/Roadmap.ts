export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum TimeCommitment {
  LIGHT = 'light',
  MODERATE = 'moderate',
  INTENSIVE = 'intensive'
}

export enum ResourceType {
  ARTICLE = 'article',
  VIDEO = 'video',
  COURSE = 'course',
  TUTORIAL = 'tutorial',
  DOCUMENTATION = 'documentation',
  EXERCISE = 'exercise',
  PROJECT = 'project',
  BOOK = 'book'
}

export enum ResourceDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum RoadmapSortBy {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  PROGRESS = 'progress',
  ESTIMATED_COMPLETION = 'estimated_completion',
  TOPIC = 'topic'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export interface LearningResource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  description?: string;
  duration_minutes?: number;
  difficulty?: ResourceDifficulty;
  is_free: boolean;
  tags: string[];
}

export interface RoadmapStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimated_hours: number;
  completed: boolean;
  completed_at?: string;
  resources: LearningResource[];
  prerequisites: string[];
  dependencies: string[];
}

export interface Roadmap {
  id: string;
  user_id: string;
  topic: string;
  area: string;
  skill_level: SkillLevel;
  time_commitment: TimeCommitment;
  steps: RoadmapStep[];
  estimated_completion: number;
  progress: number;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  tags: string[];
}

export interface CreateRoadmapInput {
  topic: string;
  area: string;
  skill_level: SkillLevel;
  time_commitment: TimeCommitment;
  user_id: string;
  tags?: string[];
}

export interface UpdateRoadmapProgressInput {
  roadmap_id: string;
  step_id: string;
  completed: boolean;
  user_id: string;
}

export interface UpdateRoadmapSettingsInput {
  roadmap_id: string;
  is_public?: boolean;
  tags?: string[];
  user_id: string;
}

export interface RoadmapGenerationResponse {
  roadmap: Roadmap;
  generated_at: string;
  model_version: string;
  confidence_score: number;
}

export interface RoadmapSummary {
  id: string;
  topic: string;
  area: string;
  progress: number;
  estimated_completion: number;
  created_at: string;
  tags: string[];
}

export interface RoadmapFilters {
  area?: string;
  skill_level?: SkillLevel;
  time_commitment?: TimeCommitment;
  min_progress?: number;
  max_progress?: number;
  tags?: string[];
  is_public?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface RoadmapStats {
  total_steps: number;
  completed_steps: number;
  total_hours: number;
  completed_hours: number;
  completion_percentage: number;
  estimated_remaining_hours: number;
  average_step_duration: number;
}