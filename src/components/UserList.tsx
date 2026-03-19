import React from 'react';
import { User } from '../types/User';
import { LoadingState } from '../types/LoadingState';

enum LoadingStateEnum {
    LOADING = 'loading',
    LOADED = 'loaded',
    ERROR = 'error'
}

interface UserListProps {
    users: User[];
    loading: LoadingStateEnum;
    error?: string;
}

const UserList: React.FC<UserListProps> = ({ users, loading, error }) => {
    if (loading === LoadingStateEnum.LOADING) {
        return <div className="text-center">Carregando...</div>;
    }

    if (error) {
        return <div className="text-red-500">Erro: {error.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>;
    }

    if (users.length === 0) {
        return <div className="text-gray-500">Nenhum usuário encontrado.</div>;
    }

    return (
        <ul className="space-y-2">
            {users.map(user => (
                <li key={user.id} className="p-4 border rounded shadow">
                    <span className="font-semibold">{user.nome || 'Nome não disponível'}</span> - 
                    <span className="text-gray-600">{user.email || 'Email não disponível'}</span>
                </li>
            ))}
        </ul>
    );
};

export default UserList;