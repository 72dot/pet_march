import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const petDir = path.resolve(process.cwd(), 'public/pet');
  try {
    const files = fs.readdirSync(petDir)
      .filter(file => file.endsWith('.webp'))
      .map(file => `/pet/${file}`);
    return NextResponse.json(files);
  } catch (e) {
    console.error('Failed to read pet directory:', e);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
