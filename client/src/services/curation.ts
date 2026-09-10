import { createJsonParser } from './http';
export type ContentIdentity = { kind: 'music' | 'native'; title: string; artist?: string; lang?: string; videoId: string };
export type CurationItem = {
  kind: 'music' | 'native'; content_key: string; video_id: string; title: string; artist: string; lang: string;
  status: 'verified' | 'rejected'; video_matches: boolean; text_matches: boolean;
  translation: 'available' | 'partial' | 'missing'; updated_at: string; reports: number;
};
export type ContentReport = { id: string; reason: string; detail: string; created_at: string } & Pick<CurationItem, 'kind' | 'content_key' | 'video_id' | 'title' | 'artist' | 'lang'>;
const parseJson = createJsonParser('Não foi possível acessar a curadoria.');
const normalize = (value = '') => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
export function contentKey(content: Omit<ContentIdentity, 'videoId'>) {
  return `${normalize(content.title)}|${normalize(content.kind === 'music' ? content.artist : content.lang || 'english')}`;
}
export function isVerified(item?: CurationItem) { return Boolean(item && item.status === 'verified' && item.video_matches && item.text_matches && !item.reports); }
export async function getCurations(kind: 'music' | 'native'): Promise<CurationItem[]> {
  const result = await parseJson<{ items: CurationItem[] }>(await fetch(`/api/curation?kind=${kind}`, { signal: AbortSignal.timeout(10000) }));
  return result.items || [];
}
export async function reportContent(content: ContentIdentity, reason: string, detail: string) {
  await parseJson(await fetch('/api/curation/reports', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...content, reason, detail }), signal: AbortSignal.timeout(10000) }));
}
export async function getContentReports(): Promise<ContentReport[]> {
  const result = await parseJson<{ reports: ContentReport[] }>(await fetch('/api/admin/curation', { credentials: 'include', signal: AbortSignal.timeout(10000) }));
  return result.reports || [];
}
export async function reviewContent(content: ContentIdentity, review: { status: 'verified' | 'rejected'; videoMatches: boolean; textMatches: boolean; translation: string; notes: string }) {
  await parseJson(await fetch('/api/admin/curation', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...content, ...review }), signal: AbortSignal.timeout(10000) }));
}
export const reportReasons = { wrong_video: 'Vídeo não corresponde ao conteúdo', wrong_text: 'Letra ou expressão incorreta', translation: 'Tradução ausente ou incorreta', unavailable: 'Vídeo indisponível', other: 'Outro problema' };
