import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client using your existing environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File;
    const userId = formData.get("userId") as string;

    if (!videoFile) {
      return NextResponse.json({ error: "No video file found." }, { status: 400 });
    }

    // Convert the browser File object to a Buffer for S3
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `interviews/${userId}-${Date.now()}.webm`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: "video/webm",
    });

    await s3Client.send(command);

    // The URL where the video is now stored
    const videoUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    const pythonPayload = {
      userId: userId,
      videoUrl: videoUrl
    };

    fetch("http://127.0.0.1:8000/analyze-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(pythonPayload)
    }).catch(err => console.error("Python trigger failed:", err));

    return NextResponse.json({ success: true, url: videoUrl }, { status: 200 });

  } catch (error) {
    console.error("S3 Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload video" }, { status: 500 });
  }
}