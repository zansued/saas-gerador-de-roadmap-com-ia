import React, { useEffect, useState } from 'react';
import { User } from '../types/User';
import { Roadmap } from '../types/Roadmap';
import { fetchRoadmaps } from '../services/roadmapService';
import { useAppSelector } from '../hooks/useAppSelector';

const Home: React.FC = () => {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [error, setError] = useState<string | null>(null);
  const user: User | null = useAppSelector(state => state.user);

  useEffect(() => {
    if (!user?.id) {
      setError("Você precisa estar logado para ver seus roadmaps.");
      return;
    }

    const loadRoadmaps = async () => {
      try {
        const fetchedRoadmaps = await fetchRoadmaps(user.id);
        setRoadmaps(fetchedRoadmaps);
      } catch (err) {
        setError("Erro ao carregar roadmaps, tente novamente mais tarde.");
      }
    };

    loadRoadmaps();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Seus Roadmaps</h1>
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : roadmaps.length > 0 ? (
        <ul className="list-disc list-inside">
          {roadmaps.map(roadmap => (
            <li key={roadmap.id} className="mb-2">
              <h2 className="text-xl font-semibold">{roadmap.title}</h2>
              <p>{roadmap.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500">Você ainda não tem roadmaps. Comece a criar um novo!</div>
      )}
    </div>
  );
};

export default Home;