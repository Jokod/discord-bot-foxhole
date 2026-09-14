export class ApiError extends Error {
	status: number;
	code?: string;
	retry_after_ms?: number;

	constructor(message: string, status: number, code?: string, retry_after_ms?: number) {
		super(message);
		this.status = status;
		this.code = code;
		this.retry_after_ms = retry_after_ms;
	}
}

let onUnauthorized: (() => void) | null = null;
let tFn: ((key: string, params?: Record<string, unknown>) => string) | null = null;

export function setApiI18n(t: (key: string, params?: Record<string, unknown>) => string) {
	tFn = t;
}

export function setUnauthorizedHandler(fn: () => void) {
	onUnauthorized = fn;
}

function apiMessage(data: { code?: string; error?: string; params?: Record<string, unknown> } | null, fallback: string) {
	if (!data?.code || !tFn) return data?.error || fallback;
	const params = data.params || {};
	const candidates = [
		data.code,
		data.code.startsWith('error.') ? null : `error.${data.code}`,
	].filter(Boolean) as string[];
	for (const key of candidates) {
		const translated = tFn(key, params);
		if (translated !== key) return String(translated);
	}
	return data.error || fallback;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const opts: RequestInit = {
		credentials: 'same-origin',
		...options,
		headers: {
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...options.headers,
		},
	};
	const res = await fetch(path, opts);
	const text = await res.text();
	let data: { code?: string; error?: string; params?: Record<string, unknown>; retry_after_ms?: number } | null;
	try {
		data = text ? JSON.parse(text) : null;
	}
	catch {
		data = { error: text || res.statusText };
	}
	if (res.status === 401 && path !== '/api/login') {
		onUnauthorized?.();
		throw new ApiError(apiMessage(data, 'error.auth'), 401, data?.code);
	}
	if (!res.ok) {
		throw new ApiError(
			apiMessage(data, 'error.generic'),
			res.status,
			data?.code,
			data?.retry_after_ms,
		);
	}
	return data as T;
}
