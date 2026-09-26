const state = {
  items: [],
  graph: { nodes: [], links: [] },
  activeId: null,
  category: "all",
  openCategories: new Set(["skills", "knowledge"]),
  query: "",
  view: "reader",
  graphScope: "related",
  graphExpanded: false,
  outlineHeadings: [],
  activeHeadingId: null
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  backdrop: document.querySelector("#backdrop"),
  menuButton: document.querySelector("#menu-button"),
  resizeHandle: document.querySelector("#resize-handle"),
  search: document.querySelector("#search"),
  categoryTree: document.querySelector("#category-tree"),
  outlinePanel: document.querySelector("#outline-panel"),
  outline: document.querySelector("#article-outline"),
  outlineTop: document.querySelector("#outline-top"),
  readingSection: document.querySelector("#reading-section"),
  readingProgressLabel: document.querySelector("#reading-progress-label"),
  readingProgressBar: document.querySelector("#reading-progress-bar"),
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
let graphController = null;
let scrollFrame = null;

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
  elements.viewButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.document.classList.toggle("graph-document", view === "graph");
  elements.outlinePanel.hidden = view !== "reader" || state.outlineHeadings.length === 0;
  if (view !== "graph" && state.graphExpanded) {
    state.graphExpanded = false;
    document.body.classList.remove("graph-expanded");
  }
}

function resetOutline() {
  state.outlineHeadings = [];
  state.activeHeadingId = null;
  elements.outline.innerHTML = "";
  elements.outlinePanel.hidden = true;
  elements.readingSection.textContent = "正文开始";
  elements.readingProgressLabel.textContent = "0%";
  elements.readingProgressBar.style.width = "0%";
}

function makeHeadingId(text, index, used) {
  const normalized = text.trim().toLocaleLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || `section-${index + 1}`;
  let id = `section-${normalized}`;
  let suffix = 2;
  while (used.has(id)) id = `section-${normalized}-${suffix++}`;
  used.add(id);
  return id;
}

function buildOutline() {
  const body = elements.document.querySelector(".markdown-body");
  if (!body) {
    resetOutline();
    return;
  }

  const headings = [...body.querySelectorAll("h2, h3")].filter((heading) => heading.textContent.trim());
  const used = new Set([...elements.document.querySelectorAll("[id]")].map((element) => element.id).filter(Boolean));
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = makeHeadingId(heading.textContent, index, used);
  });
  state.outlineHeadings = headings;
  state.activeHeadingId = null;
  elements.outlinePanel.hidden = state.view !== "reader" || headings.length === 0;
  elements.outline.innerHTML = headings.map((heading, index) => `
    <button class="outline-link level-${heading.tagName.slice(1)}" data-outline-index="${index}" type="button">
      <span></span><b>${escapeHtml(heading.textContent.trim())}</b>
    </button>`).join("");

  elements.outline.querySelectorAll("[data-outline-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const heading = state.outlineHeadings[Number(button.dataset.outlineIndex)];
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileSidebar();
    });
  });
  updateReadingProgress();
}

