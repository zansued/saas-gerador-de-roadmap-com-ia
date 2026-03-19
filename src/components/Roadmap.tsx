import React, { useEffect, useState } from 'react';
import { fetchRoadmapById } from '../services/roadmapService';
import { Roadmap } from '../types/Roadmap';
import Loader from './Loader';
import Error from './Error';

const Roadmap: React.FC<{ id: string }> = ({ id }) => {
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getRoadmap = async () => {
            if (!id) {
                setError('ID do roadmap inválido.');
                setLoading(false);
                return;
            }

            try {
                const fetchedRoadmap = await fetchRoadmapById(id);
                if (!fetchedRoadmap) {
                    setError('Roadmap não encontrado.');
                } else {
                    setRoadmap(fetchedRoadmap);
                }
            } catch (err) {
                setError('Erro ao buscar o roadmap. Tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        getRoadmap();
    }, [id]);

    if (loading) return <Loader />;
    if (error) return <Error message={error} />;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-3xl font-bold">{roadmap?.title}</h1>
            <p className="mt-2 text-gray-600">{roadmap?.description}</p>
            <div className="mt-4">
                <h2 className="text-xl font-semibold">Criado por</h2>
                <p className="text-gray-700">{roadmap?.userId}</p>
            </div>
            <div className="mt-4">
                <p className="text-gray-500">
                    Criado em: {new Date(roadmap?.createdAt).toLocaleDateString()}
                </p>
                <p className="text-gray-500">
                    Última atualização: {new Date(roadmap?.updatedAt).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
};

export default Roadmap;