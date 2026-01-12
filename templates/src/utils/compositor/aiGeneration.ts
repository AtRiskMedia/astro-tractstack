import { TractStackAPI } from '@/utils/api';
import { sandboxTokenStore } from '@/stores/storykeep';

interface AiGenerationOptions {
  prompt: string;
  context: string;
  expectJson: boolean;
  isSandboxMode: boolean;
  maxTokens?: number;
  temperature?: number;
}

export const callAskLemurAPI = async ({
  prompt,
  context,
  expectJson,
  isSandboxMode,
  maxTokens = 5000,
  temperature = 0.5,
}: AiGenerationOptions): Promise<string> => {
  const tenantId =
    (window as any).TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  const requestBody = {
    prompt,
    input_text: context,
    final_model: '',
    temperature,
    max_tokens: maxTokens,
  };

  let resultData: any;

  if (isSandboxMode) {
    const token = sandboxTokenStore.get();
    const response = await fetch(`/api/sandbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Sandbox-Token': token || '',
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'askLemur', payload: requestBody }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sandbox API failed: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || 'Sandbox generation failed');
    }
    resultData = json.data;
  } else {
    const api = new TractStackAPI(tenantId);
    const response = await api.post('/api/v1/aai/askLemur', requestBody);

    if (!response.success) {
      throw new Error(
        response.error || 'Generation failed to return valid response.'
      );
    }
    resultData = response.data;
  }

  if (!resultData?.response) {
    throw new Error('Generation failed to return a response object.');
  }

  const rawResponseData = resultData.response;

  if (expectJson && typeof rawResponseData === 'object') {
    return JSON.stringify(rawResponseData);
  }

  if (typeof rawResponseData === 'string') {
    let responseString = rawResponseData;
    // Clean up markdown code blocks if present to ensure clean parsing by caller
    if (responseString.startsWith('```json')) {
      responseString = responseString.slice(7, -3).trim();
    } else if (responseString.startsWith('```html')) {
      responseString = responseString.slice(7, -3).trim();
    }
    return responseString;
  }

  throw new Error('Unexpected response format received from API.');
};
