import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor to include JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shoujiki_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add interceptor to handle 401 Unauthorized errors (expired tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on auth failure
      localStorage.removeItem('shoujiki_token');
      localStorage.removeItem('shoujiki_wallet');
      // Dispatch custom event to notify hooks/components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('shoujiki-auth-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export const loginWallet = async (public_key: string, signature: string, message: string) => {
  const response = await api.post('/auth/verify', { public_key, signature, message });
  localStorage.setItem('shoujiki_token', response.data.access_token);
  return response.data;
};

export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const getBillingConfig = async () => {
  const response = await api.get('/billing/config');
  return response.data;
};

export const getAgent = async (id: string) => {
  const response = await api.get(`/agents/${id}`);
  return response.data;
};

export const getMyAgents = async () => {
  const response = await api.get('/agents/me');
  return response.data;
};

export const deployAgent = async (agentData: any) => {
  const response = await api.post('/agents/deploy', agentData);
  return response.data;
};

export const deleteAgent = async (id: string) => {
  const response = await api.delete(`/agents/${id}`);
  return response.data;
};

export const testAgent = async (agentData: any) => {
  const response = await api.post('/agents/test', agentData);
  return response.data;
};

export const runAgent = async (
  agentId: string, 
  inputData: any, 
  taskId: string, 
  x402Sig?: string,
  x402Pubkey?: string
) => {
  const headers: Record<string, string> = {};
  if (x402Sig && x402Pubkey) {
    headers['X-Payment-Signature'] = x402Sig;
    headers['X-Payment-Pubkey'] = x402Pubkey;
  }

  const response = await api.post('/agents/run', {
    agent_id: agentId,
    input_data: inputData,
    task_id: taskId,
  }, { headers });
  return response.data;
};

export const getMyAppWallet = async () => {
  const response = await api.get('/billing/wallet/me');
  return response.data;
};

export const depositToAppWallet = async (amount: number, transaction_signature: string) => {
  const response = await api.post('/billing/wallet/deposit', { amount, transaction_signature });
  return response.data;
};

export const withdrawFromAppWallet = async (amount: number) => {
  const response = await api.post('/billing/wallet/withdraw', { amount });
  return response.data;
};

export const getMarketOrders = async (status: string = "open") => {
  const response = await api.get(`/marketplace/orders?status=${status}`);
  return response.data;
};

export const createMarketOrder = async (orderData: any) => {
  const response = await api.post('/marketplace/orders', orderData);
  return response.data;
};

export const placeBid = async (orderId: string, bidData: any) => {
  const response = await api.post(`/marketplace/orders/${orderId}/bids`, bidData);
  return response.data;
};

export const getOrderBids = async (orderId: string) => {
  const response = await api.get(`/marketplace/orders/${orderId}/bids`);
  return response.data;
};

export const acceptBid = async (orderId: string, bidId: string) => {
  const response = await api.post(`/marketplace/orders/${orderId}/bids/${bidId}/accept`);
  return response.data;
};

export const getTasks = async (status?: string, agentId?: string) => {
  let url = `/agents/tasks/me?`;
  if (status) url += `status=${status}&`;
  if (agentId) url += `agent_id=${agentId}`;
  const response = await api.get(url);
  return response.data;
};

export const getWorkflows = async () => {
  const response = await api.get('/workflows/me');
  return response.data;
};

export const createWorkflow = async (workflowData: any) => {
  const response = await api.post('/workflows', workflowData);
  return response.data;
};

export const validateWorkflow = async (workflowData: any) => {
  const response = await api.post('/workflows/validate', workflowData);
  return response.data;
};

export const runWorkflow = async (workflowId: string, initialInput: any, maxBudget: number) => {
  const response = await api.post(`/workflows/${workflowId}/run`, {
    initial_input: initialInput,
    max_budget: maxBudget
  });
  return response.data;
};

export const getWorkflowRuns = async () => {
  const response = await api.get('/workflows/runs');
  return response.data;
};

export const getDisputes = async (status?: string) => {
  const response = await api.get(`/marketplace/disputes${status ? `?status=${status}` : ''}`);
  return response.data;
};

export const resolveDispute = async (id: string, resolution: string, details: string) => {
  const response = await api.post(`/marketplace/disputes/${id}/resolve`, {
    resolution,
    resolution_details: details
  });
  return response.data;
};

export const withdrawAgentBalance = async (id: string) => {
  const response = await api.post(`/billing/agent/${id}/withdraw`, {});
  return response.data;
};

export default api;
