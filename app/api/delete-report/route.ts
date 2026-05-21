import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import fssync from 'fs';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const videoFileName = searchParams.get('videoFileName');

        console.log(`[DELETE API] Request: userId=${userId}, video=${videoFileName}`);

        if (!userId || !videoFileName) {
            return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }

        // Security check: ensure user only deletes their own files
        if (!videoFileName.startsWith(userId)) {
            console.error(`[DELETE API] Unauthorized delete attempt: ${userId} tried to delete ${videoFileName}`);
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Cleanup local video file
        const filepath = path.join(process.cwd(), 'private_uploads', videoFileName);
        if (fssync.existsSync(filepath)) {
            await fs.unlink(filepath);
            console.log(`[DELETE API] Successfully deleted file: ${videoFileName}`);
        } else {
            console.warn(`[DELETE API] File not found: ${videoFileName}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[DELETE API] Global Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}