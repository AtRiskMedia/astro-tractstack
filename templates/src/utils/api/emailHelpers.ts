import { TractStackAPI } from '../api';

export interface TextBlock {
  type: 'text';
  content: string;
  align: 'left' | 'center' | 'right';
  color: string;
  isBold: boolean;
}

export interface ButtonBlock {
  type: 'button';
  label: string;
  url: string;
  bgColor: string;
  textColor: string;
}

export interface DividerBlock {
  type: 'divider';
  color: string;
}

export type EmailBlock = TextBlock | ButtonBlock | DividerBlock;

export interface EmailTemplate {
  subject: string;
  blocks: EmailBlock[];
}

export interface PreviewResponse {
  subject: string;
  html: string;
}

/** One row from GET /api/v1/emails/templates (merged manifests). */
export interface EmailTemplateListEntry {
  name: string;
  adminTitle: string;
}

const getApi = () => {
  return new TractStackAPI(
    typeof window !== 'undefined'
      ? (window as any).TRACTSTACK_CONFIG?.tenantId || 'default'
      : 'default'
  );
};

export const emailHelpers = {
  getTemplates: async (): Promise<Record<string, EmailTemplateListEntry[]>> => {
    const api = getApi();
    const response = await api.get<Record<string, EmailTemplateListEntry[]>>(
      '/api/v1/emails/templates'
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch templates');
    }
    return response.data;
  },

  getTemplate: async (
    category: string,
    template: string
  ): Promise<EmailTemplate> => {
    const api = getApi();
    const response = await api.get<EmailTemplate>(
      `/api/v1/emails/templates/${category}/${template}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch template');
    }
    return response.data;
  },

  saveTemplate: async (
    category: string,
    template: string,
    data: EmailTemplate
  ): Promise<void> => {
    const api = getApi();
    const response = await api.post(
      `/api/v1/emails/templates/${category}/${template}`,
      data
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to save template');
    }
  },

  previewTemplate: async (
    template: EmailTemplate,
    mockData: Record<string, any>
  ): Promise<PreviewResponse> => {
    const api = getApi();
    const response = await api.post<PreviewResponse>('/api/v1/emails/preview', {
      template,
      data: mockData,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to generate preview');
    }
    return response.data;
  },
};
