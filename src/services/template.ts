import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "../templates");

export async function renderTemplate(
    templateName: string,
    variables: Record<string, string>
): Promise<string> {
    const filePath = path.join(templatesDir, templateName);
    let html = await readFile(filePath, "utf-8");

    for (const [key, value] of Object.entries(variables)) {
        html = html.replaceAll(`{{${key}}}`, value);
    }

    return html;
}