import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let data;
    let parser;
    try {
      parser = new PDFParse({ data: buffer });
      data = await parser.getText();
    } catch (parseError: any) {
      console.error("PDF Parsing Inner Error:", parseError);
      throw new Error(`Failed to parse PDF: ${parseError.message}`);
    } finally {
      if (parser && typeof (parser as any).destroy === 'function') {
        await (parser as any).destroy();
      }
    }

    return NextResponse.json({ success: true, text: data.text });
  } catch (error: any) {
    console.error("PDF Parse API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse PDF" },
      { status: 500 }
    );
  }
}