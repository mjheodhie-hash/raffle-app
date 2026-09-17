import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

function getBaseDir() {
  return process.env.VERCEL ? '/tmp' : process.cwd();
}

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

export async function GET() {
  try {
    // Prefer /tmp config if present (runtime-updated), else fall back to repo config
    const tmpConfig = path.join('/tmp', 'data', 'config.json');
    try {
      const tmpData = await fs.readFile(tmpConfig, 'utf-8');
      return NextResponse.json(JSON.parse(tmpData));
    } catch {}

    const configPath = path.join(process.cwd(), 'data', 'config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const baseDir = getBaseDir();
    const dataDir = path.join(baseDir, 'data');
    await ensureDir(dataDir);
    const configPath = path.join(dataDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
