/**
 * Representa um conteúdo de aprendizado associado a uma etapa de roadmap
 */
export interface Content {
  id: string;
  title: string;
  description: string;
  url: string;
  type: ContentType;
  difficulty: DifficultyLevel;
  estimatedDuration: number; // em minutos
  roadmapId: string;
  stepId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  completedAt?: Date;
  metadata?: ContentMetadata;
}

/**
 * Tipos de conteúdo suportados
 */
export enum ContentType {
  ARTICLE = 'article',
  VIDEO = 'video',
  COURSE = 'course',
  TUTORIAL = 'tutorial',
  DOCUMENTATION = 'documentation',
  EXERCISE = 'exercise',
  PROJECT = 'project',
  QUIZ = 'quiz',
  BOOK = 'book',
  PODCAST = 'podcast',
  CHEATSHEET = 'cheatsheet'
}

/**
 * Níveis de dificuldade do conteúdo
 */
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Metadados adicionais para conteúdo
 */
export interface ContentMetadata {
  author?: string;
  platform?: string;
  language?: string;
  tags?: string[];
  prerequisites?: string[];
  rating?: number;
  reviewsCount?: number;
  lastUpdated?: Date;
  isFree?: boolean;
  certificateAvailable?: boolean;
  interactive?: boolean;
  codeExamples?: boolean;
}

/**
 * DTO para criação de conteúdo
 */
export interface CreateContentDTO {
  title: string;
  description: string;
  url: string;
  type: ContentType;
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  roadmapId: string;
  stepId: string;
  order: number;
  metadata?: Partial<ContentMetadata>;
}

/**
 * DTO para atualização de conteúdo
 */
export interface UpdateContentDTO {
  title?: string;
  description?: string;
  url?: string;
  type?: ContentType;
  difficulty?: DifficultyLevel;
  estimatedDuration?: number;
  order?: number;
  completed?: boolean;
  metadata?: Partial<ContentMetadata>;
}

/**
 * DTO para filtragem de conteúdo
 */
export interface ContentFilter {
  roadmapId?: string;
  stepId?: string;
  type?: ContentType;
  difficulty?: DifficultyLevel;
  completed?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Resposta da API para operações de conteúdo
 */
export interface ContentResponse {
  success: boolean;
  data?: Content | Content[];
  error?: string;
  message?: string;
}

/**
 * Estatísticas de conteúdo
 */
export interface ContentStats {
  total: number;
  completed: number;
  byType: Record<ContentType, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  totalDuration: number; // em minutos
  averageCompletionTime?: number; // em minutos
}