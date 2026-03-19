import React, { useState } from 'react';
import { User } from '../types/User';
import { RegisterForm } from '../types/RegisterForm';
import userService from '../services/userService';
import { toast } from 'react-toastify';

const Register: React.FC = () => {
    const [formData, setFormData] = useState<RegisterForm>({ nome: '', email: '', senha: '' });
    const [errors, setErrors] = useState<{ nome?: string; email?: string; senha?: string }>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        const newErrors: { nome?: string; email?: string; senha?: string } = {};
        if (formData.nome.length < 2) {
            newErrors.nome = 'O nome deve ter pelo menos 2 caracteres';
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(formData.email)) {
            newErrors.email = 'O email deve ser válido';
        }
        if (formData.senha.length < 8) {
            newErrors.senha = 'A senha deve ter pelo menos 8 caracteres e incluir letras e números';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        try {
            await userService.createUser(formData);
            toast.success('Usuário registrado com sucesso!');
            setFormData({ nome: '', email: '', senha: '' });
        } catch (error) {
            if (error.response?.status === 409) {
                toast.error('O email já está em uso.');
            } else {
                toast.error('Ocorreu um erro ao tentar registrar. Tente novamente mais tarde.');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <div>
                <label htmlFor="nome" className="block">Nome</label>
                <input
                    name="nome"
                    id="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                    className={`border p-2 ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.nome && <span className="text-red-500">{errors.nome}</span>}
            </div>
            <div>
                <label htmlFor="email" className="block">Email</label>
                <input
                    name="email"
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`border p-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && <span className="text-red-500">{errors.email}</span>}
            </div>
            <div>
                <label htmlFor="senha" className="block">Senha</label>
                <input
                    name="senha"
                    id="senha"
                    type="password"
                    value={formData.senha}
                    onChange={handleInputChange}
                    required
                    className={`border p-2 ${errors.senha ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.senha && <span className="text-red-500">{errors.senha}</span>}
            </div>
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">Registrar</button>
        </form>
    );
};

export default Register;