# Getting Started — Connect the TGC Demo to Your AI

**Read this first.** In about two minutes you'll connect this Trading Grid Catalogue (TGC)
demo to your own AI assistant (Claude or ChatGPT). After that, you can just *talk* to it —
ask about supplier compliance, look up what a category requires, or create a new
requirement — all in plain English. No coding, no setup beyond pasting one URL.

> All data in this demo is mock, watermarked "MOCK DATA FOR ILLUSTRATION ONLY." Nothing you
> do here touches a real system.

---

## What this actually is (30 seconds)

TGC publishes a small **connector** (an MCP server). When you add its URL to Claude or
ChatGPT, your assistant gains a set of TGC "tools" it can use on your behalf — reading
requirement profiles and supplier compliance, and creating requirements. **Your** AI does
the talking; the connector just gives it access to the demo's data. That means you don't
need any API key of your own — you use the Claude or ChatGPT you already have.

---

## What you need

- One of: a **claude.ai** account, **ChatGPT** (Plus / Pro / Team — Developer mode is
  needed), or the **Claude Desktop** app.
- The connector URL (below).

## The connector URL

**Use this one:**

```
https://v0-retailer-specific.vercel.app/api/mcp
```

Authentication: **None** — leave any API-key / auth field blank.

<sub>(A branch-preview host also exists for pre-merge testing:
`https://v0-retailer-specific-git-1d56dd-geminicanadapro-8402s-projects.vercel.app/api/mcp`
— same `/api/mcp` endpoint, just a different host. Prefer the production URL above.)</sub>

---

## Set it up in claude.ai (recommended)

1. Go to **claude.ai** and sign in.
2. Click your name/avatar (bottom-left) → **Settings**.
3. Open the **Connectors** tab.
4. Click **Add custom connector** (you may need to scroll to the bottom of the list).
5. A dialog appears. Fill in:
   - **Name:** `TGC`
   - **URL:** paste the connector URL from above
   - **Authentication:** leave as None / blank
6. Click **Add**. The connector now appears in your list.
7. Start a **new chat**. Click the tools/attachments icon (the **⚙️ / search-and-tools**
   control near the message box) and make sure **TGC** is toggled **on** for this chat.
8. Type your first question (see "Confirm it works" below).

> Tip: in claude.ai the connector also contributes ready-made **starter prompts** — look
> for suggested TGC prompts in the prompt picker once it's enabled. (These arrive with the
> next update; if you don't see them yet, just type a question — everything still works.)

---

## Set it up in ChatGPT

ChatGPT requires **Developer mode** to add a custom MCP connector (Plus/Pro/Team plans).

1. Go to **ChatGPT** → **Settings**.
2. Open **Apps & Connectors** (some plans label this **Connectors**).
3. Open **Advanced** → turn on **Developer mode**.
4. Back in Apps & Connectors, click **Create** (or **Add**) a connector.
5. Fill in:
   - **Name:** `TGC`
   - **MCP Server URL:** paste the connector URL
   - **Authentication:** None
6. Save. Then, in a **new chat**, open the tools menu and enable **TGC**.

---

## Set it up in Claude Desktop

1. Open **Claude Desktop** → **Settings**.
2. Open **Connectors** → **Add custom connector**.
3. Paste the connector URL, no authentication, and confirm.
4. Enable **TGC** in a new conversation's tools menu.

---

## Confirm it works

In a chat with the TGC connector enabled, type:

> **"Which of my suppliers are furthest behind on compliance, and on what?"**

A correct response looks like the assistant **calling a TGC tool** (you'll usually see a
"used TGC" / tool-call indicator) and then answering with specific supplier names and gap
counts from the demo data — for example, ranking J.Renée and Nike by open attribute gaps.
If it answers with generic advice and *no* tool call, the connector isn't enabled for that
chat — see troubleshooting.

Then try a **create** flow to see the write side:

> **"Create an attribute profile for Dresses, then add a lifestyle image requirement to it."**

It will ask you for the mandatory details (offering only the valid image formats and
backgrounds), confirm the change, then create it. Ask **"list my profiles"** afterward and
the new one appears.

---

## What you can ask (it is NOT a fixed list)

The example prompts are just that — examples. Ask anything about TGC requirements and
supplier compliance in your own words:

- **Understand requirements:** "What does my Footwear profile require?" · "Show me the
  image rules for shoes."
- **Monitor suppliers:** "Who's my worst vendor?" · "List the open gaps for Dillard's."
- **Author requirements:** "Set up requirements for a new Swimwear category." · "Require
  care instructions on Dresses."
- **Manage exceptions:** "Give Levi's a 60-day extension on sustainable-materials fields."
  · "Show all active exceptions."

Not sure what's available? Just ask **"What can you help me with?"** — the assistant can
list its own capabilities and the data that exists in the demo.

---

## Troubleshooting

**Adding the connector fails, or you get a 401 / 403.**
The demo is hosted on Vercel, whose "Deployment Protection" can block anonymous access to
preview URLs. Fix either way:
- In Vercel: **Project → Settings → Deployment Protection →** turn **Vercel
  Authentication** off (or set it to "Only Production" and use the **production** URL).
- Also check **Firewall / Bot Protection** isn't challenging non-browser clients.
- The **production** URL above is normally public; if it returns 401/403, disabling
  Vercel Authentication for the project (as above) resolves it.

**The connector isn't in the tools menu.**
Make sure you added it in Settings first, then open a **new** chat — enable it there via
the tools/attachments control.

**It answered from general knowledge instead of the demo data.**
The connector wasn't enabled for that chat, or the assistant didn't think it needed a tool.
Enable TGC for the chat and ask a specific data question ("list my attribute profiles").

**A question came back empty.**
The demo data is limited. Ask "what can you help me with?" to see which categories and
vendors have data, then rephrase.

---

## Learn more

- **`docs/mcp-faq.md`** — deeper FAQ: how mandatory fields and dropdowns work, persistence,
  security for a real rollout.
- **README's "Conversational access (MCP)" section** — the discoverability model
  (`get_capabilities`, starter prompts, self-explaining empty results) and how this
  connector fits alongside the retailer portal.
