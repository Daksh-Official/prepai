import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');
    const userId = searchParams.get('userId');

    if (!fileName || !userId) {
        return new NextResponse("Missing parameters", { status: 400 });
    }

    if (!fileName.startsWith(userId)) {
        return new NextResponse("Unauthorized Access", { status: 401 });
    }

    const filePath = path.join(process.cwd(), 'private_uploads', fileName);

    if (!fs.existsSync(filePath)) {
        return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
        headers: { 
            'Content-Type': 'video/webm',
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}