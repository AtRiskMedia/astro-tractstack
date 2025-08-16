import { findUniqueSlug } from '@/utils/helpers';

interface TitleSlugResponse {
  title: string;
  slug: string;
}

export async function getTitleSlug(
  markdownContent: string,
  existingSlugs: string[]
): Promise<TitleSlugResponse | null> {
  if (
    !markdownContent ||
    markdownContent.trim() === '...' ||
    markdownContent.trim().length === 0
  ) {
    return null;
  }

  try {
    const backendUrl =
      import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
    const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

    const token =
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('auth_token') ||
      document.cookie
        .split(';')
        .find((row) => row.startsWith('admin_auth='))
        ?.split('=')[1] ||
      document.cookie
        .split(';')
        .find((row) => row.startsWith('editor_auth='))
        ?.split('=')[1];

    if (!token) {
      console.error('No auth token found for Assembly AI request');
      return null;
    }

    const response = await fetch(`${backendUrl}/api/v1/aai/askLemur`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify({
        prompt: `Generate a concise title (maximum 40-50 characters) and a URL-friendly slug (lowercase, only letters, numbers, and dashes, no spaces) that captures the essence of this markdown content. Return only a JSON object with "title" and "slug" keys. 

Example response format:
{
  "title": "Short Descriptive Title",
  "slug": "short-descriptive-title"
}`,
        input_text: markdownContent,
        final_model: 'anthropic/claude-3-5-sonnet',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.response) {
        let titleData;
        try {
          if (typeof data.data.response === 'string') {
            titleData = JSON.parse(data.data.response);
          } else {
            titleData = data.data.response;
          }

          if (titleData.title && titleData.slug) {
            return {
              title: findUniqueSlug(titleData.title, existingSlugs),
              slug: findUniqueSlug(titleData.slug, existingSlugs),
            };
          }
        } catch (parseError) {
          console.error('Error parsing title data:', parseError);
        }
      }
    }
  } catch (error) {
    console.error('Error generating title:', error);
  }

  return null;
}
