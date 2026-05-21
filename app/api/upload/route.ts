import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;
        const userId = data.get('userId') as string;

        if (!file || !userId) {
            return NextResponse.json({ success: false, error: "Missing file or userId" });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), 'private_uploads');
        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filename = `${userId}-${Date.now()}-${file.name}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        return NextResponse.json({ success: true, filename: filename });
    } catch (error: any) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ success: false, error: error.message });
    }
}