function updateReadingProgress() {
  if (state.view !== "reader" || !state.outlineHeadings.length) return;
  const body = elements.document.querySelector(".markdown-body");
  if (!body) return;

  const marker = window.scrollY + 96;
  let activeIndex = -1;
  state.outlineHeadings.forEach((heading, index) => {
    const top = heading.getBoundingClientRect().top + window.scrollY;
    if (top <= marker) activeIndex = index;
  });

  const activeHeading = state.outlineHeadings[activeIndex] || null;
  const nextActiveId = activeHeading?.id || "";
  elements.outline.querySelectorAll("[data-outline-index]").forEach((button, index) => {
    const active = index === activeIndex;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "location");
    else button.removeAttribute("aria-current");
  });
  elements.readingSection.textContent = activeHeading?.textContent.trim() || "正文开始";

  if (nextActiveId !== state.activeHeadingId) {
    state.activeHeadingId = nextActiveId;
    const activeButton = elements.outline.querySelector(".outline-link.is-active");
    if (activeButton) {
      const top = activeButton.offsetTop;
      const bottom = top + activeButton.offsetHeight;
      if (top < elements.outline.scrollTop) elements.outline.scrollTop = Math.max(0, top - 8);
      else if (bottom > elements.outline.scrollTop + elements.outline.clientHeight) {
        elements.outline.scrollTop = bottom - elements.outline.clientHeight + 8;
      }
    }
  }

  const rect = body.getBoundingClientRect();
  const start = rect.top + window.scrollY - 96;
  const finish = Math.max(start + 1, rect.bottom + window.scrollY - window.innerHeight + 72);
  const percent = Math.round(clamp((window.scrollY - start) / (finish - start), 0, 1) * 100);
  elements.readingProgressLabel.textContent = `${percent}%`;
  elements.readingProgressBar.style.width = `${percent}%`;
}

function renderTags(tags) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((tag) => `<button class="tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("")}</div>`;
}

async function openItem(id, updateHash = true) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  state.activeId = id;
  state.graphScope = "related";
  resetOutline();
  setView("reader");
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
    buildOutline();
    if (updateHash) history.replaceState(null, "", `#/item/${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(updateReadingProgress);
  } catch (error) {
    elements.document.innerHTML = `<div class="error-state"><b>读取失败</b><p>${escapeHtml(error.message)}</p><button id="retry">重试</button></div>`;
    document.querySelector("#retry")?.addEventListener("click", () => openItem(id, false));
  }
}

function visibleGraphData() {
  if (state.graphScope !== "related" || !state.activeId) {
    return { nodes: state.graph.nodes, links: state.graph.links };
  }
  const links = state.graph.links.filter((link) => link.source === state.activeId || link.target === state.activeId);
  const ids = new Set([state.activeId]);
  links.forEach((link) => {
    ids.add(link.source);
    ids.add(link.target);
  });
  return {
    nodes: state.graph.nodes.filter((node) => ids.has(node.id)),
    links
  };
}

function showGraph(updateHash = true) {
  if (!state.activeId) state.graphScope = "all";
  setView("graph");
  document.body.classList.toggle("graph-expanded", state.graphExpanded);
  const data = visibleGraphData();
  const activeItem = state.items.find((item) => item.id === state.activeId);
  const related = state.graphScope === "related" && activeItem;
  elements.breadcrumb.textContent = related ? "GRAPH / RELATED" : "GRAPH / ALL";
  elements.document.innerHTML = `
    <section class="graph-shell">
      <header class="graph-header">
        <div class="graph-copy">
          <span class="graph-eyebrow">KNOWLEDGE MAP</span>
          <h2>${related ? `${escapeHtml(activeItem.title)}的直接关联` : "全库知识关系"}</h2>
          <p>${related
            ? "只展示当前条目与直接相连的知识和技能；点击节点即可继续阅读。"
            : "展示系统中的全部知识和技能。默认使用当前关联视图，避免条目增长后信息过载。"}</p>
        </div>
        <div class="graph-header-side">
          <div class="graph-scope-switch" role="group" aria-label="图谱范围">
            <button data-graph-scope="related" class="${state.graphScope === "related" ? "is-active" : ""}" ${activeItem ? "" : "disabled"}>当前关联</button>
            <button data-graph-scope="all" class="${state.graphScope === "all" ? "is-active" : ""}">全库图谱</button>
          </div>
          <div class="graph-stats">
            <span><b>${data.nodes.length}</b> 条目</span>
            <span><b>${data.links.length}</b> 关系</span>
          </div>
        </div>
      </header>
      <div class="graph-canvas ${state.graphExpanded ? "is-expanded" : ""}" id="graph-canvas" role="region" aria-label="知识图谱">
        <div class="graph-toolbar" role="toolbar" aria-label="图谱显示控制">
          <button data-graph-action="zoom-out" type="button" aria-label="缩小图谱" title="缩小">−</button>
          <span id="graph-zoom-label">100%</span>
          <button data-graph-action="zoom-in" type="button" aria-label="放大图谱" title="放大">＋</button>
          <button class="graph-fit-button" data-graph-action="fit" type="button">适应画布</button>
          <button class="graph-expand-button" data-graph-action="expand" type="button">${state.graphExpanded ? "收起" : "全屏放大"}</button>
        </div>
        <div class="graph-hint">滚轮缩放 · 拖动画布 · 拖动节点</div>
        <svg id="graph-svg" aria-label="知识条目关系图"></svg>
        <div class="graph-legend">${activeItem ? '<span class="current-dot"></span>当前 ' : ''}<span class="skill-dot"></span>Skill <span class="note-dot"></span>Knowledge</div>
      </div>
    </section>`;

  document.querySelectorAll("[data-graph-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphScope = button.dataset.graphScope;
      showGraph(true);
    });
  });
  document.querySelectorAll("[data-graph-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.graphAction;
      if (action === "zoom-in") graphController?.zoomBy(1.22);
      else if (action === "zoom-out") graphController?.zoomBy(1 / 1.22);
      else if (action === "fit") graphController?.fit();
      else if (action === "expand") {
        state.graphExpanded = !state.graphExpanded;
        document.body.classList.toggle("graph-expanded", state.graphExpanded);
        document.querySelector("#graph-canvas")?.classList.toggle("is-expanded", state.graphExpanded);
        button.textContent = state.graphExpanded ? "收起" : "全屏放大";
        requestAnimationFrame(drawGraph);
      }
    });
  });
  if (updateHash) {
    const route = related ? `#/graph/${encodeURIComponent(state.activeId)}` : "#/graph";
    history.replaceState(null, "", route);
  }
  closeMobileSidebar();
  requestAnimationFrame(drawGraph);
}

