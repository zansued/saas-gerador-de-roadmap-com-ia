import { Roadmap, Etapa } from '../types/Roadmap';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../supabase_client';

export function criarRoadmap(titulo: string, usuarioId: string, etapas: Etapa[]): Promise<Roadmap> {
    if (!titulo || typeof titulo !== 'string') {
        throw new Error('Título inválido');
    }
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(usuarioId)) {
        throw new Error('ID do usuário inválido');
    }
    if (!Array.isArray(etapas) || etapas.length < 1) {
        throw new Error('Deve haver pelo menos uma etapa');
    }
    
    const novoRoadmap: Roadmap = {
        id: uuidv4(),
        titulo,
        usuarioId,
        etapas
    };

    return firestore.collection('roadmaps').doc(novoRoadmap.id).set(novoRoadmap)
        .then(() => novoRoadmap);
}

export function obterRoadmapPorId(roadmapId: string): Promise<Roadmap> {
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(roadmapId)) {
        throw new Error('ID do roadmap inválido');
    }
    
    return firestore.collection('roadmaps').doc(roadmapId).get()
        .then(doc => {
            if (!doc.exists) {
                throw new Error('Roadmap não encontrado');
            }
            return { id: doc.id, ...doc.data() } as Roadmap;
        });
}

export function atualizarEtapas(roadmapId: string, etapas: Etapa[]): Promise<Roadmap> {
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(roadmapId)) {
        throw new Error('ID do roadmap inválido');
    }
    if (!Array.isArray(etapas)) {
        throw new Error('Etapas inválidas');
    }
    
    return firestore.collection('roadmaps').doc(roadmapId).update({ etapas })
        .then(() => obterRoadmapPorId(roadmapId));
}

export function deletarRoadmap(roadmapId: string): Promise<void> {
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(roadmapId)) {
        throw new Error('ID do roadmap inválido');
    }

    return firestore.collection('roadmaps').doc(roadmapId).delete()
        .then(() => {});
}

import { User } from '../types/User';
import { firestore } from '../supabase_client';

export function criarUsuario(nome: string, email: string, senha: string, perfil_aprendizado?: object): Promise<User> {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Email inválido');
    }
    if (!senha || senha.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    const novoUsuario: User = {
        id: uuidv4(),
        nome,
        email,
        perfil_aprendizado
    };

    return firestore.collection('usuarios').doc(novoUsuario.id).set(novoUsuario)
        .then(() => novoUsuario);
}

export function obterUsuarioPorId(usuarioId: string): Promise<User> {
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(usuarioId)) {
        throw new Error('ID do usuário inválido');
    }

    return firestore.collection('usuarios').doc(usuarioId).get()
        .then(doc => {
            if (!doc.exists) {
                throw new Error('Usuário não encontrado');
            }
            return { id: doc.id, ...doc.data() } as User;
        });
}

import React from "react";
import { Roadmap as RoadmapType } from '../types/Roadmap';

export interface RoadmapProps {
    roadmap: RoadmapType;
}

const Roadmap: React.FC<RoadmapProps> = ({ roadmap }) => {
    return (
        <div className="roadmap">
            <h2 className="text-xl font-bold">{roadmap.titulo}</h2>
            <ul>
                {roadmap.etapas.map(etapa => (
                    <li key={etapa.id}>
                        <h3 className="text-lg">{etapa.titulo}</h3>
                        {etapa.descricao && <p>{etapa.descricao}</p>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Roadmap;

import React from "react";
import { User } from '../types/User';
import { LoadingState } from '../types/LoadingState';
import { ApiResponse } from '../types/ApiResponse';

const UserList: React.FC<{ users: User[]; loading: LoadingState }> = ({ users, loading }) => {
    return (
        <div>
            {loading === "loading" && <p>Loading...</p>}
            <ul>
                {users.map(user => (
                    <li key={user.id}>
                        {user.nome} - {user.email}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserList;

import React from "react";
import { render, screen } from "@testing-library/react";
import Roadmap from "../components/Roadmap";
import { Roadmap as RoadmapType } from '../types/Roadmap';

describe("Roadmap Component", () => {
    const sampleRoadmap: RoadmapType = {
        id: "1",
        titulo: "Test Roadmap",
        usuarioId: "user-123",
        etapas: [
            { id: "etapa-1", titulo: "Etapa 1", descricao: "Descrição da etapa 1", concluido: false },
            { id: "etapa-2", titulo: "Etapa 2", descricao: "Descrição da etapa 2", concluido: true }
        ]
    };

    it("renders roadmap title", () => {
        render(<Roadmap roadmap={sampleRoadmap} />);
        expect(screen.getByText("Test Roadmap")).toBeInTheDocument();
    });

    it("renders etapas", () => {
        render(<Roadmap roadmap={sampleRoadmap} />);
        expect(screen.getByText("Etapa 1")).toBeInTheDocument();
        expect(screen.getByText("Etapa 2")).toBeInTheDocument();
    });
});

import React from "react";
import UserList from "../components/UserList";
import { User } from '../types/User';
import { render, screen } from "@testing-library/react";

describe("UserList Component", () => {
    const sampleUsers: User[] = [
        { id: "1", nome: "User One", email: "userone@example.com" },
        { id: "2", nome: "User Two", email: "usertwo@example.com" },
    ];

    it("renders loading state", () => {
        render(<UserList users={[]} loading="loading" />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders user list", () => {
        render(<UserList users={sampleUsers} loading="idle" />);
        expect(screen.getByText("User One")).toBeInTheDocument();
        expect(screen.getByText("User Two")).toBeInTheDocument();
    });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../pages/Home";

describe("Home Page", () => {
    it("renders successfully", () => {
        render(<Home />);
        expect(screen.getByText("Welcome to the Roadmap Generator")).toBeInTheDocument();
    });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import SubscriptionPage from "../pages/SubscriptionPage";

describe("SubscriptionPage Component", () => {
    it("renders subscription options", () => {
        render(<SubscriptionPage />);
        expect(screen.getByText("Choose your subscription")).toBeInTheDocument();
    });
});