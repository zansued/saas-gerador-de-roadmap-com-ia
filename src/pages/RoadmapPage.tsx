import React, { useEffect, useState } from 'react';
import { fetchRoadmap } from '../services/roadmapService';
import RoadmapComponent from '../components/Roadmap';

export interface RoadmapPageProps {
  roadmapId: string;
}

interface RoadmapData {
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
}

interface ErrorMessage {
  message: string;
}

const RoadmapPage: React.FC<RoadmapPageProps> = ({ roadmapId }) => {
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFetchRoadmap = async () => {
    setIsLoading(true);
    try {
      const data: RoadmapData = await fetchRoadmap(roadmapId);
      setRoadmapData(data);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: unknown) => {
    let message: string;
    if (error instanceof Error) {
      message = `Erro ao carregar o roadmap: ${error.message}`;
    } else {
      message = 'Erro ao carregar o roadmap: Erro desconhecido.';
    }
    setErrorMessage(message.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  };

  useEffect(() => {
    handleFetchRoadmap();
  }, [roadmapId]);

  if (isLoading) return <div>Carregando...</div>;
  if (errorMessage) return <div>{errorMessage}</div>;
  if (!roadmapData) return <div>Roadmap não encontrado.</div>;

  return <RoadmapComponent roadmap={roadmapData} />;
};

export default RoadmapPage;