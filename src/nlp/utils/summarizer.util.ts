export function summarize(text: string): string {
const sentences = text.split(/(?<=[.!?])\s+/);
if (sentences.length === 1) return text;


const first = sentences[0];
const last = sentences[sentences.length - 1];


return `${first} ... ${last}`;
}