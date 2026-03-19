export type SubscriptionStatus = 'free' | 'basic' | 'premium' | 'canceled' | 'expired';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface LearningPreferences {
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
  timeCommitmentPerWeek: number;
  preferredContentTypes: Array<'video' | 'article' | 'interactive' | 'project'>;
  learningGoals: string[];
}

export interface UserProgress {
  completedRoadmaps: number;
  totalLearningHours: number;
  skillsAcquired: string[];
  lastActiveDate: Date;
}

export interface User {
  id: string;
  authId?: string;
  
  email: string;
  name: string;
  avatarUrl?: string;
  
  skillLevel: SkillLevel;
  currentFocusArea?: string;
  learningPreferences: LearningPreferences;
  
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan?: 'monthly' | 'yearly';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
  
  progress: UserProgress;
  
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
  
  notificationsEnabled: boolean;
  weeklyProgressReport: boolean;
  language: 'pt' | 'en' | 'es';
}

export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;
  skillLevel: SkillLevel;
  learningPreferences?: Partial<LearningPreferences>;
}

export interface UpdateUserDTO {
  name?: string;
  avatarUrl?: string;
  skillLevel?: SkillLevel;
  currentFocusArea?: string;
  learningPreferences?: Partial<LearningPreferences>;
  notificationsEnabled?: boolean;
  weeklyProgressReport?: boolean;
  language?: 'pt' | 'en' | 'es';
}

export interface UpdateSubscriptionDTO {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan?: 'monthly' | 'yearly';
  stripeCustomerId?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  skillLevel: SkillLevel;
  currentFocusArea?: string;
  subscriptionStatus: SubscriptionStatus;
  progress: UserProgress;
  createdAt: Date;
}

export interface UserStats {
  totalRoadmaps: number;
  completedRoadmaps: number;
  inProgressRoadmaps: number;
  totalLearningHours: number;
  averageWeeklyHours: number;
  streakDays: number;
  skillDistribution: Record<string, number>;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidSkillLevel(level: string): level is SkillLevel {
  return ['beginner', 'intermediate', 'advanced', 'expert'].includes(level);
}

export function isValidSubscriptionStatus(status: string): status is SubscriptionStatus {
  return ['free', 'basic', 'premium', 'canceled', 'expired'].includes(status);
}

export function validateUser(user: Partial<User>): string[] {
  const errors: string[] = [];
  
  if (user.email && !isValidEmail(user.email)) {
    errors.push('Email inválido');
  }
  
  if (user.skillLevel && !isValidSkillLevel(user.skillLevel)) {
    errors.push('Nível de habilidade inválido');
  }
  
  if (user.subscriptionStatus && !isValidSubscriptionStatus(user.subscriptionStatus)) {
    errors.push('Status de assinatura inválido');
  }
  
  if (user.learningPreferences?.timeCommitmentPerWeek !== undefined) {
    if (user.learningPreferences.timeCommitmentPerWeek < 0) {
      errors.push('Comprometimento de tempo não pode ser negativo');
    }
    if (user.learningPreferences.timeCommitmentPerWeek > 168) {
      errors.push('Comprometimento de tempo excede horas semanais disponíveis');
    }
  }
  
  return errors;
}