function drawGraph() {
  const canvas = document.querySelector("#graph-canvas");
  const existingSvg = document.querySelector("#graph-svg");
  const data = visibleGraphData();
  if (!canvas || !existingSvg || !data.nodes.length) return;
  const svg = existingSvg.cloneNode(false);
  existingSvg.replaceWith(svg);

  const expanded = canvas.classList.contains("is-expanded");
  const width = Math.max(560, canvas.clientWidth);
  const height = expanded
    ? Math.max(520, canvas.clientHeight)
    : Math.max(470, Math.min(680, window.innerHeight - 210));
  const related = state.graphScope === "related" && Boolean(state.activeId);
  const dense = data.nodes.length > 32;
  canvas.classList.toggle("is-dense", dense);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const neighbors = data.nodes.filter((node) => node.id !== state.activeId);
  const maxRadius = Math.min(width, height) * .34;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const nodes = data.nodes.map((node, index) => {
    if (related && node.id === state.activeId) {
      return { ...node, x: width / 2, y: height / 2, vx: 0, vy: 0, fixed: true };
    }
    if (related) {
      const neighborIndex = neighbors.findIndex((candidate) => candidate.id === node.id);
      const angle = (neighborIndex / Math.max(1, neighbors.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.min(maxRadius, 150 + neighbors.length * 4);
      return { ...node, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius, vx: 0, vy: 0, fixed: false };
    }
    const ratio = Math.sqrt((index + 1) / Math.max(1, data.nodes.length));
    const angle = index * goldenAngle - Math.PI / 2;
    return {
      ...node,
      x: width / 2 + Math.cos(angle) * maxRadius * ratio,
      y: height / 2 + Math.sin(angle) * maxRadius * ratio,
      vx: 0,
      vy: 0,
      fixed: false
    };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links = data.links
    .map((link) => ({ ...link, a: byId.get(link.source), b: byId.get(link.target) }))
    .filter((link) => link.a && link.b);

  const ticks = nodes.length > 120 ? 45 : nodes.length > 60 ? 70 : 150;
  const repel = dense ? 920 : 1450;
  const idealLink = related ? 175 : dense ? 115 : 155;
  const marginX = dense ? 58 : 88;
  const marginY = dense ? 55 : 72;
  for (let tick = 0; tick < ticks; tick += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x || .1;
        const dy = b.y - a.y || .1;
        const distanceSq = Math.max(30, dx * dx + dy * dy);
        const force = Math.min(1.9, repel / distanceSq);
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
      const force = (distance - idealLink) * .006;
      a.vx += (dx / distance) * force;
      a.vy += (dy / distance) * force;
      b.vx -= (dx / distance) * force;
      b.vy -= (dy / distance) * force;
    });
    nodes.forEach((node) => {
      if (node.fixed) {
        node.x = width / 2;
        node.y = height / 2;
        node.vx = 0;
        node.vy = 0;
        return;
      }
      node.vx += (width / 2 - node.x) * .0009;
      node.vy += (height / 2 - node.y) * .0009;
      node.vx *= .86;
      node.vy *= .86;
      node.x = clamp(node.x + node.vx, marginX, width - marginX);
      node.y = clamp(node.y + node.vy, marginY, height - marginY);
    });
  }

  const ns = "http://www.w3.org/2000/svg";
  const viewport = document.createElementNS(ns, "g");
  viewport.setAttribute("class", "graph-viewport");
  const edgeLayer = document.createElementNS(ns, "g");
  edgeLayer.setAttribute("class", "graph-edges");
  const nodeLayer = document.createElementNS(ns, "g");
  nodeLayer.setAttribute("class", "graph-nodes");
  viewport.append(edgeLayer, nodeLayer);
  svg.replaceChildren(viewport);

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

  const transform = { x: 0, y: 0, scale: 1 };
  const zoomLabel = document.querySelector("#graph-zoom-label");
  const applyTransform = () => {
    viewport.setAttribute("transform", `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
    if (zoomLabel) zoomLabel.textContent = `${Math.round(transform.scale * 100)}%`;
  };
  const svgPoint = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * width / rect.width,
      y: (clientY - rect.top) * height / rect.height
    };
  };
  const graphPoint = (clientX, clientY) => {
    const point = svgPoint(clientX, clientY);
    return {
      x: (point.x - transform.x) / transform.scale,
      y: (point.y - transform.y) / transform.scale
    };
  };
  const zoomAt = (nextScale, centerX = width / 2, centerY = height / 2) => {
    const scale = clamp(nextScale, .35, 3.4);
    const worldX = (centerX - transform.x) / transform.scale;
    const worldY = (centerY - transform.y) / transform.scale;
    transform.x = centerX - worldX * scale;
    transform.y = centerY - worldY * scale;
    transform.scale = scale;
    applyTransform();
  };
  graphController = {
    zoomBy(factor) { zoomAt(transform.scale * factor); },
    fit() {
      transform.x = 0;
      transform.y = 0;
      transform.scale = 1;
      applyTransform();
    }
  };

  nodes.forEach((node) => {
    const group = document.createElementNS(ns, "g");
    const current = node.id === state.activeId;
    group.dataset.id = node.id;
    group.setAttribute("class", `graph-node ${node.type}${current ? " is-current" : ""}`);
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");
    group.setAttribute("aria-label", `打开 ${node.title}`);
    const coreRadius = node.type === "skill" ? (dense ? 18 : 23) : (dense ? 15 : 19);
    const halo = document.createElementNS(ns, "circle");
    halo.setAttribute("class", "node-halo");
    halo.setAttribute("r", String(coreRadius + 8));
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("class", "node-core");
    circle.setAttribute("r", String(coreRadius));
    const mark = document.createElementNS(ns, "text");
    mark.setAttribute("class", "node-mark");
    mark.setAttribute("text-anchor", "middle");
    mark.setAttribute("dy", ".35em");
    mark.textContent = node.type === "skill" ? "S" : "K";
    const label = document.createElementNS(ns, "text");
    label.setAttribute("class", "node-label");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("y", String(coreRadius + 22));
    const labelLimit = dense ? 13 : 18;
    label.textContent = node.title.length > labelLimit ? `${node.title.slice(0, labelLimit)}…` : node.title;
    const title = document.createElementNS(ns, "title");
    title.textContent = `${node.title}\n${node.description}`;
    group.append(halo, circle, mark, label, title);
    nodeLayer.append(group);

    let moved = false;
    let start = null;
    group.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      moved = false;
      start = [event.clientX, event.clientY];
      group.setPointerCapture(event.pointerId);
      group.classList.add("is-dragging");
    });
    group.addEventListener("pointermove", (event) => {
      if (!group.hasPointerCapture(event.pointerId)) return;
      const point = graphPoint(event.clientX, event.clientY);
      node.x = clamp(point.x, 42, width - 42);
      node.y = clamp(point.y, 42, height - 42);
      node.fixed = false;
      moved ||= Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 4;
      updatePositions();
    });
    group.addEventListener("pointerup", (event) => {
      if (group.hasPointerCapture(event.pointerId)) group.releasePointerCapture(event.pointerId);
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

  let panStart = null;
  svg.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.(".graph-node")) return;
    panStart = { clientX: event.clientX, clientY: event.clientY, x: transform.x, y: transform.y };
    svg.setPointerCapture(event.pointerId);
    canvas.classList.add("is-panning");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!panStart || !svg.hasPointerCapture(event.pointerId)) return;
    const rect = svg.getBoundingClientRect();
    transform.x = panStart.x + (event.clientX - panStart.clientX) * width / rect.width;
    transform.y = panStart.y + (event.clientY - panStart.clientY) * height / rect.height;
    applyTransform();
  });
  const finishPan = (event) => {
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    panStart = null;
    canvas.classList.remove("is-panning");
  };
  svg.addEventListener("pointerup", finishPan);
  svg.addEventListener("pointercancel", finishPan);
  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = svgPoint(event.clientX, event.clientY);
    zoomAt(transform.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), point.x, point.y);
  }, { passive: false });

  updatePositions();
  applyTransform();
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

    const graphRouteId = decodeURIComponent(location.hash.match(/^#\/graph\/(.+)$/)?.[1] || "");
    if (location.hash === "#/graph" || graphRouteId) {
      const active = state.items.find((item) => item.id === graphRouteId);
      state.activeId = active?.id || null;
      state.graphScope = active ? "related" : "all";
      renderList();
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
  else {
    const item = state.items.find((candidate) => candidate.id === state.activeId) || state.items[0];
    if (item) openItem(item.id);
  }
}));
elements.outlineTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  closeMobileSidebar();
});
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
  if (event.key === "Escape" && state.graphExpanded) {
    state.graphExpanded = false;
    document.body.classList.remove("graph-expanded");
    document.querySelector("#graph-canvas")?.classList.remove("is-expanded");
    const expandButton = document.querySelector('[data-graph-action="expand"]');
    if (expandButton) expandButton.textContent = "全屏放大";
    requestAnimationFrame(drawGraph);
    return;
  }
  if (event.key === "Escape") closeMobileSidebar();
});
window.addEventListener("hashchange", () => {
  const graphRouteId = decodeURIComponent(location.hash.match(/^#\/graph\/(.+)$/)?.[1] || "");
  if (location.hash === "#/graph" || graphRouteId) {
    const active = state.items.find((item) => item.id === graphRouteId);
    state.activeId = active?.id || null;
    state.graphScope = active ? "related" : "all";
    renderList();
    showGraph(false);
    return;
  }
  const routeId = decodeURIComponent(location.hash.match(/^#\/item\/(.+)$/)?.[1] || "");
  if (routeId && (routeId !== state.activeId || state.view !== "reader")) openItem(routeId, false);
});
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    updateReadingProgress();
  });
}, { passive: true });
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.view === "graph") drawGraph();
    else updateReadingProgress();
  }, 120);
});

init();
