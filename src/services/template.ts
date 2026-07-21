import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TemplateType } from "../types/mail.types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "../templates");

export interface TemplateVariables {
    subject: string;
    text?: string;
    link?: string;
    value?: string;
}

export async function renderTemplate(
    templateType: TemplateType,
    variables: TemplateVariables
): Promise<string> {
    const filePath = path.join(templatesDir, `${templateType}.html`);
    let html = await readFile(filePath, "utf-8");

    const safeVars: Record<string, string> = {
        subject: variables.subject,
        text: variables.text ?? "",
        link: variables.link ?? "",
        value: variables.value ?? "",
    };

    for (const [key, val] of Object.entries(safeVars)) {
        html = html.replaceAll(`{{${key}}}`, val);
    }

    return html;
}