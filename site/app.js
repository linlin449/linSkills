const state = {
  items: [],
  graph: { nodes: [], links: [] },
  activeId: null,
  category: "all",
  openCategories: new Set(["skills", "knowledge"]),
  query: "",
  view: "reader"
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  backdrop: document.querySelector("#backdrop"),
  menuButton: document.querySelector("#menu-button"),
  resizeHandle: document.querySelector("#resize-handle"),
  search: document.querySelector("#search"),
  categoryTree: document.querySelector("#category-tree"),
  list: document.querySelector("#item-list"),
  document: document.querySelector("#document"),
  breadcrumb: document.querySelector("#breadcrumb"),
  resultLabel: document.querySelector("#result-label"),
  resultCount: document.querySelector("#result-count"),
  toast: document.querySelector("#toast"),
  viewButtons: [...document.querySelectorAll("[data-view]")]
};

const desktop = window.matchMedia("(min-width: 901px)");
const siteUrl = (relativePath) => new URL(relativePath, window.location.href.split("#")[0]).href;
const escapeHtml = (value = "") => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const typeLabel = (type) => type === "skill" ? "SKILL" : "NOTE";
const categoryLabel = (segment) => ({ skills: "Skills", knowledge: "知识", uncategorized: "未分类" })[segment]
  || segment.replace(/-/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isInCategory(item, category) {
  if (category === "all") return true;
  const itemCategory = item.categoryId || item.categoryPath?.join("/") || (item.type === "skill" ? "skills" : "knowledge/uncategorized");
  return itemCategory === category || itemCategory.startsWith(`${category}/`);
}

function categoryName(category) {
  if (category === "all") return "全部内容";
  return category.split("/").map(categoryLabel).join(" / ");
}

function buildCategoryTree(items) {
  const roots = new Map();
  items.forEach((item) => {
    const parts = item.categoryPath || (item.type === "skill" ? ["skills"] : ["knowledge", "uncategorized"]);
    let children = roots;
    parts.forEach((part, index) => {
      const id = parts.slice(0, index + 1).join("/");
      if (!children.has(part)) children.set(part, { id, part, count: 0, children: new Map() });
      const node = children.get(part);
      node.count += 1;
      children = node.children;
    });
  });
  return roots;
}

function folderIcon(open = false) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h6l2-2h9v13h-17z"/><path d="M3.5 9.5h17"/>${open ? '<path d="m8 13 4 3 4-3"/>' : ""}</svg>`;
}

function renderCategoryNodes(nodes, depth = 0) {
  return [...nodes.values()].map((node) => {
    const hasChildren = node.children.size > 0;
    const isOpen = state.openCategories.has(node.id);
    return `
      <div class="category-node" style="--depth:${depth}">
        <div class="category-row">
          ${hasChildren ? `<button class="category-toggle" data-toggle-category="${escapeHtml(node.id)}" aria-expanded="${isOpen}" aria-label="${isOpen ? "收起" : "展开"} ${escapeHtml(categoryLabel(node.part))}"><span>›</span></button>` : '<span class="category-spacer"></span>'}
          <button class="category-select ${state.category === node.id ? "is-active" : ""}" data-category="${escapeHtml(node.id)}">
            ${folderIcon(isOpen)}
            <span>${escapeHtml(categoryLabel(node.part))}</span>
            <b>${node.count}</b>
          </button>
        </div>
        ${hasChildren && isOpen ? `<div class="category-children">${renderCategoryNodes(node.children, depth + 1)}</div>` : ""}
      </div>`;
  }).join("");
}

function renderCategories() {
  const tree = buildCategoryTree(state.items);
  elements.categoryTree.innerHTML = `
    <button class="category-all ${state.category === "all" ? "is-active" : ""}" data-category="all">
      <span class="category-all-icon">⌂</span><span>全部内容</span><b>${state.items.length}</b>
    </button>
    <div class="category-roots">${renderCategoryNodes(tree)}</div>`;
  elements.categoryTree.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderCategories();
      renderList();
    });
  });
  elements.categoryTree.querySelectorAll("[data-toggle-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleCategory;
      if (state.openCategories.has(id)) state.openCategories.delete(id);
      else state.openCategories.add(id);
      renderCategories();
    });
  });
}

