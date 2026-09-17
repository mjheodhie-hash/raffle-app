import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { put, del } from '@vercel/blob';

function makeId() {
  if ((crypto as any).randomUUID) return (crypto as any).randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getBaseDir() {
  return process.env.VERCEL ? '/tmp' : process.cwd();
}

function useBlobStorage() {
  return !!process.env.VERCEL || !!process.env.BLOB_READ_WRITE_TOKEN;
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

async function blobDelStable(pathname: string) {
  const opts: any = {};
  if (process.env.BLOB_READ_WRITE_TOKEN) opts.token = process.env.BLOB_READ_WRITE_TOKEN;
  try { await del(pathname, opts); } catch {}
}

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const participants: any[] = [];
    const schools: any[] = [];

    const firstString = (row: any) => {
      for (const v of Object.values(row)) {
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    };

    if (workbook.SheetNames.includes('Participants')) {
      const participantSheet = workbook.Sheets['Participants'];
      const participantData = XLSX.utils.sheet_to_json(participantSheet);
      participants.push(
        ...participantData.map((row: any) => {
          const name = row.Name ?? row.name ?? row['Participant'] ?? row['Full Name'] ?? row['Student'] ?? row['Student Name'] ?? firstString(row);
const school = row.School ?? row.school ?? row['Schools'] ?? row['School Name'] ?? row['College'] ?? row['University'];
          const base: any = { id: makeId() };
          if (name) base.Name = name;
          if (school) base.School = school;
          return { ...base, ...row };
        })
      );
    }

    if (workbook.SheetNames.includes('Schools')) {
      const schoolSheet = workbook.Sheets['Schools'];
      const schoolData = XLSX.utils.sheet_to_json(schoolSheet);
      schools.push(
        ...schoolData.map((row: any) => {
const school = row.School ?? row.school ?? row['Schools'] ?? row['School Name'] ?? row['College'] ?? row['University'] ?? firstString(row);
          return { id: makeId(), School: school, ...row };
        })
      );
    }

    const data = {
      participants,
      schools,
      uploadedAt: new Date().toISOString()
    };

    if (useBlobStorage()) {
      await blobDelStable('data/participants.json');
      await put('data/participants.json', JSON.stringify(data, null, 2), blobPutStableOpts('application/json'));
    } else {
      const baseDir = getBaseDir();
      const dataDir = path.join(baseDir, 'data');
      await ensureDir(dataDir);
      const dataPath = path.join(dataDir, 'participants.json');
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    }

    return NextResponse.json({
      success: true,
      participantsCount: participants.length,
      schoolsCount: schools.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process file', details: error.message },
      { status: 500 }
    );
  }
}
