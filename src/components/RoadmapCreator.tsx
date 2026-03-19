import React, { useState, FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase_client';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  resources: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'course' | 'documentation';
  }>;
  completed: boolean;
  order: number;
}

interface Roadmap {
  id: string;
  userId: string;
  title: string;
  area: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeCommitment: 'part-time' | 'full-time' | 'flexible';
  steps: RoadmapStep[];
  estimatedCompletion: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface RoadmapGenerationRequest {
  topic: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeCommitment: 'part-time' | 'full-time' | 'flexible';
  userId?: string;
}

interface RoadmapGenerationResponse {
  roadmap: Omit<Roadmap, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  success: boolean;
  error?: string;
}

interface RoadmapCreatorProps {
  userId?: string;
  onSuccess?: (roadmap: Roadmap) => void;
  onError?: (error: string) => void;
  showPreview?: boolean;
  autoSave?: boolean;
}

const RoadmapCreator: React.FC<RoadmapCreatorProps> = ({
  userId,
  onSuccess,
  onError,
  showPreview = true,
  autoSave = false,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RoadmapGenerationRequest>({
    topic: '',
    skillLevel: 'beginner',
    timeCommitment: 'part-time',
    userId,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<Roadmap | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateTopic = useCallback((topic: string): string | null => {
    if (!topic.trim()) return 'Topic is required';
    if (topic.length < 3) return 'Topic must be at least 3 characters';
    if (topic.length > 100) return 'Topic must be less than 100 characters';
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(topic)) return 'Topic can only contain letters, numbers, spaces, hyphens, and underscores';
    return null;
  }, []);

  const validateSkillLevel = useCallback((skillLevel: string): string | null => {
    if (!['beginner', 'intermediate', 'advanced'].includes(skillLevel)) return 'Invalid skill level';
    return null;
  }, []);

  const validateTimeCommitment = useCallback((timeCommitment: string): string | null => {
    if (!['part-time', 'full-time', 'flexible'].includes(timeCommitment)) return 'Invalid time commitment';
    return null;
  }, []);

  const validateForm = useCallback((data: RoadmapGenerationRequest): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    const topicError = validateTopic(data.topic);
    if (topicError) errors.topic = topicError;
    
    const skillLevelError = validateSkillLevel(data.skillLevel);
    if (skillLevelError) errors.skillLevel = skillLevelError;
    
    const timeCommitmentError = validateTimeCommitment(data.timeCommitment);
    if (timeCommitmentError) errors.timeCommitment = timeCommitmentError;

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [validateTopic, validateSkillLevel, validateTimeCommitment]);

  const handleInputChange = useCallback((field: keyof RoadmapGenerationRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Debounce validation for topic field only
    if (field === 'topic') {
      const timer = setTimeout(() => {
        const error = validateTopic(value);
        setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      const error = field === 'skillLevel' 
        ? validateSkillLevel(value)
        : field === 'timeCommitment'
        ? validateTimeCommitment(value)
        : null;
      setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
    }
  }, [validateTopic, validateSkillLevel, validateTimeCommitment]);

  const handleApiError = useCallback((status: number, statusText: string): never => {
    let errorMessage: string;
    switch (status) {
      case 401:
        errorMessage = 'Session expired. Please login again.';
        onError?.(errorMessage);
        setTimeout(() => navigate('/login'), 1500);
        throw new Error(errorMessage);
      case 403:
        errorMessage = 'Access denied. You do not have permission to perform this action.';
        break;
      case 429:
        errorMessage = 'Rate limit exceeded. Please try again later.';
        break;
      case 422:
        errorMessage = 'Invalid input data. Please check your request.';
        break;
      default:
        errorMessage = `Failed to generate roadmap: ${statusText || 'Server error'}`;
    }
    onError?.(errorMessage);
    throw new Error(errorMessage);
  }, [navigate, onError]);

  const validateApiResponse = useCallback((data: any): Omit<Roadmap, 'id' | 'userId' | 'createdAt' | 'updatedAt'> => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid server response format');
    }

    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Invalid roadmap title in response');
    }

    if (!Array.isArray(data.steps)) {
      throw new Error('Invalid roadmap steps in response');
    }

    const validatedSteps = data.steps.map((step: any, index: number) => ({
      id: step.id || `step-${index + 1}`,
      title: step.title || `Step ${index + 1}`,
      description: step.description || '',
      estimatedHours: typeof step.estimatedHours === 'number' ? Math.max(0, step.estimatedHours) : 0,
      resources: Array.isArray(step.resources) 
        ? step.resources.filter((resource: any) => 
            resource && 
            typeof resource.title === 'string' && 
            typeof resource.url === 'string' &&
            ['article', 'video', 'course', 'documentation'].includes(resource.type)
          )
        : [],
      completed: Boolean(step.completed),
      order: typeof step.order === 'number' ? step.order : index,
    }));

    return {
      title: data.title.trim(),
      area: typeof data.area === 'string' ? data.area : 'General',
      skillLevel: ['beginner', 'intermediate', 'advanced'].includes(data.skillLevel) 
        ? data.skillLevel 
        : 'beginner',
      timeCommitment: ['part-time', 'full-time', 'flexible'].includes(data.timeCommitment)
        ? data.timeCommitment
        : 'flexible',
      steps: validatedSteps,
      estimatedCompletion: typeof data.estimatedCompletion === 'number' 
        ? Math.max(0, data.estimatedCompletion) 
        : validatedSteps.reduce((sum, step) => sum + step.estimatedHours, 0),
      progress: typeof data.progress === 'number' 
        ? Math.max(0, Math.min(100, data.progress)) 
        : 0,
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm(formData);
    setValidationErrors(validation.errors);
    
    if (!validation.isValid) {
      setError('Please fix the validation errors above.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/roadmaps/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(session => session.data.session?.access_token)}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        handleApiError(response.status, response.statusText);
      }
      
      const result: RoadmapGenerationResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate roadmap');
      }
      
      const validatedRoadmapData = validateApiResponse(result.roadmap);
      
      const roadmapRecord = {
        ...validatedRoadmapData,
        id: `roadmap-${Date.now()}`,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (autoSave && userId) {
        const { error: saveError } = await supabase
          .from('roadmaps')
          .insert([roadmapRecord]);
        
        if (saveError) throw new Error(`Failed to save roadmap: ${saveError.message}`);
      }
      
      setGeneratedRoadmap(roadmapRecord);
      onSuccess?.(roadmapRecord);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      topic: '',
      skillLevel: 'beginner',
      timeCommitment: 'part-time',
      userId,
    });
    setGeneratedRoadmap(null);
    setError(null);
    setValidationErrors({});
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Create Learning Roadmap
          </CardTitle>
          <CardDescription>
            Generate a personalized learning path with step-by-step guidance
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="topic">Learning Topic *</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                placeholder="e.g., React Development, Machine Learning, Digital Marketing"
                disabled={isLoading}
                className={validationErrors.topic ? 'border-red-500' : ''}
              />
              {validationErrors.topic && (
                <p className="text-sm text-red-500">{validationErrors.topic}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select
                  value={formData.skillLevel}
                  onValueChange={(value) => handleInputChange('skillLevel', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={validationErrors.skillLevel ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.skillLevel && (
                  <p className="text-sm text-red-500">{validationErrors.skillLevel}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeCommitment">Time Commitment</Label>
                <Select
                  value={formData.timeCommitment}
                  onValueChange={(value) => handleInputChange('timeCommitment', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={validationErrors.timeCommitment ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select time commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part-time">Part-time (5-10 hrs/week)</SelectItem>
                    <SelectItem value="full-time">Full-time (30+ hrs/week)</SelectItem>
                    <SelectItem value="flexible">Flexible (Self-paced)</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.timeCommitment && (
                  <p className="text-sm text-red-500">{validationErrors.timeCommitment}</p>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.topic.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Roadmap
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {showPreview && generatedRoadmap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {generatedRoadmap.title}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {generatedRoadmap.skillLevel} • {generatedRoadmap.timeCommitment}
              </span>
            </CardTitle>
            <CardDescription>
              Estimated completion: {generatedRoadmap.estimatedCompletion} hours
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{generatedRoadmap.progress}%</span>
                </div>
                <Progress value={generatedRoadmap.progress} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Learning Path</h4>
                {generatedRoadmap.steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            {index + 1}
                          </div>
                          <h5 className="font-medium">{step.title}</h5>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 ml-8">
                          {step.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 ml-8 text-sm">
                          <span className="text-muted-foreground">
                            {step.estimatedHours} hours
                          </span>
                          {step.resources.length > 0 && (
                            <span className="text-muted-foreground">
                              {step.resources.length} resources
                            </span>
                          )}
                        </div>
                      </div>
                      {step.completed && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/roadmaps/${generatedRoadmap.id}`)}
            >
              View Details
            </Button>
            <Button onClick={handleReset}>
              Create Another
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default RoadmapCreator;