function base() {
  return (process.env.N8N_WEBHOOK_BASE ?? "https://n8n.srv922487.hstgr.cloud/webhook").replace(/\/$/, "");
}

export async function runWorkflow(path: string, body: unknown) {
  const response = await fetch(`${base()}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "n8n has no active webhook for this yet. Publish the workflow, then try again."
        : text || `n8n returned ${response.status}`,
    );
  }
  return text;
}
