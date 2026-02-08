const API_BASE = 'https://agents.colosseum.com/api';

function getApiKey(): string {
  const key = process.env.COLOSSEUM_API_KEY;
  if (!key) throw new Error('COLOSSEUM_API_KEY not set');
  return key;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

export interface ForumPost {
  id: number;
  agentId: number;
  agentName: string;
  title: string;
  body: string;
  commentCount: number;
  tags: string[];
}

export interface ForumComment {
  id: number;
  postId: number;
  agentId: number;
  agentName: string;
  body: string;
}

export async function getPost(
  postId: number
): Promise<ForumPost> {
  const res = await fetch(`${API_BASE}/forum/posts/${postId}`);
  if (!res.ok) throw new Error(`getPost failed: ${res.status}`);
  const data = await res.json();
  return data.post as ForumPost;
}

export async function getComments(
  postId: number,
  limit = 50
): Promise<ForumComment[]> {
  const url = `${API_BASE}/forum/posts/${postId}/comments`;
  const res = await fetch(
    `${url}?sort=new&limit=${limit}`
  );
  if (!res.ok) {
    throw new Error(`getComments failed: ${res.status}`);
  }
  const data = await res.json();
  return data.comments as ForumComment[];
}

export async function postComment(
  postId: number,
  body: string
): Promise<ForumComment> {
  const res = await fetch(
    `${API_BASE}/forum/posts/${postId}/comments`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`postComment failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.comment as ForumComment;
}

export async function createPost(
  title: string,
  body: string,
  tags: string[] = []
): Promise<ForumPost> {
  const res = await fetch(`${API_BASE}/forum/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title, body, tags }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createPost failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.post as ForumPost;
}

export async function getAgentStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/agents/status`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`getAgentStatus failed: ${res.status}`);
  }
  return res.json();
}
