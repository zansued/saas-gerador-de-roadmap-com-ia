import { createUser, getUserById, updateUser, simulateApiError } from '../services/userService';
import { User, CreateUserResponse, ApiError } from '../types/User';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('User Service Tests', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  it('should create a user successfully', async () => {
    const userData = { nome: 'Test User', email: 'test@example.com', senha: 'password123' };
    const expectedResponse: CreateUserResponse = { id: 'uuid-123', nome: 'Test User', email: 'test@example.com' };

    mock.onPost('/usuarios').reply(201, expectedResponse);

    const response = await createUser(userData);
    expect(response).toEqual(expectedResponse);
  });

  it('should return error for existing email', async () => {
    const userData = { nome: 'Test User', email: 'duplicate@example.com', senha: 'password123' };
    
    mock.onPost('/usuarios').reply(409, { status: 409, description: 'Email já cadastrado.' });

    await expect(createUser(userData)).rejects.toThrow('Email já cadastrado.');
  });

  it('should fetch user successfully', async () => {
    const userId = 'uuid-123';
    const expectedUser: User = { id: userId, nome: 'Test User', email: 'test@example.com', senha: 'password123' };

    mock.onGet(`/usuarios/${userId}`).reply(200, expectedUser);

    const response = await getUserById(userId);
    expect(response).toEqual(expectedUser);
  });

  it('should return error for user not found', async () => {
    const userId = 'invalid-uuid';

    mock.onGet(`/usuarios/${userId}`).reply(404, { status: 404, description: 'Usuário não encontrado.' });

    await expect(getUserById(userId)).rejects.toThrow('Usuário não encontrado.');
  });

  it('should update user successfully', async () => {
    const userId = 'uuid-123';
    const updatedData = { nome: 'Updated User' };
    const expectedUser: User = { id: userId, nome: 'Updated User', email: 'test@example.com', senha: 'password123' };

    mock.onPut(`/usuarios/${userId}`).reply(200, expectedUser);

    const response = await updateUser(userId, updatedData);
    expect(response).toEqual(expectedUser);
  });

  it('should return error for updating non-existing user', async () => {
    const userId = 'invalid-uuid';
    const updatedData = { nome: 'Updated User' };

    mock.onPut(`/usuarios/${userId}`).reply(404, { status: 404, description: 'Usuário não encontrado.' });

    await expect(updateUser(userId, updatedData)).rejects.toThrow('Usuário não encontrado.');
  });

  it('should handle API error simulation', async () => {
    mock.onGet('/simulate-error').reply(500);

    await expect(simulateApiError('/simulate-error')).rejects.toThrow('Erro ao simular falha na API.');
  });
});