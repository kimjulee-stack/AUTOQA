const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function fetchFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      cache: "no-store",
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      throw new Error(`API 요청 실패 (${res.status}): ${res.statusText}`);
    }

    return (await res.json()) as T;
  } catch (error) {
    // 서버 사이드에서 API 연결 실패 시 에러를 throw하지 않고 로깅만
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      console.warn(`[API] 서버에 연결할 수 없습니다: ${API_BASE_URL}${path}`);
      // 빈 배열이나 null을 반환할 수 있도록 타입에 따라 처리
      // 하지만 타입 안전성을 위해 에러를 다시 throw
      throw error;
    }
    throw error;
  }
}

/**
 * API 호출 실패 시 기본값을 반환하는 안전한 fetch 함수
 */
export async function fetchFromApiSafe<T>(path: string, defaultValue: T, init?: RequestInit): Promise<T> {
  try {
    return await fetchFromApi<T>(path, init);
  } catch (error) {
    console.warn(`[API] ${path} 호출 실패, 기본값 반환:`, error);
    return defaultValue;
  }
}

export async function postToApi<T>(path: string, body: unknown) {
  return fetchFromApi<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function putToApi<T>(path: string, body: unknown) {
  return fetchFromApi<T>(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export async function deleteToApi(path: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`API 요청 실패 (${res.status})`);
  }

  return res;
}

