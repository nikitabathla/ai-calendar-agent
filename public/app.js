const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const history = [];
const thread = document.querySelector("#thread");
const form = document.querySelector("#composer");
const input = document.querySelector("#message");
const send = form.querySelector("button");

document.querySelector("#zone").textContent = timezone;

function formatMessage(content) {
  if (window.marked && window.DOMPurify) {
    const rawHtml = window.marked.parse(content, { gfm: true, breaks: true });
    return window.DOMPurify.sanitize(rawHtml);
  }
  return content;
}

function addMessage(role, text) {
  const item = document.createElement("article");
  item.className = role;
  if (role === "agent" && window.marked) {
    item.innerHTML = formatMessage(text);
  } else {
    item.textContent = text;
  }
  thread.appendChild(item);
  item.scrollIntoView({ block: "nearest" });
  return item;
}

async function ask(message) {
  addMessage("user", message);
  const pending = addMessage("agent", "Checking your calendar…");
  send.disabled = true;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, timezone, history }),
    });
    const data = await response.json();
    const replyText = data.reply || data.error || "No reply.";
    if (window.marked) {
      pending.innerHTML = formatMessage(replyText);
    } else {
      pending.textContent = replyText;
    }
    history.push({ role: "user", content: message }, { role: "assistant", content: replyText });
  } catch {
    pending.textContent = "Could not reach the server.";
  } finally {
    send.disabled = false;
    input.focus();
  }
}

function resizeInput() {
  input.style.height = "auto";
  const nextHeight = Math.min(input.scrollHeight, 140);
  input.style.height = `${Math.max(40, nextHeight)}px`;
  input.style.overflowY = input.scrollHeight > 140 ? "auto" : "hidden";
}

input.addEventListener("input", resizeInput);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  resizeInput();
  ask(message);
});

document.querySelectorAll("[data-message]").forEach((button) => {
  button.addEventListener("click", () => ask(button.dataset.message));
});
