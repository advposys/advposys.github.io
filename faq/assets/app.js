
(function () {
  const data = window.QA_DATA || { questions: [], categories: [] };
  const state = { query: "", category: "all" };
  const list = document.getElementById("questionList");
  const categoryList = document.getElementById("categoryList");
  const resultCount = document.getElementById("resultCount");
  const activeFilter = document.getElementById("activeFilter");
  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");

  function normalize(value) {
    return (value || "").toString().toLocaleLowerCase();
  }

  function escapeHtml(value) {
    return (value || "").toString().replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function renderCategories() {
    const counts = new Map();
    data.questions.forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1));
    const rows = [{ name: "all", label: "\u6240\u6709\u5206\u985e", count: data.questions.length }]
      .concat(data.categories.map((name) => ({ name, label: name, count: counts.get(name) || 0 })));

    categoryList.innerHTML = rows.map((item) => {
      const active = item.name === state.category ? " active" : "";
      return `<button class="category-button${active}" type="button" data-category="${escapeHtml(item.name)}"><span>${escapeHtml(item.label)}</span><span>${item.count}</span></button>`;
    }).join("");
  }

  function filteredQuestions() {
    const query = normalize(state.query).trim();
    return data.questions.filter((item) => {
      if (state.category !== "all" && item.category !== state.category) return false;
      if (!query) return true;
      return normalize(item.search).includes(query);
    });
  }

  function renderQuestions() {
    const rows = filteredQuestions();
    resultCount.textContent = rows.length;
    activeFilter.textContent = state.category === "all" ? "\u6240\u6709\u554f\u984c" : state.category;

    if (!rows.length) {
      list.innerHTML = `<p class="empty">\u6c92\u6709\u7b26\u5408\u689d\u4ef6\u7684\u554f\u984c</p>`;
      return;
    }

    list.innerHTML = rows.map((item) => {
      const activity = item.answers > 0 ? "\u6700\u65b0\u56de\u7b54" : "\u6700\u65b0\u63d0\u554f";
      return `
        <article class="question-card">
          <div class="stat-grid" aria-hidden="true">
            <div class="vote-box">
              <i class="arrow-up"></i>
              <strong>${escapeHtml(item.votes || "0")}</strong>
              <span>\u6295\u7968</span>
              <i class="arrow-down"></i>
            </div>
            <div class="answer-box">
              <strong>${item.answers}</strong>
              <span>\u56de\u7b54</span>
            </div>
            <div class="view-count">${escapeHtml(item.views || "0")} \u700f\u89bd</div>
          </div>
          <div class="question-summary">
            <h2><a href="${item.href}">${escapeHtml(item.title)}</a></h2>
            <div class="question-meta">
              <span>${activity}</span>
              <strong>${escapeHtml(item.date || "")}</strong>
              <span>\u5206\u985e:<a href="#" data-category-link="${escapeHtml(item.category)}">${escapeHtml(item.category)}</a></span>
              <span>| \u7528\u6236: ${escapeHtml(item.author || "\u533f\u540d")}</span>
            </div>
            ${item.excerpt ? `<p class="question-excerpt">${escapeHtml(item.excerpt)}</p>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderQuestions();
  });

  list.addEventListener("click", (event) => {
    const link = event.target.closest("[data-category-link]");
    if (!link) return;
    event.preventDefault();
    state.category = link.dataset.categoryLink;
    renderCategories();
    renderQuestions();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderQuestions();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = searchInput.value;
    renderQuestions();
  });

  renderCategories();
  renderQuestions();
}());
