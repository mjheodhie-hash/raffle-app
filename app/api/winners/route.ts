import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { list, put } from '@vercel/blob';

type Winners = { participants: any[]; schools: any[] };

function getBaseDir() {
  return process.env.VERCEL ? '/tmp' : process.cwd();
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

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

async function readJsonFromBlob<T>(key: string): Promise<T | null> {
  const res = await list(blobListOpts(key));
  const item = (res.blobs || []).find((b: any) => b.pathname === key) || null;
  if (!item?.url) return null;
  const r = await fetch(item.url, { cache: 'no-store' });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

async function readLegacyWinnersFromBlob(): Promise<Winners | null> {
  const res = await list(blobListOpts('winners'));
  const blobs = (res.blobs || []).filter((b: any) => b.pathname.startsWith('winners') && b.pathname.endsWith('.json'));
  // Optionally choose most recent by uploadedAt
  blobs.sort((a: any, b: any) => (new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
  for (const b of blobs) {
    try {
      const r = await fetch(b.url, { cache: 'no-store' });
      if (!r.ok) continue;
      const json = await r.json();
      if (json && json.participants && json.schools) return json as Winners;
    } catch {}
  }
  return null;
}

export async function GET() {
  try {
    if (useBlobStorage()) {
      const normalize = (w: any) => {
        if (w && w.Schools && !w.School) w.School = w.Schools;
        if (w && w.school && !w.School) w.School = w.school;
        return w;
      };
      let winners = (await readJsonFromBlob<Winners>('data/winners.json')) || null;
      if (!winners) {
        winners = await readLegacyWinnersFromBlob();
        if (winners) {
          // Migrate to canonical path
          await put('data/winners.json', JSON.stringify(winners, null, 2), blobPutStableOpts('application/json'));
        }
      }
      const normalized = winners ? {
        participants: (winners.participants || []).map(normalize),
        schools: (winners.schools || []).map(normalize),
      } : { participants: [], schools: [] };
      return NextResponse.json(normalized);
    }
    const baseDir = getBaseDir();
    const dataDir = path.join(baseDir, 'data');
    await ensureDir(dataDir);
    const winnersPath = path.join(dataDir, 'winners.json');
    const data = await fs.readFile(winnersPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ participants: [], schools: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, winner } = body;

    let winners: Winners = { participants: [], schools: [] };

    if (useBlobStorage()) {
      winners = (await readJsonFromBlob<Winners>('data/winners.json')) || winners;
    } else {
      const baseDir = getBaseDir();
      const dataDir = path.join(baseDir, 'data');
      await ensureDir(dataDir);
      const winnersPath = path.join(dataDir, 'winners.json');
      try {
        const data = await fs.readFile(winnersPath, 'utf-8');
        winners = JSON.parse(data);
      } catch (error) {}
    }

    const norm = (w: any) => {
      if (w && w.Schools && !w.School) w.School = w.Schools;
      if (w && w.school && !w.School) w.School = w.school;
      return w;
    };

    if (mode === 'participants') {
      winners.participants.push(norm(winner));
    } else if (mode === 'schools') {
      winners.schools.push(norm(winner));
    }

    // Deduplicate by id if ids exist
    if (mode === 'participants') {
      const seen = new Set<string>();
      winners.participants = winners.participants.filter((w: any) => {
        if (w.id && seen.has(w.id)) return false;
        if (w.id) seen.add(w.id);
        return true;
      });
    } else {
      const seen = new Set<string>();
      winners.schools = winners.schools.filter((w: any) => {
        if (w.id && seen.has(w.id)) return false;
        if (w.id) seen.add(w.id);
        return true;
      });
    }

    if (useBlobStorage()) {
      await put('data/winners.json', JSON.stringify(winners, null, 2), blobPutStableOpts('application/json'));
    } else {
      const baseDir = getBaseDir();
      const dataDir = path.join(baseDir, 'data');
      await ensureDir(dataDir);
      const winnersPath = path.join(dataDir, 'winners.json');
      await fs.writeFile(winnersPath, JSON.stringify(winners, null, 2));
    }
    return NextResponse.json({ success: true, winners });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save winner' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (useBlobStorage()) {
      await put('data/winners.json', JSON.stringify({ participants: [], schools: [] }, null, 2), blobPutStableOpts('application/json'));
      return NextResponse.json({ success: true });
    }
    const baseDir = getBaseDir();
    const dataDir = path.join(baseDir, 'data');
    await ensureDir(dataDir);
    const winnersPath = path.join(dataDir, 'winners.json');
    await fs.writeFile(winnersPath, JSON.stringify({ participants: [], schools: [] }, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset winners' },
      { status: 500 }
    );
  }
}
