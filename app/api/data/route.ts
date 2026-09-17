import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { list, put } from '@vercel/blob';

type Pools = { participants: any[]; schools: any[] };
type Winners = { participants: any[]; schools: any[] };

function makeId() {
  // Prefer stable UUID if available
  // @ts-ignore
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getBaseDir() {
  return process.env.VERCEL ? '/tmp' : process.cwd();
}

async function ensureDir(p: string) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch {}
}

function useBlobStorage() {
  return !!process.env.VERCEL || !!process.env.BLOB_READ_WRITE_TOKEN;
}

function blobListOpts(prefix: string) {
  const opts: any = { prefix };
  if (process.env.BLOB_READ_WRITE_TOKEN) opts.token = process.env.BLOB_READ_WRITE_TOKEN;
  return opts;
}

function blobPutOpts(contentType?: string) {
  const opts: any = { access: 'public' };
  if (contentType) opts.contentType = contentType;
  if (process.env.BLOB_READ_WRITE_TOKEN) opts.token = process.env.BLOB_READ_WRITE_TOKEN;
  return opts;
}

function blobPutStableOpts(contentType?: string) {
  const opts: any = blobPutOpts(contentType);
  opts.addRandomSuffix = false;
  return opts;
}

async function readJsonFromBlob<T>(key: string): Promise<T | null> {
  const res = await list(blobListOpts(key));
  const blob = (res.blobs || []).find((b: any) => b.pathname === key) || null;
  if (!blob?.url) return null;
  const r = await fetch(blob.url, { cache: 'no-store' });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

async function readPoolsFromBlob(): Promise<Pools | null> {
  const res = await list(blobListOpts('data/'));
  const blobs = (res.blobs || []).filter((b: any) => b.pathname.endsWith('.json'));
  // Prefer canonical key if present
  const preferred = blobs.find((b: any) => b.pathname === 'data/participants.json');
  const candidates = preferred ? [preferred, ...blobs.filter((b: any) => b !== preferred)] : blobs;
  for (const b of candidates) {
    try {
      const r = await fetch(b.url, { cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      if (json && Array.isArray(json.participants) && Array.isArray(json.schools)) {
        return json as Pools;
      }
    } catch {}
  }
  return null;
}

async function readWinnersFromBlob(): Promise<Winners | null> {
  const res = await list(blobListOpts('data/'));
  const blobs = (res.blobs || []).filter((b: any) => b.pathname.endsWith('.json'));
  const preferred = blobs.find((b: any) => b.pathname === 'data/winners.json');
  const candidates = preferred ? [preferred, ...blobs.filter((b: any) => b !== preferred)] : blobs;
  for (const b of candidates) {
    try {
      const r = await fetch(b.url, { cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      if (json && Array.isArray(json.participants) && Array.isArray(json.schools)) {
        // Heuristic: winners.json has arrays of winners under same keys, but pools also does.
        // Prefer file explicitly named winners.json; else fall back to the first with those keys.
        if (b.pathname === 'data/winners.json') return json as Winners;
      }
    } catch {}
  }
  // If nothing matched explicitly, try direct key
  const direct = await readJsonFromBlob<Winners>('data/winners.json');
  return direct;
}

export async function GET() {
  try {
let data: Pools = { participants: [], schools: [] };
    let winners: Winners = { participants: [], schools: [] };

    const normalizeSchoolFields = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (obj.Schools && !obj.School) obj.School = obj.Schools;
      if (obj.school && !obj.School) obj.School = obj.school;
      if (obj.schools && !obj.School) obj.School = obj.schools;
      return obj;
    };

    const usingBlob = useBlobStorage();
    let dataPath: string | null = null;
    let winnersPath: string | null = null;

    if (usingBlob) {
      data = (await readJsonFromBlob<Pools>('data/participants.json')) || (await readPoolsFromBlob()) || data;
      winners = (await readJsonFromBlob<Winners>('data/winners.json')) || (await readWinnersFromBlob()) || winners;
    } else {
      const baseDir = getBaseDir();
      const dataDir = path.join(baseDir, 'data');
      await ensureDir(dataDir);
      dataPath = path.join(dataDir, 'participants.json');
      winnersPath = path.join(dataDir, 'winners.json');

      try {
        const participantsData = await fs.readFile(dataPath, 'utf-8');
        data = JSON.parse(participantsData);
      } catch (error) {}

      try {
        const winnersData = await fs.readFile(winnersPath, 'utf-8');
        winners = JSON.parse(winnersData);
      } catch (error) {}
    }

// Normalize fields for compatibility
    data.participants = (data.participants || []).map((p: any) => normalizeSchoolFields(p));
    data.schools = (data.schools || []).map((s: any) => normalizeSchoolFields(s));
    winners.participants = (winners.participants || []).map((w: any) => normalizeSchoolFields(w));
    winners.schools = (winners.schools || []).map((w: any) => normalizeSchoolFields(w));

    // Ensure every record has an id; if missing, assign and persist
    let mutated = false;
    data.participants = (data.participants || []).map((p: any) => {
      if (!p.id) { mutated = true; return { id: makeId(), ...p }; }
      return p;
    });
    data.schools = (data.schools || []).map((s: any) => {
      if (!s.id) { mutated = true; return { id: makeId(), ...s }; }
      return s;
    });

    // Migrate winners to include ids by matching on content if needed
    const participantsByContent = new Map<string, any>();
    data.participants.forEach((p: any) => {
      const clone = { ...p }; delete clone.id;
      participantsByContent.set(JSON.stringify(clone), p);
    });
    const schoolsByContent = new Map<string, any>();
    data.schools.forEach((s: any) => {
      const clone = { ...s }; delete clone.id;
      schoolsByContent.set(JSON.stringify(clone), s);
    });

    let winnersMutated = false;
    winners.participants = (winners.participants || []).map((w: any) => {
      if (!w.id) {
        const match = participantsByContent.get(JSON.stringify(w));
        if (match?.id) { winnersMutated = true; return { ...w, id: match.id }; }
      }
      return w;
    });
    winners.schools = (winners.schools || []).map((w: any) => {
      if (!w.id) {
        const match = schoolsByContent.get(JSON.stringify(w));
        if (match?.id) { winnersMutated = true; return { ...w, id: match.id }; }
      }
      return w;
    });

    if (mutated) {
      if (usingBlob) {
        await put('data/participants.json', JSON.stringify(data, null, 2), blobPutStableOpts('application/json'));
      } else if (dataPath) {
        await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
      }
    }
    if (winnersMutated) {
      if (usingBlob) {
        await put('data/winners.json', JSON.stringify(winners, null, 2), blobPutStableOpts('application/json'));
      } else if (winnersPath) {
        await fs.writeFile(winnersPath, JSON.stringify(winners, null, 2));
      }
    }

    const winnerIdsParticipants = new Set((winners.participants || []).map((w: any) => w.id));
    const winnerIdsSchools = new Set((winners.schools || []).map((w: any) => w.id));

    const availableParticipants = (data.participants || []).filter((p: any) => !winnerIdsParticipants.has(p.id));
    const availableSchools = (data.schools || []).filter((s: any) => !winnerIdsSchools.has(s.id));

    return NextResponse.json({
      participants: availableParticipants,
      schools: availableSchools,
      winners
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
