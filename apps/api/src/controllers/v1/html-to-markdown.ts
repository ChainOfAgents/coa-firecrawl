import { Request, Response } from "express";
import { z } from "zod";
import { parseMarkdown } from "../../lib/html-to-markdown";

// Request body schema validation
const htmlToMarkdownSchema = z.object({
  html: z.string().min(1, "HTML content is required"),
  options: z
    .object({
      preserveHtmlTags: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

type HTMLToMarkdownRequest = z.infer<typeof htmlToMarkdownSchema>;

interface HTMLToMarkdownResponse {
  success: boolean;
  markdown?: string;
  error?: string;
}

export async function htmlToMarkdownController(
  req: Request<{}, {}, HTMLToMarkdownRequest>,
  res: Response<HTMLToMarkdownResponse>
) {
  try {
    // Validate request body
    const validatedBody = htmlToMarkdownSchema.parse(req.body);

    // Convert HTML to Markdown using the same converter as /scrape
    const markdown = await parseMarkdown(validatedBody.html);

    return res.json({
      success: true,
      markdown,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message,
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      error: "Failed to convert HTML to Markdown",
    });
  }
}
