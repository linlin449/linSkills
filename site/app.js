const state = {
  items: [],
  activeId: null,
  filter: "all",
  query: ""
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  backdrop: document.querySelector("#backdrop"),
  menuButton: document.querySelector("#menu-button"),
  search: document.querySelector("#search"),
  list: document.querySelector("#item-list"),
  document: document.querySelector("#document"),
  breadcrumb: document.querySelector("#breadcrumb"),
  resultLabel: document.querySelector("#result-label"),
  resultCount: document.querySelector("#result-count"),
  toast: document.querySelector("#toast")
};

const siteUrl = (relativePath) => new URL(relativePath, window.location.href.split("#")[0]).href;
const escapeHtml = (value = "") => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const typeLabel = (type) => type === "skill" ? "SKILL" : "NOTE";

function filteredItems() {
  const words = state.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return state.items.filter((item) => {
    if (state.filter !== "all" && item.type !== state.filter) return false;
    const haystack = [item.title, item.description, item.sourcePath, item.searchText, ...item.tags].join(" ").toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

function renderList() {
  const items = filteredItems();
  elements.resultLabel.textContent = state.query ? `“${state.query}”` : "最近更新";
  elements.resultCount.textContent = `${items.length} 项`;
  elements.list.innerHTML = items.length ? items.map((item, index) => `
    <button class="item-card ${item.id === state.activeId ? "is-active" : ""}" data-id="${escapeHtml(item.id)}">
      <span class="item-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="item-copy">
        <span class="item-type">${typeLabel(item.type)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.description)}</small>
      </span>
      <span class="item-arrow">↗</span>
    </button>
  `).join("") : `
    <div class="empty-list">
      <span>∅</span>
      <p>没有匹配的内容</p>
      <button id="clear-search">清除筛选</button>
    </div>`;

  elements.list.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => openItem(button.dataset.id));
  });
  document.querySelector("#clear-search")?.addEventListener("click", clearSearch);
}

function renderTags(tags) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((tag) => `<button class="tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("")}</div>`;
}

async function openItem(id, updateHash = true) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  state.activeId = id;
  renderList();
  elements.breadcrumb.textContent = item.type === "skill" ? "SKILLS" : "KNOWLEDGE";
  elements.document.innerHTML = `<div class="loading-state"><span class="loading-number">↻</span><p>读取内容…</p></div>`;
  closeSidebar();

  try {
    const response = await fetch(siteUrl(item.contentUrl));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const content = await response.json();
    elements.document.innerHTML = `
      <header class="document-header">
        <div class="document-kicker"><span>${typeLabel(item.type)}</span><i></i><time>${escapeHtml(item.updated || "持续维护")}</time></div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description)}</p>
        ${renderTags(item.tags)}
        <div class="document-actions">
          <button id="copy-markdown">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h11v11H8zM5 16H4V5h11v1" /></svg>
            复制 Markdown
          </button>
          <a href="${escapeHtml(item.rawUrl)}" target="_blank" rel="noopener">查看原始文件 ↗</a>
        </div>
      </header>
      <div class="document-rule"><span>${escapeHtml(item.sourcePath)}</span></div>
      <div class="markdown-body">${content.html}</div>
      <footer class="document-footer">
        <span>END OF RECORD</span>
        <b>${escapeHtml(item.id)}</b>
      </footer>`;
    document.querySelector("#copy-markdown")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(content.markdown);
      showToast("已复制 Markdown");
    });
    document.querySelectorAll("[data-tag]").forEach((button) => {
      button.addEventListener("click", () => {
        state.query = button.dataset.tag;
        elements.search.value = state.query;
        renderList();
      });
    });
    if (updateHash) history.replaceState(null, "", `#/item/${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    elements.document.innerHTML = `<div class="error-state"><b>读取失败</b><p>${escapeHtml(error.message)}</p><button id="retry">重试</button></div>`;
    document.querySelector("#retry")?.addEventListener("click", () => openItem(id, false));
  }
}

function clearSearch() {
  state.query = "";
  state.filter = "all";
  elements.search.value = "";
  document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("is-active", button.dataset.filter === "all"));
  renderList();
}

function openSidebar() {
  elements.sidebar.classList.add("is-open");
  elements.backdrop.classList.add("is-visible");
  elements.menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  elements.sidebar.classList.remove("is-open");
  elements.backdrop.classList.remove("is-visible");
  elements.menuButton.setAttribute("aria-expanded", "false");
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

async function init() {
  try {
    const response = await fetch(siteUrl("catalog.json"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    state.items = catalog.items;
    document.querySelector("#count-all").textContent = state.items.length;
    document.querySelector("#count-skill").textContent = state.items.filter((item) => item.type === "skill").length;
    document.querySelector("#count-knowledge").textContent = state.items.filter((item) => item.type === "knowledge").length;
    renderList();

    const routeId = decodeURIComponent(location.hash.match(/^#\/item\/(.+)$/)?.[1] || "");
    const initial = state.items.find((item) => item.id === routeId) || state.items[0];
    if (initial) openItem(initial.id, !routeId);
    else elements.document.innerHTML = `<div class="empty-library"><b>知识库还是空的</b><p>在 skills/ 或 knowledge/ 中加入第一份 Markdown。</p></div>`;
  } catch (error) {
    elements.document.innerHTML = `<div class="error-state"><b>知识库加载失败</b><p>${escapeHtml(error.message)}</p><p>请先运行构建脚本，再通过本地服务器访问。</p></div>`;
  }
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderList();
});
document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    renderList();
  });
});
elements.menuButton.addEventListener("click", () => elements.sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar());
elements.backdrop.addEventListener("click", closeSidebar);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape") closeSidebar();
});
window.addEventListener("hashchange", () => {
  const routeId = decodeURIComponent(location.hash.match(/^#\/item\/(.+)$/)?.[1] || "");
  if (routeId && routeId !== state.activeId) openItem(routeId, false);
});

init();