function filteredItems() {
  const words = state.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return state.items.filter((item) => {
    if (!isInCategory(item, state.category)) return false;
    const haystack = [item.title, item.description, item.sourcePath, item.searchText, ...item.tags].join(" ").toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

function renderList() {
  const items = filteredItems();
  elements.resultLabel.textContent = state.query ? `“${state.query}”` : categoryName(state.category);
  elements.resultCount.textContent = `${items.length} 项`;
  elements.list.innerHTML = items.length ? items.map((item) => `
    <button class="item-card ${item.id === state.activeId ? "is-active" : ""}" data-id="${escapeHtml(item.id)}">
      <span class="item-type">${typeLabel(item.type)}</span>
      <span class="item-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <em>${escapeHtml((item.categoryPath || []).slice(1).map(categoryLabel).join(" / ") || categoryLabel(item.categoryPath?.[0] || item.type))}</em>
        <small>${escapeHtml(item.description)}</small>
      </span>
      <span class="item-arrow">→</span>
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

function setView(view) {
  state.view = view;
  elements.viewButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  elements.document.classList.toggle("graph-document", view === "graph");
}

function renderTags(tags) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((tag) => `<button class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("")}</div>`;
}

async function openItem(id, updateHash = true) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  setView("reader");
  state.activeId = id;
  renderList();
  elements.breadcrumb.textContent = (item.categoryPath || [item.type]).map(categoryLabel).join(" / ").toUpperCase();
  elements.document.innerHTML = `<div class="loading-state"><span class="loading-number">↻</span><p>读取内容…</p></div>`;
  closeMobileSidebar();

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

function showGraph(updateHash = true) {
  setView("graph");
  elements.breadcrumb.textContent = "GRAPH";
  elements.document.innerHTML = `
    <section class="graph-shell">
      <header class="graph-header">
        <div>
          <span class="graph-eyebrow">KNOWLEDGE MAP</span>
          <h2>知识之间，如何连接</h2>
          <p>关系由 Agent 随 Markdown 一起维护。点击节点即可打开内容。</p>
        </div>
        <div class="graph-stats">
          <span><b>${state.graph.nodes.length}</b> 条目</span>
          <span><b>${state.graph.links.length}</b> 关系</span>
        </div>
      </header>
      <div class="graph-canvas" id="graph-canvas" role="region" aria-label="知识图谱">
        <svg id="graph-svg" aria-label="知识条目关系图"></svg>
        <div class="graph-legend"><span class="skill-dot"></span>Skill <span class="note-dot"></span>Knowledge</div>
      </div>
    </section>`;
  if (updateHash) history.replaceState(null, "", "#/graph");
  closeMobileSidebar();
  requestAnimationFrame(drawGraph);
}

function drawGraph() {
  const canvas = document.querySelector("#graph-canvas");
  const svg = document.querySelector("#graph-svg");
  if (!canvas || !svg || !state.graph.nodes.length) return;

  const width = Math.max(560, canvas.clientWidth);
  const height = Math.max(470, Math.min(680, window.innerHeight - 210));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const nodes = state.graph.nodes.map((node, index) => {
    const angle = (index / state.graph.nodes.length) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.min(width, height) * .27;
    return { ...node, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius, vx: 0, vy: 0 };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links = state.graph.links.map((link) => ({ ...link, a: byId.get(link.source), b: byId.get(link.target) }));

  for (let tick = 0; tick < 180; tick += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x || .1;
        const dy = b.y - a.y || .1;
        const distanceSq = dx * dx + dy * dy;
        const force = Math.min(1.8, 1400 / distanceSq);
        const distance = Math.sqrt(distanceSq);
        a.vx -= (dx / distance) * force;
        a.vy -= (dy / distance) * force;
        b.vx += (dx / distance) * force;
        b.vy += (dy / distance) * force;
      }
    }
    links.forEach(({ a, b }) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (distance - 155) * .005;
      a.vx += (dx / distance) * force;
      a.vy += (dy / distance) * force;
      b.vx -= (dx / distance) * force;
      b.vy -= (dy / distance) * force;
    });
    nodes.forEach((node) => {
      node.vx += (width / 2 - node.x) * .0008;
      node.vy += (height / 2 - node.y) * .0008;
      node.vx *= .86;
      node.vy *= .86;
      node.x = clamp(node.x + node.vx, 90, width - 90);
      node.y = clamp(node.y + node.vy, 70, height - 70);
    });
  }

  const ns = "http://www.w3.org/2000/svg";
  const edgeLayer = document.createElementNS(ns, "g");
  edgeLayer.setAttribute("class", "graph-edges");
  const nodeLayer = document.createElementNS(ns, "g");
  nodeLayer.setAttribute("class", "graph-nodes");
  svg.replaceChildren(edgeLayer, nodeLayer);

  links.forEach((link) => {
    const line = document.createElementNS(ns, "line");
    line.dataset.source = link.source;
    line.dataset.target = link.target;
    edgeLayer.append(line);
  });

  const updatePositions = () => {
    edgeLayer.querySelectorAll("line").forEach((line) => {
      const a = byId.get(line.dataset.source);
      const b = byId.get(line.dataset.target);
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
    });
    nodeLayer.querySelectorAll("g").forEach((group) => {
      const node = byId.get(group.dataset.id);
      group.setAttribute("transform", `translate(${node.x} ${node.y})`);
    });
  };

  nodes.forEach((node) => {
    const group = document.createElementNS(ns, "g");
    group.dataset.id = node.id;
    group.setAttribute("class", `graph-node ${node.type}${node.id === state.activeId ? " is-current" : ""}`);
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");
    group.setAttribute("aria-label", `打开 ${node.title}`);
    const halo = document.createElementNS(ns, "circle");
    halo.setAttribute("class", "node-halo");
    halo.setAttribute("r", node.type === "skill" ? "31" : "27");
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("class", "node-core");
    circle.setAttribute("r", node.type === "skill" ? "23" : "19");
    const mark = document.createElementNS(ns, "text");
    mark.setAttribute("class", "node-mark");
    mark.setAttribute("text-anchor", "middle");
    mark.setAttribute("dy", ".35em");
    mark.textContent = node.type === "skill" ? "S" : "K";
    const label = document.createElementNS(ns, "text");
    label.setAttribute("class", "node-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("y", node.type === "skill" ? "45" : "41");
    label.textContent = node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title;
    const title = document.createElementNS(ns, "title");
    title.textContent = `${node.title}\n${node.description}`;
    group.append(halo, circle, mark, label, title);
    nodeLayer.append(group);

    let moved = false;
    let start = null;
    group.addEventListener("pointerdown", (event) => {
      moved = false;
      start = [event.clientX, event.clientY];
      group.setPointerCapture(event.pointerId);
      group.classList.add("is-dragging");
    });
    group.addEventListener("pointermove", (event) => {
      if (!group.hasPointerCapture(event.pointerId)) return;
      const rect = svg.getBoundingClientRect();
      node.x = clamp((event.clientX - rect.left) * width / rect.width, 70, width - 70);
      node.y = clamp((event.clientY - rect.top) * height / rect.height, 55, height - 55);
      moved ||= Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 4;
      updatePositions();
    });
    group.addEventListener("pointerup", (event) => {
      group.releasePointerCapture(event.pointerId);
      group.classList.remove("is-dragging");
      if (!moved) openItem(node.id);
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItem(node.id);
      }
    });
  });
  updatePositions();
}

function clearSearch() {
  state.query = "";
  state.category = "all";
  elements.search.value = "";
  renderCategories();
  renderList();
}

function closeMobileSidebar() {
  if (desktop.matches) return;
  elements.sidebar.classList.remove("is-open");
  elements.backdrop.classList.remove("is-visible");
  elements.menuButton.setAttribute("aria-expanded", "false");
}

function toggleSidebar() {
  if (!desktop.matches) {
    const willOpen = !elements.sidebar.classList.contains("is-open");
    elements.sidebar.classList.toggle("is-open", willOpen);
    elements.backdrop.classList.toggle("is-visible", willOpen);
    elements.menuButton.setAttribute("aria-expanded", String(willOpen));
    elements.menuButton.setAttribute("aria-label", willOpen ? "关闭目录" : "打开目录");
    return;
  }
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  localStorage.setItem("kb-sidebar-collapsed", String(collapsed));
  elements.menuButton.setAttribute("aria-expanded", String(!collapsed));
  elements.menuButton.setAttribute("aria-label", collapsed ? "展开目录" : "收起目录");
}

function setSidebarWidth(width) {
  const next = clamp(Math.round(width), 240, 420);
  document.documentElement.style.setProperty("--sidebar-width", `${next}px`);
  elements.resizeHandle.setAttribute("aria-valuenow", String(next));
  localStorage.setItem("kb-sidebar-width", String(next));
}

let toastTimer;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

async function init() {
  const savedWidth = Number(localStorage.getItem("kb-sidebar-width"));
  if (savedWidth) setSidebarWidth(savedWidth);
  if (localStorage.getItem("kb-sidebar-collapsed") === "true" && desktop.matches) {
    document.body.classList.add("sidebar-collapsed");
    elements.menuButton.setAttribute("aria-expanded", "false");
  }

  try {
    const [catalogResponse, graphResponse] = await Promise.all([fetch(siteUrl("catalog.json")), fetch(siteUrl("graph.json"))]);
    if (!catalogResponse.ok || !graphResponse.ok) throw new Error(`HTTP ${catalogResponse.status}/${graphResponse.status}`);
    const catalog = await catalogResponse.json();
    state.graph = await graphResponse.json();
    state.items = catalog.items;
    renderCategories();
    renderList();

    if (location.hash === "#/graph") {
      showGraph(false);
      return;
    }
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
elements.viewButtons.forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.view === "graph") showGraph();
  else if (state.activeId) openItem(state.activeId);
}));
elements.menuButton.addEventListener("click", toggleSidebar);
elements.backdrop.addEventListener("click", closeMobileSidebar);
elements.resizeHandle.addEventListener("pointerdown", (event) => {
  if (!desktop.matches) return;
  elements.resizeHandle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing");
});
elements.resizeHandle.addEventListener("pointermove", (event) => {
  if (elements.resizeHandle.hasPointerCapture(event.pointerId)) setSidebarWidth(event.clientX);
});
elements.resizeHandle.addEventListener("pointerup", (event) => {
  elements.resizeHandle.releasePointerCapture(event.pointerId);
  document.body.classList.remove("is-resizing");
});
elements.resizeHandle.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"), 10);
  if (event.key === "Home") setSidebarWidth(240);
  else if (event.key === "End") setSidebarWidth(420);
  else setSidebarWidth(current + (event.key === "ArrowLeft" ? -16 : 16));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape") closeMobileSidebar();
});
window.addEventListener("hashchange", () => {
  if (location.hash === "#/graph" && state.view !== "graph") showGraph(false);
  const routeId = decodeURIComponent(location.hash.match(/^#\/item\/(.+)$/)?.[1] || "");
  if (routeId && (routeId !== state.activeId || state.view !== "reader")) openItem(routeId, false);
});
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.view === "graph") drawGraph();
  }, 120);
});

init();
