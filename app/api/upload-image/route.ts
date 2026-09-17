import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

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

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!['logo', 'background'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (useBlobStorage()) {
      const keyPrefix = type === 'logo' ? 'uploads/logos' : 'uploads/backgrounds';
      const key = `${keyPrefix}/${Date.now()}-${file.name}`;
      const contentType = (file as any).type || undefined;
      const uploaded = await put(key, buffer, blobPutOpts(contentType));
      return NextResponse.json({ success: true, path: uploaded.url });
    } else {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', type === 'logo' ? 'logos' : 'backgrounds');
      await ensureDir(uploadDir);
      const filename = `${Date.now()}-${file.name}`;
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, buffer);
      const publicPath = `/uploads/${type === 'logo' ? 'logos' : 'backgrounds'}/${filename}`;
      return NextResponse.json({ success: true, path: publicPath });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!['logo', 'background'].includes(type || '')) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (useBlobStorage()) {
      const prefix = type === 'logo' ? 'uploads/logos/' : 'uploads/backgrounds/';
      const result = await list(blobListOpts(prefix));
      const imagePaths = (result.blobs || []).map((b: any) => b.url);
      return NextResponse.json({ files: imagePaths });
    } else {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', type === 'logo' ? 'logos' : 'backgrounds');
      try {
        const files = await fs.readdir(uploadDir);
        const imagePaths = files
          .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
          .map(file => `/uploads/${type === 'logo' ? 'logos' : 'backgrounds'}/${file}`);
        return NextResponse.json({ files: imagePaths });
      } catch (error) {
        return NextResponse.json({ files: [] });
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to list files', details: error.message },
      { status: 500 }
    );
  }
}
