import {
  os7RequestHostHeader,
  projectServiceApiBaseUri,
  projectServiceApiToken
} from './env';

type ProjectServiceHandshake = {
  ok: boolean;
  projectId?: string;
};

export async function checkProjectServiceHandshake(): Promise<ProjectServiceHandshake> {
  const baseUri = projectServiceApiBaseUri();
  const token = projectServiceApiToken();
  const response = await fetch(`${baseUri}/handshake`, {
    cache: 'no-store',
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...os7RequestHostHeader()
    }
  }).catch(() => null);

  if (!response?.ok) {
    return { ok: false };
  }

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    project?: {
      id?: string;
    };
  } | null;

  return {
    ok: payload?.ok === true,
    projectId: payload?.project?.id
  };
}
